-- =====================================================================
-- Check List Expedição — Ambiente Sementes Veneza
-- Rode UMA vez no SQL Editor do Supabase (é idempotente, pode re-rodar).
-- Autossuficiente: não depende de nenhum outro arquivo ter rodado antes
-- (recria op_auditoria/_op_log se ainda não existirem, mesmo padrão dos
-- módulos operacionais). Tudo prefixado com exp_. Sem RLS por ora (mesmo
-- padrão dos demais módulos — auth é feita via app_login, não Supabase auth).
-- =====================================================================

begin;

create extension if not exists pgcrypto;   -- p/ gen_random_uuid()

-- ---------------------------------------------------------------------
-- Auditoria compartilhada (mesma tabela/função dos módulos operacionais;
-- criada aqui só se ainda não existir, p/ este arquivo rodar sozinho)
-- ---------------------------------------------------------------------
create table if not exists public.op_auditoria (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  usuario_id uuid,
  usuario_nome text,
  modulo text not null,
  entidade text not null,
  registro_id uuid,
  acao text not null,
  resumo text,
  antes jsonb,
  depois jsonb
);
grant select on public.op_auditoria to anon, authenticated;

create or replace function public._op_log(
  p_usuario_id uuid,p_usuario_nome text,p_modulo text,p_entidade text,
  p_registro_id uuid,p_acao text,p_resumo text,p_antes jsonb,p_depois jsonb
) returns void
language sql security definer set search_path = public as $$
  insert into public.op_auditoria(usuario_id,usuario_nome,modulo,entidade,registro_id,acao,resumo,antes,depois)
  values(p_usuario_id,nullif(trim(p_usuario_nome),''),p_modulo,p_entidade,p_registro_id,p_acao,p_resumo,p_antes,p_depois);
$$;

-- ---------------------------------------------------------------------
-- Itens do modelo do checklist (configuráveis; editar um item não altera
-- as respostas já registradas em cargas passadas — elas guardam uma cópia
-- do título/critico/ordem no momento em que a carga foi criada)
-- ---------------------------------------------------------------------
create table if not exists public.exp_itens_modelo (
  id        uuid primary key default gen_random_uuid(),
  secao     text not null check (secao in ('antes','depois')),
  titulo    text not null,
  critico   boolean not null default false,
  ordem     int not null default 0,
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists exp_itens_modelo_secao_idx on public.exp_itens_modelo(secao, ordem);

-- ---------------------------------------------------------------------
-- Numeração sequencial da carga (formato 2026-0001, zera a cada ano)
-- ---------------------------------------------------------------------
create table if not exists public.exp_cargas_contador (
  ano    int primary key,
  ultimo int not null default 0
);

create or replace function public.exp_gera_numero_carga()
returns trigger language plpgsql security definer set search_path = public as $$
declare a int; n int;
begin
  if new.numero is not null then return new; end if;
  a := extract(year from now())::int;
  insert into public.exp_cargas_contador(ano, ultimo) values (a, 1)
    on conflict (ano) do update set ultimo = public.exp_cargas_contador.ultimo + 1
    returning ultimo into n;
  new.numero := a::text || '-' || lpad(n::text, 4, '0');
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Cargas (uma por carregamento/expedição)
--   status: aberta → (bloqueada quando item crítico reprovado) → concluida
-- ---------------------------------------------------------------------
create table if not exists public.exp_cargas (
  id                    uuid primary key default gen_random_uuid(),
  numero                text unique,
  data                  date not null default current_date,
  placa                 text,
  motorista             text,
  transportadora        text,
  destino               text,
  status                text not null default 'aberta' check (status in ('aberta','bloqueada','concluida')),
  cancelado             boolean not null default false,
  responsavel_antes     text,
  respondido_antes_em   timestamptz,
  responsavel_depois    text,
  respondido_depois_em  timestamptz,
  criado_em             timestamptz not null default now()
);
create index if not exists exp_cargas_status_idx on public.exp_cargas(status);
create index if not exists exp_cargas_data_idx   on public.exp_cargas(data);

drop trigger if exists exp_cargas_numero on public.exp_cargas;
create trigger exp_cargas_numero before insert on public.exp_cargas
  for each row execute function public.exp_gera_numero_carga();

-- ---------------------------------------------------------------------
-- Respostas do checklist (uma por item, por carga — snapshot do modelo
-- no momento da criação da carga)
-- ---------------------------------------------------------------------
create table if not exists public.exp_respostas (
  id            uuid primary key default gen_random_uuid(),
  carga_id      uuid not null references public.exp_cargas(id) on delete cascade,
  item_id       uuid references public.exp_itens_modelo(id) on delete set null,
  secao         text not null check (secao in ('antes','depois')),
  titulo        text not null,
  critico       boolean not null default false,
  ordem         int not null default 0,
  status        text not null default 'pendente' check (status in ('pendente','conforme','nao_conforme','na')),
  observacao    text,
  foto_url      text,
  respondido_em timestamptz,
  criado_em     timestamptz not null default now()
);
create index if not exists exp_respostas_carga_idx on public.exp_respostas(carga_id);

-- ---------------------------------------------------------------------
-- Storage: bucket público p/ fotos dos itens (mesmo padrão do pcm_fotos)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('exp_fotos','exp_fotos', true)
  on conflict (id) do nothing;

drop policy if exists "exp_fotos leitura" on storage.objects;
create policy "exp_fotos leitura" on storage.objects
  for select to public using (bucket_id = 'exp_fotos');

drop policy if exists "exp_fotos envio" on storage.objects;
create policy "exp_fotos envio" on storage.objects
  for insert to public with check (bucket_id = 'exp_fotos');

drop policy if exists "exp_fotos remove" on storage.objects;
create policy "exp_fotos remove" on storage.objects
  for delete to public using (bucket_id = 'exp_fotos');

-- ---------------------------------------------------------------------
-- Itens do modelo: criar / editar (edição não afeta cargas já criadas)
-- ---------------------------------------------------------------------
create or replace function public.exp_criar_item_modelo(
  p_usuario_id uuid, p_usuario_nome text,
  p_secao text, p_titulo text, p_critico boolean default false, p_ordem int default 0
) returns public.exp_itens_modelo
language plpgsql security definer set search_path = public as $$
declare v_item public.exp_itens_modelo;
begin
  if p_secao not in ('antes','depois') then raise exception 'Seção inválida'; end if;
  if nullif(trim(p_titulo),'') is null then raise exception 'Informe o título do item'; end if;
  insert into public.exp_itens_modelo(secao,titulo,critico,ordem)
    values(p_secao, trim(p_titulo), coalesce(p_critico,false), coalesce(p_ordem,0))
    returning * into v_item;
  perform public._op_log(p_usuario_id,p_usuario_nome,'expedicao','item_modelo',v_item.id,'criar',v_item.titulo,null,to_jsonb(v_item));
  return v_item;
end $$;

create or replace function public.exp_editar_item_modelo(
  p_usuario_id uuid, p_usuario_nome text, p_id uuid,
  p_secao text, p_titulo text, p_critico boolean, p_ordem int, p_ativo boolean
) returns public.exp_itens_modelo
language plpgsql security definer set search_path = public as $$
declare v_old public.exp_itens_modelo; v_item public.exp_itens_modelo;
begin
  if p_secao not in ('antes','depois') then raise exception 'Seção inválida'; end if;
  if nullif(trim(p_titulo),'') is null then raise exception 'Informe o título do item'; end if;
  select * into v_old from public.exp_itens_modelo where id=p_id for update;
  if not found then raise exception 'Item não encontrado'; end if;
  update public.exp_itens_modelo set
    secao=p_secao, titulo=trim(p_titulo), critico=coalesce(p_critico,false),
    ordem=coalesce(p_ordem,0), ativo=coalesce(p_ativo,true)
  where id=p_id returning * into v_item;
  perform public._op_log(p_usuario_id,p_usuario_nome,'expedicao','item_modelo',p_id,'editar',v_item.titulo,to_jsonb(v_old),to_jsonb(v_item));
  return v_item;
end $$;

-- ---------------------------------------------------------------------
-- Recalcula o status da carga a partir das respostas atuais
--   bloqueada  : algum item crítico reprovado
--   concluida  : seção "depois" já foi concluída e nada bloqueado
--   aberta     : caso contrário
-- ---------------------------------------------------------------------
create or replace function public._exp_recalcular_status(p_carga_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_bloqueado boolean; v_carga public.exp_cargas; v_novo text;
begin
  select exists(
    select 1 from public.exp_respostas where carga_id=p_carga_id and critico and status='nao_conforme'
  ) into v_bloqueado;
  select * into v_carga from public.exp_cargas where id=p_carga_id for update;
  if v_bloqueado then v_novo := 'bloqueada';
  elsif v_carga.respondido_depois_em is not null then v_novo := 'concluida';
  else v_novo := 'aberta';
  end if;
  update public.exp_cargas set status=v_novo where id=p_carga_id;
end $$;

-- ---------------------------------------------------------------------
-- Cria uma carga (expedição) e já gera as respostas a partir do modelo
-- ativo vigente (antes + depois)
-- ---------------------------------------------------------------------
create or replace function public.exp_criar_carga(
  p_usuario_id uuid, p_usuario_nome text,
  p_data date, p_placa text, p_motorista text, p_transportadora text, p_destino text
) returns public.exp_cargas
language plpgsql security definer set search_path = public as $$
declare v_carga public.exp_cargas;
begin
  insert into public.exp_cargas(data,placa,motorista,transportadora,destino)
    values(coalesce(p_data,current_date), nullif(trim(p_placa),''), nullif(trim(p_motorista),''),
           nullif(trim(p_transportadora),''), nullif(trim(p_destino),''))
    returning * into v_carga;
  insert into public.exp_respostas(carga_id,item_id,secao,titulo,critico,ordem)
    select v_carga.id, id, secao, titulo, critico, ordem
    from public.exp_itens_modelo where ativo order by secao, ordem;
  perform public._op_log(p_usuario_id,p_usuario_nome,'expedicao','carga',v_carga.id,'criar',
    coalesce(v_carga.numero,'')||' · '||coalesce(v_carga.placa,''), null, to_jsonb(v_carga));
  return v_carga;
end $$;

-- ---------------------------------------------------------------------
-- Responde um item do checklist (status/observação/foto) e recalcula
-- o status da carga (bloqueia automaticamente em item crítico reprovado,
-- desbloqueia automaticamente se o item for corrigido depois)
-- ---------------------------------------------------------------------
create or replace function public.exp_responder_item(
  p_usuario_id uuid, p_usuario_nome text, p_id uuid,
  p_status text, p_observacao text, p_foto_url text
) returns public.exp_respostas
language plpgsql security definer set search_path = public as $$
declare v_resp public.exp_respostas; v_carga public.exp_cargas;
begin
  if p_status not in ('pendente','conforme','nao_conforme','na') then raise exception 'Status inválido'; end if;
  select * into v_resp from public.exp_respostas where id=p_id for update;
  if not found then raise exception 'Item de checklist não encontrado'; end if;
  select * into v_carga from public.exp_cargas where id=v_resp.carga_id for update;
  if v_carga.cancelado then raise exception 'Carga cancelada não pode ser alterada'; end if;
  update public.exp_respostas set
    status=p_status, observacao=nullif(trim(p_observacao),''), foto_url=coalesce(p_foto_url,foto_url),
    respondido_em=now()
  where id=p_id returning * into v_resp;
  perform public._exp_recalcular_status(v_carga.id);
  if p_status='nao_conforme' and v_resp.critico then
    perform public._op_log(p_usuario_id,p_usuario_nome,'expedicao','carga',v_carga.id,'bloquear',
      'Item crítico reprovado: '||v_resp.titulo, null, null);
  end if;
  return v_resp;
end $$;

-- ---------------------------------------------------------------------
-- Conclui uma seção (antes/depois): exige todos os itens respondidos e
-- carimba responsável + data/hora. Concluir "depois" fecha a carga
-- (se nada estiver bloqueado).
-- ---------------------------------------------------------------------
create or replace function public.exp_concluir_secao(
  p_usuario_id uuid, p_usuario_nome text, p_carga_id uuid, p_secao text, p_responsavel text
) returns public.exp_cargas
language plpgsql security definer set search_path = public as $$
declare v_pendentes int; v_carga public.exp_cargas;
begin
  if p_secao not in ('antes','depois') then raise exception 'Seção inválida'; end if;
  if nullif(trim(p_responsavel),'') is null then raise exception 'Informe o responsável pela conferência'; end if;
  select * into v_carga from public.exp_cargas where id=p_carga_id for update;
  if not found then raise exception 'Carga não encontrada'; end if;
  if v_carga.cancelado then raise exception 'Carga cancelada não pode ser alterada'; end if;
  select count(*) into v_pendentes from public.exp_respostas
    where carga_id=p_carga_id and secao=p_secao and status='pendente';
  if v_pendentes > 0 then raise exception 'Existem % item(ns) sem resposta nesta seção', v_pendentes; end if;
  if p_secao='antes' then
    update public.exp_cargas set responsavel_antes=trim(p_responsavel), respondido_antes_em=now() where id=p_carga_id;
  else
    update public.exp_cargas set responsavel_depois=trim(p_responsavel), respondido_depois_em=now() where id=p_carga_id;
  end if;
  perform public._exp_recalcular_status(p_carga_id);
  select * into v_carga from public.exp_cargas where id=p_carga_id;
  perform public._op_log(p_usuario_id,p_usuario_nome,'expedicao','carga',p_carga_id,'concluir_secao',
    p_secao||' · '||trim(p_responsavel), null, to_jsonb(v_carga));
  return v_carga;
end $$;

create or replace function public.exp_cancelar_carga(
  p_usuario_id uuid, p_usuario_nome text, p_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
declare v_old public.exp_cargas;
begin
  select * into v_old from public.exp_cargas where id=p_id for update;
  if not found then raise exception 'Carga não encontrada'; end if;
  if v_old.cancelado then return; end if;
  update public.exp_cargas set cancelado=true where id=p_id;
  perform public._op_log(p_usuario_id,p_usuario_nome,'expedicao','carga',p_id,'cancelar',
    coalesce(v_old.numero,'')||' · '||coalesce(v_old.placa,''), to_jsonb(v_old), null);
end $$;

-- ---------------------------------------------------------------------
-- Acesso pelo anon (sem auth por ora — mesmo padrão dos demais módulos)
-- ---------------------------------------------------------------------
grant select, insert, update, delete
  on public.exp_itens_modelo, public.exp_cargas, public.exp_respostas, public.exp_cargas_contador
  to anon, authenticated;

grant execute on function public.exp_criar_item_modelo(uuid,text,text,text,boolean,int) to anon, authenticated;
grant execute on function public.exp_editar_item_modelo(uuid,text,uuid,text,text,boolean,int,boolean) to anon, authenticated;
grant execute on function public.exp_criar_carga(uuid,text,date,text,text,text,text) to anon, authenticated;
grant execute on function public.exp_responder_item(uuid,text,uuid,text,text,text) to anon, authenticated;
grant execute on function public.exp_concluir_secao(uuid,text,uuid,text,text) to anon, authenticated;
grant execute on function public.exp_cancelar_carga(uuid,text,uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Realtime (sincronização ao vivo entre usuários)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['exp_itens_modelo','exp_cargas','exp_respostas'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- SEED: itens de exemplo do checklist (editáveis na tela depois)
-- ---------------------------------------------------------------------
insert into public.exp_itens_modelo (secao, titulo, critico, ordem)
select * from (values
  ('antes','Caminhão limpo e sem avarias na carroceria', true, 1),
  ('antes','Lona em bom estado, sem furos ou rasgos', true, 2),
  ('antes','Cintas/amarração disponíveis e em bom estado', false, 3),
  ('antes','Placa e documentação do veículo conferidas', true, 4),
  ('antes','Motorista com EPI adequado', false, 5),
  ('depois','Carga amarrada e lona fechada corretamente', true, 1),
  ('depois','Quantidade carregada confere com a nota/pedido', true, 2),
  ('depois','Lacre aplicado (quando exigido)', false, 3),
  ('depois','Carroceria/pátio limpos após o carregamento', false, 4)
) as v(secao,titulo,critico,ordem)
where not exists (select 1 from public.exp_itens_modelo);

commit;

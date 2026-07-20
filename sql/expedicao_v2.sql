-- =====================================================================
-- Check List Expedição v2 — seções configuráveis e conclusão sequencial
-- Rode UMA vez no SQL Editor do Supabase (é idempotente, pode re-rodar).
-- Requer o expedicao_v1.sql já aplicado.
--
-- O que muda:
--   * Seções deixam de ser fixas (antes/depois) e viram cadastro
--     (exp_secoes): pode criar quantas quiser, com nome e ordem.
--   * Cada carga guarda uma cópia das seções vigentes (exp_carga_secoes),
--     no mesmo espírito do snapshot dos itens.
--   * Uma seção só pode ser concluída quando TODAS as anteriores
--     (ordem menor) da mesma carga já estiverem concluídas.
--   * A carga fica "concluída" quando todas as seções dela concluírem.
--   * Dados existentes migram automaticamente (antes/depois viram
--     registros e as cargas antigas ganham suas seções).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Cadastro de seções
-- ---------------------------------------------------------------------
create table if not exists public.exp_secoes (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  ordem     int not null default 0,
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);

-- seed a partir das seções fixas antigas (só na primeira execução)
insert into public.exp_secoes (nome, ordem)
select * from (values ('Antes do carregamento',1),('Depois do carregamento',2)) as v(nome,ordem)
where not exists (select 1 from public.exp_secoes);

-- ---------------------------------------------------------------------
-- Itens do modelo passam a apontar para a seção cadastrada
-- (a coluna antiga "secao" fica como legado, sem constraint)
-- ---------------------------------------------------------------------
alter table public.exp_itens_modelo add column if not exists secao_id uuid references public.exp_secoes(id) on delete set null;
alter table public.exp_itens_modelo drop constraint if exists exp_itens_modelo_secao_check;
alter table public.exp_itens_modelo alter column secao drop not null;

update public.exp_itens_modelo i set secao_id = s.id
from public.exp_secoes s
where i.secao_id is null
  and ((i.secao='antes' and s.ordem=1) or (i.secao='depois' and s.ordem=2));

-- ---------------------------------------------------------------------
-- Seções da carga (snapshot no momento da criação, com conferência)
-- ---------------------------------------------------------------------
create table if not exists public.exp_carga_secoes (
  id           uuid primary key default gen_random_uuid(),
  carga_id     uuid not null references public.exp_cargas(id) on delete cascade,
  secao_id     uuid references public.exp_secoes(id) on delete set null,
  nome         text not null,
  ordem        int not null default 0,
  responsavel  text,
  concluida_em timestamptz,
  criado_em    timestamptz not null default now()
);
create index if not exists exp_carga_secoes_carga_idx on public.exp_carga_secoes(carga_id, ordem);

-- migra as cargas antigas (que ainda não têm seções próprias)
insert into public.exp_carga_secoes (carga_id, secao_id, nome, ordem, responsavel, concluida_em)
select c.id, s.id, s.nome, s.ordem,
  case when s.ordem=1 then c.responsavel_antes else c.responsavel_depois end,
  case when s.ordem=1 then c.respondido_antes_em else c.respondido_depois_em end
from public.exp_cargas c
cross join public.exp_secoes s
where s.ordem in (1,2)
  and not exists (select 1 from public.exp_carga_secoes cs where cs.carga_id=c.id);

-- respostas passam a apontar para a seção da carga
alter table public.exp_respostas add column if not exists carga_secao_id uuid references public.exp_carga_secoes(id) on delete cascade;
alter table public.exp_respostas drop constraint if exists exp_respostas_secao_check;
alter table public.exp_respostas alter column secao drop not null;

update public.exp_respostas r set carga_secao_id = cs.id
from public.exp_carga_secoes cs
where r.carga_secao_id is null and cs.carga_id = r.carga_id
  and ((r.secao='antes' and cs.ordem=1) or (r.secao='depois' and cs.ordem=2));

-- ---------------------------------------------------------------------
-- Seções: criar / editar (com auditoria)
-- ---------------------------------------------------------------------
create or replace function public.exp_criar_secao(
  p_usuario_id uuid, p_usuario_nome text, p_nome text, p_ordem int default 0
) returns public.exp_secoes
language plpgsql security definer set search_path = public as $$
declare v_sec public.exp_secoes;
begin
  if nullif(trim(p_nome),'') is null then raise exception 'Informe o nome da seção'; end if;
  insert into public.exp_secoes(nome, ordem) values (trim(p_nome), coalesce(p_ordem,0))
    returning * into v_sec;
  perform public._op_log(p_usuario_id,p_usuario_nome,'expedicao','secao',v_sec.id,'criar',v_sec.nome,null,to_jsonb(v_sec));
  return v_sec;
end $$;

create or replace function public.exp_editar_secao(
  p_usuario_id uuid, p_usuario_nome text, p_id uuid, p_nome text, p_ordem int, p_ativo boolean
) returns public.exp_secoes
language plpgsql security definer set search_path = public as $$
declare v_old public.exp_secoes; v_sec public.exp_secoes;
begin
  if nullif(trim(p_nome),'') is null then raise exception 'Informe o nome da seção'; end if;
  select * into v_old from public.exp_secoes where id=p_id for update;
  if not found then raise exception 'Seção não encontrada'; end if;
  update public.exp_secoes set nome=trim(p_nome), ordem=coalesce(p_ordem,0), ativo=coalesce(p_ativo,true)
    where id=p_id returning * into v_sec;
  perform public._op_log(p_usuario_id,p_usuario_nome,'expedicao','secao',p_id,'editar',v_sec.nome,to_jsonb(v_old),to_jsonb(v_sec));
  return v_sec;
end $$;

-- ---------------------------------------------------------------------
-- Itens do modelo: novas assinaturas com secao_id (as antigas saem)
-- ---------------------------------------------------------------------
drop function if exists public.exp_criar_item_modelo(uuid,text,text,text,boolean,int);
drop function if exists public.exp_editar_item_modelo(uuid,text,uuid,text,text,boolean,int,boolean);

create or replace function public.exp_criar_item_modelo(
  p_usuario_id uuid, p_usuario_nome text,
  p_secao_id uuid, p_titulo text, p_critico boolean default false, p_ordem int default 0
) returns public.exp_itens_modelo
language plpgsql security definer set search_path = public as $$
declare v_item public.exp_itens_modelo;
begin
  if not exists (select 1 from public.exp_secoes where id=p_secao_id) then raise exception 'Seção inválida'; end if;
  if nullif(trim(p_titulo),'') is null then raise exception 'Informe o título do item'; end if;
  insert into public.exp_itens_modelo(secao_id,titulo,critico,ordem)
    values(p_secao_id, trim(p_titulo), coalesce(p_critico,false), coalesce(p_ordem,0))
    returning * into v_item;
  perform public._op_log(p_usuario_id,p_usuario_nome,'expedicao','item_modelo',v_item.id,'criar',v_item.titulo,null,to_jsonb(v_item));
  return v_item;
end $$;

create or replace function public.exp_editar_item_modelo(
  p_usuario_id uuid, p_usuario_nome text, p_id uuid,
  p_secao_id uuid, p_titulo text, p_critico boolean, p_ordem int, p_ativo boolean
) returns public.exp_itens_modelo
language plpgsql security definer set search_path = public as $$
declare v_old public.exp_itens_modelo; v_item public.exp_itens_modelo;
begin
  if not exists (select 1 from public.exp_secoes where id=p_secao_id) then raise exception 'Seção inválida'; end if;
  if nullif(trim(p_titulo),'') is null then raise exception 'Informe o título do item'; end if;
  select * into v_old from public.exp_itens_modelo where id=p_id for update;
  if not found then raise exception 'Item não encontrado'; end if;
  update public.exp_itens_modelo set
    secao_id=p_secao_id, titulo=trim(p_titulo), critico=coalesce(p_critico,false),
    ordem=coalesce(p_ordem,0), ativo=coalesce(p_ativo,true)
  where id=p_id returning * into v_item;
  perform public._op_log(p_usuario_id,p_usuario_nome,'expedicao','item_modelo',p_id,'editar',v_item.titulo,to_jsonb(v_old),to_jsonb(v_item));
  return v_item;
end $$;

-- ---------------------------------------------------------------------
-- Status da carga: bloqueada > concluída (todas as seções) > aberta
-- ---------------------------------------------------------------------
create or replace function public._exp_recalcular_status(p_carga_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_bloqueado boolean; v_abertas int; v_total int; v_novo text;
begin
  select exists(
    select 1 from public.exp_respostas where carga_id=p_carga_id and critico and status='nao_conforme'
  ) into v_bloqueado;
  select count(*), count(*) filter (where concluida_em is null)
    into v_total, v_abertas from public.exp_carga_secoes where carga_id=p_carga_id;
  if v_bloqueado then v_novo := 'bloqueada';
  elsif v_total > 0 and v_abertas = 0 then v_novo := 'concluida';
  else v_novo := 'aberta';
  end if;
  update public.exp_cargas set status=v_novo where id=p_carga_id;
end $$;

-- ---------------------------------------------------------------------
-- Criar carga: snapshot das seções ativas + itens ativos de cada uma
-- ---------------------------------------------------------------------
create or replace function public.exp_criar_carga(
  p_usuario_id uuid, p_usuario_nome text,
  p_data date, p_placa text, p_motorista text, p_transportadora text, p_destino text
) returns public.exp_cargas
language plpgsql security definer set search_path = public as $$
declare v_carga public.exp_cargas;
begin
  if not exists (select 1 from public.exp_secoes where ativo) then
    raise exception 'Cadastre ao menos uma seção ativa no modelo do checklist';
  end if;
  insert into public.exp_cargas(data,placa,motorista,transportadora,destino)
    values(coalesce(p_data,current_date), nullif(trim(p_placa),''), nullif(trim(p_motorista),''),
           nullif(trim(p_transportadora),''), nullif(trim(p_destino),''))
    returning * into v_carga;
  insert into public.exp_carga_secoes(carga_id,secao_id,nome,ordem)
    select v_carga.id, s.id, s.nome, s.ordem from public.exp_secoes s where s.ativo;
  insert into public.exp_respostas(carga_id,carga_secao_id,item_id,titulo,critico,ordem)
    select v_carga.id, cs.id, i.id, i.titulo, i.critico, i.ordem
    from public.exp_itens_modelo i
    join public.exp_carga_secoes cs on cs.carga_id=v_carga.id and cs.secao_id=i.secao_id
    where i.ativo;
  perform public._op_log(p_usuario_id,p_usuario_nome,'expedicao','carga',v_carga.id,'criar',
    coalesce(v_carga.numero,'')||' · '||coalesce(v_carga.placa,''), null, to_jsonb(v_carga));
  return v_carga;
end $$;

-- ---------------------------------------------------------------------
-- Concluir seção da carga: exige itens todos respondidos E as seções
-- anteriores (ordem menor) já concluídas
-- ---------------------------------------------------------------------
create or replace function public.exp_concluir_secao(
  p_usuario_id uuid, p_usuario_nome text, p_carga_secao_id uuid, p_responsavel text
) returns public.exp_cargas
language plpgsql security definer set search_path = public as $$
declare v_cs public.exp_carga_secoes; v_carga public.exp_cargas; v_pendentes int; v_anteriores int;
begin
  if nullif(trim(p_responsavel),'') is null then raise exception 'Informe o responsável pela conferência'; end if;
  select * into v_cs from public.exp_carga_secoes where id=p_carga_secao_id for update;
  if not found then raise exception 'Seção da carga não encontrada'; end if;
  if v_cs.concluida_em is not null then raise exception 'Esta seção já foi concluída'; end if;
  select * into v_carga from public.exp_cargas where id=v_cs.carga_id for update;
  if v_carga.cancelado then raise exception 'Carga cancelada não pode ser alterada'; end if;
  select count(*) into v_anteriores from public.exp_carga_secoes
    where carga_id=v_cs.carga_id and ordem < v_cs.ordem and concluida_em is null;
  if v_anteriores > 0 then
    raise exception 'Conclua primeiro a(s) seção(ões) anterior(es) desta carga';
  end if;
  select count(*) into v_pendentes from public.exp_respostas
    where carga_secao_id=p_carga_secao_id and status='pendente';
  if v_pendentes > 0 then raise exception 'Existem % item(ns) sem resposta nesta seção', v_pendentes; end if;
  update public.exp_carga_secoes set responsavel=trim(p_responsavel), concluida_em=now()
    where id=p_carga_secao_id;
  perform public._exp_recalcular_status(v_cs.carga_id);
  select * into v_carga from public.exp_cargas where id=v_cs.carga_id;
  perform public._op_log(p_usuario_id,p_usuario_nome,'expedicao','carga',v_cs.carga_id,'concluir_secao',
    v_cs.nome||' · '||trim(p_responsavel), null, to_jsonb(v_carga));
  return v_carga;
end $$;

-- shim de transição: aparelhos que ainda estiverem com o app antigo em
-- cache (antes/depois) continuam funcionando até atualizarem o PWA
create or replace function public.exp_concluir_secao(
  p_usuario_id uuid, p_usuario_nome text, p_carga_id uuid, p_secao text, p_responsavel text
) returns public.exp_cargas
language plpgsql security definer set search_path = public as $$
declare v_cs_id uuid;
begin
  select id into v_cs_id from public.exp_carga_secoes
    where carga_id=p_carga_id order by ordem
    limit 1 offset (case when p_secao='antes' then 0 else 1 end);
  if v_cs_id is null then raise exception 'Seção da carga não encontrada'; end if;
  return public.exp_concluir_secao(p_usuario_id, p_usuario_nome, v_cs_id, p_responsavel);
end $$;

-- ---------------------------------------------------------------------
-- Grants e realtime das tabelas novas
-- ---------------------------------------------------------------------
grant select, insert, update, delete on public.exp_secoes, public.exp_carga_secoes to anon, authenticated;
grant execute on function public.exp_criar_secao(uuid,text,text,int) to anon, authenticated;
grant execute on function public.exp_editar_secao(uuid,text,uuid,text,int,boolean) to anon, authenticated;
grant execute on function public.exp_criar_item_modelo(uuid,text,uuid,text,boolean,int) to anon, authenticated;
grant execute on function public.exp_editar_item_modelo(uuid,text,uuid,uuid,text,boolean,int,boolean) to anon, authenticated;
grant execute on function public.exp_concluir_secao(uuid,text,uuid,text) to anon, authenticated;
grant execute on function public.exp_concluir_secao(uuid,text,uuid,text,text) to anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['exp_secoes','exp_carga_secoes'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

commit;

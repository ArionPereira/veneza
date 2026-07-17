-- =====================================================================
-- Chōrei v3 · Projetos mais ricos
-- Etapas (checklist com progresso), observações (diário de andamento),
-- status 'pausado' (em espera), prioridade e data de início.
-- Idempotente — pode rodar mais de uma vez. Pressupõe o v1 (e o v2, se
-- o módulo já estava no ar antes dos projetos).
-- =====================================================================
begin;

-- ---------- Colunas novas nos itens ------------------------------------
alter table public.chorei_itens add column if not exists prioridade text not null default 'media';
alter table public.chorei_itens add column if not exists inicio date;

alter table public.chorei_itens drop constraint if exists chorei_itens_prioridade_check;
alter table public.chorei_itens add constraint chorei_itens_prioridade_check
  check (prioridade in ('alta','media','baixa'));

-- status ganha 'pausado' (projeto em espera de terceiros/decisão)
alter table public.chorei_itens drop constraint if exists chorei_itens_status_check;
alter table public.chorei_itens add constraint chorei_itens_status_check
  check (status in ('aberto','em_andamento','pausado','resolvido','cancelado'));

-- ---------- Etapas do projeto (checklist) ------------------------------
create table if not exists public.chorei_projeto_etapas (
  id               uuid primary key default gen_random_uuid(),
  item_id          uuid not null references public.chorei_itens(id) on delete cascade,
  texto            text not null,
  feito            boolean not null default false,
  ordem            int not null default 0,
  responsavel_id   uuid references public.app_usuarios(id) on delete set null,
  responsavel_nome text,
  prazo            date,
  criado_em        timestamptz not null default now(),
  feito_em         timestamptz,
  constraint chorei_etapas_texto_chk check (length(trim(texto)) > 0)
);
create index if not exists chorei_etapas_item_idx
  on public.chorei_projeto_etapas(item_id, ordem, criado_em);

-- ---------- Observações do projeto (diário de andamento) ---------------
create table if not exists public.chorei_projeto_notas (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.chorei_itens(id) on delete cascade,
  texto      text not null,
  autor_id   uuid references public.app_usuarios(id) on delete set null,
  autor_nome text,
  criado_em  timestamptz not null default now(),
  constraint chorei_notas_texto_chk check (length(trim(texto)) > 0)
);
create index if not exists chorei_notas_item_idx
  on public.chorei_projeto_notas(item_id, criado_em desc);

-- ---------- Autorização: pode escrever no item -------------------------
create or replace function public.chorei_pode_escrever_item(p_user_id uuid, p_item_id uuid)
returns boolean language sql security definer set search_path=public as $$
  select exists (select 1 from public.chorei_itens where id = p_item_id)
     and public.chorei_pode_escrever(p_user_id, (select equipe_id from public.chorei_itens where id = p_item_id));
$$;

-- ---------- RPCs de etapas ---------------------------------------------
create or replace function public.chorei_salvar_etapa(
  p_user_id uuid, p_id uuid, p_item_id uuid, p_texto text,
  p_responsavel_id uuid default null, p_responsavel_nome text default null,
  p_prazo date default null, p_ordem int default null
) returns public.chorei_projeto_etapas language plpgsql security definer set search_path=public as $$
declare v_row public.chorei_projeto_etapas; v_item uuid;
begin
  if p_id is null then v_item := p_item_id;
  else
    select item_id into v_item from public.chorei_projeto_etapas where id = p_id;
    if v_item is null then raise exception 'Etapa não encontrada'; end if;
  end if;
  if not public.chorei_pode_escrever_item(p_user_id, v_item) then
    raise exception 'Você não é o responsável desta equipe';
  end if;
  if p_id is null then
    if nullif(trim(coalesce(p_texto,'')),'') is null then raise exception 'Escreva o texto da etapa'; end if;
    insert into public.chorei_projeto_etapas(item_id, texto, ordem, responsavel_id, responsavel_nome, prazo)
    values (v_item, trim(p_texto),
      coalesce(p_ordem, (select coalesce(max(ordem),0)+1 from public.chorei_projeto_etapas where item_id = v_item)),
      p_responsavel_id, nullif(trim(coalesce(p_responsavel_nome,'')),''), p_prazo)
    returning * into v_row;
  else
    update public.chorei_projeto_etapas set
      texto            = coalesce(nullif(trim(coalesce(p_texto,'')),''), texto),
      responsavel_id   = p_responsavel_id,
      responsavel_nome = nullif(trim(coalesce(p_responsavel_nome,'')),''),
      prazo            = p_prazo,
      ordem            = coalesce(p_ordem, ordem)
    where id = p_id
    returning * into v_row;
  end if;
  return v_row;
end $$;

create or replace function public.chorei_marcar_etapa(p_user_id uuid, p_id uuid, p_feito boolean)
returns public.chorei_projeto_etapas language plpgsql security definer set search_path=public as $$
declare v_row public.chorei_projeto_etapas; v_item uuid;
begin
  select item_id into v_item from public.chorei_projeto_etapas where id = p_id;
  if v_item is null then raise exception 'Etapa não encontrada'; end if;
  if not public.chorei_pode_escrever_item(p_user_id, v_item) then
    raise exception 'Você não é o responsável desta equipe';
  end if;
  update public.chorei_projeto_etapas set
    feito    = coalesce(p_feito, false),
    feito_em = case when coalesce(p_feito, false) then coalesce(feito_em, now()) else null end
  where id = p_id
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.chorei_apagar_etapa(p_user_id uuid, p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_item uuid;
begin
  select item_id into v_item from public.chorei_projeto_etapas where id = p_id;
  if v_item is null then return; end if;
  if not public.chorei_pode_escrever_item(p_user_id, v_item) then
    raise exception 'Você não é o responsável desta equipe';
  end if;
  delete from public.chorei_projeto_etapas where id = p_id;
end $$;

-- ---------- RPCs de observações ----------------------------------------
create or replace function public.chorei_criar_nota(p_user_id uuid, p_item_id uuid, p_texto text)
returns public.chorei_projeto_notas language plpgsql security definer set search_path=public as $$
declare v_row public.chorei_projeto_notas; v_autor text;
begin
  if not public.chorei_pode_escrever_item(p_user_id, p_item_id) then
    raise exception 'Você não é o responsável desta equipe';
  end if;
  if nullif(trim(coalesce(p_texto,'')),'') is null then raise exception 'Escreva a observação'; end if;
  select nome into v_autor from public.app_usuarios where id = p_user_id;
  insert into public.chorei_projeto_notas(item_id, texto, autor_id, autor_nome)
  values (p_item_id, trim(p_texto), p_user_id, v_autor)
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.chorei_apagar_nota(p_user_id uuid, p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_item uuid;
begin
  select item_id into v_item from public.chorei_projeto_notas where id = p_id;
  if v_item is null then return; end if;
  if not public.chorei_pode_escrever_item(p_user_id, v_item) then
    raise exception 'Você não é o responsável desta equipe';
  end if;
  delete from public.chorei_projeto_notas where id = p_id;
end $$;

-- ---------- Itens: criar/atualizar com prioridade e início --------------
-- (drop + create porque a assinatura ganhou parâmetros; os novos têm
--  default, então o app antigo que chama sem eles continua funcionando)
drop function if exists public.chorei_criar_item(uuid, uuid, text, text, uuid, text, date);
create or replace function public.chorei_criar_item(
  p_user_id uuid, p_equipe_id uuid, p_tipo text, p_texto text,
  p_responsavel_id uuid, p_responsavel_nome text, p_prazo date,
  p_prioridade text default null, p_inicio date default null
) returns public.chorei_itens language plpgsql security definer set search_path=public as $$
declare v_item public.chorei_itens; v_autor text;
begin
  if not public.chorei_pode_escrever(p_user_id, p_equipe_id) then
    raise exception 'Você não é o responsável desta equipe';
  end if;
  if p_tipo not in ('ontem','dificuldade','plano','aviso','projeto') then raise exception 'Tipo inválido'; end if;
  if nullif(trim(coalesce(p_texto,'')),'') is null then raise exception 'Escreva o texto do item'; end if;
  if p_prioridade is not null and p_prioridade not in ('alta','media','baixa') then
    raise exception 'Prioridade inválida';
  end if;
  select nome into v_autor from public.app_usuarios where id=p_user_id;
  insert into public.chorei_itens(equipe_id, tipo, texto, autor_id, autor_nome,
    responsavel_id, responsavel_nome, prazo, status, prioridade, inicio)
  values (p_equipe_id, p_tipo, trim(p_texto), p_user_id, v_autor,
    p_responsavel_id, nullif(trim(coalesce(p_responsavel_nome,'')),''), p_prazo, 'aberto',
    coalesce(p_prioridade, 'media'), p_inicio)
  returning * into v_item;
  return v_item;
end $$;

drop function if exists public.chorei_atualizar_item(uuid, uuid, text, uuid, text, date, text, text);
create or replace function public.chorei_atualizar_item(
  p_user_id uuid, p_id uuid, p_texto text, p_responsavel_id uuid,
  p_responsavel_nome text, p_prazo date, p_status text, p_resolucao text,
  p_prioridade text default null, p_inicio date default null
) returns public.chorei_itens language plpgsql security definer set search_path=public as $$
declare v_item public.chorei_itens; v_eq uuid;
begin
  select equipe_id into v_eq from public.chorei_itens where id=p_id;
  if v_eq is null then raise exception 'Item não encontrado'; end if;
  if not public.chorei_pode_escrever(p_user_id, v_eq) then
    raise exception 'Você não é o responsável desta equipe';
  end if;
  if p_status is not null and p_status not in ('aberto','em_andamento','pausado','resolvido','cancelado') then
    raise exception 'Status inválido';
  end if;
  if p_prioridade is not null and p_prioridade not in ('alta','media','baixa') then
    raise exception 'Prioridade inválida';
  end if;
  update public.chorei_itens set
    texto            = coalesce(nullif(trim(coalesce(p_texto,'')),''), texto),
    responsavel_id   = p_responsavel_id,
    responsavel_nome = nullif(trim(coalesce(p_responsavel_nome,'')),''),
    prazo            = p_prazo,
    status           = coalesce(p_status, status),
    resolucao        = nullif(trim(coalesce(p_resolucao,'')),''),
    prioridade       = coalesce(p_prioridade, prioridade),
    inicio           = coalesce(p_inicio, inicio),
    resolvido_em     = case
                         when coalesce(p_status, status) in ('resolvido','cancelado')
                           then coalesce(resolvido_em, now())
                         else null
                       end
  where id = p_id
  returning * into v_item;
  return v_item;
end $$;

-- ---------- Grants ------------------------------------------------------
grant select on public.chorei_projeto_etapas, public.chorei_projeto_notas to anon, authenticated;
grant execute on function public.chorei_pode_escrever_item(uuid, uuid) to anon, authenticated;
grant execute on function public.chorei_salvar_etapa(uuid, uuid, uuid, text, uuid, text, date, int) to anon, authenticated;
grant execute on function public.chorei_marcar_etapa(uuid, uuid, boolean) to anon, authenticated;
grant execute on function public.chorei_apagar_etapa(uuid, uuid) to anon, authenticated;
grant execute on function public.chorei_criar_nota(uuid, uuid, text) to anon, authenticated;
grant execute on function public.chorei_apagar_nota(uuid, uuid) to anon, authenticated;
grant execute on function public.chorei_criar_item(uuid, uuid, text, text, uuid, text, date, text, date) to anon, authenticated;
grant execute on function public.chorei_atualizar_item(uuid, uuid, text, uuid, text, date, text, text, text, date) to anon, authenticated;

-- ---------- Realtime ----------------------------------------------------
do $$ declare t text;
begin
  foreach t in array array['chorei_projeto_etapas','chorei_projeto_notas'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

commit;

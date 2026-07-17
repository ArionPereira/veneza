-- =====================================================================
-- Chōrei · Reuniões diárias
-- Uma tabela de equipes (PCP/Almoxarifado/ADM) e uma tabela de itens
-- (dificuldades, planos, avisos, sobras do dia anterior e projetos de
-- longa duração).
-- Todo cliente lê direto (via anon), mas escrita/edição/exclusão passa por
-- RPCs SECURITY DEFINER que validam se o usuário é master OU responsável
-- daquela equipe.
-- =====================================================================
begin;

create extension if not exists pgcrypto;

create table if not exists public.chorei_equipes (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null unique,
  cor            text default '#004D94',
  ordem          int not null default 0,
  responsavel_id uuid references public.app_usuarios(id) on delete set null,
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now(),
  constraint chorei_equipes_nome_chk check (length(trim(nome)) > 0)
);

create table if not exists public.chorei_itens (
  id               uuid primary key default gen_random_uuid(),
  equipe_id        uuid not null references public.chorei_equipes(id) on delete cascade,
  tipo             text not null check (tipo in ('ontem','dificuldade','plano','aviso','projeto')),
  texto            text not null,
  autor_id         uuid references public.app_usuarios(id) on delete set null,
  autor_nome       text,
  responsavel_id   uuid references public.app_usuarios(id) on delete set null,
  responsavel_nome text,
  prazo            date,
  status           text not null default 'aberto' check (status in ('aberto','em_andamento','resolvido','cancelado')),
  resolucao        text,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  resolvido_em     timestamptz,
  constraint chorei_itens_texto_chk check (length(trim(texto)) > 0)
);

create index if not exists chorei_itens_equipe_criado_idx on public.chorei_itens(equipe_id, criado_em desc);
create index if not exists chorei_itens_status_idx on public.chorei_itens(status);

-- Trigger p/ manter atualizado_em fresco
create or replace function public.chorei_touch() returns trigger language plpgsql as $$
begin new.atualizado_em := now(); return new; end $$;
drop trigger if exists chorei_itens_touch on public.chorei_itens;
create trigger chorei_itens_touch before update on public.chorei_itens
  for each row execute function public.chorei_touch();

-- Autoriza: master OU responsável da equipe
create or replace function public.chorei_pode_escrever(p_user_id uuid, p_equipe_id uuid)
returns boolean language sql security definer set search_path=public as $$
  select
    coalesce((select role='master' from public.app_usuarios where id=p_user_id and ativo), false)
    or exists (select 1 from public.chorei_equipes where id=p_equipe_id and responsavel_id=p_user_id and ativo);
$$;

-- CRUD equipes (só master)
create or replace function public.chorei_salvar_equipe(
  p_master_id uuid, p_id uuid, p_nome text, p_cor text, p_ordem int,
  p_responsavel_id uuid, p_ativo boolean
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.app_usuarios where id=p_master_id and role='master' and ativo) then
    raise exception 'Apenas um usuário master pode gerenciar equipes';
  end if;
  if nullif(trim(coalesce(p_nome,'')),'') is null then raise exception 'Informe o nome da equipe'; end if;
  if p_id is null then
    insert into public.chorei_equipes(nome, cor, ordem, responsavel_id, ativo)
    values (trim(p_nome), coalesce(p_cor,'#004D94'), coalesce(p_ordem,0), p_responsavel_id, coalesce(p_ativo,true))
    returning id into v_id;
  else
    update public.chorei_equipes set
      nome           = trim(p_nome),
      cor            = coalesce(p_cor, cor),
      ordem          = coalesce(p_ordem, ordem),
      responsavel_id = p_responsavel_id,
      ativo          = coalesce(p_ativo, true)
    where id = p_id
    returning id into v_id;
    if v_id is null then raise exception 'Equipe não encontrada'; end if;
  end if;
  return v_id;
exception when unique_violation then raise exception 'Já existe uma equipe com esse nome';
end $$;

-- Criar item de reunião
create or replace function public.chorei_criar_item(
  p_user_id uuid, p_equipe_id uuid, p_tipo text, p_texto text,
  p_responsavel_id uuid, p_responsavel_nome text, p_prazo date
) returns public.chorei_itens language plpgsql security definer set search_path=public as $$
declare v_item public.chorei_itens; v_autor text;
begin
  if not public.chorei_pode_escrever(p_user_id, p_equipe_id) then
    raise exception 'Você não é o responsável desta equipe';
  end if;
  if p_tipo not in ('ontem','dificuldade','plano','aviso','projeto') then raise exception 'Tipo inválido'; end if;
  if nullif(trim(coalesce(p_texto,'')),'') is null then raise exception 'Escreva o texto do item'; end if;
  select nome into v_autor from public.app_usuarios where id=p_user_id;
  insert into public.chorei_itens(equipe_id, tipo, texto, autor_id, autor_nome,
    responsavel_id, responsavel_nome, prazo, status)
  values (p_equipe_id, p_tipo, trim(p_texto), p_user_id, v_autor,
    p_responsavel_id, nullif(trim(coalesce(p_responsavel_nome,'')),''), p_prazo, 'aberto')
  returning * into v_item;
  return v_item;
end $$;

-- Atualizar item
create or replace function public.chorei_atualizar_item(
  p_user_id uuid, p_id uuid, p_texto text, p_responsavel_id uuid,
  p_responsavel_nome text, p_prazo date, p_status text, p_resolucao text
) returns public.chorei_itens language plpgsql security definer set search_path=public as $$
declare v_item public.chorei_itens; v_eq uuid;
begin
  select equipe_id into v_eq from public.chorei_itens where id=p_id;
  if v_eq is null then raise exception 'Item não encontrado'; end if;
  if not public.chorei_pode_escrever(p_user_id, v_eq) then
    raise exception 'Você não é o responsável desta equipe';
  end if;
  if p_status is not null and p_status not in ('aberto','em_andamento','resolvido','cancelado') then
    raise exception 'Status inválido';
  end if;
  update public.chorei_itens set
    texto            = coalesce(nullif(trim(coalesce(p_texto,'')),''), texto),
    responsavel_id   = p_responsavel_id,
    responsavel_nome = nullif(trim(coalesce(p_responsavel_nome,'')),''),
    prazo            = p_prazo,
    status           = coalesce(p_status, status),
    resolucao        = nullif(trim(coalesce(p_resolucao,'')),''),
    resolvido_em     = case
                         when coalesce(p_status, status) in ('resolvido','cancelado')
                           then coalesce(resolvido_em, now())
                         else null
                       end
  where id = p_id
  returning * into v_item;
  return v_item;
end $$;

create or replace function public.chorei_apagar_item(p_user_id uuid, p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_eq uuid;
begin
  select equipe_id into v_eq from public.chorei_itens where id=p_id;
  if v_eq is null then return; end if;
  if not public.chorei_pode_escrever(p_user_id, v_eq) then
    raise exception 'Você não é o responsável desta equipe';
  end if;
  delete from public.chorei_itens where id=p_id;
end $$;

grant select on public.chorei_equipes, public.chorei_itens to anon, authenticated;
grant execute on function public.chorei_pode_escrever(uuid, uuid) to anon, authenticated;
grant execute on function public.chorei_salvar_equipe(uuid, uuid, text, text, int, uuid, boolean) to anon, authenticated;
grant execute on function public.chorei_criar_item(uuid, uuid, text, text, uuid, text, date) to anon, authenticated;
grant execute on function public.chorei_atualizar_item(uuid, uuid, text, uuid, text, date, text, text) to anon, authenticated;
grant execute on function public.chorei_apagar_item(uuid, uuid) to anon, authenticated;

-- Realtime
do $$ declare t text;
begin
  foreach t in array array['chorei_equipes','chorei_itens'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Seed: as 3 equipes iniciais
insert into public.chorei_equipes(nome, cor, ordem) values
  ('PCP',          '#004D94', 1),
  ('Almoxarifado', '#B07D10', 2),
  ('ADM',          '#2F8F2C', 3)
on conflict (nome) do nothing;

commit;

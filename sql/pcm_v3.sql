-- =====================================================================
-- PCM v3 (incremental) — componentes do equipamento
-- NÃO recria nada existente. Rode UMA vez no SQL Editor do Supabase
-- (idempotente). Pré-requisito: schemas PCM v1 e v2 já rodados.
-- Obs.: a tabela de OS é pcm_ordens (não pcm_os).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Componentes de um equipamento (N por equipamento; opcionais)
-- ---------------------------------------------------------------------
create table if not exists pcm_componentes (
  id             uuid primary key default gen_random_uuid(),
  equipamento_id uuid not null references pcm_equipamentos(id) on delete cascade,
  nome           text not null,
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now()
);
create index if not exists pcm_componentes_equip_idx on pcm_componentes(equipamento_id);

-- ---------------------------------------------------------------------
-- Componente que apresentou o defeito na OS (opcional)
-- ---------------------------------------------------------------------
alter table pcm_ordens add column if not exists componente_id uuid references pcm_componentes(id) on delete set null;
create index if not exists pcm_os_componente_idx on pcm_ordens(componente_id);

-- ---------------------------------------------------------------------
-- Acesso anon (sem auth ainda) + realtime
-- ---------------------------------------------------------------------
grant select, insert, update, delete on pcm_componentes to anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['pcm_componentes'] loop
    if not exists (select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

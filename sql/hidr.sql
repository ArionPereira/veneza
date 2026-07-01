-- =====================================================================
-- Hidrômetro (controle de água) — complementa o módulo de Pluviometria.
-- Incremental: cria só as tabelas novas. Rode no SQL Editor do Supabase.
-- =====================================================================

create extension if not exists pgcrypto;

-- Hidrômetros (pontos de medição de água)
create table if not exists hidr_pontos (
  id          uuid primary key default gen_random_uuid(),
  codigo      text,
  nome        text not null,
  localizacao text,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

-- Leituras do hidrômetro (valor acumulado do relógio, em m³)
create table if not exists hidr_leituras (
  id          uuid primary key default gen_random_uuid(),
  ponto_id    uuid not null references hidr_pontos(id) on delete cascade,
  data        date not null,
  leitura_m3  numeric not null,
  responsavel text,
  observacao  text,
  criado_em   timestamptz not null default now()
);
create index if not exists hidr_leituras_ponto_idx on hidr_leituras(ponto_id);

-- Acesso anon (sem auth, mesmo padrão dos demais) + realtime
grant select, insert, update, delete on hidr_pontos, hidr_leituras to anon, authenticated;

do $$ declare t text; begin
  foreach t in array array['hidr_pontos','hidr_leituras'] loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

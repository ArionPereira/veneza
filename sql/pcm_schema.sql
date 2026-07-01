-- =====================================================================
-- PCM (Planejamento e Controle de Manutenção) — Ambiente Sementes Veneza
-- Rode UMA vez no SQL Editor do Supabase (é idempotente, pode re-rodar).
-- Tudo prefixado com pcm_ para conviver com os outros módulos no mesmo
-- projeto Supabase. Sem RLS por ora (mesmo padrão do html_tools_storage).
-- TODO(pcm): habilitar RLS por papel quando o Ambiente Veneza tiver auth.
-- =====================================================================

create extension if not exists pgcrypto;   -- p/ gen_random_uuid()

-- ---------------------------------------------------------------------
-- SETORES
-- ---------------------------------------------------------------------
create table if not exists pcm_setores (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null unique,
  ordem      int  not null default 0,
  criado_em  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- EQUIPAMENTOS (TAG única, criticidade A/B/C, dados do fabricante, foto)
-- ---------------------------------------------------------------------
create table if not exists pcm_equipamentos (
  id           uuid primary key default gen_random_uuid(),
  setor_id     uuid references pcm_setores(id) on delete set null,
  tag          text not null unique,
  nome         text not null,
  fabricante   text,
  modelo       text,
  criticidade  text not null default 'C' check (criticidade in ('A','B','C')),
  foto_url     text,
  ativo        boolean not null default true,
  criado_em    timestamptz not null default now()
);
create index if not exists pcm_equip_setor_idx on pcm_equipamentos(setor_id);

-- ---------------------------------------------------------------------
-- CONTADOR p/ numeração da OS no formato 2026-0001 (zera a cada ano)
-- ---------------------------------------------------------------------
create table if not exists pcm_os_contador (
  ano     int primary key,
  ultimo  int not null default 0
);

create or replace function pcm_gera_numero_os()
returns trigger language plpgsql security definer set search_path = public as $$
declare a int; n int;
begin
  if new.numero is not null then return new; end if;
  a := extract(year from now())::int;
  insert into pcm_os_contador(ano, ultimo) values (a, 1)
    on conflict (ano) do update set ultimo = pcm_os_contador.ultimo + 1
    returning ultimo into n;
  new.numero := a::text || '-' || lpad(n::text, 4, '0');
  return new;
end $$;

create or replace function pcm_touch()
returns trigger language plpgsql as $$
begin new.atualizado_em := now(); return new; end $$;

-- ---------------------------------------------------------------------
-- ORDENS DE SERVIÇO
--   fluxo: aberta → planejada → executando → aguardando_peca →
--          concluida | cancelada
-- ---------------------------------------------------------------------
create table if not exists pcm_ordens (
  id                  uuid primary key default gen_random_uuid(),
  numero              text unique,
  equipamento_id      uuid not null references pcm_equipamentos(id) on delete cascade,
  tipo                text not null check (tipo in ('preventiva','corretiva','emergencial','programada','melhoria')),
  status              text not null default 'aberta'
                      check (status in ('aberta','planejada','executando','aguardando_peca','concluida','cancelada')),
  titulo              text not null,
  descricao           text,
  solicitante         text,
  aberta_em           timestamptz not null default now(),
  iniciada_em         timestamptz,
  concluida_em        timestamptz,
  causa_raiz          text,
  solucao             text,
  tempo_parada_min    int,
  motivo_cancelamento text,
  atualizado_em       timestamptz not null default now(),

  -- rede de segurança no banco: não fecha como concluída sem
  -- causa raiz + solução + tempo de máquina parada
  constraint pcm_os_fecha_completa check (
    status <> 'concluida' or (
      causa_raiz is not null and length(btrim(causa_raiz)) > 0 and
      solucao    is not null and length(btrim(solucao))    > 0 and
      tempo_parada_min is not null
    )
  ),
  constraint pcm_os_cancela_motivo check (
    status <> 'cancelada' or (motivo_cancelamento is not null and length(btrim(motivo_cancelamento)) > 0)
  )
);
create index if not exists pcm_os_equip_idx  on pcm_ordens(equipamento_id);
create index if not exists pcm_os_status_idx on pcm_ordens(status);
create index if not exists pcm_os_tipo_idx   on pcm_ordens(tipo);

drop trigger if exists pcm_os_numero on pcm_ordens;
create trigger pcm_os_numero before insert on pcm_ordens
  for each row execute function pcm_gera_numero_os();

drop trigger if exists pcm_os_touch on pcm_ordens;
create trigger pcm_os_touch before update on pcm_ordens
  for each row execute function pcm_touch();

-- ---------------------------------------------------------------------
-- FOTOS DA OS (problema, evidência de causa raiz, etc.)
-- ---------------------------------------------------------------------
create table if not exists pcm_os_fotos (
  id         uuid primary key default gen_random_uuid(),
  os_id      uuid not null references pcm_ordens(id) on delete cascade,
  url        text not null,
  tipo       text not null default 'problema' check (tipo in ('problema','evidencia','causa_raiz','outro')),
  legenda    text,
  criado_em  timestamptz not null default now()
);
create index if not exists pcm_fotos_os_idx on pcm_os_fotos(os_id);

-- ---------------------------------------------------------------------
-- SEED dos setores (editáveis na tela depois)
-- ---------------------------------------------------------------------
insert into pcm_setores (nome, ordem) values
  ('Recebimento',1),('Secagem',2),('Beneficiamento',3),('TSI',4),('Ensaque',5),('Utilidades',6)
on conflict (nome) do nothing;

-- ---------------------------------------------------------------------
-- Acesso pelo anon (sem auth por ora — mesmo padrão do html_tools_storage)
-- ---------------------------------------------------------------------
grant select, insert, update, delete
  on pcm_setores, pcm_equipamentos, pcm_ordens, pcm_os_fotos, pcm_os_contador
  to anon, authenticated;

-- ---------------------------------------------------------------------
-- Realtime (sincronização ao vivo entre usuários)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['pcm_setores','pcm_equipamentos','pcm_ordens','pcm_os_fotos'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Storage: bucket público p/ fotos (sem auth por ora)
-- Obs.: se o Supabase reclamar do "_" no nome do bucket, troque para
-- 'pcm-fotos' e me avise que ajusto no código.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('pcm_fotos','pcm_fotos', true)
  on conflict (id) do nothing;

drop policy if exists "pcm_fotos leitura" on storage.objects;
create policy "pcm_fotos leitura" on storage.objects
  for select to public using (bucket_id = 'pcm_fotos');

drop policy if exists "pcm_fotos envio" on storage.objects;
create policy "pcm_fotos envio" on storage.objects
  for insert to public with check (bucket_id = 'pcm_fotos');

drop policy if exists "pcm_fotos remove" on storage.objects;
create policy "pcm_fotos remove" on storage.objects
  for delete to public using (bucket_id = 'pcm_fotos');

-- =====================================================================
-- TODO(pcm) — evoluções já mapeadas (não fazem parte do MVP):
--   * pcm_planos: planos preventivos automáticos (periodicidade/horímetro
--     gerando OS).
--   * pcm_os_eventos: linha do tempo de mudança de status por usuário.
--   * dashboards de MTBF/MTTR.
--   * QR code por equipamento p/ operador abrir OS pelo celular.
--   * integração SAP.
--   * habilitar RLS por papel quando entrar auth.
-- =====================================================================

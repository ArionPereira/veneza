-- =====================================================================
-- PCM v2 (incremental) — usuários, histórico de status, campos novos na OS
-- NÃO recria as tabelas existentes. Rode UMA vez no SQL Editor do Supabase
-- (é idempotente). Pré-requisito: o schema PCM v1 já rodado.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1) Usuários do módulo (sem senha/Auth por ora)
-- ---------------------------------------------------------------------
create table if not exists pcm_usuarios (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  funcao    text,                      -- ex.: Mecânico, Eletricista, Supervisor, Operador
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists pcm_usuarios_ativo_idx on pcm_usuarios(ativo);

-- ---------------------------------------------------------------------
-- 2) Histórico de mudanças de status (timeline da OS)
-- ---------------------------------------------------------------------
create table if not exists pcm_os_status_historico (
  id           uuid primary key default gen_random_uuid(),
  os_id        uuid not null references pcm_ordens(id) on delete cascade,
  de_status    text,
  para_status  text not null,
  usuario_id   uuid references pcm_usuarios(id) on delete set null,
  usuario_nome text,                   -- snapshot p/ o histórico sobreviver a rename/exclusão
  em           timestamptz not null default now()
);
create index if not exists pcm_oshist_os_idx on pcm_os_status_historico(os_id);

-- ---------------------------------------------------------------------
-- 3) Campos novos na OS
--    - aberta_por_id / executante_id: FK p/ usuário (substituem o texto
--      livre na prática; mantemos 'solicitante' para o legado).
--    - planejada_para: data prevista de execução.
--    - prioridade: Baixa/Média/Alta (padrão Média).
-- ---------------------------------------------------------------------
alter table pcm_ordens add column if not exists aberta_por_id  uuid references pcm_usuarios(id) on delete set null;
alter table pcm_ordens add column if not exists executante_id  uuid references pcm_usuarios(id) on delete set null;
alter table pcm_ordens add column if not exists planejada_para date;
alter table pcm_ordens add column if not exists prioridade     text not null default 'media'
  check (prioridade in ('baixa','media','alta'));

create index if not exists pcm_os_aberta_idx     on pcm_ordens(aberta_em);
create index if not exists pcm_os_prioridade_idx on pcm_ordens(prioridade);

-- ---------------------------------------------------------------------
-- 4) Acesso anon (sem auth ainda) + realtime nas tabelas novas
-- ---------------------------------------------------------------------
grant select, insert, update, delete on pcm_usuarios, pcm_os_status_historico to anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['pcm_usuarios','pcm_os_status_historico'] loop
    if not exists (select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- =====================================================================
-- TODO(pcm): quando entrar Supabase Auth, ligar pcm_usuarios a auth.uid()
--            e habilitar RLS por papel. Por ora, sem senha.
-- =====================================================================

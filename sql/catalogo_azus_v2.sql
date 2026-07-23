-- =====================================================================
-- Loja Azus — log da sincronização automática do catálogo
-- Rode UMA vez no SQL Editor do Supabase (é idempotente, pode re-rodar).
-- Depende de sql/catalogo_azus_v1.sql já ter rodado antes.
--
-- A sincronização em si (buscar o catálogo Canva, comparar e atualizar
-- azus_produtos/azus_produto_cores) roda na Edge Function
-- supabase/functions/azus-sync-catalogo — aqui só fica o histórico de
-- execuções, pra mostrar "última sincronização" no painel Pedidos Azus.
-- =====================================================================

create table if not exists azus_sync_log (
  id            uuid primary key default gen_random_uuid(),
  executado_em  timestamptz not null default now(),
  ok            boolean not null default true,
  resumo        text,          -- texto curto pronto pra exibir ("2 preços atualizados, 1 produto novo")
  detalhes      jsonb,         -- {novos:[...], precos_alterados:[...], desativados:[...], erro:null}
  origem        text           -- 'cron' | 'manual'
);
create index if not exists azus_sync_log_executado_idx on azus_sync_log(executado_em desc);

-- Sem PII aqui (só resumo de mudança de catálogo) — pode ser lido como o
-- resto do catálogo. Só a Edge Function grava (service-role).
grant select on azus_sync_log to anon, authenticated;

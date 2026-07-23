-- =====================================================================
-- Loja Azus — suporte a múltiplas linhas de catálogo (Alfaiataria,
-- Bermudas/Malhas/Linhos, Sarjas/Tech — cada uma é um site Canva próprio).
-- Rode UMA vez no SQL Editor do Supabase (é idempotente, pode re-rodar).
-- Depende de sql/catalogo_azus_v1.sql já ter rodado antes.
--
-- Esta migração só adiciona a COLUNA azus_produtos.linha. Ela não cadastra
-- produto nenhum — quem faz isso é a função azus-sync-catalogo, que já lê
-- os 3 catálogos ao vivo e insere/atualiza produto, cor e preço sozinha
-- (rodando 1x por dia + botão "sincronizar agora" no painel interno).
-- Depois de rodar este SQL, basta reimplantar a função
-- (supabase functions deploy azus-sync-catalogo --no-verify-jwt) e rodar
-- uma sincronização pra ela trazer os produtos novos automaticamente —
-- sem precisar de mais nenhum SQL por causa de mudança no catálogo.
-- =====================================================================

alter table azus_produtos add column if not exists linha text not null default 'Alfaiataria';

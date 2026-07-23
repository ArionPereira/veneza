-- =====================================================================
-- Loja Azus — identificação do cliente (CNPJ/CPF) na entrada da loja.
-- Rode UMA vez no SQL Editor do Supabase (é idempotente, pode re-rodar).
-- Depende de sql/catalogo_azus_v1.sql (e v3, v4) já terem rodado antes.
--
-- Antes de ver o catálogo, o cliente agora informa nome, CNPJ/CPF e
-- contato (tela de identificação no início da loja) — fica guardado no
-- navegador dele (localStorage) e vai junto no pedido, pra vendedora
-- saber quem é o comprador antes mesmo de abrir o WhatsApp.
-- =====================================================================

alter table azus_pedidos add column if not exists cliente_documento text;

drop function if exists azus_criar_pedido(text,text,text,text,text,jsonb,numeric,numeric,text);

create or replace function azus_criar_pedido(
  p_cliente_nome      text,
  p_cliente_telefone  text,
  p_forma_pagamento   text,
  p_aviamento         text,
  p_observacoes       text,
  p_itens             jsonb,   -- [{produto_id, produto_nome, cor_codigo, cor_nome, tamanho, quantidade, preco_unit}, ...]
  p_ajuste_pagamento  numeric default 0,
  p_frete             numeric default 0,
  p_estado            text default null,
  p_cliente_documento text default null
)
returns table(id uuid, numero int, total numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_pedido_id uuid;
  v_numero    int;
  v_total     numeric(10,2) := 0;
  v_item      jsonb;
  v_qtd       int;
  v_preco     numeric(10,2);
begin
  if p_cliente_nome is null or length(btrim(p_cliente_nome)) = 0 then
    raise exception 'Nome do cliente é obrigatório';
  end if;
  if p_aviamento is null or length(btrim(p_aviamento)) = 0 then
    raise exception 'Escolha o aviamento (Azus ou Private Label)';
  end if;
  if p_itens is null or jsonb_array_length(p_itens) = 0 then
    raise exception 'Pedido sem itens';
  end if;

  insert into azus_pedidos (cliente_nome, cliente_telefone, cliente_documento, forma_pagamento, aviamento, observacoes, ajuste_pagamento, frete, estado)
  values (btrim(p_cliente_nome), p_cliente_telefone, p_cliente_documento, p_forma_pagamento, p_aviamento, p_observacoes, coalesce(p_ajuste_pagamento,0), coalesce(p_frete,0), p_estado)
  returning azus_pedidos.id, azus_pedidos.numero into v_pedido_id, v_numero;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_qtd   := coalesce((v_item->>'quantidade')::int, 1);
    v_preco := coalesce((v_item->>'preco_unit')::numeric, 0);
    insert into azus_pedido_itens (pedido_id, produto_id, produto_nome, cor_codigo, cor_nome, tamanho, quantidade, preco_unit, subtotal)
    values (
      v_pedido_id,
      nullif(v_item->>'produto_id','')::uuid,
      v_item->>'produto_nome',
      v_item->>'cor_codigo',
      v_item->>'cor_nome',
      nullif(v_item->>'tamanho','')::int,
      v_qtd,
      v_preco,
      v_qtd * v_preco
    );
    v_total := v_total + (v_qtd * v_preco);
  end loop;

  v_total := v_total + coalesce(p_ajuste_pagamento,0) + coalesce(p_frete,0);
  update azus_pedidos set total = v_total where azus_pedidos.id = v_pedido_id;

  return query select v_pedido_id, v_numero, v_total;
end $$;

grant execute on function azus_criar_pedido(text,text,text,text,text,jsonb,numeric,numeric,text,text) to anon, authenticated;

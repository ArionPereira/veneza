-- =====================================================================
-- Loja Azus — aviamento obrigatório no pedido (Azus / Private Label)
-- Rode UMA vez no SQL Editor do Supabase (é idempotente, pode re-rodar).
-- Depende de sql/catalogo_azus_v1.sql já ter rodado antes.
--
-- Troca a função azus_criar_pedido pra receber também o aviamento
-- escolhido (o cálculo do acréscimo do Private Label — mínimo de 10
-- peças por cor ou +R$3,00/peça — é feito no client, em Carrinho.jsx,
-- antes de chamar essa função; aqui só grava o que já veio calculado).
-- =====================================================================

alter table azus_pedidos add column if not exists aviamento text;

drop function if exists azus_criar_pedido(text, text, text, text, jsonb);

create or replace function azus_criar_pedido(
  p_cliente_nome     text,
  p_cliente_telefone text,
  p_forma_pagamento  text,
  p_aviamento        text,
  p_observacoes      text,
  p_itens            jsonb   -- [{produto_id, produto_nome, cor_codigo, cor_nome, tamanho, quantidade, preco_unit}, ...]
                              -- preco_unit já vem com o acréscimo do Private Label aplicado, se for o caso
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

  insert into azus_pedidos (cliente_nome, cliente_telefone, forma_pagamento, aviamento, observacoes)
  values (btrim(p_cliente_nome), p_cliente_telefone, p_forma_pagamento, p_aviamento, p_observacoes)
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

  update azus_pedidos set total = v_total where azus_pedidos.id = v_pedido_id;

  return query select v_pedido_id, v_numero, v_total;
end $$;

grant execute on function azus_criar_pedido(text,text,text,text,text,jsonb) to anon, authenticated;

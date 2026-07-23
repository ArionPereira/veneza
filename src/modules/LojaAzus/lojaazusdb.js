// Camada de acesso ao Supabase para a Loja Azus (vitrine pública).
// Reaproveita o mesmo cliente `sb` do resto do Ambiente Veneza.
import { sb } from "../../db.js";

async function ok(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}

// Catálogo: produtos ativos, com fotos e cores já aninhadas, agrupados
// por linha (Alfaiataria / Bermudas, Malhas e Linhos / Sarjas e Tech).
export const listarProdutos = () =>
  ok(sb.from("azus_produtos")
    .select("*, fotos:azus_produto_fotos(*), cores:azus_produto_cores(*)")
    .eq("ativo", true)
    .order("linha").order("ordem"))
  .then(produtos => produtos.map(p => ({
    ...p,
    fotos: (p.fotos || []).sort((a, b) => a.ordem - b.ordem),
    cores: (p.cores || []).sort((a, b) => a.ordem - b.ordem),
  })));

// Cria o pedido + itens de forma atômica via RPC (o anon não tem select
// direto nas tabelas de pedido — ver sql/catalogo_azus_v1.sql).
export const criarPedido = ({ clienteNome, clienteTelefone, formaPagamento, aviamento, observacoes, itens, ajustePagamento, frete, estado }) =>
  ok(sb.rpc("azus_criar_pedido", {
    p_cliente_nome: clienteNome,
    p_cliente_telefone: clienteTelefone || null,
    p_forma_pagamento: formaPagamento || null,
    p_aviamento: aviamento,
    p_observacoes: observacoes || null,
    p_itens: itens.map(it => ({
      produto_id: it.produtoId,
      produto_nome: it.produtoNome,
      cor_codigo: it.corCodigo || null,
      cor_nome: it.corNome || null,
      tamanho: it.tamanho || null,
      quantidade: it.quantidade,
      preco_unit: it.precoUnit,
    })),
    p_ajuste_pagamento: ajustePagamento || 0,
    p_frete: frete || 0,
    p_estado: estado || null,
  })).then(rows => rows[0]);

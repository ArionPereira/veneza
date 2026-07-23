import { brl } from "../../constants.js";

// Número da vendedora (Azus) que recebe os pré-pedidos pelo WhatsApp.
export const NUMERO_WHATSAPP_VENDEDORA = "5545999663050";

export function montarMensagem({ numero, clienteNome, clienteTelefone, formaPagamento, aviamento, observacoes, itens, subtotalProdutos, ajustePagamento, frete, total }) {
  const linhas = [];
  linhas.push("🛍️ *Novo pré-pedido — Loja Azus*");
  if (numero) linhas.push("Pedido #" + numero);
  linhas.push("");
  linhas.push("*Cliente:* " + clienteNome);
  if (clienteTelefone) linhas.push("*Telefone:* " + clienteTelefone);
  linhas.push("");
  linhas.push("*Itens:*");
  itens.forEach((it, i) => {
    const partes = [it.produtoNome];
    if (it.corNome) partes.push("cor " + (it.corCodigo ? it.corCodigo + " " : "") + it.corNome);
    if (it.tamanho) partes.push("tam. " + it.tamanho);
    partes.push(it.quantidade + " un.");
    partes.push(brl(it.precoUnit) + " = " + brl(it.precoUnit * it.quantidade));
    linhas.push((i + 1) + ". " + partes.join(" — "));
  });
  linhas.push("");
  if (subtotalProdutos != null) linhas.push("Subtotal produtos: " + brl(subtotalProdutos));
  if (ajustePagamento) linhas.push((ajustePagamento < 0 ? "Desconto" : "Acréscimo") + " " + formaPagamento + ": " + (ajustePagamento < 0 ? "−" : "+") + brl(Math.abs(ajustePagamento)));
  if (frete) linhas.push("Frete: " + brl(frete));
  linhas.push("*Total:* " + brl(total));
  if (formaPagamento) linhas.push("*Forma de pagamento:* " + formaPagamento);
  if (aviamento) linhas.push("*Aviamento:* " + aviamento);
  if (observacoes) { linhas.push(""); linhas.push("*Observações:* " + observacoes); }
  return linhas.join("\n");
}

export function abrirWhatsapp(mensagem) {
  const url = "https://wa.me/" + NUMERO_WHATSAPP_VENDEDORA + "?text=" + encodeURIComponent(mensagem);
  window.open(url, "_blank");
}

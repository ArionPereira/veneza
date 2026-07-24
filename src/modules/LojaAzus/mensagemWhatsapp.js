import { brl } from "../../constants.js";
import { agruparPorProduto } from "./agruparPedido.js";
import { nomeCor } from "./azusTheme.js";

// Número da representante (Azus) que recebe os pré-pedidos pelo WhatsApp.
export const NUMERO_WHATSAPP_VENDEDORA = "5545999663050";

export const PRAZO_BOLETO = "Boleto em 30, 60, 90 e 120 dias a partir da data do faturamento.";

export function montarMensagem({ numero, clienteNome, clienteDocumento, clienteTelefone, formaPagamento, aviamento, estado, observacoes, itens, subtotalProdutos, acrescimoAviamento, ajustePagamento, frete, total }) {
  const linhas = [];
  linhas.push("🛍️ *Novo pré-pedido — Loja Azus*");
  if (numero) linhas.push("Pedido #" + numero);
  linhas.push("");
  linhas.push("*Cliente:* " + clienteNome);
  if (clienteDocumento) linhas.push("*CNPJ/CPF:* " + clienteDocumento);
  if (clienteTelefone) linhas.push("*Telefone:* " + clienteTelefone);
  if (estado) linhas.push("*Estado:* " + estado);
  linhas.push("");

  linhas.push("*Itens:*");
  const grupos = agruparPorProduto(itens);
  grupos.forEach(g => {
    linhas.push("");
    linhas.push("*" + g.produtoNome.toUpperCase() + "*");
    g.cores.forEach(c => {
      const partes = c.linhas.map(l => "tam. " + l.tamanho + " (" + l.quantidade + " un.)");
      linhas.push(nomeCor(c.corNome) + ": " + partes.join(", "));
    });
    linhas.push("Subtotal: " + brl(g.subtotal) + " (" + g.totalPecas + " peça(s))");
  });

  linhas.push("");
  linhas.push("*Resumo:*");
  linhas.push("Valor dos produtos: " + brl(subtotalProdutos));
  if (acrescimoAviamento) linhas.push("Acréscimo aviamento (" + aviamento + "): +" + brl(acrescimoAviamento));
  if (ajustePagamento) linhas.push((ajustePagamento < 0 ? "Desconto" : "Acréscimo") + " " + formaPagamento + ": " + (ajustePagamento < 0 ? "−" : "+") + brl(Math.abs(ajustePagamento)));
  if (frete) linhas.push("Frete: " + brl(frete));
  linhas.push("*Total:* " + brl(total));
  linhas.push("");
  if (formaPagamento) linhas.push("*Forma de pagamento:* " + formaPagamento);
  if (formaPagamento === "Boleto") linhas.push(PRAZO_BOLETO);
  if (aviamento) linhas.push("*Aviamento:* " + aviamento);
  if (observacoes) { linhas.push(""); linhas.push("*Observações:* " + observacoes); }
  return linhas.join("\n");
}

export function abrirWhatsapp(mensagem) {
  const url = "https://wa.me/" + NUMERO_WHATSAPP_VENDEDORA + "?text=" + encodeURIComponent(mensagem);
  window.open(url, "_blank");
}

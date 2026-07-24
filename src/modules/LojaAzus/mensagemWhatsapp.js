import { brl } from "../../constants.js";
import { agruparPorProduto } from "./agruparPedido.js";
import { nomeCor } from "./azusTheme.js";

// Número da representante (Azus) que recebe os pré-pedidos pelo WhatsApp.
export const NUMERO_WHATSAPP_VENDEDORA = "5545999663050";

export const PRAZO_BOLETO = "Boleto em 30, 60, 90 e 120 dias a partir da data do faturamento.";

const DIVISOR = "━━━━━━━━━━━━━━━";

export function montarMensagem({ numero, clienteNome, clienteDocumento, clienteTelefone, formaPagamento, aviamento, estado, observacoes, itens, subtotalProdutos, acrescimoAviamento, ajustePagamento, frete, total }) {
  const grupos = agruparPorProduto(itens);
  const totalPecas = grupos.reduce((s, g) => s + g.totalPecas, 0);

  const linhas = [];
  linhas.push("🛍️ *NOVO PRÉ-PEDIDO — LOJA AZUS*");
  if (numero) linhas.push("*Pedido #" + numero + "*");
  linhas.push("");
  linhas.push("👤 *Cliente:* " + clienteNome);
  if (clienteDocumento) linhas.push("🪪 *CNPJ/CPF:* " + clienteDocumento);
  if (clienteTelefone) linhas.push("📱 *Telefone:* " + clienteTelefone);
  if (estado) linhas.push("📍 *Estado:* " + estado);
  linhas.push("");

  linhas.push("📦 *ITENS* — " + totalPecas + " peça(s)");
  linhas.push("_formato: tamanho (quantidade)_");
  grupos.forEach(g => {
    linhas.push(DIVISOR);
    linhas.push("*" + g.produtoNome.toUpperCase() + "*");
    g.cores.forEach(c => {
      const partes = [...c.linhas]
        .sort((a, b) => (a.tamanho || 0) - (b.tamanho || 0))
        .map(l => l.tamanho + " (" + l.quantidade + ")");
      linhas.push("• " + nomeCor(c.corNome) + ": " + partes.join("  "));
    });
    linhas.push("_" + g.totalPecas + " peça(s) · " + brl(g.subtotal) + "_");
  });
  linhas.push(DIVISOR);

  linhas.push("");
  linhas.push("💰 *RESUMO*");
  linhas.push("Valor dos produtos: " + brl(subtotalProdutos));
  if (acrescimoAviamento) linhas.push("Acréscimo aviamento (" + aviamento + "): +" + brl(acrescimoAviamento));
  if (ajustePagamento) linhas.push((ajustePagamento < 0 ? "Desconto" : "Acréscimo") + " " + formaPagamento + ": " + (ajustePagamento < 0 ? "−" : "+") + brl(Math.abs(ajustePagamento)));
  linhas.push("Frete" + (estado ? " (" + estado + ")" : "") + ": " + (frete ? brl(frete) : "Grátis 🎉"));
  linhas.push("*TOTAL: " + brl(total) + "*");
  linhas.push("");
  if (formaPagamento) linhas.push("💳 *Pagamento:* " + formaPagamento);
  if (formaPagamento === "Boleto") linhas.push("_" + PRAZO_BOLETO + "_");
  if (aviamento) linhas.push("🧵 *Aviamento:* " + aviamento);
  if (observacoes) linhas.push("📝 *Observações:* " + observacoes);
  return linhas.join("\n");
}

export function abrirWhatsapp(mensagem) {
  const url = "https://wa.me/" + NUMERO_WHATSAPP_VENDEDORA + "?text=" + encodeURIComponent(mensagem);
  window.open(url, "_blank");
}

import React from "react";
import { SERIF, brl } from "../../constants.js";
import { AZ as C } from "./azusTheme.js";
import { agruparPorProduto } from "./agruparPedido.js";
import { PRAZO_BOLETO } from "./mensagemWhatsapp.js";

// Recibo pensado pra impressão/"salvar como PDF" (Ctrl+P / compartilhar
// no celular) — fica invisível na tela normal e só aparece quando o
// navegador entra em modo de impressão (ver <style> abaixo).
export function Recibo({ pedido }) {
  if (!pedido) return null;
  const { numero, clienteNome, clienteTelefone, formaPagamento, aviamento, estado, observacoes, itens, subtotalProdutos, acrescimoAviamento, ajustePagamento, frete, total, data } = pedido;
  const grupos = agruparPorProduto(itens);

  return (
    <div className="azus-recibo-print" style={{ display: "none" }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .azus-recibo-print, .azus-recibo-print * { visibility: visible; }
          .azus-recibo-print { display: block !important; position: absolute; top: 0; left: 0; width: 100%; padding: 24px; }
        }
      `}</style>
      <div style={{ fontFamily: SERIF, fontSize: 22, color: C.brand, fontWeight: 700 }}>Alfaiataria Azus</div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>Comprovante de pré-pedido — Pedido #{numero}</div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>{data}</div>

      <table style={{ width: "100%", fontSize: 11, color: "#666", marginBottom: 16 }}><tbody>
        <tr><td style={{ padding: "2px 0", width: 110 }}>Cliente</td><td>{clienteNome}</td></tr>
        {clienteTelefone && <tr><td style={{ padding: "2px 0" }}>Telefone</td><td>{clienteTelefone}</td></tr>}
        {estado && <tr><td style={{ padding: "2px 0" }}>Estado</td><td>{estado}</td></tr>}
        <tr><td style={{ padding: "2px 0" }}>Forma de pagamento</td><td>{formaPagamento}{formaPagamento === "Boleto" ? " — " + PRAZO_BOLETO : ""}</td></tr>
        <tr><td style={{ padding: "2px 0" }}>Aviamento</td><td>{aviamento}</td></tr>
        {observacoes && <tr><td style={{ padding: "2px 0" }}>Observações</td><td>{observacoes}</td></tr>}
      </tbody></table>

      {grupos.map((g, gi) => (
        <div key={gi} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.brand, borderBottom: "1px solid #ccc", padding: "4px 0" }}>{g.produtoNome}</div>
          {g.cores.map((c, ci) => (
            <div key={ci} style={{ fontSize: 12, padding: "3px 0" }}>
              <b>{c.corNome}:</b> {c.linhas.map(l => "tam. " + l.tamanho + " (" + l.quantidade + " un.)").join(", ")}
            </div>
          ))}
          <div style={{ fontSize: 12, textAlign: "right", color: "#444" }}>Subtotal: {brl(g.subtotal)} ({g.totalPecas} peça(s))</div>
        </div>
      ))}

      <div style={{ marginTop: 14, textAlign: "right", fontSize: 12, color: "#444" }}>
        <div>Valor dos produtos: {brl(subtotalProdutos)}</div>
        {!!acrescimoAviamento && <div>Acréscimo aviamento ({aviamento}): +{brl(acrescimoAviamento)}</div>}
        {!!ajustePagamento && <div>{ajustePagamento < 0 ? "Desconto" : "Acréscimo"} {formaPagamento}: {ajustePagamento < 0 ? "−" : "+"}{brl(Math.abs(ajustePagamento))}</div>}
        {!!frete && <div>Frete: {brl(frete)}</div>}
        <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginTop: 4 }}>Total: {brl(total)}</div>
      </div>

      <div style={{ marginTop: 24, fontSize: 10.5, color: "#999" }}>
        Este é um comprovante do pré-pedido enviado pela Loja Azus. O pedido é confirmado após contato da vendedora.
      </div>
    </div>
  );
}

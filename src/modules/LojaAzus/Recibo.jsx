import React from "react";
import { brl } from "../../constants.js";
import { AZ as C, BEBAS, logoAzus, nomeCor } from "./azusTheme.js";
import { agruparPorProduto } from "./agruparPedido.js";
import { PRAZO_BOLETO } from "./mensagemWhatsapp.js";

// Grade fixa de tamanhos da Azus (mesma da tela de produto).
const TAMANHOS = [38, 40, 42, 44, 46, 48, 50, 52];

const th = { border: "1px solid #B8C2CE", padding: "5px 6px", fontSize: 10, background: "#EAF0F7", color: "#09294d", textAlign: "center", fontWeight: 700 };
const td = { border: "1px solid #B8C2CE", padding: "5px 6px", fontSize: 10.5, textAlign: "center", color: "#1a1a1a" };

// Recibo pensado pra impressão/"salvar como PDF" (Ctrl+P / compartilhar
// no celular) — fica invisível na tela normal e só aparece quando o
// navegador entra em modo de impressão (ver <style> abaixo). O corpo é
// uma grade de pedido no formato de atacado: uma linha por produto/cor,
// uma coluna por tamanho (38–52), com totais por linha e o resumo
// financeiro discriminado no fim.
export function Recibo({ pedido }) {
  if (!pedido) return null;
  const { numero, clienteNome, clienteDocumento, clienteTelefone, formaPagamento, aviamento, estado, observacoes, itens, subtotalProdutos, acrescimoAviamento, ajustePagamento, frete, total, data } = pedido;
  const grupos = agruparPorProduto(itens);
  const logo = logoAzus();

  const totalPecas = grupos.reduce((s, g) => s + g.totalPecas, 0);

  // Uma linha da grade por (produto, cor): mapa tamanho→quantidade,
  // preço unitário da cor (pode variar por cor — acréscimo Private
  // Label é por cor) e subtotal da linha.
  const linhasGrade = grupos.flatMap(g =>
    g.cores.map((c, ci) => {
      const porTamanho = {};
      for (const l of c.linhas) porTamanho[l.tamanho] = (porTamanho[l.tamanho] || 0) + l.quantidade;
      const precoUnit = c.linhas[0]?.precoUnit || 0;
      const subtotal = c.linhas.reduce((s, l) => s + l.precoUnit * l.quantidade, 0);
      return { produtoNome: g.produtoNome, primeiraDoProduto: ci === 0, qtdCores: g.cores.length, corNome: c.corNome, porTamanho, totalPecas: c.totalPecas, precoUnit, subtotal };
    }));

  return (
    <div className="azus-recibo-print" style={{ display: "none" }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .azus-recibo-print, .azus-recibo-print * { visibility: visible; }
          .azus-recibo-print { display: block !important; position: absolute; top: 0; left: 0; width: 100%; padding: 20px; }
          .azus-recibo-print table { page-break-inside: auto; }
          .azus-recibo-print tr { page-break-inside: avoid; }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderBottom: "3px solid " + C.brand, paddingBottom: 10, marginBottom: 12 }}>
        <div>
          {logo
            ? <img src={logo} alt="Azus Menswear" style={{ height: 36 }} />
            : <div style={{ fontFamily: BEBAS, fontSize: 28, color: C.brand, letterSpacing: .5 }}>AZUS MENSWEAR</div>}
          <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>Comprovante de pré-pedido</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: BEBAS, fontSize: 22, color: C.brand }}>PEDIDO #{numero}</div>
          <div style={{ fontSize: 10.5, color: "#666" }}>{data}</div>
        </div>
      </div>

      <table style={{ width: "100%", fontSize: 10.5, color: "#333", marginBottom: 14, borderCollapse: "collapse" }}><tbody>
        <tr>
          <td style={{ padding: "2px 0", width: "50%" }}><b>Cliente:</b> {clienteNome}</td>
          <td style={{ padding: "2px 0" }}><b>CNPJ/CPF:</b> {clienteDocumento || "—"}</td>
        </tr>
        <tr>
          <td style={{ padding: "2px 0" }}><b>Telefone:</b> {clienteTelefone || "—"}</td>
          <td style={{ padding: "2px 0" }}><b>Estado:</b> {estado || "—"}</td>
        </tr>
        <tr>
          <td style={{ padding: "2px 0" }}><b>Pagamento:</b> {formaPagamento}</td>
          <td style={{ padding: "2px 0" }}><b>Aviamento:</b> {aviamento}</td>
        </tr>
      </tbody></table>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 4 }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: "left" }}>Produto</th>
            <th style={{ ...th, textAlign: "left" }}>Cor</th>
            {TAMANHOS.map(t => <th key={t} style={{ ...th, width: 30 }}>{t}</th>)}
            <th style={th}>Peças</th>
            <th style={th}>Unit.</th>
            <th style={th}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {linhasGrade.map((linha, i) => (
            <tr key={i}>
              {linha.primeiraDoProduto && (
                <td rowSpan={linha.qtdCores} style={{ ...td, textAlign: "left", fontWeight: 700, verticalAlign: "top", background: "#F7F9FC" }}>
                  {linha.produtoNome}
                </td>
              )}
              <td style={{ ...td, textAlign: "left" }}>{nomeCor(linha.corNome)}</td>
              {TAMANHOS.map(t => (
                <td key={t} style={{ ...td, fontWeight: linha.porTamanho[t] ? 700 : 400, color: linha.porTamanho[t] ? "#09294d" : "#C4CDD7" }}>
                  {linha.porTamanho[t] || "·"}
                </td>
              ))}
              <td style={{ ...td, fontWeight: 700 }}>{linha.totalPecas}</td>
              <td style={td}>{brl(linha.precoUnit)}</td>
              <td style={{ ...td, fontWeight: 700 }}>{brl(linha.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 10, color: "#666", marginBottom: 14 }}>Total de peças no pedido: <b>{totalPecas}</b></div>

      <table style={{ borderCollapse: "collapse", marginLeft: "auto", minWidth: 280 }}><tbody>
        <tr>
          <td style={{ padding: "3px 14px 3px 0", fontSize: 11, color: "#444" }}>Valor dos produtos</td>
          <td style={{ padding: "3px 0", fontSize: 11, color: "#444", textAlign: "right" }}>{brl(subtotalProdutos)}</td>
        </tr>
        {!!acrescimoAviamento && (
          <tr>
            <td style={{ padding: "3px 14px 3px 0", fontSize: 11, color: "#444" }}>Acréscimo aviamento ({aviamento})</td>
            <td style={{ padding: "3px 0", fontSize: 11, color: "#444", textAlign: "right" }}>+{brl(acrescimoAviamento)}</td>
          </tr>
        )}
        {!!ajustePagamento && (
          <tr>
            <td style={{ padding: "3px 14px 3px 0", fontSize: 11, color: "#444" }}>{ajustePagamento < 0 ? "Desconto" : "Acréscimo"} {formaPagamento}</td>
            <td style={{ padding: "3px 0", fontSize: 11, color: "#444", textAlign: "right" }}>{ajustePagamento < 0 ? "−" : "+"}{brl(Math.abs(ajustePagamento))}</td>
          </tr>
        )}
        <tr>
          <td style={{ padding: "3px 14px 3px 0", fontSize: 11, color: "#444" }}>Frete{estado ? " (" + estado + ")" : ""}</td>
          <td style={{ padding: "3px 0", fontSize: 11, color: "#444", textAlign: "right" }}>{frete ? brl(frete) : "Grátis"}</td>
        </tr>
        <tr>
          <td style={{ padding: "6px 14px 3px 0", fontSize: 14, fontWeight: 700, color: C.brand, borderTop: "2px solid " + C.brand }}>TOTAL</td>
          <td style={{ padding: "6px 0 3px", fontSize: 14, fontWeight: 700, color: C.brand, textAlign: "right", borderTop: "2px solid " + C.brand }}>{brl(total)}</td>
        </tr>
      </tbody></table>

      {formaPagamento === "Boleto" && (
        <div style={{ marginTop: 12, fontSize: 10.5, color: "#444" }}>ℹ️ {PRAZO_BOLETO}</div>
      )}
      {observacoes && (
        <div style={{ marginTop: 8, fontSize: 10.5, color: "#444" }}><b>Observações:</b> {observacoes}</div>
      )}

      <div style={{ marginTop: 22, fontSize: 9.5, color: "#999", borderTop: "1px solid #ddd", paddingTop: 8 }}>
        Este é um comprovante do pré-pedido enviado pela Loja Azus. O pedido é confirmado após contato da representante.
      </div>
    </div>
  );
}

import React from "react";
const { useState } = React;
import { brl } from "../../constants.js";
import { AZ as C, BEBAS, nomeCor } from "./azusTheme.js";

// A Azus produz todos os modelos do 38 ao 52, mesmo quando o catálogo
// original só lista uma faixa menor pra uma cor específica.
const TAMANHOS = [38, 40, 42, 44, 46, 48, 50, 52];

// "imediato" (em qualquer grafia) é entrega normal; qualquer outra coisa
// (data, mês, "sob consulta"...) é produção programada — destaca a linha.
function producaoProgramada(cor) {
  if (!cor.entrega) return false;
  return cor.entrega.trim().toLowerCase() !== "imediato";
}

const inputCel = { width: 52, textAlign: "center", border: "1px solid " + C.line, borderRadius: 6, padding: "6px 2px", fontSize: 13.5, background: C.paper, color: C.ink };

// Só a primeira letra ("imediato" → "Imediato"); datas e frases longas
// ficam como estão no catálogo.
const rotuloEntrega = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function ProdutoDetalhe({ produto, onVoltar, onAdicionarVarios }) {
  const [qtds, setQtds] = useState({}); // { [corId]: { [tamanho]: quantidade } }
  const [aviso, setAviso] = useState("");

  const precoUnit = produto.preco_varejo != null
    ? produto.preco_varejo
    : (produto.preco_atacado && produto.preco_atacado[0] ? produto.preco_atacado[0].preco : 0);

  const setQtd = (corId, tamanho, valor) => {
    const n = Math.max(0, parseInt(valor, 10) || 0);
    setQtds(q => ({ ...q, [corId]: { ...(q[corId] || {}), [tamanho]: n } }));
  };

  const totalLinha = (corId) => Object.values(qtds[corId] || {}).reduce((s, n) => s + n, 0);
  const totalPecas = produto.cores.reduce((s, c) => s + totalLinha(c.id), 0);
  const totalValor = totalPecas * precoUnit;

  const adicionar = () => {
    const itens = [];
    for (const cor of produto.cores) {
      const linha = qtds[cor.id] || {};
      for (const [tamanho, quantidade] of Object.entries(linha)) {
        if (quantidade > 0) {
          itens.push({
            produtoId: produto.id,
            produtoNome: produto.nome,
            corCodigo: cor.codigo,
            corNome: cor.nome,
            tamanho: parseInt(tamanho, 10),
            quantidade,
            precoUnit,
          });
        }
      }
    }
    if (!itens.length) { setAviso("Informe a quantidade em pelo menos uma cor/tamanho."); return; }
    setAviso("");
    onAdicionarVarios(itens);
  };

  return (
    <div>
      <button onClick={onVoltar} style={{ background: "transparent", border: "none", color: C.brand, fontSize: 13.5, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 14 }}>← Voltar ao catálogo</button>

      {produto.codigo && <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 2 }}>Código {produto.codigo}</div>}
      <h1 style={{ fontFamily: BEBAS, fontSize: 34, margin: "0 0 4px", color: C.brand, letterSpacing: .3 }}>{produto.nome}</h1>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.ink, marginBottom: 10 }}>
        {produto.preco_varejo != null ? brl(produto.preco_varejo) : "sob consulta"}
      </div>
      {produto.descricao && <p style={{ fontSize: 14.5, color: C.ink, lineHeight: 1.55, margin: "0 0 12px" }}>{produto.descricao}</p>}
      {produto.composicao && <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 10px" }}>Composição: {produto.composicao}</p>}
      {produto.producao_limitada && (
        <div style={{ background: "#FBEFC9", color: C.ink, borderRadius: 8, padding: "9px 12px", fontSize: 12.5, marginBottom: 14 }}>⚠ {produto.producao_limitada}</div>
      )}

      {produto.preco_atacado && produto.preco_atacado.length > 0 && (
        <div style={{ background: C.sage, borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: C.brand, fontWeight: 700, marginBottom: 6 }}>Preço por atacado</div>
          {produto.preco_atacado.map((f, i) => (
            <div key={i} style={{ fontSize: 13, color: C.ink }}>
              {f.min === 1 ? "Compra livre" : "+" + f.min + " peças"}: <b>{brl(f.preco)}</b>
            </div>
          ))}
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>Preço final por faixa de quantidade é confirmado com a representante.</div>
        </div>
      )}

      {produto.cores.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.brand, marginBottom: 8 }}>Escolha as cores e quantidades</div>
          <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 8 }}>
            <span style={{ background: "#FBEFC9", padding: "1px 6px", borderRadius: 4 }}>destacado</span> = produção programada, entrega não é imediata
          </div>
          <div style={{ overflowX: "auto", border: "1px solid " + C.line, borderRadius: 10 }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.sage }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", position: "sticky", left: 0, background: C.sage, whiteSpace: "nowrap" }}>Cor</th>
                  {TAMANHOS.map(t => <th key={t} style={{ padding: "8px 6px", fontWeight: 700, color: C.brand }}>{t}</th>)}
                  <th style={{ padding: "8px 10px", fontWeight: 700, color: C.brand }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {produto.cores.map(cor => {
                  const programada = producaoProgramada(cor);
                  return (
                    <tr key={cor.id} style={{ borderTop: "1px solid " + C.line, background: programada ? "#FBEFC9" : "transparent" }}>
                      <td style={{ padding: "6px 10px", whiteSpace: "nowrap", position: "sticky", left: 0, background: programada ? "#FBEFC9" : C.card, fontWeight: 600 }}>
                        {nomeCor(cor.nome)}
                        {(cor.entrega || cor.observacao) && (
                          <div style={{ fontSize: 10.5, color: programada ? "#8A6D00" : C.muted, fontWeight: programada ? 700 : 400 }}>
                            {programada && "📅 "}{rotuloEntrega(cor.entrega)}{cor.observacao ? (cor.entrega ? " · " : "") + cor.observacao : ""}
                          </div>
                        )}
                      </td>
                      {TAMANHOS.map(t => (
                        <td key={t} style={{ padding: "4px 4px", textAlign: "center" }}>
                          <input type="number" min="0" inputMode="numeric" value={qtds[cor.id]?.[t] || ""} placeholder="0"
                            onChange={e => setQtd(cor.id, t, e.target.value)} style={inputCel} />
                        </td>
                      ))}
                      <td style={{ padding: "4px 10px", textAlign: "center", fontWeight: 700 }}>{totalLinha(cor.id) || ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {produto.cores.length === 0 && (
        <div style={{ marginTop: 20, color: C.muted, fontSize: 13 }}>Sem cores cadastradas pra esse modelo no momento.</div>
      )}

      {produto.cores.length > 0 && (
        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14 }}>
            <b>{totalPecas}</b> peça(s) · <b>{brl(totalValor)}</b>
          </div>
          {aviso && <div style={{ color: C.clay, fontSize: 13 }}>{aviso}</div>}
          <button onClick={adicionar} style={{ marginLeft: "auto", background: C.brand, color: "#fff", border: "none", borderRadius: 10, padding: "12px 22px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            Adicionar ao carrinho
          </button>
        </div>
      )}
    </div>
  );
}

import React from "react";
const { useState, useMemo } = React;
import { C, SERIF, SH, brl } from "../../constants.js";

// Uma coluna de tamanho por número par entre o menor e o maior tamanho
// entre TODAS as cores do produto (cada cor habilita só a faixa dela).
function tamanhosDoProduto(cores) {
  const comFaixa = cores.filter(c => c.tamanho_min != null && c.tamanho_max != null);
  if (!comFaixa.length) return [];
  const min = Math.min(...comFaixa.map(c => c.tamanho_min));
  const max = Math.max(...comFaixa.map(c => c.tamanho_max));
  const out = [];
  for (let t = min; t <= max; t += 2) out.push(t);
  return out;
}

const inputCel = { width: 52, textAlign: "center", border: "1px solid " + C.line, borderRadius: 6, padding: "6px 2px", fontSize: 13.5, background: C.paper, color: C.ink };

export function ProdutoDetalhe({ produto, onVoltar, onAdicionarVarios }) {
  const [fotoIdx, setFotoIdx] = useState(0);
  const [qtds, setQtds] = useState({}); // { [corId]: { [tamanho]: quantidade } }
  const [aviso, setAviso] = useState("");

  const tamanhos = useMemo(() => tamanhosDoProduto(produto.cores), [produto.cores]);
  const semFaixaDeTamanho = produto.cores.filter(c => c.tamanho_min == null || c.tamanho_max == null);

  const precoUnit = produto.preco_varejo != null
    ? produto.preco_varejo
    : (produto.preco_atacado && produto.preco_atacado[0] ? produto.preco_atacado[0].preco : 0);

  const foto = produto.fotos[fotoIdx];

  const setQtd = (corId, tamanhoChave, valor) => {
    const n = Math.max(0, parseInt(valor, 10) || 0);
    setQtds(q => ({ ...q, [corId]: { ...(q[corId] || {}), [tamanhoChave]: n } }));
  };

  const totalLinha = (corId) => Object.values(qtds[corId] || {}).reduce((s, n) => s + n, 0);
  const totalPecas = produto.cores.reduce((s, c) => s + totalLinha(c.id), 0);
  const totalValor = totalPecas * precoUnit;

  const adicionar = () => {
    const itens = [];
    for (const cor of produto.cores) {
      const linha = qtds[cor.id] || {};
      for (const [tamanhoChave, quantidade] of Object.entries(linha)) {
        if (quantidade > 0) {
          itens.push({
            produtoId: produto.id,
            produtoNome: produto.nome,
            corCodigo: cor.codigo,
            corNome: cor.nome,
            tamanho: tamanhoChave === "unico" ? null : parseInt(tamanhoChave, 10),
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

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 20 }}>
        <div>
          <div style={{ aspectRatio: "3/4", background: C.sage, borderRadius: 14, overflow: "hidden", border: "1px solid " + C.line }}>
            {foto
              ? <img src={foto.url} alt={produto.nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.muted }}>sem foto</div>}
          </div>
          {produto.fotos.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginTop: 8, overflowX: "auto" }}>
              {produto.fotos.map((f, i) => (
                <button key={f.id} onClick={() => setFotoIdx(i)} style={{
                  width: 56, height: 74, flex: "0 0 auto", borderRadius: 8, overflow: "hidden", padding: 0, cursor: "pointer",
                  border: "2px solid " + (i === fotoIdx ? C.brand : C.line),
                }}>
                  <img src={f.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 style={{ fontFamily: SERIF, fontSize: 24, margin: "0 0 6px", color: C.brand, fontWeight: 700 }}>{produto.nome}</h1>
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
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>Preço final por faixa de quantidade é confirmado com a vendedora.</div>
            </div>
          )}
        </div>
      </div>

      {tamanhos.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.brand, marginBottom: 8 }}>Escolha as cores e quantidades</div>
          <div style={{ overflowX: "auto", border: "1px solid " + C.line, borderRadius: 10 }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.sage }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", position: "sticky", left: 0, background: C.sage, whiteSpace: "nowrap" }}>Cor</th>
                  {tamanhos.map(t => <th key={t} style={{ padding: "8px 6px", fontWeight: 700, color: C.brand }}>{t}</th>)}
                  <th style={{ padding: "8px 10px", fontWeight: 700, color: C.brand }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {produto.cores.filter(c => c.tamanho_min != null && c.tamanho_max != null).map(cor => (
                  <tr key={cor.id} style={{ borderTop: "1px solid " + C.line }}>
                    <td style={{ padding: "6px 10px", whiteSpace: "nowrap", position: "sticky", left: 0, background: C.card }}>
                      {cor.codigo} - {cor.nome}
                      {(cor.entrega || cor.observacao) && (
                        <div style={{ fontSize: 10.5, color: C.muted }}>{cor.entrega}{cor.observacao ? (cor.entrega ? " · " : "") + cor.observacao : ""}</div>
                      )}
                    </td>
                    {tamanhos.map(t => {
                      const habilitado = t >= cor.tamanho_min && t <= cor.tamanho_max;
                      return (
                        <td key={t} style={{ padding: "4px 4px", textAlign: "center" }}>
                          {habilitado
                            ? <input type="number" min="0" inputMode="numeric" value={qtds[cor.id]?.[t] || ""} placeholder="0"
                                onChange={e => setQtd(cor.id, t, e.target.value)} style={inputCel} />
                            : <span style={{ color: C.line }}>—</span>}
                        </td>
                      );
                    })}
                    <td style={{ padding: "4px 10px", textAlign: "center", fontWeight: 700 }}>{totalLinha(cor.id) || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {semFaixaDeTamanho.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.brand, marginBottom: 8 }}>Outras cores (tamanho sob consulta)</div>
          {semFaixaDeTamanho.map(cor => (
            <div key={cor.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ flex: 1, fontSize: 13 }}>
                {cor.codigo} - {cor.nome}
                {(cor.entrega || cor.observacao) && <span style={{ color: C.muted }}> ({[cor.entrega, cor.observacao].filter(Boolean).join(" · ")})</span>}
              </div>
              <input type="number" min="0" inputMode="numeric" value={qtds[cor.id]?.["unico"] || ""} placeholder="0"
                onChange={e => setQtd(cor.id, "unico", e.target.value)} style={inputCel} />
            </div>
          ))}
        </div>
      )}

      {tamanhos.length === 0 && semFaixaDeTamanho.length === 0 && (
        <div style={{ marginTop: 20, color: C.muted, fontSize: 13 }}>Sem cores cadastradas pra esse modelo no momento.</div>
      )}

      {(tamanhos.length > 0 || semFaixaDeTamanho.length > 0) && (
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

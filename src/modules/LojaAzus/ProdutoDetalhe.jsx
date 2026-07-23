import React from "react";
const { useState, useMemo } = React;
import { C, SERIF, SH, brl } from "../../constants.js";

function tamanhos(min, max) {
  if (min == null || max == null) return [];
  const out = [];
  for (let t = min; t <= max; t += 2) out.push(t);
  return out;
}

const btn = { border: "1px solid " + C.line, borderRadius: 9, padding: "9px 14px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", background: C.card, color: C.ink };
const btnAtivo = { ...btn, background: C.brand, color: "#fff", borderColor: C.brand };

export function ProdutoDetalhe({ produto, onVoltar, onAdicionar }) {
  const [fotoIdx, setFotoIdx] = useState(0);
  const [corId, setCorId] = useState(null);
  const [tamanho, setTamanho] = useState(null);
  const [qtd, setQtd] = useState(1);
  const [aviso, setAviso] = useState("");

  const cor = useMemo(() => produto.cores.find(c => c.id === corId) || null, [corId, produto.cores]);
  const opcoesTamanho = cor ? tamanhos(cor.tamanho_min, cor.tamanho_max) : [];

  const precoUnit = produto.preco_varejo != null
    ? produto.preco_varejo
    : (produto.preco_atacado && produto.preco_atacado[0] ? produto.preco_atacado[0].preco : 0);

  const foto = produto.fotos[fotoIdx];

  const adicionar = () => {
    if (produto.cores.length && !cor) { setAviso("Escolha uma cor."); return; }
    if (opcoesTamanho.length && !tamanho) { setAviso("Escolha um tamanho."); return; }
    setAviso("");
    onAdicionar({
      produtoId: produto.id,
      produtoNome: produto.nome,
      corCodigo: cor?.codigo || null,
      corNome: cor?.nome || null,
      tamanho: tamanho || null,
      quantidade: qtd,
      precoUnit,
    });
    setQtd(1);
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

          {produto.cores.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.brand, marginBottom: 8 }}>Cor</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {produto.cores.map(c => (
                  <button key={c.id} onClick={() => { setCorId(c.id); setTamanho(null); }} style={corId === c.id ? btnAtivo : btn}>
                    {c.codigo} {c.nome}
                  </button>
                ))}
              </div>
              {cor && (cor.entrega || cor.observacao) && (
                <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
                  {cor.entrega && <>Entrega: {cor.entrega}. </>}{cor.observacao}
                </div>
              )}
            </div>
          )}

          {cor && opcoesTamanho.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.brand, marginBottom: 8 }}>Tamanho</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {opcoesTamanho.map(t => (
                  <button key={t} onClick={() => setTamanho(t)} style={{ ...(tamanho === t ? btnAtivo : btn), minWidth: 44 }}>{t}</button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.brand }}>Quantidade</div>
            <div style={{ display: "flex", alignItems: "center", border: "1px solid " + C.line, borderRadius: 9, overflow: "hidden" }}>
              <button onClick={() => setQtd(q => Math.max(1, q - 1))} style={{ border: "none", background: C.sage, width: 34, height: 34, fontSize: 16, cursor: "pointer" }}>−</button>
              <div style={{ width: 40, textAlign: "center", fontWeight: 700 }}>{qtd}</div>
              <button onClick={() => setQtd(q => q + 1)} style={{ border: "none", background: C.sage, width: 34, height: 34, fontSize: 16, cursor: "pointer" }}>+</button>
            </div>
          </div>

          {aviso && <div style={{ color: C.clay, fontSize: 13, marginBottom: 10 }}>{aviso}</div>}

          <button onClick={adicionar} style={{ width: "100%", background: C.brand, color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            Adicionar ao carrinho
          </button>
        </div>
      </div>
    </div>
  );
}

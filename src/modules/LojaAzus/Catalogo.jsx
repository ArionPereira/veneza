import React from "react";
import { C, SERIF, SH, brl } from "../../constants.js";

function precoExibido(produto) {
  if (produto.preco_varejo != null) return brl(produto.preco_varejo);
  if (produto.preco_atacado && produto.preco_atacado.length) {
    const menor = produto.preco_atacado.reduce((m, f) => Math.min(m, f.preco), Infinity);
    return "a partir de " + brl(menor) + " (atacado)";
  }
  return "sob consulta";
}

function CardProduto({ produto, onAbrir }) {
  const foto = produto.fotos[0];
  return (
    <button onClick={() => onAbrir(produto.slug)} style={{
      textAlign: "left", background: C.card, border: "1px solid " + C.line, borderRadius: 14,
      overflow: "hidden", cursor: "pointer", boxShadow: SH, display: "flex", flexDirection: "column",
    }}>
      <div style={{ aspectRatio: "3/4", background: C.sage, overflow: "hidden" }}>
        {foto
          ? <img src={foto.url} alt={produto.nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
          : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.muted, fontSize: 13 }}>sem foto</div>}
      </div>
      <div style={{ padding: "12px 14px 14px" }}>
        <h3 style={{ fontFamily: SERIF, fontSize: 16.5, margin: 0, color: C.brand, fontWeight: 600 }}>{produto.nome}</h3>
        <div style={{ marginTop: 4, fontSize: 14, fontWeight: 700, color: C.ink }}>{precoExibido(produto)}</div>
      </div>
    </button>
  );
}

export function Catalogo({ produtos, onAbrirProduto }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
      {produtos.map(p => <CardProduto key={p.id} produto={p} onAbrir={onAbrirProduto} />)}
    </div>
  );
}

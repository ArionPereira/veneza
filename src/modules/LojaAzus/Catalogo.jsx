import React from "react";
import { C, SERIF, SH, brl } from "../../constants.js";
import { REGRAS_FRETE } from "./frete.js";

function precoExibido(produto) {
  if (produto.preco_varejo != null) return brl(produto.preco_varejo);
  if (produto.preco_atacado && produto.preco_atacado.length) {
    const menor = produto.preco_atacado.reduce((m, f) => Math.min(m, f.preco), Infinity);
    return "a partir de " + brl(menor) + " (atacado)";
  }
  return "sob consulta";
}

function CardProduto({ produto, onAbrir }) {
  return (
    <button onClick={() => onAbrir(produto.slug)} style={{
      textAlign: "left", background: C.card, border: "1px solid " + C.line, borderRadius: 14,
      cursor: "pointer", boxShadow: SH, padding: "16px 16px 15px", display: "flex", flexDirection: "column", gap: 6,
    }}>
      {produto.codigo && <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Cód. {produto.codigo}</div>}
      <h3 style={{ fontFamily: SERIF, fontSize: 17, margin: 0, color: C.brand, fontWeight: 600 }}>{produto.nome}</h3>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{precoExibido(produto)}</div>
    </button>
  );
}

function BannerFrete() {
  const regioes = Object.entries(REGRAS_FRETE);
  return (
    <div style={{ marginTop: 26, background: C.sage, border: "1px solid " + C.line, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ fontFamily: SERIF, fontSize: 15.5, color: C.brand, fontWeight: 700, marginBottom: 8 }}>🚚 Frete por região</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
        {regioes.map(([regiao, regra]) => (
          <div key={regiao} style={{ fontSize: 12.5, color: C.ink }}>
            <b>{regiao}</b><br />
            {regra
              ? <>{brl(regra.taxa)} · grátis acima de {brl(regra.gratisAcima)}</>
              : <span style={{ color: C.clay }}>consulte a vendedora</span>}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8 }}>O frete é calculado no carrinho, de acordo com o estado informado e o valor do pedido.</div>
    </div>
  );
}

export function Catalogo({ produtos, onAbrirProduto }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
        {produtos.map(p => <CardProduto key={p.id} produto={p} onAbrir={onAbrirProduto} />)}
      </div>
      <BannerFrete />
    </div>
  );
}

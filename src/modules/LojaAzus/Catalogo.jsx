import React from "react";
import { SERIF, SH, brl } from "../../constants.js";
import { AZ as C, fotoAmanda } from "./azusTheme.js";
import { REGRAS_FRETE } from "./frete.js";
import { NUMERO_WHATSAPP_VENDEDORA } from "./mensagemWhatsapp.js";

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

function VendedoraCard() {
  const foto = fotoAmanda();
  const linkWhats = "https://wa.me/" + NUMERO_WHATSAPP_VENDEDORA;
  return (
    <div style={{ marginTop: 26, background: C.brand, borderRadius: 14, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, boxShadow: SH }}>
      {foto
        ? <img src={foto} alt="Amanda Gabrielle" style={{ width: 62, height: 62, borderRadius: "50%", objectFit: "cover", border: "2px solid " + C.accent, flexShrink: 0 }} />
        : <div style={{ width: 62, height: 62, borderRadius: "50%", background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: 22, fontWeight: 700, flexShrink: 0 }}>AG</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C.accent, fontWeight: 700 }}>Sua vendedora</div>
        <div style={{ fontFamily: SERIF, fontSize: 16.5, fontWeight: 700, color: "#fff", margin: "2px 0" }}>Amanda Gabrielle</div>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.75)" }}>Dúvidas sobre um produto? Fale direto comigo.</div>
      </div>
      <a href={linkWhats} target="_blank" rel="noreferrer" style={{
        background: C.accent, color: "#fff", borderRadius: 9, padding: "9px 14px", fontSize: 13, fontWeight: 700,
        textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0,
      }}>
        💬 WhatsApp
      </a>
    </div>
  );
}

function agruparPorLinha(produtos) {
  const porLinha = new Map();
  for (const p of produtos) {
    const linha = p.linha || "Outros";
    if (!porLinha.has(linha)) porLinha.set(linha, []);
    porLinha.get(linha).push(p);
  }
  return [...porLinha.entries()];
}

export function Catalogo({ produtos, onAbrirProduto }) {
  const grupos = agruparPorLinha(produtos);
  return (
    <div>
      {grupos.map(([linha, itens]) => (
        <div key={linha} style={{ marginBottom: 30 }}>
          <h2 style={{ fontFamily: SERIF, fontSize: 20, color: C.brand, fontWeight: 800, textTransform: "uppercase", letterSpacing: .5, margin: "0 0 14px", borderBottom: "3px solid " + C.accent, paddingBottom: 8 }}>{linha}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {itens.map(p => <CardProduto key={p.id} produto={p} onAbrir={onAbrirProduto} />)}
          </div>
        </div>
      ))}
      <VendedoraCard />
      <BannerFrete />
    </div>
  );
}

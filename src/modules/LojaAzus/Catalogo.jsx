import React from "react";
const { useState, useMemo } = React;
import { SERIF, SH, brl } from "../../constants.js";
import { AZ as C, BEBAS, fotoAmanda } from "./azusTheme.js";
import { REGRAS_FRETE } from "./frete.js";
import { NUMERO_WHATSAPP_VENDEDORA } from "./mensagemWhatsapp.js";

const LINK_CATALOGO_FOTOS = "https://catalogosazus.my.canva.site/alfaiatariasazus3/outros-catlogos";

function precoExibido(produto) {
  if (produto.preco_varejo != null) return brl(produto.preco_varejo);
  if (produto.preco_atacado && produto.preco_atacado.length) {
    const menor = produto.preco_atacado.reduce((m, f) => Math.min(m, f.preco), Infinity);
    return "a partir de " + brl(menor) + " (atacado)";
  }
  return "sob consulta";
}

const norm = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// As bermudas vêm misturadas com as calças no catálogo "Bermudas, Malhas
// e Linhos" da Azus — na vitrine elas ganham uma seção própria. A
// detecção é pelo texto (o catálogo não marca a categoria): descrição/nome
// citando "bermuda" ou "versão curta" (caso da Munique curta).
function ehBermuda(p) {
  const texto = norm(p.nome + " " + (p.descricao || ""));
  return texto.includes("bermuda") || texto.includes("versao curta");
}

const ORDEM_SECOES = ["Alfaiataria", "Malhas e Linhos", "Bermudas", "Sarjas e Tech"];

function secaoDoProduto(p) {
  if (ehBermuda(p)) return "Bermudas";
  if (p.linha === "Bermudas, Malhas e Linhos") return "Malhas e Linhos";
  return p.linha || "Outros";
}

// Tecidos reconhecidos na composição (ex.: "68% viscose 30% linho").
const TECIDOS = [
  ["linho", "Linho"], ["algodao", "Algodão"], ["rami", "Rami"], ["poliamida", "Poliamida"],
  ["elastomultiester", "Elastomultiéster"], ["viscose", "Viscose"], ["poliester", "Poliéster"], ["elastano", "Elastano"],
];

const TAMANHOS_FILTRO = [38, 40, 42, 44, 46, 48, 50, 52];

function temTamanho(p, t) {
  return (p.cores || []).some(c =>
    (c.tamanho_min == null || c.tamanho_min <= t) && (c.tamanho_max == null || t <= c.tamanho_max));
}

function temEntregaImediata(p) {
  return (p.cores || []).some(c => norm(c.entrega).includes("mediat"));
}

function CardProduto({ produto, onAbrir }) {
  const imediata = temEntregaImediata(produto);
  return (
    <button onClick={() => onAbrir(produto.slug)} style={{
      textAlign: "left", background: C.card, border: "1px solid " + C.line, borderRadius: 14,
      cursor: "pointer", boxShadow: SH, padding: "16px 16px 15px", display: "flex", flexDirection: "column", gap: 6,
    }}>
      {produto.codigo && <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Cód. {produto.codigo}</div>}
      <h3 style={{ fontFamily: BEBAS, fontSize: 21, margin: 0, color: C.brand, letterSpacing: .3 }}>{produto.nome}</h3>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{precoExibido(produto)}</div>
      {imediata && <div style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>✓ Entrega imediata</div>}
    </button>
  );
}

const inpFiltro = { width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid " + C.line, fontSize: 13.5, background: "#fff", color: C.ink, boxSizing: "border-box" };
const lblFiltro = { fontSize: 11, fontWeight: 700, color: C.brand, marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: .5 };

function Filtros({ filtros, setFiltros, secoesDisponiveis, tecidosDisponiveis, total, exibidos }) {
  const set = (campo, valor) => setFiltros(f => ({ ...f, [campo]: valor }));
  const ativos = filtros.busca || filtros.secao || filtros.tecido || filtros.tamanho || filtros.imediata;
  return (
    <div style={{ background: C.card, border: "1px solid " + C.line, borderRadius: 14, padding: "14px 16px", marginBottom: 22, boxShadow: SH }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={lblFiltro}>Buscar produto</label>
          <input style={inpFiltro} value={filtros.busca} onChange={e => set("busca", e.target.value)}
            placeholder="Nome, tecido, descrição… ex.: linho, gurkha, Tóquio" />
        </div>
        <div>
          <label style={lblFiltro}>Linha</label>
          <select style={inpFiltro} value={filtros.secao} onChange={e => set("secao", e.target.value)}>
            <option value="">Todas</option>
            {secoesDisponiveis.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={lblFiltro}>Tecido</label>
          <select style={inpFiltro} value={filtros.tecido} onChange={e => set("tecido", e.target.value)}>
            <option value="">Todos</option>
            {tecidosDisponiveis.map(([chave, rotulo]) => <option key={chave} value={chave}>{rotulo}</option>)}
          </select>
        </div>
        <div>
          <label style={lblFiltro}>Tamanho</label>
          <select style={inpFiltro} value={filtros.tamanho} onChange={e => set("tamanho", e.target.value)}>
            <option value="">Todos</option>
            {TAMANHOS_FILTRO.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: C.ink, cursor: "pointer", padding: "9px 0", fontWeight: 600 }}>
            <input type="checkbox" checked={filtros.imediata} onChange={e => set("imediata", e.target.checked)} style={{ width: 16, height: 16, accentColor: C.brand }} />
            Só entrega imediata
          </label>
        </div>
      </div>
      {ativos && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
          <div style={{ fontSize: 12.5, color: C.muted }}>{exibidos} de {total} produto(s)</div>
          <button onClick={() => setFiltros({ busca: "", secao: "", tecido: "", tamanho: "", imediata: false })}
            style={{ background: "transparent", border: "none", color: C.brand, fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: 0, textDecoration: "underline" }}>
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}

function LinkCatalogoFotos() {
  return (
    <a href={LINK_CATALOGO_FOTOS} target="_blank" rel="noreferrer" style={{
      display: "flex", alignItems: "center", gap: 10, background: C.sage, border: "1px solid " + C.line,
      borderRadius: 12, padding: "11px 16px", marginBottom: 16, textDecoration: "none", color: C.ink, fontSize: 13.5,
    }}>
      <span style={{ fontSize: 18 }}>📖</span>
      <span>Quer ver as fotos dos modelos? <b style={{ color: C.brand }}>Acesse o catálogo completo</b></span>
      <span style={{ marginLeft: "auto", color: C.brand, fontWeight: 700 }}>→</span>
    </a>
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
              : <span style={{ color: C.clay }}>consulte a representante</span>}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8 }}>O frete é calculado no carrinho, de acordo com o estado informado e o valor do pedido.</div>
    </div>
  );
}

function RepresentanteCard() {
  const foto = fotoAmanda();
  const linkWhats = "https://wa.me/" + NUMERO_WHATSAPP_VENDEDORA;
  return (
    <div style={{ marginTop: 26, background: C.brand, borderRadius: 14, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, boxShadow: SH }}>
      {foto
        ? <img src={foto} alt="Amanda Gabrielle" style={{ width: 62, height: 62, borderRadius: "50%", objectFit: "cover", border: "2px solid " + C.accent, flexShrink: 0 }} />
        : <div style={{ width: 62, height: 62, borderRadius: "50%", background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: 22, fontWeight: 700, flexShrink: 0 }}>AG</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C.accent, fontWeight: 700 }}>Sua representante</div>
        <div style={{ fontFamily: BEBAS, fontSize: 21, color: "#fff", margin: "2px 0", letterSpacing: .3 }}>Amanda Gabrielle</div>
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

function agruparPorSecao(produtos) {
  const porSecao = new Map();
  for (const p of produtos) {
    const secao = secaoDoProduto(p);
    if (!porSecao.has(secao)) porSecao.set(secao, []);
    porSecao.get(secao).push(p);
  }
  return [...porSecao.entries()].sort((a, b) => {
    const ia = ORDEM_SECOES.indexOf(a[0]), ib = ORDEM_SECOES.indexOf(b[0]);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

export function Catalogo({ produtos, onAbrirProduto }) {
  const [filtros, setFiltros] = useState({ busca: "", secao: "", tecido: "", tamanho: "", imediata: false });

  const secoesDisponiveis = useMemo(() => agruparPorSecao(produtos).map(([s]) => s), [produtos]);
  const tecidosDisponiveis = useMemo(
    () => TECIDOS.filter(([chave]) => produtos.some(p => norm(p.composicao).includes(chave))),
    [produtos]);

  const filtrados = useMemo(() => produtos.filter(p => {
    if (filtros.secao && secaoDoProduto(p) !== filtros.secao) return false;
    if (filtros.tecido && !norm(p.composicao).includes(filtros.tecido)) return false;
    if (filtros.tamanho && !temTamanho(p, Number(filtros.tamanho))) return false;
    if (filtros.imediata && !temEntregaImediata(p)) return false;
    if (filtros.busca) {
      const alvo = norm(p.nome + " " + (p.descricao || "") + " " + (p.composicao || "") + " " + (p.cores || []).map(c => c.nome).join(" "));
      const termos = norm(filtros.busca).split(/\s+/).filter(Boolean);
      if (!termos.every(t => alvo.includes(t))) return false;
    }
    return true;
  }), [produtos, filtros]);

  const grupos = agruparPorSecao(filtrados);

  return (
    <div>
      <LinkCatalogoFotos />
      <Filtros filtros={filtros} setFiltros={setFiltros} secoesDisponiveis={secoesDisponiveis}
        tecidosDisponiveis={tecidosDisponiveis} total={produtos.length} exibidos={filtrados.length} />

      {!grupos.length && (
        <div style={{ textAlign: "center", color: C.muted, padding: "40px 20px", fontSize: 14 }}>
          Nenhum produto encontrado com esses filtros. <br />
          <button onClick={() => setFiltros({ busca: "", secao: "", tecido: "", tamanho: "", imediata: false })}
            style={{ background: "transparent", border: "none", color: C.brand, fontWeight: 700, cursor: "pointer", textDecoration: "underline", fontSize: 14, marginTop: 8 }}>
            Limpar filtros
          </button>
        </div>
      )}

      {grupos.map(([secao, itens]) => (
        <div key={secao} style={{ marginBottom: 30 }}>
          <h2 style={{ fontFamily: BEBAS, fontSize: 26, color: C.brand, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 14px", borderBottom: "3px solid " + C.accent, paddingBottom: 8 }}>{secao}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {itens.map(p => <CardProduto key={p.id} produto={p} onAbrir={onAbrirProduto} />)}
          </div>
        </div>
      ))}
      <RepresentanteCard />
      <BannerFrete />
    </div>
  );
}

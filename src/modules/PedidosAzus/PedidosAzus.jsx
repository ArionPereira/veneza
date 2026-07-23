import React from "react";
const { useState, useEffect } = React;
import { C, SERIF, SH, brl } from "../../constants.js";
import { listarPedidos, atualizarStatusPedido, sincronizarCatalogoAgora, buscarUltimaSincronizacao } from "./pedidosazusdb.js";

const ROTULOS_STATUS = { novo: "Novo", lancado: "Lançado", cancelado: "Cancelado" };
const CORES_STATUS = { novo: C.wheat, lancado: C.green, cancelado: C.clay };

const inp = { border: "1px solid " + C.line, borderRadius: 8, padding: "10px 12px", fontSize: 14, background: C.paper, color: C.ink, width: "100%", boxSizing: "border-box" };
const btn = { background: C.brand, color: "#fff", border: 0, borderRadius: 8, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" };
const btnGhost = { background: "transparent", color: C.brand, border: "1px solid " + C.line, borderRadius: 8, padding: "8px 13px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" };

function ConfirmarSenha({ nome, onConfirmar, erro, busy }) {
  const [senha, setSenha] = useState("");
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form onSubmit={e => { e.preventDefault(); onConfirmar(senha); }}
        style={{ background: C.card, border: "1px solid " + C.line, borderRadius: 14, padding: "26px 24px", width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontFamily: SERIF, fontSize: 18, color: C.brand }}>Confirmar acesso</div>
        <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Pedidos de cliente têm nome e telefone — confirme sua senha, {nome}, pra ver a lista.</p>
        <input type="password" autoFocus value={senha} onChange={e => setSenha(e.target.value)} placeholder="Sua senha" style={inp} autoComplete="current-password" />
        {erro && <div style={{ fontSize: 13, color: C.clay }}>{erro}</div>}
        <button disabled={busy} style={{ ...btn, opacity: busy ? 0.7 : 1 }}>{busy ? "Verificando…" : "Confirmar"}</button>
      </form>
    </div>
  );
}

export function PedidosAzus({ sessao, onSair }) {
  const [senha, setSenha] = useState(null); // guardada só em memória, nunca persistida
  const [confirmErro, setConfirmErro] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState("novo");
  const [ultimaSync, setUltimaSync] = useState(null);
  const [sincronizando, setSincronizando] = useState(false);

  const carregar = async (s) => {
    setCarregando(true); setErro("");
    try { setPedidos(await listarPedidos(sessao.usuario, s)); }
    catch (e) { setErro(e.message || String(e)); }
    setCarregando(false);
  };

  const carregarUltimaSync = () => { buscarUltimaSincronizacao().then(setUltimaSync).catch(() => {}); };

  const confirmar = async (s) => {
    setConfirmBusy(true); setConfirmErro("");
    try { await listarPedidos(sessao.usuario, s); setSenha(s); await carregar(s); carregarUltimaSync(); }
    catch (e) { setConfirmErro(e.message || "Senha incorreta."); }
    setConfirmBusy(false);
  };

  const marcarStatus = async (id, status) => {
    try { await atualizarStatusPedido(sessao.usuario, senha, id, status); await carregar(senha); }
    catch (e) { alert("Não foi possível atualizar: " + (e.message || e)); }
  };

  const sincronizarAgora = async () => {
    setSincronizando(true);
    try {
      const r = await sincronizarCatalogoAgora(sessao.usuario, senha);
      carregarUltimaSync();
      alert("Catálogo atualizado: " + (r.resumo || "sem mudanças."));
    } catch (e) {
      alert("Não foi possível sincronizar: " + (e.message || e));
    }
    setSincronizando(false);
  };

  if (!senha) return <ConfirmarSenha nome={sessao?.nome} onConfirmar={confirmar} erro={confirmErro} busy={confirmBusy} />;

  const visiveis = filtro === "todos" ? pedidos : pedidos.filter(p => p.status === filtro);

  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={{ background: "rgba(255,255,255,.9)", borderBottom: "1px solid " + C.line, boxShadow: SH, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.accent, fontWeight: 700 }}>Sementes Veneza</div>
            <h1 style={{ fontFamily: SERIF, fontSize: 20, margin: "1px 0 0", color: C.brand, fontWeight: 600 }}>Pedidos Azus</h1>
          </div>
          {onSair && <button onClick={onSair} style={{ ...btnGhost, marginLeft: "auto" }}>← Módulos</button>}
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px 48px" }}>
        <div style={{ background: C.sage, border: "1px solid " + C.line, borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12.5, color: C.ink, flex: "1 1 260px" }}>
            <b>Catálogo:</b>{" "}
            {ultimaSync
              ? <>{ultimaSync.resumo} <span style={{ color: C.muted }}>({new Date(ultimaSync.executado_em).toLocaleString("pt-BR")})</span></>
              : <span style={{ color: C.muted }}>ainda sem sincronização registrada</span>}
          </div>
          <button onClick={sincronizarAgora} disabled={sincronizando} style={{ ...btnGhost, opacity: sincronizando ? 0.6 : 1 }}>
            {sincronizando ? "Sincronizando…" : "↻ Atualizar catálogo agora"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          {["novo", "lancado", "cancelado", "todos"].map(f => (
            <button key={f} onClick={() => setFiltro(f)} style={{
              border: "1px solid " + C.line, borderRadius: 8, padding: "7px 13px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: filtro === f ? C.brand : C.card, color: filtro === f ? "#fff" : C.ink,
            }}>
              {f === "todos" ? "Todos" : ROTULOS_STATUS[f]}
            </button>
          ))}
          <button onClick={() => carregar(senha)} style={{ ...btnGhost, marginLeft: "auto" }}>↻ Atualizar</button>
        </div>

        {carregando && <div style={{ color: C.muted, padding: 30, textAlign: "center" }}>Carregando…</div>}
        {erro && <div style={{ color: C.clay, padding: 20 }}>{erro}</div>}
        {!carregando && !visiveis.length && <div style={{ color: C.muted, padding: 30, textAlign: "center" }}>Nenhum pedido aqui.</div>}

        {visiveis.map(p => (
          <div key={p.id} style={{ background: C.card, border: "1px solid " + C.line, borderRadius: 12, padding: "14px 16px", marginBottom: 12, boxShadow: SH }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 700, color: C.ink, fontSize: 15 }}>#{p.numero} — {p.cliente_nome}</div>
                <div style={{ fontSize: 12.5, color: C.muted }}>
                  {p.cliente_telefone && <>{p.cliente_telefone} · </>}
                  {p.forma_pagamento && <>{p.forma_pagamento} · </>}
                  {new Date(p.criado_em).toLocaleString("pt-BR")}
                </div>
              </div>
              <span style={{ background: CORES_STATUS[p.status], color: "#fff", borderRadius: 999, padding: "3px 11px", fontSize: 11.5, fontWeight: 700 }}>
                {ROTULOS_STATUS[p.status] || p.status}
              </span>
            </div>

            <div style={{ marginTop: 10, borderTop: "1px solid " + C.line, paddingTop: 10 }}>
              {(p.itens || []).map(it => (
                <div key={it.id} style={{ fontSize: 13, color: C.ink, display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                  <span>{it.produto_nome}{it.cor_nome && " — " + it.cor_codigo + " " + it.cor_nome}{it.tamanho && " — tam. " + it.tamanho} × {it.quantidade}</span>
                  <span>{brl(it.subtotal)}</span>
                </div>
              ))}
              {p.observacoes && <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6 }}>Obs.: {p.observacoes}</div>}
              <div style={{ textAlign: "right", fontWeight: 700, marginTop: 8 }}>Total: {brl(p.total)}</div>
            </div>

            {p.status === "novo" && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => marcarStatus(p.id, "lancado")} style={btn}>✓ Marcar como lançado</button>
                <button onClick={() => marcarStatus(p.id, "cancelado")} style={{ ...btnGhost, color: C.clay, borderColor: C.clay }}>Cancelar</button>
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}

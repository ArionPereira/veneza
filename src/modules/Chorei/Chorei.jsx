import React from "react";
const { useState, useEffect, useRef, useCallback, useMemo } = React;
import { C, SERIF, SH } from "../../constants.js";
import { Header, Centro } from "../../ui.jsx";
import { sb } from "../../db.js";
import { listEquipes, listItens, listEtapas, listNotas, assinarChorei } from "./choreidb.js";
import { EquipeDia } from "./EquipeDia.jsx";
import { Historico } from "./Historico.jsx";
import { Pendencias } from "./Pendencias.jsx";
import { Equipes } from "./Equipes.jsx";
import { Painel } from "./Painel.jsx";

const TABS_BASE = [
  ["hoje",       "Hoje"],
  ["painel",     "Painel"],
  ["pendencias", "Pendências"],
  ["historico",  "Histórico"],
];

export function Chorei({ onSair, sessao }) {
  const [equipes,  setEquipes]  = useState([]);
  const [itens,    setItens]    = useState([]);
  const [etapas,   setEtapas]   = useState([]);
  const [notas,    setNotas]    = useState([]);
  const [semV3,    setSemV3]    = useState(false); // banco ainda sem chorei_v3.sql
  const [usuarios, setUsuarios] = useState([]); // pra os selects de dono
  const [loading,  setLoading]  = useState(true);
  const [erro,     setErro]     = useState(null);
  const [tab,      setTab]      = useState("hoje");
  const [equipeId, setEquipeId] = useState(null);

  const eMaster = sessao?.role === "master";
  const tabs = useMemo(() => eMaster ? [...TABS_BASE, ["equipes","Equipes"]] : TABS_BASE, [eMaster]);

  const recarregar = useCallback(async () => {
    try {
      const [eq, it] = await Promise.all([listEquipes(), listItens()]);
      setEquipes(eq || []); setItens(it || []); setErro(null);
      // etapas/notas dependem do chorei_v3.sql; se ainda não rodou, segue sem elas
      try {
        const [et, no] = await Promise.all([listEtapas(), listNotas()]);
        setEtapas(et || []); setNotas(no || []); setSemV3(false);
      } catch { setEtapas([]); setNotas([]); setSemV3(true); }
      // primeira vez ou equipe atual sumiu: seleciona a primeira ativa
      setEquipeId(prev => {
        if (prev && (eq || []).some(e => e.id === prev)) return prev;
        const ativa = (eq || []).find(e => e.ativo);
        return ativa ? ativa.id : ((eq || [])[0]?.id || null);
      });
    } catch (err) { setErro(err.message || String(err)); }
  }, []);

  const carregarUsuarios = useCallback(async () => {
    if (!eMaster) { setUsuarios([]); return; }
    try {
      const { data } = await sb.rpc("app_listar_usuarios", { p_master_id: sessao.id });
      setUsuarios((data || []).filter(u => u.ativo));
    } catch { /* sem lista de usuários; a UI cai em campo de texto livre */ }
  }, [eMaster, sessao?.id]);

  useEffect(() => { document.title = "Chōrei · Sementes Veneza"; return () => { document.title = "Sementes Veneza"; }; }, []);
  useEffect(() => { (async () => { await recarregar(); await carregarUsuarios(); setLoading(false); })(); }, [recarregar, carregarUsuarios]);

  // realtime: recarrega com debounce
  const tmr = useRef(null);
  useEffect(() => {
    const off = assinarChorei(() => {
      if (tmr.current) clearTimeout(tmr.current);
      tmr.current = setTimeout(recarregar, 300);
    });
    return () => { if (tmr.current) clearTimeout(tmr.current); off(); };
  }, [recarregar]);

  if (loading) return <Centro txt="Carregando reuniões…" />;

  const equipeSel = equipes.find(e => e.id === equipeId) || null;

  return (
    <div style={{ minHeight:"100vh", paddingBottom:64 }}>
      <Header
        titulo="Chōrei"
        eyebrow="Sementes Veneza · Reuniões diárias"
        tabs={tabs}
        tab={tab}
        setTab={setTab}
        onSair={onSair}
      />

      {erro && /schema cache|could not find the table|chorei_/i.test(erro) ? (
        <div style={{ maxWidth:1080, margin:"16px auto", padding:"18px 20px",
          background:C.sage, border:"1px solid "+C.brand2, borderRadius:12, color:C.ink, fontSize:14 }}>
          <div style={{ fontWeight:700, color:C.brand, fontSize:15, marginBottom:6 }}>⚙ Módulo ainda não configurado</div>
          As tabelas do Chōrei não existem no banco. Para ativar, rode uma vez no Supabase (SQL Editor) os arquivos{" "}
          <b>sql/chorei_v1.sql</b>, <b>sql/chorei_v3.sql</b> e <b>sql/chorei_v4.sql</b> — eles criam as tabelas
          (com etapas e observações de projetos) e já cadastram as equipes PCP, Almoxarifado e ADM.
          Depois é só recarregar esta página.
        </div>
      ) : erro && (
        <div style={{ maxWidth:1080, margin:"0 auto 12px", padding:"10px 14px",
          background:"#FBEAE3", border:"1px solid "+C.clay, borderRadius:10, color:C.clay, fontSize:13 }}>
          Erro: {erro}
        </div>
      )}

      <main style={{ maxWidth:1080, margin:"0 auto", padding:"0 20px" }}>
        {/* Seletor de equipe (aparece em Hoje/Histórico) */}
        {(tab === "hoje" || tab === "historico") && (
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginTop:14 }}>
            <span style={{ fontSize:12, color:C.muted, fontWeight:600, marginRight:4 }}>Equipe:</span>
            {equipes.filter(e => e.ativo || e.id === equipeId).map(e => {
              const on = e.id === equipeId;
              return (
                <button key={e.id} onClick={() => setEquipeId(e.id)}
                  style={{ border:"1px solid "+(on?e.cor||C.brand:C.line),
                    background:on?(e.cor||C.brand):C.card, color:on?"#fff":C.muted,
                    borderRadius:20, padding:"6px 14px", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                  {e.nome}
                </button>
              );
            })}
            {equipes.length === 0 && (
              <span style={{ fontSize:13, color:C.muted }}>
                Nenhuma equipe cadastrada. {eMaster ? "Vá em Equipes pra criar." : "Peça pro master criar."}
              </span>
            )}
          </div>
        )}

        {tab === "hoje" && equipeSel && (
          <EquipeDia
            equipe={equipeSel}
            equipes={equipes}
            itens={itens.filter(i => i.equipe_id === equipeSel.id)}
            etapas={etapas}
            notas={notas}
            semV3={semV3}
            sessao={sessao}
            usuarios={usuarios}
            recarregar={recarregar}
          />
        )}

        {tab === "painel" && (
          <Painel equipes={equipes} itens={itens} etapas={etapas} usuarios={usuarios} />
        )}

        {tab === "pendencias" && (
          <Pendencias equipes={equipes} itens={itens} sessao={sessao} usuarios={usuarios} recarregar={recarregar} />
        )}

        {tab === "historico" && equipeSel && (
          <Historico
            equipe={equipeSel}
            itens={itens.filter(i => i.equipe_id === equipeSel.id)}
            sessao={sessao}
            usuarios={usuarios}
            recarregar={recarregar}
          />
        )}

        {tab === "equipes" && eMaster && (
          <Equipes equipes={equipes} usuarios={usuarios} sessao={sessao} recarregar={recarregar} />
        )}

        <p style={{ fontSize:12, color:C.muted, textAlign:"center", marginTop:24 }}>
          Chōrei · a reunião rápida de todo dia. Curta, mesmo horário, mesma estrutura.
        </p>
      </main>
    </div>
  );
}

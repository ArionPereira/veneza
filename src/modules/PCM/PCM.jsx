import React from "react";
const { useState, useEffect, useRef, useCallback } = React;
import { C, SH, SERIF } from "../../constants.js";
import { Header, Centro } from "../../ui.jsx";
import { listSetores, listEquipamentos, listOrdens, assinarPCM } from "./pcmdb.js";

const TABS = [["ordens","Ordens"],["equipamentos","Equipamentos"]];

// Placeholder visual usado nas abas até a etapa que as implementa
function EmBreve({titulo, etapa, children}) {
  return (
    <div style={{background:C.card,border:"1px dashed "+C.brand2,borderRadius:14,padding:"28px 22px",marginTop:14,textAlign:"center"}}>
      <div style={{fontFamily:SERIF,fontSize:18,color:C.brand,marginBottom:6}}>{titulo}</div>
      <div style={{fontSize:13.5,color:C.muted}}>Chega na <b>Etapa {etapa}</b>.</div>
      {children && <div style={{marginTop:12}}>{children}</div>}
    </div>
  );
}

export function PCM({ nome, onSair }) {
  const [setores,      setSetores]      = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [ordens,       setOrdens]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [erro,         setErro]         = useState(null);
  const [tab,          setTab]          = useState("ordens");

  const recarregar = useCallback(async () => {
    try {
      const [s, e, o] = await Promise.all([listSetores(), listEquipamentos(), listOrdens()]);
      setSetores(s||[]); setEquipamentos(e||[]); setOrdens(o||[]); setErro(null);
    } catch (err) { setErro(err.message || String(err)); }
  }, []);

  // título da aba + carga inicial
  useEffect(()=>{ document.title = "PCM · Sementes Veneza"; return ()=>{ document.title = "Sementes Veneza"; }; }, []);
  useEffect(()=>{ (async ()=>{ await recarregar(); setLoading(false); })(); }, [recarregar]);

  // realtime: qualquer mudança nas tabelas pcm_ recarrega (debounce leve)
  const tmr = useRef(null);
  useEffect(()=>{
    const desassinar = assinarPCM(()=>{
      if (tmr.current) clearTimeout(tmr.current);
      tmr.current = setTimeout(recarregar, 300);
    });
    return ()=>{ if (tmr.current) clearTimeout(tmr.current); desassinar(); };
  }, [recarregar]);

  if (loading) return <Centro txt="Carregando manutenção…"/>;

  return (
    <div style={{minHeight:"100vh",paddingBottom:64}}>
      <Header tab={tab} setTab={setTab} onSair={onSair}
        titulo="PCM" eyebrow="Sementes Veneza · Manutenção" tabs={TABS}/>

      {erro && <div style={{maxWidth:1080,margin:"0 auto 12px",padding:"10px 14px",background:"#FBEAE3",border:"1px solid "+C.clay,borderRadius:10,color:C.clay,fontSize:13}}>Erro: {erro}</div>}

      <main style={{maxWidth:1080,margin:"0 auto",padding:"0 20px"}}>
        {tab==="ordens" && (
          <EmBreve titulo="Fila de ordens de serviço (board + tabela)" etapa="3">
            <span style={{fontSize:13,color:C.muted}}>{ordens.length} OS no banco.</span>
          </EmBreve>
        )}
        {tab==="equipamentos" && (
          <EmBreve titulo="Cadastro de equipamentos e ficha do ativo" etapa="2">
            <span style={{fontSize:13,color:C.muted}}>{setores.length} setores · {equipamentos.length} equipamentos no banco.</span>
          </EmBreve>
        )}

        <p style={{fontSize:12,color:C.muted,textAlign:"center",marginTop:20}}>
          Fundação pronta (Etapa 1): dados e realtime ligados. Conectado ao Supabase como <b>{nome}</b>.
        </p>
      </main>
    </div>
  );
}

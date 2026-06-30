import React from "react";
const { useState, useEffect, useRef, useCallback } = React;
import { C } from "../../constants.js";
import { Header, Centro } from "../../ui.jsx";
import { listSetores, listEquipamentos, listOrdens, assinarPCM } from "./pcmdb.js";
import { Equipamentos } from "./Equipamentos.jsx";
import { Ordens } from "./Ordens.jsx";

const TABS = [["ordens","Ordens"],["equipamentos","Equipamentos"]];

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
          <Ordens setores={setores} equipamentos={equipamentos} ordens={ordens} recarregar={recarregar} nome={nome}/>
        )}
        {tab==="equipamentos" && (
          <Equipamentos setores={setores} equipamentos={equipamentos} recarregar={recarregar}/>
        )}

        <p style={{fontSize:12,color:C.muted,textAlign:"center",marginTop:24}}>
          Conectado como <b>{nome}</b>.
        </p>
      </main>
    </div>
  );
}

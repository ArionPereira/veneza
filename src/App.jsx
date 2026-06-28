import React from "react";
const { useState, useEffect, useMemo, useRef } = React;

import { C, clientId, novoId, estaEditando, fmtHora, brl } from "./constants.js";
import { hojeISO, addDias, fmtData, iso, fromISO } from "./dates.js";
import { sb, CHAVE } from "./db.js";
import {
  INSUMOS_SEED, PRATOS_SEED, TIPOS_SEED, PREVISTO_PADRAO,
  normPratos, semearCardapioDatas, migrar, novaRef
} from "./seed.js";
import { ModalNome, Centro, BarraPresenca, Header } from "./ui.jsx";
import { Calendario } from "./tabs/Calendario.jsx";
import { Custos }     from "./tabs/Custos.jsx";
import { Operacao }   from "./tabs/Operacao.jsx";
import { Relatorio }  from "./tabs/Relatorio.jsx";
import { Mural }      from "./tabs/Mural.jsx";

export function App() {
  const [insumos,        setInsumos]        = useState([]);
  const [pratos,         setPratos]         = useState([]);
  const [cardapio,       setCardapio]       = useState({});
  const [tiposRefeicao,  setTiposRefeicao]  = useState(TIPOS_SEED.map(t=>({...t})));
  const [previstoPadrao, setPrevistoPadrao] = useState(PREVISTO_PADRAO);
  const [estoque,        setEstoque]        = useState({});
  const [ceasa,          setCeasa]          = useState(null);
  const [tab,            setTab]            = useState("cardapio");
  const [loading,        setLoading]        = useState(true);
  const [erro,           setErro]           = useState(null);
  const [status,         setStatus]         = useState("");
  const [ultimoSave,     setUltimoSave]     = useState("");
  const [online,         setOnline]         = useState([]);
  const [pendente,       setPendente]       = useState(null);
  const [nome,           setNome]           = useState(localStorage.getItem("refeitorio_nome")||"");
  const [precisaNome,    setPrecisaNome]    = useState(!localStorage.getItem("refeitorio_nome"));

  const dadosRef = useRef({}); const nomeRef = useRef(nome); const timerRef = useRef(null);
  useEffect(()=>{ dadosRef.current={insumos,pratos,cardapio,tiposRefeicao,previstoPadrao,estoque,ceasa}; },[insumos,pratos,cardapio,tiposRefeicao,previstoPadrao,estoque,ceasa]);
  useEffect(()=>{ nomeRef.current=nome; },[nome]);

  const aplicar = (e) => {
    setInsumos(e.insumos||[]);
    setPratos(normPratos(e.pratos||[]));
    setCardapio(e.cardapio||{});
    setTiposRefeicao((e.tiposRefeicao&&e.tiposRefeicao.length)?e.tiposRefeicao:TIPOS_SEED.map(t=>({...t})));
    setPrevistoPadrao(typeof e.previstoPadrao==="number"?e.previstoPadrao:PREVISTO_PADRAO);
    setEstoque(e.estoque||{});
    setCeasa(e.ceasa||null);
  };

  async function salvarEstado(estado) {
    setStatus("salvando…");
    const {error} = await sb.from("html_tools_storage").upsert({ chave:CHAVE, estado, atualizado_em:new Date().toISOString() });
    if (error) { setErro(error.message); }
    else { const h=fmtHora(new Date().toISOString()); setUltimoSave(h); setStatus("salvo "+h); setTimeout(()=>setStatus(""),1500); }
  }

  function agendarSave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(()=>{
      const estado = { ...dadosRef.current, _by:nomeRef.current, _client:clientId, _at:new Date().toISOString() };
      salvarEstado(estado);
    }, 700);
  }

  async function carregar() {
    try {
      setErro(null);
      const {data,error} = await sb.from("html_tools_storage").select("*").eq("chave",CHAVE).maybeSingle();
      if (error) throw error;
      if (data && data.estado && Array.isArray(data.estado.insumos) && data.estado.insumos.length) {
        aplicar(migrar(data.estado)); setUltimoSave(fmtHora(data.atualizado_em));
      } else {
        const seed = { insumos:INSUMOS_SEED, pratos:PRATOS_SEED, cardapio:semearCardapioDatas(), tiposRefeicao:TIPOS_SEED.map(t=>({...t})), previstoPadrao:PREVISTO_PADRAO, estoque:{} };
        aplicar(seed);
        salvarEstado({ ...seed, _by:nomeRef.current||"sistema", _client:clientId, _at:new Date().toISOString() });
      }
      setLoading(false);
    } catch(e) { setErro(e.message||String(e)); setLoading(false); }
  }
  useEffect(()=>{ carregar(); }, []);

  // presença + sync ao vivo
  useEffect(()=>{
    if (loading || !nome) return;
    const ch = sb.channel("presenca-"+CHAVE, {config:{presence:{key:clientId}}});
    ch.on("presence",{event:"sync"},()=>{
      const st = ch.presenceState(); const nomes = [];
      Object.values(st).forEach(arr=>arr.forEach(m=>{ if(m.nome) nomes.push(m.nome); }));
      setOnline(nomes);
    });
    ch.on("postgres_changes",{event:"*",schema:"public",table:"html_tools_storage",filter:"chave=eq."+CHAVE},(payload)=>{
      const novo = payload.new && payload.new.estado; if(!novo) return;
      if (novo._client===clientId) return;
      const mig = migrar(novo);
      setUltimoSave(fmtHora(payload.new.atualizado_em||novo._at));
      if (estaEditando()) setPendente(mig); else aplicar(mig);
    });
    ch.subscribe(async (s)=>{ if(s==="SUBSCRIBED") await ch.track({nome:nomeRef.current,at:Date.now()}); });
    return ()=>{ sb.removeChannel(ch); };
  }, [loading, nome]);

  // ---- refeições por dia ----
  const addPratoMeal    = (data,refId,id) => { if(!id)return; setCardapio(c=>{ const dia={...(c[data]||{})}; const r={...(dia[refId]||{pratos:[],previsto:previstoPadrao,realizado:null})}; if(!r.pratos.includes(id)) r.pratos=[...r.pratos,id]; dia[refId]=r; return {...c,[data]:dia}; }); agendarSave(); };
  const removePratoMeal = (data,refId,id) => { setCardapio(c=>{ const dia={...(c[data]||{})}; const r=dia[refId]; if(!r)return c; dia[refId]={...r,pratos:r.pratos.filter(x=>x!==id)}; return {...c,[data]:dia}; }); agendarSave(); };
  const ativarRefDia    = (data,refId) => { setCardapio(c=>{ const dia={...(c[data]||{})}; if(!dia[refId]) dia[refId]={pratos:[],previsto:previstoPadrao,realizado:null}; return {...c,[data]:dia}; }); agendarSave(); };
  const removerRefDia   = (data,refId) => { setCardapio(c=>{ const dia={...(c[data]||{})}; delete dia[refId]; const nc={...c}; if(Object.keys(dia).length) nc[data]=dia; else delete nc[data]; return nc; }); agendarSave(); };
  const setPrevisto     = (data,refId,v) => { setCardapio(c=>{ const dia={...(c[data]||{})}; const r=dia[refId]; if(!r)return c; dia[refId]={...r,previsto:v}; return {...c,[data]:dia}; }); agendarSave(); };
  const setRealizado    = (data,refId,v) => { setCardapio(c=>{ const dia={...(c[data]||{})}; const r=dia[refId]; if(!r)return c; let cong=r.custoCong; if(v!=null && cong==null) cong=custoPratosLista(r.pratos); if(v==null) cong=null; dia[refId]={...r,realizado:v,custoCong:cong}; return {...c,[data]:dia}; }); agendarSave(); };
  const toggleTipo      = (refId) => { setTiposRefeicao(ts=>ts.map(t=>t.id===refId?{...t,ativo:!t.ativo}:t)); agendarSave(); };
  const setPadrao       = (v) => { setPrevistoPadrao(v); agendarSave(); };

  // ---- insumos ----
  const updateInsumo = (id,campo,val) => { setInsumos(xs=>xs.map(i=>i.id===id?{...i,[campo]:val}:i)); agendarSave(); };
  const addInsumo    = () => { setInsumos(xs=>[...xs,{id:novoId(),nome:"Novo insumo",unidade:"kg",preco:0,fc:1,minimo:0}]); agendarSave(); };
  const removeInsumo = (id) => { setInsumos(xs=>xs.filter(i=>i.id!==id)); setPratos(ps=>ps.map(p=>({...p,ficha:p.ficha.filter(l=>l.insumoId!==id)}))); agendarSave(); };

  // ---- pratos + fichas ----
  const updatePrato = (id,campo,val) => { setPratos(ps=>ps.map(p=>p.id===id?{...p,[campo]:val}:p)); agendarSave(); };
  const removePrato = (id) => { setPratos(ps=>ps.filter(p=>p.id!==id)); setCardapio(c=>{ const nc={}; Object.keys(c).forEach(d=>{ const dia={}; Object.keys(c[d]).forEach(rid=>{ const r=c[d][rid]; dia[rid]={...r,pratos:(r.pratos||[]).filter(x=>x!==id)}; }); nc[d]=dia; }); return nc; }); agendarSave(); };
  const addPrato    = () => { setPratos(ps=>[...ps,{id:novoId(),nome:"Novo prato",categoria:"Prato principal",sazonal:false,ficha:[]}]); agendarSave(); };
  const addLinha    = (pid) => { setPratos(ps=>ps.map(p=>p.id===pid?{...p,ficha:[...p.ficha,{insumoId:(insumos[0]&&insumos[0].id)||"",g:0}]}:p)); agendarSave(); };
  const updateLinha = (pid,idx,campo,val) => { setPratos(ps=>ps.map(p=>p.id===pid?{...p,ficha:p.ficha.map((l,i)=>i===idx?{...l,[campo]:val}:l)}:p)); agendarSave(); };
  const removeLinha = (pid,idx) => { setPratos(ps=>ps.map(p=>p.id===pid?{...p,ficha:p.ficha.filter((_,i)=>i!==idx)}:p)); agendarSave(); };

  // ---- dia (por data) ----
  const copiarDia         = (origem,destino,tipos) => { if(!origem||!destino)return; setCardapio(c=>{ const src=c[origem]; if(!src)return c; const destDia={...(c[destino]||{})}; Object.keys(src).forEach(rid=>{ if(tipos&&tipos.length&&!tipos.includes(rid))return; destDia[rid]={pratos:(src[rid].pratos||[]).slice(),previsto:src[rid].previsto,realizado:null,custoCong:null}; }); return {...c,[destino]:destDia}; }); agendarSave(); };
  const limparDia         = (data) => { setCardapio(c=>{ const n={...c}; delete n[data]; return n; }); agendarSave(); };
  const recalcularDia     = (data) => { setCardapio(c=>{ const dia={...(c[data]||{})}; Object.keys(dia).forEach(rid=>{ const r=dia[rid]; if(r.realizado!=null) dia[rid]={...r,custoCong:custoPratosLista(r.pratos)}; }); return {...c,[data]:dia}; }); agendarSave(); };
  const segDe             = (dataISO) => { const d=fromISO(dataISO); const off=(d.getDay()+6)%7; d.setDate(d.getDate()-off); return iso(d); };
  const copiarSemana      = (origemISO,destinoISO,tipos) => { if(!origemISO||!destinoISO)return; const os=segDe(origemISO),ds=segDe(destinoISO); setCardapio(c=>{ const nc={...c}; for(let i=0;i<7;i++){ const od=addDias(os,i),dd=addDias(ds,i); const src=c[od]; if(!src)continue; const destDia={...(nc[dd]||{})}; Object.keys(src).forEach(rid=>{ if(tipos&&tipos.length&&!tipos.includes(rid))return; destDia[rid]={pratos:(src[rid].pratos||[]).slice(),previsto:src[rid].previsto,realizado:null,custoCong:null}; }); nc[dd]=destDia; } return nc; }); agendarSave(); };
  const copiarDiaIntervalo= (origem,deISO,ateISO,tipos) => { if(!origem||!deISO)return; const ate=(ateISO&&ateISO>=deISO)?ateISO:deISO; setCardapio(c=>{ const src=c[origem]; if(!src)return c; const nc={...c}; let d=deISO,g=0; while(d<=ate&&g<400){ if(d!==origem){ const destDia={...(nc[d]||{})}; Object.keys(src).forEach(rid=>{ if(tipos&&tipos.length&&!tipos.includes(rid))return; destDia[rid]={pratos:(src[rid].pratos||[]).slice(),previsto:src[rid].previsto,realizado:null,custoCong:null}; }); nc[d]=destDia; } d=addDias(d,1); g++; } return nc; }); agendarSave(); };
  const setEstoqueItem    = (id,v) => { setEstoque(e=>({...e,[id]:v})); agendarSave(); };

  // ---- cálculos de custo ----
  const insumoMap        = useMemo(()=>{ const m={}; insumos.forEach(i=>m[i.id]=i); return m; },[insumos]);
  const pratoMap         = useMemo(()=>{ const m={}; pratos.forEach(p=>m[p.id]=p); return m; },[pratos]);
  const custoLinha       = (l) => { const i=insumoMap[l.insumoId]; if(!i)return 0; return ((Number(l.g)||0)/1000)*i.fc*i.preco; };
  const custoPrato       = (p) => !p?0:p.ficha.reduce((s,l)=>s+custoLinha(l),0);
  const custoPratosLista = (ids) => (ids||[]).reduce((s,id)=>s+custoPrato(pratoMap[id]),0);

  if (precisaNome) return <ModalNome onOk={(v)=>{ localStorage.setItem("refeitorio_nome",v); setNome(v); setPrecisaNome(false); }}/>;
  if (loading) return <Centro txt="Carregando do banco…"/>;

  return (
    <div style={{minHeight:"100vh",paddingBottom:64}}>
      <BarraPresenca online={online} nome={nome} ultimoSave={ultimoSave} status={status} pendente={pendente}
        onSync={()=>{ if(pendente){ aplicar(pendente); setPendente(null); } }}/>
      <Header tab={tab} setTab={setTab}/>
      {erro && <div style={{maxWidth:1080,margin:"0 auto 12px",padding:"10px 14px",background:"#FBEAE3",border:"1px solid "+C.clay,borderRadius:10,color:C.clay,fontSize:13}}>Erro: {erro}</div>}
      <main style={{maxWidth:1080,margin:"0 auto",padding:"0 20px"}}>
        {tab==="cardapio"  && <Calendario {...{cardapio,pratos,pratoMap,custoPrato,custoPratosLista,tiposRefeicao,addPratoMeal,removePratoMeal,ativarRefDia,removerRefDia,setPrevisto,setRealizado,copiarDia,copiarDiaIntervalo,limparDia,copiarSemana,recalcularDia,segDe}}/>}
        {tab==="custos"    && <Custos     {...{insumos,insumoMap,pratos,custoLinha,custoPrato,updateInsumo,addInsumo,removeInsumo,ceasa,setCeasa,updatePrato,addPrato,removePrato,addLinha,updateLinha,removeLinha}}/>}
        {tab==="operacao"  && <Operacao   {...{cardapio,pratoMap,custoPrato,custoPratosLista,tiposRefeicao,insumos,insumoMap,estoque,setEstoqueItem}}/>}
        {tab==="relatorio" && <Relatorio  {...{cardapio,pratoMap,custoPratosLista,tiposRefeicao}}/>}
        {tab==="mural"     && <Mural      {...{cardapio,pratoMap,tiposRefeicao}}/>}
      </main>
    </div>
  );
}

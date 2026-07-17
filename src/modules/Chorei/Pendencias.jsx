import React from "react";
const { useState, useMemo } = React;
import { C, SERIF, SH } from "../../constants.js";
import { STATUS, statusInfo, ehTerminal, fmtData, hojeISO } from "./choreiconst.js";
import { ItemCard } from "./ItemCard.jsx";

// Painel consolidado de pendências: mostra todos os itens NÃO terminais das
// 3 equipes juntas. Ordena por prazo (mais próximo primeiro), depois por
// data de criação. Filtros por equipe, tipo e dono.
export function Pendencias({ equipes, itens, sessao, usuarios, recarregar }) {
  const [erro, setErro] = useState("");
  const [equipeFiltro, setEquipeFiltro] = useState("todas");
  const [donoFiltro, setDonoFiltro] = useState("todos");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [status, setStatus] = useState("nao_terminais");

  const eMaster = sessao?.role === "master";

  const equipeCor = (id) => (equipes.find(e => e.id === id)?.cor || C.brand);
  const equipeNome = (id) => (equipes.find(e => e.id === id)?.nome || "?");

  const respPodeEscrever = (item) => {
    if (eMaster) return true;
    const eq = equipes.find(e => e.id === item.equipe_id);
    return eq?.responsavel_id === sessao?.id;
  };

  const filtrados = useMemo(() => {
    let arr = itens.filter(i => {
      if (status === "nao_terminais" && ehTerminal(i.status)) return false;
      if (status !== "todos" && status !== "nao_terminais" && i.status !== status) return false;
      if (equipeFiltro !== "todas" && i.equipe_id !== equipeFiltro) return false;
      if (tipoFiltro === "dia" && i.tipo === "projeto") return false;
      if (tipoFiltro === "projeto" && i.tipo !== "projeto") return false;
      if (donoFiltro !== "todos") {
        if (donoFiltro === "sem_dono" && (i.responsavel_id || i.responsavel_nome)) return false;
        if (donoFiltro !== "sem_dono" && i.responsavel_id !== donoFiltro) return false;
      }
      return true;
    });
    arr.sort((a,b) => {
      const pa = a.prazo || "9999-99-99";
      const pb = b.prazo || "9999-99-99";
      if (pa !== pb) return pa < pb ? -1 : 1;
      return (a.criado_em || "") < (b.criado_em || "") ? 1 : -1;
    });
    return arr.map(i => ({
      ...i,
      _equipeNome: equipeNome(i.equipe_id),
      _equipeCor: equipeCor(i.equipe_id),
    }));
  }, [itens, equipeFiltro, donoFiltro, tipoFiltro, status]);

  const contagens = useMemo(() => {
    const atrasadas = itens.filter(i => !ehTerminal(i.status) && i.prazo && i.prazo < hojeISO()).length;
    const abertas = itens.filter(i => i.status === "aberto").length;
    const emAndamento = itens.filter(i => i.status === "em_andamento").length;
    return { atrasadas, abertas, emAndamento };
  }, [itens]);

  const sel = { border:"1px solid "+C.line, borderRadius:8, padding:"6px 10px", fontSize:13, background:C.paper, color:C.ink };

  return (
    <div style={{ marginTop:16 }}>
      {/* Barra de métricas */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:14 }}>
        {[
          { icone:"⏰", rotulo:"Atrasadas",    valor:contagens.atrasadas,   cor:C.clay },
          { icone:"○",  rotulo:"Abertas",      valor:contagens.abertas,     cor:C.brand },
          { icone:"→",  rotulo:"Em andamento", valor:contagens.emAndamento, cor:"#B07D10" },
        ].map(m => (
          <div key={m.rotulo} style={{ background:C.card, border:"1px solid "+C.line, borderRadius:10,
            padding:"8px 14px", display:"flex", alignItems:"center", gap:10, flex:"1 1 150px", maxWidth:230 }}>
            <span style={{ width:32, height:32, borderRadius:"50%", background:m.cor+"14", color:m.cor,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, flexShrink:0 }}>
              {m.icone}
            </span>
            <div>
              <div style={{ fontFamily:SERIF, fontSize:20, fontWeight:700, lineHeight:1,
                color:m.valor > 0 ? m.cor : C.muted }}>{m.valor}</div>
              <div style={{ fontSize:10.5, color:C.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:.4, marginTop:2 }}>
                {m.rotulo}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14, alignItems:"center" }}>
        <span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>Equipe:</span>
        <select value={equipeFiltro} onChange={e => setEquipeFiltro(e.target.value)} style={sel}>
          <option value="todas">Todas</option>
          {equipes.filter(e => e.ativo).map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>Tipo:</span>
        <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)} style={sel}>
          <option value="todos">Todos</option>
          <option value="dia">Itens do dia</option>
          <option value="projeto">Projetos / longa duração</option>
        </select>
        <span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>Dono:</span>
        <select value={donoFiltro} onChange={e => setDonoFiltro(e.target.value)} style={sel}>
          <option value="todos">Todos</option>
          <option value="sem_dono">Sem dono</option>
          {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>
        <span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>Status:</span>
        <select value={status} onChange={e => setStatus(e.target.value)} style={sel}>
          <option value="nao_terminais">Abertas + em andamento</option>
          <option value="aberto">Só abertas</option>
          <option value="em_andamento">Só em andamento</option>
          <option value="pausado">Só pausadas</option>
          <option value="resolvido">Resolvidas</option>
          <option value="cancelado">Canceladas</option>
          <option value="todos">Todas</option>
        </select>
        <span style={{ marginLeft:"auto", fontSize:11.5, color:C.muted }}>
          {filtrados.length} item(ns)
        </span>
      </div>

      {erro && (
        <div style={{ marginBottom:10, fontSize:13, color:C.clay, background:"#FBEAE3",
          border:"1px solid "+C.clay, borderRadius:8, padding:"8px 10px" }}>{erro}</div>
      )}

      {filtrados.length === 0 && (
        <div style={{ background:C.sage, border:"1px solid "+C.line, borderRadius:10,
          padding:"18px", textAlign:"center", fontSize:13, color:C.brand, fontWeight:600 }}>
          Nada pendente com esses filtros. 🎉
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtrados.map(i => (
          <ItemCard key={i.id} item={i} sessao={sessao} usuarios={usuarios}
            podeEscrever={respPodeEscrever(i)} recarregar={recarregar} onErro={setErro}
            mostrarEquipe={true} />
        ))}
      </div>
    </div>
  );
}

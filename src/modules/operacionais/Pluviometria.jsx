import React from "react";
const { useState } = React;
import { C } from "../../constants.js";
import { Stat } from "../../ui.jsx";
import { S, hoje, num, inserir, csv, Campo, Tabela, Form, Erro, Titulo, useDados, Shell } from "./Common.jsx";

const TABELAS=["pluv_pontos","pluv_leituras","hidr_pontos","hidr_leituras"];

// consumo de cada leitura de hidrômetro = leitura atual − leitura anterior (mesmo hidrômetro, por data)
function calcConsumo(leituras){
  const porPonto={}; leituras.forEach(l=>{(porPonto[l.ponto_id]=porPonto[l.ponto_id]||[]).push(l)});
  const map={};
  Object.values(porPonto).forEach(arr=>{
    arr.sort((a,b)=> a.data<b.data?-1:a.data>b.data?1:((a.criado_em||"")<(b.criado_em||"")?-1:1));
    for(let i=0;i<arr.length;i++) map[arr[i].id]= i>0 ? Number(arr[i].leitura_m3)-Number(arr[i-1].leitura_m3) : null;
  });
  return map;
}

export function Pluviometria({onSair,nome}) {
  const [tab,setTab]=useState("pluv");
  const {dados,loading,erro,recarregar,setErro}=useDados(TABELAS,"medicao");
  const pontos=dados.pluv_pontos||[], leituras=dados.pluv_leituras||[];
  const hidros=dados.hidr_pontos||[], hleituras=dados.hidr_leituras||[];
  const pontoPorId=Object.fromEntries(pontos.map(x=>[x.id,x]));
  const hidroPorId=Object.fromEntries(hidros.map(x=>[x.id,x]));
  const consumo=calcConsumo(hleituras);

  // --- salvar (pluviometria) ---
  const salvarPonto=async(f,el)=>{try{
    await inserir("pluv_pontos",{nome:f.get("nome").trim(),codigo:f.get("codigo").trim()||null,localizacao:f.get("localizacao").trim()||null,latitude:f.get("latitude")||null,longitude:f.get("longitude")||null,ativo:true});
    el.reset(); await recarregar();
  }catch(e){setErro(e.message)}};
  const salvarLeitura=async(f,el)=>{try{
    await inserir("pluv_leituras",{ponto_id:f.get("ponto_id"),data:f.get("data"),hora:f.get("hora")||"07:00",precipitacao_mm:Number(f.get("precipitacao_mm")),responsavel:nome||null,observacao:f.get("observacao").trim()||null});
    el.reset(); await recarregar();
  }catch(e){setErro(e.message)}};

  // --- salvar (hidrômetro) ---
  const salvarHidro=async(f,el)=>{try{
    await inserir("hidr_pontos",{nome:f.get("nome").trim(),codigo:f.get("codigo").trim()||null,localizacao:f.get("localizacao").trim()||null,ativo:true});
    el.reset(); await recarregar();
  }catch(e){setErro(e.message)}};
  const salvarHLeitura=async(f,el)=>{try{
    await inserir("hidr_leituras",{ponto_id:f.get("ponto_id"),data:f.get("data"),leitura_m3:Number(f.get("leitura_m3")),responsavel:nome||null,observacao:f.get("observacao").trim()||null});
    el.reset(); await recarregar();
  }catch(e){setErro(e.message)}};

  // --- métricas ---
  const totalChuva=leituras.reduce((s,x)=>s+Number(x.precipitacao_mm||0),0);
  const maiorChuva=leituras.reduce((m,x)=>Math.max(m,Number(x.precipitacao_mm||0)),0);
  const porPonto=pontos.map(p=>({id:p.id,nome:p.nome,total:leituras.filter(l=>l.ponto_id===p.id).reduce((s,l)=>s+Number(l.precipitacao_mm||0),0),medicoes:leituras.filter(l=>l.ponto_id===p.id).length}));
  const porHidro=hidros.map(h=>{
    const ls=hleituras.filter(l=>l.ponto_id===h.id).slice().sort((a,b)=> a.data<b.data?-1:a.data>b.data?1:0);
    const consumoTotal=ls.length>=2?Number(ls[ls.length-1].leitura_m3)-Number(ls[0].leitura_m3):0;
    return {id:h.id,nome:h.nome,leituras:ls.length,ultima:ls.length?Number(ls[ls.length-1].leitura_m3):null,consumo:consumoTotal};
  });
  const consumoGeral=porHidro.reduce((s,h)=>s+h.consumo,0);

  return <Shell titulo="Pluviometria e Hidrômetro" eyebrow="Sementes Veneza · Medição de chuva e água"
    tabs={[["pluv","Pluviométrico"],["hidr","Hidrômetro"],["cadastros","Cadastros"],["relatorios","Relatórios"]]} tab={tab} setTab={setTab} onSair={onSair} loading={loading}>
    <Erro msg={erro}/>

    {tab==="pluv"&&<><Titulo>Nova medição de chuva</Titulo>
      <Form onSubmit={salvarLeitura}>
        <Campo label="Ponto"><select name="ponto_id" required style={S.input}><option value="">Selecione</option>{pontos.filter(x=>x.ativo).map(x=><option key={x.id} value={x.id}>{x.codigo?x.codigo+" · ":""}{x.nome}</option>)}</select></Campo>
        <Campo label="Data"><input name="data" type="date" required defaultValue={hoje()} style={S.input}/></Campo>
        <Campo label="Hora"><input name="hora" type="time" required defaultValue="07:00" style={S.input}/></Campo>
        <Campo label="Precipitação (mm)"><input name="precipitacao_mm" type="number" min="0" step=".01" required style={S.input}/></Campo>
        <Campo label="Observação" wide><input name="observacao" style={S.input}/></Campo>
      </Form>
      <Titulo>Histórico de medições</Titulo>
      <Tabela rows={leituras} cols={[["data","Data"],["hora","Hora",x=>(x.hora||"").slice(0,5)],["ponto","Ponto",x=>pontoPorId[x.ponto_id]?.nome||"—"],["precipitacao_mm","Chuva",x=><b>{num(x.precipitacao_mm)} mm</b>],["responsavel","Responsável"],["observacao","Observação"]]}/>
    </>}

    {tab==="hidr"&&<><Titulo>Nova leitura de hidrômetro</Titulo>
      <Form onSubmit={salvarHLeitura}>
        <Campo label="Hidrômetro"><select name="ponto_id" required style={S.input}><option value="">Selecione</option>{hidros.filter(x=>x.ativo).map(x=><option key={x.id} value={x.id}>{x.codigo?x.codigo+" · ":""}{x.nome}</option>)}</select></Campo>
        <Campo label="Data"><input name="data" type="date" required defaultValue={hoje()} style={S.input}/></Campo>
        <Campo label="Leitura do relógio (m³)"><input name="leitura_m3" type="number" min="0" step=".001" required style={S.input}/></Campo>
        <Campo label="Observação" wide><input name="observacao" style={S.input}/></Campo>
      </Form>
      {!hidros.filter(x=>x.ativo).length&&<div style={{fontSize:13,color:C.muted,margin:"6px 2px"}}>Cadastre um hidrômetro na aba <b>Cadastros</b> primeiro.</div>}
      <Titulo>Histórico de leituras</Titulo>
      <Tabela rows={hleituras} cols={[["data","Data"],["ponto","Hidrômetro",x=>hidroPorId[x.ponto_id]?.nome||"—"],["leitura_m3","Leitura",x=><b>{num(x.leitura_m3)} m³</b>],["consumo","Consumo",x=>consumo[x.id]==null?"—":<b style={{color:C.brand}}>{num(consumo[x.id])} m³</b>],["responsavel","Responsável"],["observacao","Observação"]]}/>
    </>}

    {tab==="cadastros"&&<>
      <Titulo>Novo ponto pluviométrico</Titulo>
      <Form onSubmit={salvarPonto}>
        <Campo label="Código"><input name="codigo" placeholder="Ex.: P01" style={S.input}/></Campo>
        <Campo label="Nome"><input name="nome" required style={S.input}/></Campo>
        <Campo label="Localização" wide><input name="localizacao" style={S.input}/></Campo>
        <Campo label="Latitude"><input name="latitude" type="number" min="-90" max="90" step="any" style={S.input}/></Campo>
        <Campo label="Longitude"><input name="longitude" type="number" min="-180" max="180" step="any" style={S.input}/></Campo>
      </Form>
      <Tabela rows={pontos} cols={[["codigo","Código"],["nome","Nome"],["localizacao","Localização"],["ativo","Status",x=>x.ativo?"Ativo":"Inativo"]]}/>

      <Titulo>Novo hidrômetro</Titulo>
      <Form onSubmit={salvarHidro}>
        <Campo label="Código"><input name="codigo" placeholder="Ex.: H01" style={S.input}/></Campo>
        <Campo label="Nome"><input name="nome" required placeholder="Ex.: Poço 1 / Entrada" style={S.input}/></Campo>
        <Campo label="Localização" wide><input name="localizacao" style={S.input}/></Campo>
      </Form>
      <Tabela rows={hidros} cols={[["codigo","Código"],["nome","Nome"],["localizacao","Localização"],["ativo","Status",x=>x.ativo?"Ativo":"Inativo"]]}/>
    </>}

    {tab==="relatorios"&&<>
      <Titulo>Pluviometria</Titulo>
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <Stat rotulo="Chuva acumulada" valor={num(totalChuva)+" mm"}/><Stat rotulo="Maior medição" valor={num(maiorChuva)+" mm"}/><Stat rotulo="Medições" valor={leituras.length}/><Stat rotulo="Pontos ativos" valor={pontos.filter(x=>x.ativo).length}/>
      </div>
      <Titulo acao={<button style={S.btn} onClick={()=>csv("pluviometria.csv",[["Data","Hora","Ponto","Precipitação (mm)","Responsável","Observação"],...leituras.map(x=>[x.data,x.hora,pontoPorId[x.ponto_id]?.nome,x.precipitacao_mm,x.responsavel,x.observacao])])}>Baixar CSV</button>}>Acumulado por ponto</Titulo>
      <Tabela rows={porPonto} cols={[["nome","Ponto"],["medicoes","Medições"],["total","Acumulado",x=>num(x.total)+" mm"]]}/>

      <Titulo>Hidrômetro</Titulo>
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <Stat rotulo="Consumo total" valor={num(consumoGeral)+" m³"}/><Stat rotulo="Leituras" valor={hleituras.length}/><Stat rotulo="Hidrômetros ativos" valor={hidros.filter(x=>x.ativo).length}/>
      </div>
      <Titulo acao={<button style={S.btn} onClick={()=>csv("hidrometro.csv",[["Data","Hidrômetro","Leitura (m³)","Consumo (m³)","Responsável","Observação"],...hleituras.map(x=>[x.data,hidroPorId[x.ponto_id]?.nome,x.leitura_m3,consumo[x.id]==null?"":consumo[x.id],x.responsavel,x.observacao])])}>Baixar CSV</button>}>Consumo por hidrômetro</Titulo>
      <Tabela rows={porHidro} cols={[["nome","Hidrômetro"],["leituras","Leituras"],["ultima","Última leitura",x=>x.ultima==null?"—":num(x.ultima)+" m³"],["consumo","Consumo no período",x=><b>{num(x.consumo)} m³</b>]]}/>
    </>}
  </Shell>;
}

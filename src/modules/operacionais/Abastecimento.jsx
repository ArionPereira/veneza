import React from "react";
const { useState } = React;
import { C } from "../../constants.js";
import { Stat } from "../../ui.jsx";
import { S, hoje, num, inserir, rpc, msgErro, csv, Campo, Tabela, Form, Erro, Aviso, Titulo, useDados, Shell } from "./Common.jsx";

const TABELAS=["comb_veiculos","comb_tanques","comb_abastecimentos","comb_entradas"];
const COMBUSTIVEIS=[["diesel","Diesel"],["gasolina","Gasolina"],["etanol","Etanol"],["gas","Gás"]];
const nomeComb=v=>COMBUSTIVEIS.find(x=>x[0]===String(v).toLowerCase())?.[1]||v||"—";
const unidadePadrao=comb=>comb==="gas"?"kg":"L";

function TanqueForm({onSalvar}) {
  const [comb,setComb]=useState("diesel"),[unidade,setUnidade]=useState("L");
  const mudarComb=v=>{setComb(v);setUnidade(unidadePadrao(v))};
  return <Form onSubmit={onSalvar}>
    <Campo label="Nome do tanque"><input name="nome" required style={S.input}/></Campo>
    <Campo label="Combustível"><select name="combustivel" value={comb} onChange={e=>mudarComb(e.target.value)} style={S.input}>{COMBUSTIVEIS.map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></Campo>
    <Campo label="Unidade"><select name="unidade" value={unidade} onChange={e=>setUnidade(e.target.value)} style={S.input}>{comb==="gas"?<><option value="kg">kg</option><option value="m3">m³</option></>:<option value="L">Litros (L)</option>}</select></Campo>
    <Campo label={"Capacidade ("+(unidade==="m3"?"m³":unidade)+")"}><input name="capacidade" type="number" min=".001" step=".001" required style={S.input}/></Campo>
  </Form>;
}
function VeiculoForm({onSalvar}) {
  return <Form onSubmit={onSalvar}>
    <Campo label="Identificação"><input name="identificacao" required style={S.input}/></Campo>
    <Campo label="Placa/patrimônio"><input name="placa" style={S.input}/></Campo>
    <Campo label="Tipo"><input name="tipo" placeholder="Trator, empilhadeira…" required style={S.input}/></Campo>
    <Campo label="Combustível"><select name="combustivel" style={S.input}>{COMBUSTIVEIS.map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></Campo>
  </Form>;
}
function AbastecimentoForm({veiculos,tanques,onSalvar}) {
  const [veiculoId,setVeiculoId]=useState(""),[tanqueId,setTanqueId]=useState("");
  const veiculo=veiculos.find(x=>x.id===veiculoId);
  const disponiveis=tanques.filter(t=>t.ativo&&(!veiculo||String(t.combustivel).toLowerCase()===String(veiculo.combustivel).toLowerCase()));
  const tanque=tanques.find(x=>x.id===tanqueId);
  const un=tanque?.unidade||"L";
  return <Form onSubmit={onSalvar} label="Registrar abastecimento">
    <Campo label="Veículo/equipamento"><select name="veiculo_id" required value={veiculoId} onChange={e=>{setVeiculoId(e.target.value);setTanqueId("")}} style={S.input}><option value="">Selecione</option>{veiculos.filter(x=>x.ativo).map(x=><option key={x.id} value={x.id}>{x.identificacao}{x.placa?" · "+x.placa:""} · {nomeComb(x.combustivel)}</option>)}</select></Campo>
    <Campo label="Tanque interno"><select name="tanque_id" required value={tanqueId} onChange={e=>setTanqueId(e.target.value)} style={S.input}><option value="">Selecione</option>{disponiveis.map(x=><option key={x.id} value={x.id}>{x.nome} · saldo {num(x.saldo_l)} {x.unidade==="m3"?"m³":x.unidade}</option>)}</select></Campo>
    <Campo label={"Quantidade ("+(un==="m3"?"m³":un)+")"}><input name="quantidade" type="number" min=".001" step=".001" required style={S.input}/></Campo>
    <Campo label="Data"><input name="data" type="date" required defaultValue={hoje()} style={S.input}/></Campo>
    <Campo label="Odômetro/horímetro"><input name="odometro" type="number" min="0" step=".1" style={S.input}/></Campo>
    <Campo label="Observação" wide><input name="observacao" style={S.input}/></Campo>
  </Form>;
}
function EntradaForm({tanques,nome,onSalvar}) {
  const [tanqueId,setTanqueId]=useState("");
  const tanque=tanques.find(x=>x.id===tanqueId),un=tanque?.unidade||"L";
  return <Form onSubmit={onSalvar} label="Registrar entrada">
    <Campo label="Tanque abastecido"><select name="tanque_id" required value={tanqueId} onChange={e=>setTanqueId(e.target.value)} style={S.input}><option value="">Selecione</option>{tanques.filter(x=>x.ativo).map(x=><option key={x.id} value={x.id}>{x.nome} · {nomeComb(x.combustivel)} · saldo {num(x.saldo_l)} {x.unidade==="m3"?"m³":x.unidade}</option>)}</select></Campo>
    <Campo label={"Quantidade recebida ("+(un==="m3"?"m³":un)+")"}><input name="quantidade" type="number" min=".001" step=".001" required style={S.input}/></Campo>
    <Campo label="Data"><input name="data" type="date" required defaultValue={hoje()} style={S.input}/></Campo>
    <Campo label="Fornecedor/terceiro"><input name="fornecedor" style={S.input}/></Campo>
    <Campo label="Documento/NF"><input name="documento" style={S.input}/></Campo>
    <Campo label="Responsável"><input name="responsavel" defaultValue={nome} style={S.input}/></Campo>
    <Campo label="Observação" wide><input name="observacao" style={S.input}/></Campo>
  </Form>;
}

export function Abastecimento({onSair,nome}) {
  const [tab,setTab]=useState("abastecimentos");
  const {dados,loading,erro,recarregar,setErro}=useDados(TABELAS,"comb");
  const veiculos=dados.comb_veiculos||[],tanques=dados.comb_tanques||[],abastecimentos=dados.comb_abastecimentos||[],entradas=dados.comb_entradas||[];
  const veiculoPorId=Object.fromEntries(veiculos.map(x=>[x.id,x])),tanquePorId=Object.fromEntries(tanques.map(x=>[x.id,x]));

  const addVeiculo=async(f,el)=>{try{await inserir("comb_veiculos",{identificacao:f.get("identificacao").trim(),placa:f.get("placa").trim()||null,tipo:f.get("tipo").trim(),combustivel:f.get("combustivel"),ativo:true});el.reset();await recarregar()}catch(e){setErro(msgErro(e))}};
  const addTanque=async(f,el)=>{try{await inserir("comb_tanques",{nome:f.get("nome").trim(),combustivel:f.get("combustivel"),capacidade_l:Number(f.get("capacidade")),saldo_l:0,unidade:f.get("unidade"),ativo:true});el.reset();await recarregar()}catch(e){setErro(msgErro(e))}};
  const addAbastecimento=async(f,el)=>{try{await rpc("comb_registrar_abastecimento",{p_veiculo_id:f.get("veiculo_id"),p_tanque_id:f.get("tanque_id"),p_data:f.get("data"),p_quantidade:Number(f.get("quantidade")),p_odometro:f.get("odometro")?Number(f.get("odometro")):null,p_observacao:f.get("observacao")||null});el.reset();await recarregar()}catch(e){setErro(msgErro(e))}};
  const addEntrada=async(f,el)=>{try{await rpc("comb_registrar_entrada",{p_tanque_id:f.get("tanque_id"),p_data:f.get("data"),p_quantidade:Number(f.get("quantidade")),p_fornecedor:f.get("fornecedor")||null,p_documento:f.get("documento")||null,p_responsavel:f.get("responsavel")||nome||null,p_observacao:f.get("observacao")||null});el.reset();await recarregar()}catch(e){setErro(msgErro(e))}};

  const totaisPorUnidade=["L","m3","kg"].map(un=>({id:un,un,total:abastecimentos.filter(x=>x.unidade===un).reduce((s,x)=>s+Number(x.litros||0),0),entradas:entradas.filter(x=>x.unidade===un).reduce((s,x)=>s+Number(x.quantidade||0),0)})).filter(x=>x.total||x.entradas);

  return <Shell titulo="Abastecimento" eyebrow="Sementes Veneza · Combustíveis internos"
    tabs={[["abastecimentos","Abastecimentos"],["entradas","Entradas"],["veiculos","Veículos"],["tanques","Tanques"],["relatorios","Relatórios"]]} tab={tab} setTab={setTab} onSair={onSair} loading={loading}>
    <Erro msg={erro}/>
    {tab==="abastecimentos"&&<><Aviso>Registre aqui somente o abastecimento interno de veículos e equipamentos. O saldo é baixado automaticamente do tanque.</Aviso>
      <Titulo>Novo abastecimento interno</Titulo><AbastecimentoForm veiculos={veiculos} tanques={tanques} onSalvar={addAbastecimento}/>
      <Titulo>Histórico</Titulo><Tabela rows={abastecimentos} cols={[["data","Data"],["veiculo","Veículo/equipamento",x=>veiculoPorId[x.veiculo_id]?.identificacao||"—"],["tanque","Tanque",x=>tanquePorId[x.tanque_id]?.nome||"—"],["combustivel","Combustível",x=>nomeComb(x.combustivel)],["litros","Quantidade",x=>num(x.litros)+" "+(x.unidade==="m3"?"m³":x.unidade||"L")],["odometro","Odômetro/horímetro"],["observacao","Observação"]]}/></>}
    {tab==="entradas"&&<><Aviso>Use esta tela quando um fornecedor ou terceiro reabastecer um tanque da empresa. O saldo é acrescido automaticamente.</Aviso>
      <Titulo>Entrada de combustível</Titulo><EntradaForm tanques={tanques} nome={nome} onSalvar={addEntrada}/>
      <Titulo>Histórico de entradas</Titulo><Tabela rows={entradas} cols={[["data","Data"],["tanque","Tanque",x=>tanquePorId[x.tanque_id]?.nome||"—"],["combustivel","Combustível",x=>nomeComb(x.combustivel)],["quantidade","Quantidade",x=>num(x.quantidade)+" "+(x.unidade==="m3"?"m³":x.unidade)],["fornecedor","Fornecedor"],["documento","Documento"],["responsavel","Responsável"]]}/></>}
    {tab==="veiculos"&&<><Titulo>Novo veículo/equipamento</Titulo><VeiculoForm onSalvar={addVeiculo}/>
      <Titulo>Frota e equipamentos</Titulo><Tabela rows={veiculos} cols={[["identificacao","Identificação"],["placa","Placa/patrimônio"],["tipo","Tipo"],["combustivel","Combustível",x=>nomeComb(x.combustivel)],["ativo","Status",x=>x.ativo?"Ativo":"Inativo"]]}/></>}
    {tab==="tanques"&&<><Aviso>Tanques novos começam com saldo zero. Lance o primeiro abastecimento na aba Entradas.</Aviso>
      <Titulo>Novo tanque</Titulo><TanqueForm onSalvar={addTanque}/>
      <Titulo>Tanques</Titulo><Tabela rows={tanques} cols={[["nome","Nome"],["combustivel","Combustível",x=>nomeComb(x.combustivel)],["capacidade_l","Capacidade",x=>num(x.capacidade_l)+" "+(x.unidade==="m3"?"m³":x.unidade)],["saldo_l","Saldo atual",x=><b style={{color:Number(x.saldo_l)<=Number(x.capacidade_l)*.15?C.clay:C.ink}}>{num(x.saldo_l)} {x.unidade==="m3"?"m³":x.unidade}</b>],["nivel","Nível",x=>x.capacidade_l?Math.round(x.saldo_l/x.capacidade_l*100)+"%":"—"]]}/></>}
    {tab==="relatorios"&&<><div style={{display:"flex",gap:12,flexWrap:"wrap"}}><Stat rotulo="Abastecimentos" valor={abastecimentos.length}/><Stat rotulo="Entradas" valor={entradas.length}/><Stat rotulo="Veículos/equipamentos" valor={veiculos.filter(x=>x.ativo).length}/><Stat rotulo="Tanques ativos" valor={tanques.filter(x=>x.ativo).length}/></div>
      <Titulo>Movimentação por unidade</Titulo><Tabela rows={totaisPorUnidade} cols={[["un","Unidade",x=>x.un==="m3"?"m³":x.un],["entradas","Entradas",x=>num(x.entradas)],["total","Consumo interno",x=>num(x.total)]]}/>
      <Titulo>Exportação</Titulo><button style={S.btn} onClick={()=>csv("abastecimentos.csv",[["Data","Veículo/equipamento","Tanque","Combustível","Quantidade","Unidade","Odômetro/horímetro","Observação"],...abastecimentos.map(x=>[x.data,veiculoPorId[x.veiculo_id]?.identificacao,tanquePorId[x.tanque_id]?.nome,nomeComb(x.combustivel),x.litros,x.unidade,x.odometro,x.observacao])])}>Baixar CSV</button>
    </>}
  </Shell>;
}

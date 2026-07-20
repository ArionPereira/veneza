import React from "react";
const { useState } = React;
import { C } from "../../constants.js";
import { Stat } from "../../ui.jsx";
import { S, hoje, rpc, msgErro, csv, Campo, Tabela, Form, Erro, Aviso, Titulo, useDados, Shell, BtnMini, Modal, Auditoria, cancelBadge } from "../operacionais/Common.jsx";
import { CargaDetalhe } from "./CargaDetalhe.jsx";
import { SECOES, rotuloStatusCarga, corStatusCarga } from "./expedicaoconst.js";

const TABELAS = ["exp_itens_modelo","exp_cargas","exp_respostas","op_auditoria"];

function CargaForm({ onSalvar }) {
  return <Form onSubmit={onSalvar} label="Criar carga">
    <Campo label="Data"><input name="data" type="date" required defaultValue={hoje()} style={S.input} /></Campo>
    <Campo label="Placa"><input name="placa" style={S.input} /></Campo>
    <Campo label="Motorista"><input name="motorista" style={S.input} /></Campo>
    <Campo label="Transportadora"><input name="transportadora" style={S.input} /></Campo>
    <Campo label="Destino/cliente" wide><input name="destino" style={S.input} /></Campo>
  </Form>;
}

function ItemModeloForm({ onSalvar }) {
  return <Form onSubmit={onSalvar} label="+ Adicionar item">
    <Campo label="Seção"><select name="secao" defaultValue="antes" style={S.input}>{SECOES.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></Campo>
    <Campo label="Título" wide><input name="titulo" required style={S.input} /></Campo>
    <Campo label="Ordem"><input name="ordem" type="number" defaultValue={0} style={{ ...S.input, width:90 }} /></Campo>
    <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, padding:"9px 0" }}><input type="checkbox" name="critico" /> Crítico (bloqueia despacho se reprovado)</label>
  </Form>;
}

export function Expedicao({ onSair, nome, sessao }) {
  const [tab, setTab] = useState("cargas");
  const [verCanc, setVerCanc] = useState(false);
  const [abrirCarga, setAbrirCarga] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const { dados, loading, erro, recarregar, setErro } = useDados(TABELAS, "exp");
  const itensModelo = dados.exp_itens_modelo || [], cargas = dados.exp_cargas || [], respostas = dados.exp_respostas || [];
  const audit = (dados.op_auditoria || []).filter(a => a.modulo === "expedicao");
  const uid = sessao?.id, unome = sessao?.nome || nome;

  const criarCarga = async (f, el) => { try {
    await rpc("exp_criar_carga", { p_usuario_id:uid, p_usuario_nome:unome, p_data:f.get("data"), p_placa:f.get("placa")||null, p_motorista:f.get("motorista")||null, p_transportadora:f.get("transportadora")||null, p_destino:f.get("destino")||null });
    el.reset(); await recarregar();
  } catch (e) { setErro(msgErro(e)); } };

  const salvarItem = async (id, patch) => {
    await rpc("exp_responder_item", { p_usuario_id:uid, p_usuario_nome:unome, p_id:id, p_status:patch.status, p_observacao:patch.observacao, p_foto_url:patch.foto_url });
    await recarregar();
  };
  const concluirSecao = async (secao, responsavel) => {
    await rpc("exp_concluir_secao", { p_usuario_id:uid, p_usuario_nome:unome, p_carga_id:abrirCarga, p_secao:secao, p_responsavel:responsavel });
    await recarregar();
  };
  const cancelarCarga = async () => {
    if (!confirm("Cancelar esta carga? O checklist fica arquivado, sem poder ser alterado.")) return;
    try { await rpc("exp_cancelar_carga", { p_usuario_id:uid, p_usuario_nome:unome, p_id:abrirCarga }); await recarregar(); setAbrirCarga(null); }
    catch (e) { setErro(msgErro(e)); }
  };

  const addItemModelo = async (f, el) => { try {
    await rpc("exp_criar_item_modelo", { p_usuario_id:uid, p_usuario_nome:unome, p_secao:f.get("secao"), p_titulo:f.get("titulo").trim(), p_critico:f.get("critico")==="on", p_ordem:Number(f.get("ordem")||0) });
    el.reset(); await recarregar();
  } catch (e) { setErro(msgErro(e)); } };

  const salvarEditItem = async (f) => { try {
    await rpc("exp_editar_item_modelo", { p_usuario_id:uid, p_usuario_nome:unome, p_id:editItem.id, p_secao:f.get("secao"), p_titulo:f.get("titulo").trim(), p_critico:f.get("critico")==="on", p_ordem:Number(f.get("ordem")||0), p_ativo:f.get("ativo")==="on" });
    setEditItem(null); await recarregar();
  } catch (e) { setErro(msgErro(e)); } };

  const cargasView = cargas.filter(x => verCanc || !x.cancelado).sort((a,b) => new Date(b.criado_em) - new Date(a.criado_em));
  const cargaAberta = abrirCarga ? cargas.find(c => c.id === abrirCarga) : null;
  const respostasCarga = abrirCarga ? respostas.filter(r => r.carga_id === abrirCarga) : [];

  const stats = {
    abertas: cargas.filter(c => !c.cancelado && c.status==="aberta").length,
    bloqueadas: cargas.filter(c => !c.cancelado && c.status==="bloqueada").length,
    concluidas: cargas.filter(c => !c.cancelado && c.status==="concluida").length,
    canceladas: cargas.filter(c => c.cancelado).length,
  };

  return <Shell titulo="Check List Expedição" eyebrow="Sementes Veneza · Expedição"
    tabs={[["cargas","Cargas"],["modelo","Itens do checklist"],["relatorios","Relatórios"],["alteracoes","Alterações"]]} tab={tab} setTab={setTab} onSair={onSair} loading={loading}>
    <Erro msg={erro} />

    {cargaAberta && <CargaDetalhe carga={cargaAberta} respostas={respostasCarga} onSalvarItem={salvarItem} onConcluirSecao={concluirSecao} onCancelar={cancelarCarga} onFechar={()=>setAbrirCarga(null)} />}

    {tab==="cargas" && <>
      <Aviso>Cada carga gera automaticamente o checklist com os itens ativos do modelo (seções "antes" e "depois" do carregamento). Um item crítico reprovado bloqueia a carga até a correção.</Aviso>
      <Titulo>Nova carga/expedição</Titulo>
      <CargaForm onSalvar={criarCarga} />
      <Titulo acao={<label style={{ fontSize:12, color:C.muted, display:"flex", gap:6, alignItems:"center", textTransform:"none", letterSpacing:0, fontWeight:400 }}><input type="checkbox" checked={verCanc} onChange={e=>setVerCanc(e.target.checked)} />mostrar canceladas</label>}>Cargas</Titulo>
      <Tabela rows={cargasView} onRow={x=>setAbrirCarga(x.id)} vazio="Nenhuma carga registrada." cols={[
        ["numero","Nº"],
        ["data","Data", x=>new Date(x.data+"T00:00:00").toLocaleDateString("pt-BR")],
        ["placa","Placa"], ["motorista","Motorista"], ["destino","Destino"],
        ["status","Status", x=>x.cancelado ? cancelBadge : <span style={{ color:corStatusCarga(x.status), fontWeight:700 }}>{rotuloStatusCarga(x.status)}</span>],
      ]} />
    </>}

    {tab==="modelo" && <>
      <Aviso>Editar um item não altera cargas já criadas — cada carga guarda uma cópia do checklist no momento em que foi aberta.</Aviso>
      <Titulo>Novo item do checklist</Titulo>
      <ItemModeloForm onSalvar={addItemModelo} />
      {editItem && <Modal titulo="Editar item" onFechar={()=>setEditItem(null)}>
        <form onSubmit={e=>{ e.preventDefault(); salvarEditItem(new FormData(e.currentTarget)); }} style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <Campo label="Seção"><select name="secao" defaultValue={editItem.secao} style={S.input}>{SECOES.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></Campo>
          <Campo label="Título"><input name="titulo" defaultValue={editItem.titulo} required style={S.input} /></Campo>
          <Campo label="Ordem"><input name="ordem" type="number" defaultValue={editItem.ordem} style={S.input} /></Campo>
          <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:13 }}><input type="checkbox" name="critico" defaultChecked={editItem.critico} /> Crítico (bloqueia despacho se reprovado)</label>
          <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:13 }}><input type="checkbox" name="ativo" defaultChecked={editItem.ativo} /> Ativo</label>
          <div style={{ display:"flex", gap:10, marginTop:4 }}><button style={S.btn}>Salvar</button><button type="button" style={S.btn2} onClick={()=>setEditItem(null)}>Cancelar</button></div>
        </form>
      </Modal>}
      {SECOES.map(([id,label]) => (
        <React.Fragment key={id}>
          <Titulo>{label}</Titulo>
          <Tabela rows={itensModelo.filter(i=>i.secao===id).sort((a,b)=>a.ordem-b.ordem)} vazio="Nenhum item cadastrado." cols={[
            ["ordem","Ordem"], ["titulo","Título"],
            ["critico","Crítico", x=>x.critico?"Sim":"Não"],
            ["ativo","Status", x=>x.ativo?"Ativo":"Inativo"],
            ["acoes","Ações", x=><BtnMini onClick={()=>setEditItem(x)}>Editar</BtnMini>],
          ]} />
        </React.Fragment>
      ))}
    </>}

    {tab==="relatorios" && <>
      <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
        <Stat rotulo="Abertas" valor={stats.abertas} />
        <Stat rotulo="Bloqueadas" valor={stats.bloqueadas} />
        <Stat rotulo="Concluídas" valor={stats.concluidas} />
        <Stat rotulo="Canceladas" valor={stats.canceladas} />
      </div>
      <Titulo>Exportação</Titulo>
      <button style={S.btn} onClick={()=>csv("cargas_expedicao.csv", [
        ["Nº","Data","Placa","Motorista","Transportadora","Destino","Status","Responsável antes","Conferido em (antes)","Responsável depois","Conferido em (depois)","Cancelada"],
        ...cargas.map(x=>[x.numero,x.data,x.placa,x.motorista,x.transportadora,x.destino,rotuloStatusCarga(x.status),x.responsavel_antes,x.respondido_antes_em,x.responsavel_depois,x.respondido_depois_em,x.cancelado?"sim":"não"]),
      ])}>Baixar CSV</button>
    </>}

    {tab==="alteracoes" && <Auditoria rows={audit} />}
  </Shell>;
}

import React from "react";
const { useState, useEffect } = React;
import { C } from "../../constants.js";
import { Stat } from "../../ui.jsx";
import { S, hoje, num, inserir, rpc, msgErro, csv, Campo, Tabela, Form, Erro, Aviso, Titulo, useDados, Shell, BtnMini, Modal, Auditoria, cancelBadge } from "./Common.jsx";

const TABELAS=["alm_itens","alm_movimentacoes","alm_inventarios","alm_inventario_itens","alm_categorias","alm_unidades","op_auditoria"];

function LinhaContagem({registro,item,unidade,onSalvar,bloqueado}) {
  const [valor,setValor]=useState(String(registro.contagem_fisica??0)),[salvando,setSalvando]=useState(false);
  useEffect(()=>setValor(String(registro.contagem_fisica??0)),[registro.contagem_fisica]);
  const salvar=async()=>{setSalvando(true);try{await onSalvar(registro.id,Number(valor))}finally{setSalvando(false)}};
  const diferenca=Number(valor||0)-Number(registro.saldo_sistema||0);
  return <tr>
    <td style={S.td}><b>{item?.codigo||"—"}</b></td><td style={S.td}>{item?.nome||"Item removido"}</td>
    <td style={S.td}>{num(registro.saldo_sistema)} {unidade}</td>
    <td style={S.td}><input aria-label={"Contagem de "+(item?.nome||"item")} type="number" min="0" step=".001" value={valor} disabled={bloqueado} onChange={e=>setValor(e.target.value)} style={{...S.input,width:120}}/></td>
    <td style={{...S.td,color:diferenca===0?C.muted:diferenca>0?C.green:C.clay,fontWeight:700}}>{diferenca>0?"+":""}{num(diferenca)} {unidade}</td>
    <td style={S.td}>{!bloqueado&&<button type="button" onClick={salvar} disabled={salvando} style={S.btn2}>{salvando?"Salvando…":"Salvar"}</button>}</td>
  </tr>;
}

export function Almoxarifado({onSair,nome,sessao}) {
  const [tab,setTab]=useState("movimentacoes"),[inventarioId,setInventarioId]=useState("");
  const [verCanc,setVerCanc]=useState(false),[editMov,setEditMov]=useState(null);
  const {dados,loading,erro,recarregar,setErro}=useDados(TABELAS,"alm");
  const itens=dados.alm_itens||[],movimentos=dados.alm_movimentacoes||[],inventarios=dados.alm_inventarios||[],contagens=dados.alm_inventario_itens||[],categorias=dados.alm_categorias||[],unidades=dados.alm_unidades||[];
  const audit=(dados.op_auditoria||[]).filter(a=>a.modulo==="almoxarifado");
  const itemPorId=Object.fromEntries(itens.map(x=>[x.id,x])),categoriaPorId=Object.fromEntries(categorias.map(x=>[x.id,x])),unidadePorId=Object.fromEntries(unidades.map(x=>[x.id,x]));
  const uid=sessao?.id,unome=sessao?.nome||nome;
  const saldo=id=>movimentos.filter(x=>x.item_id===id&&!x.cancelado).reduce((s,x)=>s+(x.tipo==="entrada"?1:-1)*Number(x.quantidade||0),0);
  const inventarioSelecionado=inventarios.find(x=>x.id===inventarioId)||inventarios.find(x=>x.status==="aberto")||inventarios[0]||null;
  const itensInventario=inventarioSelecionado?contagens.filter(x=>x.inventario_id===inventarioSelecionado.id):[];

  useEffect(()=>{if(!inventarioId&&inventarioSelecionado)setInventarioId(inventarioSelecionado.id)},[inventarioSelecionado?.id]);

  const addMovimento=async(f,el)=>{try{
    await rpc("alm_registrar_movimentacao",{p_item_id:f.get("item_id"),p_data:f.get("data"),p_tipo:f.get("tipo"),p_quantidade:Number(f.get("quantidade")),p_documento:f.get("documento")||null,p_responsavel:f.get("responsavel")||nome||null,p_observacao:f.get("observacao")||null});
    el.reset(); await recarregar();
  }catch(e){setErro(msgErro(e))}};
  const addItem=async(f,el)=>{try{
    await rpc("alm_criar_item",{p_nome:f.get("nome").trim(),p_categoria_id:f.get("categoria_id"),p_unidade_id:f.get("unidade_id"),p_estoque_minimo:Number(f.get("estoque_minimo")||0)});
    el.reset(); await recarregar();
  }catch(e){setErro(msgErro(e))}};
  const addCategoria=async(f,el)=>{try{
    const tag=f.get("tag").toUpperCase().replace(/[^A-Z0-9]/g,"");
    await inserir("alm_categorias",{nome:f.get("nome").trim(),tag,proximo_numero:1,ativo:true});el.reset();await recarregar();
  }catch(e){setErro(msgErro(e))}};
  const addUnidade=async(f,el)=>{try{
    await inserir("alm_unidades",{nome:f.get("nome").trim(),sigla:f.get("sigla").trim(),ativo:true});el.reset();await recarregar();
  }catch(e){setErro(msgErro(e))}};
  const abrirInventario=async(f,el)=>{try{
    const id=await rpc("alm_abrir_inventario",{p_data:f.get("data"),p_responsavel:f.get("responsavel")||nome||null,p_observacao:f.get("observacao")||null});
    el.reset();setInventarioId(id);await recarregar();
  }catch(e){setErro(msgErro(e))}};
  const salvarContagem=async(id,valor)=>{try{await rpc("alm_atualizar_contagem",{p_inventario_item_id:id,p_contagem:valor});await recarregar()}catch(e){setErro(msgErro(e))}};
  const [editItem,setEditItem]=useState(null);
  const salvarEditItem=async(f)=>{try{
    await rpc("alm_atualizar_item",{p_usuario_id:uid,p_usuario_nome:unome,p_id:editItem.id,p_nome:f.get("nome").trim(),p_categoria_id:f.get("categoria_id"),p_unidade_id:f.get("unidade_id"),p_estoque_minimo:Number(f.get("estoque_minimo")||0),p_ativo:f.get("ativo")==="on"});
    setEditItem(null); await recarregar();
  }catch(e){setErro(msgErro(e));setEditItem(null)}};
  const concluirInventario=async()=>{if(!inventarioSelecionado)return;if(!window.confirm("Concluir o inventário e ajustar o estoque pelas divergências?"))return;try{
    await rpc("alm_concluir_inventario",{p_inventario_id:inventarioSelecionado.id,p_responsavel:nome||inventarioSelecionado.responsavel||null});await recarregar();
  }catch(e){setErro(msgErro(e))}};
  const setAtivo=async(entidade,x)=>{try{await rpc("op_definir_ativo",{p_usuario_id:uid,p_usuario_nome:unome,p_entidade:entidade,p_id:x.id,p_ativo:!x.ativo});await recarregar()}catch(e){setErro(msgErro(e))}};
  const cancelarMov=async x=>{if(!confirm("Cancelar esta movimentação? O saldo do item será recalculado."))return;try{await rpc("alm_cancelar_movimentacao",{p_usuario_id:uid,p_usuario_nome:unome,p_id:x.id});await recarregar()}catch(e){setErro(msgErro(e))}};
  const salvarEditMov=async f=>{try{
    await rpc("alm_editar_movimentacao",{p_usuario_id:uid,p_usuario_nome:unome,p_id:editMov.id,p_data:f.get("data"),p_tipo:f.get("tipo"),p_quantidade:Number(f.get("quantidade")),p_documento:f.get("documento")||null,p_observacao:f.get("observacao")||null});
    setEditMov(null); await recarregar();
  }catch(e){setErro(msgErro(e))}};

  const abaixo=itens.filter(x=>x.ativo&&saldo(x.id)<Number(x.estoque_minimo||0));
  const unidadeItem=x=>unidadePorId[x.unidade_id]?.sigla||x.unidade||"";
  const totalItens=itens.reduce((s,x)=>s+saldo(x.id),0);
  const movimentosView=movimentos.filter(x=>verCanc||!x.cancelado);
  const acaoAtivo=(entidade,x)=><BtnMini cor={x.ativo?C.clay:C.green} onClick={()=>setAtivo(entidade,x)}>{x.ativo?"Inativar":"Ativar"}</BtnMini>;

  return <Shell titulo="Almoxarifado" eyebrow="Sementes Veneza · Estoque"
    tabs={[["movimentacoes","Movimentações"],["itens","Itens"],["cadastros","Categorias & unidades"],["inventarios","Inventários"],["relatorios","Relatórios"],["alteracoes","Alterações"]]} tab={tab} setTab={setTab} onSair={onSair} loading={loading}>
    <Erro msg={erro}/>
    {editMov&&<Modal titulo={"Editar movimentação · "+(itemPorId[editMov.item_id]?.nome||"")} onFechar={()=>setEditMov(null)}>
      <form onSubmit={e=>{e.preventDefault();salvarEditMov(new FormData(e.currentTarget))}} style={{display:"flex",flexDirection:"column",gap:12}}>
        <Campo label="Data"><input name="data" type="date" required defaultValue={editMov.data} style={S.input}/></Campo>
        <Campo label="Tipo"><select name="tipo" defaultValue={editMov.tipo} style={S.input}><option value="entrada">Entrada</option><option value="saida">Saída</option></select></Campo>
        <Campo label="Quantidade"><input name="quantidade" type="number" min=".001" step=".001" required defaultValue={editMov.quantidade} style={S.input}/></Campo>
        <Campo label="Documento"><input name="documento" defaultValue={editMov.documento||""} style={S.input}/></Campo>
        <Campo label="Observação"><input name="observacao" defaultValue={editMov.observacao||""} style={S.input}/></Campo>
        <div style={{display:"flex",gap:10,marginTop:4}}><button style={S.btn}>Salvar</button><button type="button" style={S.btn2} onClick={()=>setEditMov(null)}>Cancelar</button></div>
      </form>
    </Modal>}
    {tab==="movimentacoes"&&<><Aviso>Entradas aumentam o saldo e saídas diminuem. O sistema bloqueia saídas maiores que o estoque disponível.</Aviso>
      <Titulo>Nova movimentação</Titulo><Form onSubmit={addMovimento}>
        <Campo label="Item"><select name="item_id" required style={S.input}><option value="">Selecione</option>{itens.filter(x=>x.ativo).map(x=><option key={x.id} value={x.id}>{x.codigo} · {x.nome} · saldo {num(saldo(x.id))} {unidadeItem(x)}</option>)}</select></Campo>
        <Campo label="Data"><input name="data" type="date" required defaultValue={hoje()} style={S.input}/></Campo>
        <Campo label="Tipo"><select name="tipo" style={S.input}><option value="entrada">Entrada</option><option value="saida">Saída</option></select></Campo>
        <Campo label="Quantidade"><input name="quantidade" type="number" min=".001" step=".001" required style={S.input}/></Campo>
        <Campo label="Documento"><input name="documento" style={S.input}/></Campo>
        <Campo label="Responsável"><input name="responsavel" defaultValue={nome} style={S.input}/></Campo>
        <Campo label="Observação" wide><input name="observacao" style={S.input}/></Campo>
      </Form>
      <Titulo acao={<label style={{fontSize:12,color:C.muted,display:"flex",gap:6,alignItems:"center",textTransform:"none",letterSpacing:0,fontWeight:400}}><input type="checkbox" checked={verCanc} onChange={e=>setVerCanc(e.target.checked)}/>mostrar cancelados</label>}>Histórico</Titulo>
      <Tabela rows={movimentosView} cols={[["data","Data"],["item","Item",x=>itemPorId[x.item_id]?.nome||"—"],["tipo","Tipo",x=><b style={{color:x.tipo==="entrada"?C.green:C.clay}}>{x.tipo==="entrada"?"Entrada":"Saída"}</b>],["quantidade","Quantidade",x=>num(x.quantidade)+" "+unidadeItem(itemPorId[x.item_id]||{})],["documento","Documento"],["responsavel","Responsável"],["origem","Origem",x=>x.origem==="inventario"?"Inventário":"Manual"],["acoes","Ações",x=>x.cancelado?cancelBadge:x.origem!=="manual"?"—":<div style={{whiteSpace:"nowrap"}}><BtnMini onClick={()=>setEditMov(x)}>Editar</BtnMini><BtnMini cor={C.clay} onClick={()=>cancelarMov(x)}>Cancelar</BtnMini></div>]]}/>
    </>}
    {tab==="itens"&&<><Aviso>O código é gerado automaticamente pela tag da categoria. Exemplo: categoria EPI gera EPI0001, EPI0002 e assim por diante.</Aviso>
      <Titulo>Novo item</Titulo><Form onSubmit={addItem}>
        <Campo label="Nome do item" wide><input name="nome" required style={S.input}/></Campo>
        <Campo label="Categoria"><select name="categoria_id" required style={S.input}><option value="">Selecione</option>{categorias.filter(x=>x.ativo).map(x=><option key={x.id} value={x.id}>{x.nome} ({x.tag})</option>)}</select></Campo>
        <Campo label="Unidade de medida"><select name="unidade_id" required style={S.input}><option value="">Selecione</option>{unidades.filter(x=>x.ativo).map(x=><option key={x.id} value={x.id}>{x.nome} ({x.sigla})</option>)}</select></Campo>
        <Campo label="Estoque mínimo"><input name="estoque_minimo" type="number" min="0" step=".001" defaultValue="0" style={S.input}/></Campo>
      </Form>
      <Titulo>Estoque atual <span style={{fontSize:11,fontWeight:400,color:C.muted,textTransform:"none",letterSpacing:0}}>· clique numa linha para editar</span></Titulo>
      <Tabela onRow={setEditItem} rows={itens} cols={[["codigo","Código",x=><b>{x.codigo}</b>],["nome","Item"],["categoria","Categoria",x=>categoriaPorId[x.categoria_id]?.nome||x.categoria],["unidade","Unidade",x=>unidadeItem(x)],["saldo","Saldo",x=><b style={{color:saldo(x.id)<Number(x.estoque_minimo||0)?C.clay:C.ink}}>{num(saldo(x.id))} {unidadeItem(x)}</b>],["estoque_minimo","Mínimo",x=>num(x.estoque_minimo)+" "+unidadeItem(x)],["ativo","Status",x=>x.ativo?"Ativo":"Inativo"]]}/>
    </>}
    {tab==="cadastros"&&<><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:18}}>
      <div><Titulo>Nova categoria</Titulo><Form onSubmit={addCategoria}><Campo label="Nome"><input name="nome" required style={S.input}/></Campo><Campo label="Tag do código"><input name="tag" required minLength="2" maxLength="8" placeholder="EPI" onInput={e=>e.currentTarget.value=e.currentTarget.value.toUpperCase().replace(/[^A-Z0-9]/g,"")} style={S.input}/></Campo></Form></div>
      <div><Titulo>Nova unidade de medida</Titulo><Form onSubmit={addUnidade}><Campo label="Nome"><input name="nome" required placeholder="Quilograma" style={S.input}/></Campo><Campo label="Sigla"><input name="sigla" required maxLength="10" placeholder="kg" style={S.input}/></Campo></Form></div>
      </div>
      <Titulo>Categorias</Titulo><Tabela rows={categorias} cols={[["nome","Categoria"],["tag","Tag"],["proximo","Próximo código",x=>x.tag+String(x.proximo_numero).padStart(4,"0")],["ativo","Status",x=>x.ativo?"Ativa":"Inativa"],["acoes","Ações",x=>acaoAtivo("categoria",x)]]}/>
      <Titulo>Unidades de medida</Titulo><Tabela rows={unidades} cols={[["nome","Unidade"],["sigla","Sigla"],["ativo","Status",x=>x.ativo?"Ativa":"Inativa"],["acoes","Ações",x=>acaoAtivo("unidade",x)]]}/>
    </>}
    {tab==="inventarios"&&<><Aviso>Abra um inventário, informe a contagem física de cada item e salve. Ao concluir, as divergências geram entradas ou saídas automaticamente.</Aviso>
      <Titulo>Novo inventário</Titulo><Form onSubmit={abrirInventario} label="Abrir inventário">
        <Campo label="Data"><input name="data" type="date" required defaultValue={hoje()} style={S.input}/></Campo>
        <Campo label="Responsável"><input name="responsavel" defaultValue={nome} style={S.input}/></Campo>
        <Campo label="Observação" wide><input name="observacao" style={S.input}/></Campo>
      </Form>
      <Titulo>Inventários</Titulo><Tabela rows={inventarios} onRow={x=>setInventarioId(x.id)} cols={[["data","Data"],["status","Status",x=><b style={{color:x.status==="aberto"?C.accent:C.muted}}>{x.status}</b>],["responsavel","Responsável"],["itens","Itens",x=>contagens.filter(c=>c.inventario_id===x.id).length],["observacao","Observação"]]}/>
      {inventarioSelecionado&&<><Titulo acao={inventarioSelecionado.status==="aberto"?<button onClick={concluirInventario} style={S.btn}>Concluir e ajustar estoque</button>:null}>Contagem de {inventarioSelecionado.data} · {inventarioSelecionado.status}</Titulo>
        <div style={{overflow:"auto",...S.card,padding:0}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:760}}><thead><tr>{["Código","Item","Saldo do sistema","Contagem física","Diferença",""].map(x=><th key={x} style={S.th}>{x}</th>)}</tr></thead><tbody>{!itensInventario.length&&<tr><td colSpan="6" style={S.td}>Nenhum item neste inventário.</td></tr>}{itensInventario.map(r=>{const item=itemPorId[r.item_id];return <LinhaContagem key={r.id} registro={r} item={item} unidade={unidadeItem(item||{})} onSalvar={salvarContagem} bloqueado={inventarioSelecionado.status!=="aberto"}/>})}</tbody></table></div>
      </>}
    </>}
    {tab==="relatorios"&&<><div style={{display:"flex",gap:12,flexWrap:"wrap"}}><Stat rotulo="Itens cadastrados" valor={itens.length}/><Stat rotulo="Saldo total" valor={num(totalItens)}/><Stat rotulo="Abaixo do mínimo" valor={abaixo.length}/><Stat rotulo="Movimentações" valor={movimentos.filter(x=>!x.cancelado).length}/></div>
      <Titulo>Itens abaixo do mínimo</Titulo><Tabela rows={abaixo} cols={[["codigo","Código"],["nome","Item"],["saldo","Saldo",x=>num(saldo(x.id))+" "+unidadeItem(x)],["estoque_minimo","Mínimo",x=>num(x.estoque_minimo)+" "+unidadeItem(x)]]}/>
      <Titulo>Exportação</Titulo><button style={S.btn} onClick={()=>csv("estoque.csv",[["Código","Item","Categoria","Unidade","Saldo","Mínimo"],...itens.map(x=>[x.codigo,x.nome,categoriaPorId[x.categoria_id]?.nome||x.categoria,unidadeItem(x),saldo(x.id),x.estoque_minimo])])}>Baixar CSV</button>
    </>}
    {tab==="alteracoes"&&<Auditoria rows={audit}/>}
    {editItem&&<Modal titulo={"Editar item · "+editItem.codigo} onFechar={()=>setEditItem(null)}>
      <form onSubmit={e=>{e.preventDefault();salvarEditItem(new FormData(e.currentTarget))}} style={{display:"flex",flexDirection:"column",gap:12}}>
        <Campo label="Nome do item"><input name="nome" required defaultValue={editItem.nome} style={S.input}/></Campo>
        <Campo label="Categoria"><select name="categoria_id" required defaultValue={editItem.categoria_id} style={S.input}>{categorias.filter(x=>x.ativo||x.id===editItem.categoria_id).map(x=><option key={x.id} value={x.id}>{x.nome} ({x.tag})</option>)}</select></Campo>
        <Campo label="Unidade de medida"><select name="unidade_id" required defaultValue={editItem.unidade_id} style={S.input}>{unidades.filter(x=>x.ativo||x.id===editItem.unidade_id).map(x=><option key={x.id} value={x.id}>{x.nome} ({x.sigla})</option>)}</select></Campo>
        <Campo label="Estoque mínimo"><input name="estoque_minimo" type="number" min="0" step=".001" required defaultValue={editItem.estoque_minimo} style={S.input}/></Campo>
        <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.ink}}><input type="checkbox" name="ativo" defaultChecked={editItem.ativo}/> Item ativo</label>
        <div style={{display:"flex",gap:10,marginTop:4}}>
          <button style={S.btn}>Salvar</button>
          <button type="button" style={S.btn2} onClick={()=>setEditItem(null)}>Cancelar</button>
        </div>
      </form>
    </Modal>}
  </Shell>;
}

import React from "react";
const { useState } = React;
import { C, SERIF, SH } from "../../constants.js";
import { salvarEquipe } from "./choreidb.js";

const CORES = ["#004D94","#B07D10","#2F8F2C","#B5562F","#6A7682","#7CC24B","#8E5AA3","#0F8791"];

const VAZIO = { id:null, nome:"", cor:"#004D94", ordem:0, responsavel_id:null, ativo:true };

// CRUD das equipes — só master abre essa tela (Chorei.jsx filtra a tab).
export function Equipes({ equipes, usuarios, sessao, recarregar }) {
  const [form, setForm] = useState(VAZIO);
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  const editar = (e) => { setErro(""); setForm({ id:e.id, nome:e.nome, cor:e.cor||"#004D94", ordem:e.ordem||0, responsavel_id:e.responsavel_id||null, ativo:!!e.ativo }); };
  const novo   = ()  => { setErro(""); setForm(VAZIO); };

  const salvar = async (ev) => {
    ev.preventDefault(); setErro(""); setBusy(true);
    try {
      await salvarEquipe(sessao.id, {
        id: form.id, nome: form.nome, cor: form.cor, ordem: form.ordem,
        responsavelId: form.responsavel_id, ativo: form.ativo,
      });
      setForm(VAZIO);
      await recarregar();
    } catch (err) { setErro(err.message || String(err)); }
    setBusy(false);
  };

  const toggleAtivo = async (e) => {
    setErro("");
    try {
      await salvarEquipe(sessao.id, { id:e.id, nome:e.nome, cor:e.cor, ordem:e.ordem,
        responsavelId:e.responsavel_id, ativo:!e.ativo });
      await recarregar();
    } catch (err) { setErro(err.message || String(err)); }
  };

  const inp = { border:"1px solid "+C.line, borderRadius:8, padding:"8px 10px", fontSize:13.5, background:C.paper, color:C.ink, width:"100%" };
  const lab = { fontSize:12, fontWeight:600, color:C.muted, display:"flex", flexDirection:"column", gap:4 };

  return (
    <div style={{ marginTop:16 }}>
      <div style={{ fontSize:11, letterSpacing:1, textTransform:"uppercase", color:C.accent, fontWeight:700 }}>Master</div>
      <div style={{ fontFamily:SERIF, fontSize:19, color:C.brand, fontWeight:600, marginBottom:12 }}>
        Equipes e responsáveis
      </div>

      <form onSubmit={salvar} style={{ background:C.card, border:"1px solid "+C.line, borderRadius:12,
        padding:14, boxShadow:SH, display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>
          {form.id ? "Editar equipe" : "Nova equipe"}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:10 }}>
          <label style={lab}>Nome
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome:e.target.value }))} required style={inp} />
          </label>
          <label style={lab}>Ordem
            <input type="number" value={form.ordem} onChange={e => setForm(f => ({ ...f, ordem:Number(e.target.value)||0 }))} style={inp} />
          </label>
          <label style={lab}>Responsável
            <select value={form.responsavel_id||""} onChange={e => setForm(f => ({ ...f, responsavel_id:e.target.value||null }))} style={inp}>
              <option value="">— sem responsável —</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome} {u.role==="master"?"(master)":""}</option>)}
            </select>
          </label>
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:C.muted, marginBottom:6 }}>Cor</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {CORES.map(cor => (
              <button type="button" key={cor} onClick={() => setForm(f => ({ ...f, cor }))}
                style={{ width:28, height:28, borderRadius:"50%", background:cor, cursor:"pointer",
                  border: form.cor===cor ? "3px solid "+C.ink : "2px solid "+C.line }} />
            ))}
          </div>
        </div>
        <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:C.ink }}>
          <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo:e.target.checked }))} />
          Equipe ativa
        </label>
        {erro && (
          <div style={{ fontSize:13, color:C.clay, background:"#FBEAE3", border:"1px solid "+C.clay, borderRadius:8, padding:"8px 10px" }}>
            {erro}
          </div>
        )}
        <div style={{ display:"flex", gap:10 }}>
          <button disabled={busy} style={{ background:C.brand, color:"#fff", border:"none", borderRadius:8,
            padding:"9px 16px", fontSize:13.5, fontWeight:600, cursor:busy?"default":"pointer" }}>
            {form.id ? "Salvar alterações" : "+ Criar equipe"}
          </button>
          {form.id && (
            <button type="button" onClick={novo}
              style={{ background:"transparent", color:C.muted, border:"1px solid "+C.line, borderRadius:8, padding:"9px 14px", fontSize:13, cursor:"pointer" }}>
              Cancelar edição
            </button>
          )}
        </div>
      </form>

      <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:8 }}>
        {equipes.length === 0 && <div style={{ fontSize:13, color:C.muted }}>Nenhuma equipe cadastrada.</div>}
        {equipes.map(e => {
          const resp = usuarios.find(u => u.id === e.responsavel_id);
          return (
            <div key={e.id} style={{ display:"flex", alignItems:"center", gap:10, background:C.card,
              border:"1px solid "+C.line, borderLeft:"4px solid "+(e.cor||C.brand), borderRadius:10,
              padding:"10px 12px", opacity:e.ativo?1:0.55 }}>
              <div style={{ flex:"1 1 auto" }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.ink }}>
                  {e.nome}
                  {!e.ativo && <span style={{ fontSize:11, color:C.clay, marginLeft:8, fontWeight:700 }}>inativa</span>}
                </div>
                <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
                  Responsável: <b style={{ color:resp?C.ink:C.clay }}>{resp?.nome || "não definido"}</b>
                  {" · "}Ordem: {e.ordem||0}
                </div>
              </div>
              <button onClick={() => editar(e)}
                style={{ background:"transparent", color:C.brand, border:"1px solid "+C.line, borderRadius:7, padding:"5px 10px", fontSize:12.5, cursor:"pointer" }}>
                Editar
              </button>
              <button onClick={() => toggleAtivo(e)}
                style={{ background:"transparent", color:e.ativo?C.clay:C.green,
                  border:"1px solid "+(e.ativo?C.clay:C.green), borderRadius:7, padding:"5px 10px", fontSize:12.5, cursor:"pointer" }}>
                {e.ativo ? "Inativar" : "Reativar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

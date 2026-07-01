import React from "react";
const { useState, useEffect } = React;
import { C, SERIF, SH, SH2 } from "./constants.js";
import { sb } from "./db.js";

const inp = { border:"1px solid "+C.line, borderRadius:8, padding:"10px 12px", fontSize:14, background:C.paper, color:C.ink, width:"100%", boxSizing:"border-box" };
const btn = { background:C.brand, color:"#fff", border:0, borderRadius:8, padding:"11px 16px", fontSize:14, fontWeight:700, cursor:"pointer" };
const btnGhost = { background:"transparent", color:C.brand, border:"1px solid "+C.line, borderRadius:8, padding:"8px 13px", fontSize:13, fontWeight:600, cursor:"pointer" };
const lbl = { fontSize:12, fontWeight:600, color:C.muted, display:"flex", flexDirection:"column", gap:6 };

// ---------------------------------------------------------------------------
// Tela de login (entrada do app)
// ---------------------------------------------------------------------------
export function Login({ onEntrar }) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  const logo = typeof window !== "undefined" ? window.LOGO : null;

  const entrar = async (e) => {
    e.preventDefault(); setErro(""); setBusy(true);
    try {
      const { data, error } = await sb.rpc("app_login", { p_usuario: usuario, p_senha: senha });
      if (error) throw error;
      const u = Array.isArray(data) ? data[0] : data;
      if (!u) setErro("Usuário ou senha inválidos.");
      else onEntrar(u);
    } catch (x) { setErro(x.message || String(x)); }
    setBusy(false);
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <form onSubmit={entrar} style={{ background:C.card, border:"1px solid "+C.line, borderRadius:16, boxShadow:SH2, padding:"30px 28px", width:"100%", maxWidth:380, display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ textAlign:"center", marginBottom:4 }}>
          {logo && <img src={logo} alt="Sementes Veneza" style={{ height:70, display:"block", margin:"0 auto 10px" }} />}
          <div style={{ fontSize:10, letterSpacing:2, textTransform:"uppercase", color:C.accent, fontWeight:700 }}>Sementes Veneza</div>
          <h1 style={{ fontFamily:SERIF, fontSize:22, margin:"2px 0 0", color:C.brand, fontWeight:600 }}>Central de aplicativos</h1>
        </div>
        <label style={lbl}>Usuário<input value={usuario} onChange={e=>setUsuario(e.target.value)} autoFocus autoComplete="username" style={inp} /></label>
        <label style={lbl}>Senha<input type="password" value={senha} onChange={e=>setSenha(e.target.value)} autoComplete="current-password" style={inp} /></label>
        {erro && <div style={{ fontSize:13, color:C.clay, background:"#FBEAE3", border:"1px solid "+C.clay, borderRadius:8, padding:"8px 10px" }}>{erro}</div>}
        <button disabled={busy} style={{ ...btn, opacity:busy?0.7:1 }}>{busy ? "Entrando…" : "Entrar"}</button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gestão de usuários (modal) — só para o master
// ---------------------------------------------------------------------------
const VAZIO = { id:null, usuario:"", nome:"", senha:"", role:"comum", modulos:[], ativo:true };

export function GerenciarAcesso({ sessao, modulos, onFechar }) {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(VAZIO);
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  const carregar = async () => {
    try {
      const { data, error } = await sb.rpc("app_listar_usuarios", { p_master_id: sessao.id });
      if (error) throw error;
      setLista(data || []);
    } catch (x) { setErro(x.message || String(x)); }
  };
  useEffect(() => { carregar(); }, []);

  const editar = (u) => { setErro(""); setForm({ id:u.id, usuario:u.usuario, nome:u.nome, senha:"", role:u.role, modulos:u.modulos||[], ativo:u.ativo }); };
  const novo = () => { setErro(""); setForm(VAZIO); };
  const toggleMod = (id) => setForm(f => ({ ...f, modulos: f.modulos.includes(id) ? f.modulos.filter(m=>m!==id) : [...f.modulos, id] }));

  const salvar = async (e) => {
    e.preventDefault(); setErro(""); setBusy(true);
    try {
      const { error } = await sb.rpc("app_salvar_usuario", {
        p_master_id: sessao.id, p_id: form.id, p_usuario: form.usuario, p_nome: form.nome,
        p_senha: form.senha, p_role: form.role, p_modulos: form.modulos, p_ativo: form.ativo,
      });
      if (error) throw error;
      setForm(VAZIO);
      await carregar();
    } catch (x) { setErro(x.message || String(x)); }
    setBusy(false);
  };

  const toggleAtivo = async (u) => {
    setErro("");
    try {
      const { error } = await sb.rpc("app_salvar_usuario", {
        p_master_id: sessao.id, p_id: u.id, p_usuario: u.usuario, p_nome: u.nome,
        p_senha: "", p_role: u.role, p_modulos: u.modulos||[], p_ativo: !u.ativo,
      });
      if (error) throw error;
      await carregar();
    } catch (x) { setErro(x.message || String(x)); }
  };

  return (
    <div onClick={onFechar} style={{ position:"fixed", inset:0, background:"rgba(28,42,54,.5)", zIndex:120, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 16px", overflowY:"auto" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.card, borderRadius:14, border:"1px solid "+C.line, boxShadow:SH2, width:"100%", maxWidth:620, padding:"22px 24px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <div style={{ fontFamily:SERIF, fontSize:19, color:C.brand }}>Usuários e permissões</div>
          <button onClick={onFechar} style={btnGhost}>Fechar</button>
        </div>

        <form onSubmit={salvar} style={{ border:"1px solid "+C.line, borderRadius:12, padding:16, display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>{form.id ? "Editar usuário" : "Novo usuário"}</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:12 }}>
            <label style={lbl}>Login<input value={form.usuario} onChange={e=>setForm(f=>({...f,usuario:e.target.value}))} placeholder="ex.: joao" style={inp} /></label>
            <label style={lbl}>Nome<input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Nome do colaborador" style={inp} /></label>
            <label style={lbl}>{form.id ? "Nova senha (deixe em branco p/ manter)" : "Senha"}<input type="password" value={form.senha} onChange={e=>setForm(f=>({...f,senha:e.target.value}))} autoComplete="new-password" style={inp} /></label>
            <label style={lbl}>Papel<select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} style={inp}><option value="comum">Comum</option><option value="master">Master (acesso total)</option></select></label>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:C.muted, marginBottom:8 }}>Módulos permitidos {form.role==="master" && <span style={{ color:C.accent }}>· master vê todos</span>}</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, opacity:form.role==="master"?0.5:1 }}>
              {modulos.map(m => (
                <label key={m.id} style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, border:"1px solid "+C.line, borderRadius:8, padding:"6px 10px", cursor:form.role==="master"?"default":"pointer", background: form.modulos.includes(m.id)?C.sage:"transparent" }}>
                  <input type="checkbox" disabled={form.role==="master"} checked={form.role==="master"||form.modulos.includes(m.id)} onChange={()=>toggleMod(m.id)} />
                  {m.icone} {m.nome}
                </label>
              ))}
            </div>
          </div>
          {erro && <div style={{ fontSize:13, color:C.clay, background:"#FBEAE3", border:"1px solid "+C.clay, borderRadius:8, padding:"8px 10px" }}>{erro}</div>}
          <div style={{ display:"flex", gap:10 }}>
            <button disabled={busy} style={{ ...btn, opacity:busy?0.7:1 }}>{form.id ? "Salvar alterações" : "+ Criar usuário"}</button>
            {form.id && <button type="button" onClick={novo} style={btnGhost}>Cancelar edição</button>}
          </div>
        </form>

        <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:16 }}>
          {lista.length===0 && <div style={{ fontSize:13, color:C.muted }}>Nenhum usuário ainda.</div>}
          {lista.map(u => (
            <div key={u.id} style={{ display:"flex", alignItems:"center", gap:10, border:"1px solid "+C.line, borderRadius:10, padding:"9px 12px", opacity:u.ativo?1:0.55 }}>
              <div style={{ flex:"1 1 auto" }}>
                <span style={{ fontSize:14, color:C.ink, fontWeight:700 }}>{u.nome}</span>
                <span style={{ fontSize:12.5, color:C.muted, marginLeft:8 }}>@{u.usuario}</span>
                {u.role==="master" && <span style={{ fontSize:11, color:C.brand, marginLeft:8, fontWeight:700 }}>MASTER</span>}
                {!u.ativo && <span style={{ fontSize:11, color:C.clay, marginLeft:8, fontWeight:700 }}>inativo</span>}
                <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{u.role==="master" ? "Todos os módulos" : (u.modulos?.length ? u.modulos.map(id=>modulos.find(m=>m.id===id)?.nome||id).join(" · ") : "Sem módulos")}</div>
              </div>
              <button onClick={()=>editar(u)} style={btnGhost}>Editar</button>
              <button onClick={()=>toggleAtivo(u)} style={{ ...btnGhost, color:u.ativo?C.clay:C.green, borderColor:u.ativo?C.clay:C.green }}>{u.ativo ? "Inativar" : "Reativar"}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

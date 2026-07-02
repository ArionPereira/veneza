import React from "react";
const { useState, useMemo } = React;
import { C, SERIF, SH } from "../../constants.js";
import { TIPOS, tipoInfo, ehTerminal, fmtData, hojeISO } from "./choreiconst.js";
import { criarItem } from "./choreidb.js";
import { ItemCard } from "./ItemCard.jsx";

const inp = { border:"1px solid "+C.line, borderRadius:8, padding:"8px 10px", fontSize:13.5, background:C.paper, color:C.ink, width:"100%" };
const lab = { fontSize:11, color:C.muted, fontWeight:600, marginBottom:3 };

// tela do dia — três colunas com os blocos + form pra adicionar
export function EquipeDia({ equipe, itens, sessao, usuarios, recarregar }) {
  const [erro, setErro] = useState("");
  const [novo, setNovo] = useState({ tipo:"dificuldade", texto:"", responsavel:"", prazo:"" });
  const [salvando, setSalvando] = useState(false);

  const eMaster = sessao?.role === "master";
  const eResponsavel = equipe?.responsavel_id === sessao?.id;
  const podeEscrever = eMaster || eResponsavel;

  const hoje = hojeISO();

  // separa por bloco
  const criadosHoje = itens.filter(i => (i.criado_em || "").slice(0,10) === hoje);
  const pendentesHerdados = itens.filter(i =>
    (i.criado_em || "").slice(0,10) < hoje &&
    !ehTerminal(i.status)
  );

  const dificuldadesHoje = criadosHoje.filter(i => i.tipo === "dificuldade");
  const planosHoje       = criadosHoje.filter(i => i.tipo === "plano");
  const avisosHoje       = criadosHoje.filter(i => i.tipo === "aviso");
  const ontemHoje        = criadosHoje.filter(i => i.tipo === "ontem");

  const salvar = async () => {
    setErro("");
    if (!novo.texto.trim()) { setErro("Escreva o texto do item."); return; }
    setSalvando(true);
    try {
      const respUser = usuarios.find(u => u.id === novo.responsavel);
      await criarItem(sessao.id, {
        equipeId: equipe.id,
        tipo: novo.tipo,
        texto: novo.texto.trim(),
        responsavelId: novo.responsavel || null,
        responsavelNome: respUser?.nome || null,
        prazo: novo.prazo || null,
      });
      setNovo({ tipo: novo.tipo, texto:"", responsavel:"", prazo:"" });
      await recarregar();
    } catch (err) { setErro(err.message || String(err)); }
    setSalvando(false);
  };

  const Bloco = ({ titulo, sub, cor, itens: lista, vazio }) => (
    <div style={{ background:C.card, border:"1px solid "+C.line, borderTop:"3px solid "+cor,
      borderRadius:12, padding:"12px 14px", boxShadow:SH, display:"flex", flexDirection:"column", gap:8, minHeight:120 }}>
      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between" }}>
        <span style={{ fontFamily:SERIF, fontSize:15, color:C.brand, fontWeight:600 }}>{titulo}</span>
        <span style={{ fontSize:11.5, color:C.muted, fontWeight:600, background:C.sage, borderRadius:20, padding:"1px 8px" }}>{lista.length}</span>
      </div>
      {sub && <div style={{ fontSize:11.5, color:C.muted, marginTop:-4 }}>{sub}</div>}
      {lista.length === 0 && <div style={{ fontSize:12.5, color:C.muted, fontStyle:"italic" }}>{vazio}</div>}
      {lista.map(i => (
        <ItemCard key={i.id} item={i} sessao={sessao} usuarios={usuarios}
          podeEscrever={podeEscrever} recarregar={recarregar} onErro={setErro} />
      ))}
    </div>
  );

  return (
    <>
      {/* Cabeçalho do Chōrei */}
      <div style={{ background:C.card, border:"1px solid "+C.line, borderLeft:"4px solid "+(equipe.cor||C.brand),
        borderRadius:12, padding:"14px 18px", marginTop:16, boxShadow:SH }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
          <div>
            <div style={{ fontSize:11, letterSpacing:1, textTransform:"uppercase", color:C.accent, fontWeight:700 }}>
              Chōrei de hoje · {fmtData(hoje)}
            </div>
            <div style={{ fontFamily:SERIF, fontSize:20, color:C.brand, fontWeight:600, marginTop:2 }}>
              Equipe {equipe.nome}
            </div>
          </div>
          <div style={{ fontSize:12.5, color:C.muted, textAlign:"right" }}>
            {equipe.responsavel_id ? (
              <>Facilitador: <b style={{ color:C.ink }}>{usuarios.find(u => u.id === equipe.responsavel_id)?.nome || "—"}</b></>
            ) : (
              <span style={{ color:C.clay }}>Sem responsável definido</span>
            )}
            {!podeEscrever && (
              <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>Você está em modo leitura</div>
            )}
          </div>
        </div>
      </div>

      {/* Form pra adicionar item — só se puder escrever */}
      {podeEscrever && (
        <div style={{ background:C.card, border:"1px solid "+C.line, borderRadius:12, padding:"14px 16px", marginTop:14, boxShadow:SH }}>
          <div style={{ fontSize:12, color:C.muted, fontWeight:600, marginBottom:8 }}>Adicionar item</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
            {TIPOS.map(t => (
              <button key={t.id} onClick={() => setNovo(n => ({ ...n, tipo:t.id }))}
                style={{ border:"1px solid "+(novo.tipo===t.id?t.cor:C.line),
                  background:novo.tipo===t.id?t.cor:C.card, color:novo.tipo===t.id?"#fff":C.muted,
                  borderRadius:20, padding:"5px 12px", fontSize:12.5, fontWeight:600, cursor:"pointer" }}>
                {t.icone} {t.label}
              </button>
            ))}
          </div>
          <textarea value={novo.texto} onChange={e => setNovo(n => ({ ...n, texto:e.target.value }))} rows={2}
            placeholder={novo.tipo === "dificuldade" ? "O que está atrapalhando?"
                        : novo.tipo === "plano" ? "O que a equipe vai atacar hoje?"
                        : novo.tipo === "aviso" ? "Aviso curto pro time…"
                        : "Nota sobre ontem…"}
            style={{...inp, resize:"vertical", marginBottom:10}} />
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"end" }}>
            {(novo.tipo === "dificuldade" || novo.tipo === "plano") && (
              <>
                <div style={{ flex:"1 1 180px" }}>
                  <div style={lab}>Dono (opcional)</div>
                  {usuarios.length > 0 ? (
                    <select value={novo.responsavel} onChange={e => setNovo(n => ({ ...n, responsavel:e.target.value }))} style={inp}>
                      <option value="">— sem dono —</option>
                      {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </select>
                  ) : (
                    <input value={novo.responsavel} onChange={e => setNovo(n => ({ ...n, responsavel:e.target.value }))} placeholder="Nome do dono" style={inp} />
                  )}
                </div>
                <div style={{ flex:"0 0 140px" }}>
                  <div style={lab}>Prazo (opcional)</div>
                  <input type="date" value={novo.prazo} onChange={e => setNovo(n => ({ ...n, prazo:e.target.value }))} style={inp} />
                </div>
              </>
            )}
            <button onClick={salvar} disabled={salvando}
              style={{ background:C.brand, color:"#fff", border:"none", borderRadius:8,
                padding:"9px 18px", fontSize:13.5, fontWeight:600, cursor:salvando?"default":"pointer" }}>
              {salvando ? "salvando…" : "+ Adicionar"}
            </button>
          </div>
          {erro && (
            <div style={{ marginTop:10, fontSize:12.5, color:C.clay, background:"#FBEAE3", border:"1px solid "+C.clay, borderRadius:8, padding:"7px 10px" }}>
              {erro}
            </div>
          )}
        </div>
      )}

      {/* 4 blocos da reunião */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))", gap:14, marginTop:16 }}>
        <Bloco titulo="↩ Pendentes de ontem"
          sub="itens abertos de dias anteriores"
          cor={C.muted}
          itens={pendentesHerdados}
          vazio="Nada pendente. Bom sinal 🎉" />
        <Bloco titulo="⚠ Dificuldades / bloqueios"
          sub="o que precisa destravar"
          cor={C.clay}
          itens={dificuldadesHoje}
          vazio="Sem dificuldades registradas hoje." />
        <Bloco titulo="→ Plano de hoje"
          sub="ações que a equipe vai atacar"
          cor={C.brand}
          itens={planosHoje}
          vazio="Adicione as ações do dia acima." />
        <Bloco titulo="! Avisos"
          sub="novidades e recados"
          cor="#B07D10"
          itens={[...avisosHoje, ...ontemHoje]}
          vazio="Sem avisos." />
      </div>
    </>
  );
}

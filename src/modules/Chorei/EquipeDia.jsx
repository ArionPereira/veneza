import React from "react";
const { useState, useMemo } = React;
import { C, SERIF, SH } from "../../constants.js";
import { TIPOS, TIPO_PROJETO, PRIORIDADES, pesoPrioridade, ehProjeto, tipoInfo, ehTerminal, fmtData, hojeISO } from "./choreiconst.js";
import { criarItem } from "./choreidb.js";
import { ItemCard } from "./ItemCard.jsx";
import { ProjetoCard } from "./ProjetoCard.jsx";

const inp = { border:"1px solid "+C.line, borderRadius:8, padding:"8px 10px", fontSize:13.5, background:C.paper, color:C.ink, width:"100%" };
const lab = { fontSize:11, color:C.muted, fontWeight:600, marginBottom:3 };

// tela do dia — três colunas com os blocos + form pra adicionar
export function EquipeDia({ equipe, itens, etapas = [], notas = [], semV3 = false, sessao, usuarios, recarregar }) {
  const [erro, setErro] = useState("");
  const [novo, setNovo] = useState({ tipo:"dificuldade", texto:"", responsavel:"", prazo:"" });
  const [salvando, setSalvando] = useState(false);
  const [novoProj, setNovoProj] = useState({ texto:"", responsavel:"", prazo:"", prioridade:"media", inicio:hojeISO() });
  const [salvandoProj, setSalvandoProj] = useState(false);
  const [verConcluidos, setVerConcluidos] = useState(false);

  const eMaster = sessao?.role === "master";
  const eResponsavel = equipe?.responsavel_id === sessao?.id;
  const podeEscrever = eMaster || eResponsavel;

  const hoje = hojeISO();

  // projetos/atividades de longa duração ficam fora do fluxo do dia
  const itensDia = itens.filter(i => !ehProjeto(i));
  const projetos = itens.filter(ehProjeto);
  const projetosAbertos = projetos.filter(i => !ehTerminal(i.status))
    .slice().sort((a,b) => {
      const wa = pesoPrioridade(a.prioridade), wb = pesoPrioridade(b.prioridade);
      if (wa !== wb) return wa - wb;
      const pa = a.prazo || "9999-99-99", pb = b.prazo || "9999-99-99";
      if (pa !== pb) return pa < pb ? -1 : 1;
      return (a.criado_em || "") < (b.criado_em || "") ? 1 : -1;
    });
  const projetosConcluidos = projetos.filter(i => ehTerminal(i.status));

  // separa por bloco
  const criadosHoje = itensDia.filter(i => (i.criado_em || "").slice(0,10) === hoje);
  const pendentesHerdados = itensDia.filter(i =>
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

  const salvarProjeto = async () => {
    setErro("");
    if (!novoProj.texto.trim()) { setErro("Escreva o nome/descrição do projeto."); return; }
    setSalvandoProj(true);
    try {
      const respUser = usuarios.find(u => u.id === novoProj.responsavel);
      await criarItem(sessao.id, {
        equipeId: equipe.id,
        tipo: TIPO_PROJETO.id,
        texto: novoProj.texto.trim(),
        responsavelId: novoProj.responsavel || null,
        responsavelNome: respUser?.nome || null,
        prazo: novoProj.prazo || null,
        // prioridade/início dependem do chorei_v3.sql
        ...(semV3 ? {} : { prioridade: novoProj.prioridade, inicio: novoProj.inicio || null }),
      });
      setNovoProj({ texto:"", responsavel:"", prazo:"", prioridade:"media", inicio:hojeISO() });
      await recarregar();
    } catch (err) {
      const m = err.message || String(err);
      setErro(/tipo_check|tipo inválido/i.test(m)
        ? "Seu banco ainda não aceita projetos — rode uma vez o sql/chorei_v2.sql no Supabase (SQL Editor) e tente de novo."
        : m);
    }
    setSalvandoProj(false);
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

      {/* Projetos e atividades de longa duração */}
      <div style={{ background:C.card, border:"1px solid "+C.line, borderTop:"3px solid "+TIPO_PROJETO.cor,
        borderRadius:12, padding:"14px 16px", marginTop:18, boxShadow:SH }}>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
          <div>
            <span style={{ fontFamily:SERIF, fontSize:16, color:C.brand, fontWeight:600 }}>
              ◆ Projetos e atividades de longa duração
            </span>
            <span style={{ fontSize:11.5, color:C.muted, fontWeight:600, background:C.sage, borderRadius:20, padding:"1px 8px", marginLeft:8 }}>
              {projetosAbertos.length}
            </span>
            <div style={{ fontSize:11.5, color:C.muted, marginTop:2 }}>
              o que atravessa vários dias e não se resolve hoje — fica aqui até concluir
            </div>
          </div>
          {projetosConcluidos.length > 0 && (
            <button onClick={() => setVerConcluidos(v => !v)}
              style={{ background:"transparent", color:C.muted, border:"1px solid "+C.line,
                borderRadius:20, padding:"4px 12px", fontSize:11.5, fontWeight:600, cursor:"pointer" }}>
              {verConcluidos ? "ocultar concluídos" : `ver concluídos (${projetosConcluidos.length})`}
            </button>
          )}
        </div>

        {/* Form de novo projeto */}
        {podeEscrever && (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"end", marginTop:12,
            padding:"10px 12px", background:C.paper, border:"1px dashed "+C.line, borderRadius:10 }}>
            <div style={{ flex:"2 1 260px" }}>
              <div style={lab}>Novo projeto / atividade</div>
              <input value={novoProj.texto}
                onChange={e => setNovoProj(n => ({ ...n, texto:e.target.value }))}
                onKeyDown={e => { if (e.key === "Enter") salvarProjeto(); }}
                placeholder="Ex.: reforma do galpão 2, implantar 5S no setor…" style={inp} />
            </div>
            <div style={{ flex:"1 1 160px" }}>
              <div style={lab}>Dono (opcional)</div>
              {usuarios.length > 0 ? (
                <select value={novoProj.responsavel} onChange={e => setNovoProj(n => ({ ...n, responsavel:e.target.value }))} style={inp}>
                  <option value="">— sem dono —</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              ) : (
                <input value={novoProj.responsavel} onChange={e => setNovoProj(n => ({ ...n, responsavel:e.target.value }))} placeholder="Nome do dono" style={inp} />
              )}
            </div>
            {!semV3 && (
              <div style={{ flex:"0 0 100px" }}>
                <div style={lab}>Prioridade</div>
                <select value={novoProj.prioridade} onChange={e => setNovoProj(n => ({ ...n, prioridade:e.target.value }))} style={inp}>
                  {PRIORIDADES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            )}
            {!semV3 && (
              <div style={{ flex:"0 0 135px" }}>
                <div style={lab}>Início</div>
                <input type="date" value={novoProj.inicio} onChange={e => setNovoProj(n => ({ ...n, inicio:e.target.value }))} style={inp} />
              </div>
            )}
            <div style={{ flex:"0 0 135px" }}>
              <div style={lab}>Prazo (opcional)</div>
              <input type="date" value={novoProj.prazo} onChange={e => setNovoProj(n => ({ ...n, prazo:e.target.value }))} style={inp} />
            </div>
            <button onClick={salvarProjeto} disabled={salvandoProj}
              style={{ background:TIPO_PROJETO.cor, color:"#fff", border:"none", borderRadius:8,
                padding:"9px 18px", fontSize:13.5, fontWeight:600, cursor:salvandoProj?"default":"pointer" }}>
              {salvandoProj ? "salvando…" : "+ Adicionar"}
            </button>
          </div>
        )}

        {/* Lista de projetos */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:10, marginTop:12 }}>
          {projetosAbertos.length === 0 && !verConcluidos && (
            <div style={{ fontSize:12.5, color:C.muted, fontStyle:"italic" }}>
              Nenhum projeto em andamento. {podeEscrever ? "Adicione acima o que a equipe está tocando a médio/longo prazo." : ""}
            </div>
          )}
          {projetosAbertos.map(i => (
            <ProjetoCard key={i.id} item={i} sessao={sessao} usuarios={usuarios}
              etapas={etapas.filter(e => e.item_id === i.id)}
              notas={notas.filter(n => n.item_id === i.id)}
              semV3={semV3}
              podeEscrever={podeEscrever} recarregar={recarregar} onErro={setErro} />
          ))}
          {verConcluidos && projetosConcluidos.map(i => (
            <ProjetoCard key={i.id} item={i} sessao={sessao} usuarios={usuarios}
              etapas={etapas.filter(e => e.item_id === i.id)}
              notas={notas.filter(n => n.item_id === i.id)}
              semV3={semV3}
              podeEscrever={podeEscrever} recarregar={recarregar} onErro={setErro} />
          ))}
        </div>
      </div>
    </>
  );
}

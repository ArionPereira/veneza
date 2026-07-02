import React from "react";
const { useState, useMemo, useRef } = React;
import { C, SERIF, SH, SH2 } from "../../constants.js";
import { Header, Centro } from "../../ui.jsx";
import { lerPlanilha } from "./pontoparse.js";
import { apurar, resumo, fmtMin, fmtHM, FLAGS, TOL_MARCACAO, TOL_DIA } from "./pontocalc.js";

const TABS = [["painel", "Painel"], ["detalhado", "Detalhado"]];

function Card({ titulo, valor, cor, sub }) {
  return (
    <div style={{ background: C.card, border: "1px solid " + C.line, borderLeft: "3px solid " + cor, borderRadius: 12, padding: "12px 14px", boxShadow: SH, minWidth: 150, flex: "1 1 150px" }}>
      <div style={{ fontSize: 11.5, color: C.muted, fontWeight: 600 }}>{titulo}</div>
      <div style={{ fontFamily: SERIF, fontSize: 24, color: cor, fontWeight: 700, marginTop: 2 }}>{valor}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function FlagChip({ f }) {
  const info = FLAGS[f] || { label: f, cor: C.muted, icone: "•" };
  return <span style={{ display: "inline-block", fontSize: 10.5, fontWeight: 700, color: "#fff", background: info.cor, borderRadius: 20, padding: "1px 7px", marginRight: 4, marginBottom: 2, whiteSpace: "nowrap" }}>{info.icone} {info.label}</span>;
}

const th = { padding: "8px 9px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: C.muted, borderBottom: "1px solid " + C.line, whiteSpace: "nowrap", position: "sticky", top: 0, background: C.card };
const td = { padding: "7px 9px", fontSize: 12.5, borderBottom: "1px solid " + C.line, verticalAlign: "top" };

export function Ponto({ onSair }) {
  const [tab, setTab] = useState("painel");
  const [dias, setDias] = useState(null);
  const [nomeArq, setNomeArq] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const inputRef = useRef(null);

  // filtros do detalhado
  const [fColab, setFColab] = useState("");
  const [fSetor, setFSetor] = useState("");
  const [fData, setFData] = useState("");
  const [fFlag, setFFlag] = useState("");
  const [soOcorr, setSoOcorr] = useState(false);

  const subir = async (file) => {
    if (!file) return;
    setErro(""); setCarregando(true); setNomeArq(file.name);
    try {
      const regs = await lerPlanilha(file);
      if (!regs.length) throw new Error("Não encontrei registros de ponto nesse arquivo. Confira se é o Excel de Apuração de Eventos.");
      setDias(apurar(regs));
      setTab("painel");
    } catch (e) { setErro(e.message || String(e)); setDias(null); }
    setCarregando(false);
  };

  const s = useMemo(() => dias ? resumo(dias) : null, [dias]);
  const colaboradores = useMemo(() => dias ? [...new Set(dias.map(d => d.nome))].sort() : [], [dias]);
  const setores = useMemo(() => dias ? [...new Set(dias.map(d => d.setor).filter(Boolean))].sort() : [], [dias]);
  const datas = useMemo(() => dias ? [...new Set(dias.map(d => d.data))].sort() : [], [dias]);

  const filtrados = useMemo(() => {
    if (!dias) return [];
    return dias.filter(d => {
      if (fColab && d.nome !== fColab) return false;
      if (fSetor && d.setor !== fSetor) return false;
      if (fData && d.data !== fData) return false;
      if (fFlag && !d.flags.includes(fFlag)) return false;
      if (soOcorr && !d.flags.some(f => f !== "sem_marcacao")) return false;
      return true;
    }).sort((a, b) => a.data < b.data ? -1 : a.data > b.data ? 1 : a.nome.localeCompare(b.nome));
  }, [dias, fColab, fSetor, fData, fFlag, soOcorr]);

  const exportar = () => {
    const esc = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const head = ["Data", "Dia", "Contrato", "Colaborador", "Setor", "Função", "Escala", "Previsto", "Batidas", "Carga", "Trabalhado", "Intervalo", "Saldo líquido (min)", "Saldo bruto (min)", "Ocorrências", "Obs. sistema"];
    const linhas = filtrados.map(d => [
      d.data, d.sem, d.contrato, d.nome, d.setor, d.funcao, d.escala,
      (d.previsto || []).join(" "), (d.marcacoes || []).join(" "),
      d.carga != null ? fmtHM(d.carga) : "", d.trabalhado != null ? fmtHM(d.trabalhado) : "",
      d.intrajornada != null ? fmtHM(d.intrajornada) : "",
      d.saldoLiquido ?? "", d.saldoBruto ?? "",
      d.flags.map(f => (FLAGS[f]?.label || f)).join("; "), d.obs,
    ]);
    const blob = new Blob(["﻿" + [head, ...linhas].map(r => r.map(esc).join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "apuracao-ponto.csv"; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 64 }}>
      <Header titulo="Ponto · Apuração" eyebrow="Sementes Veneza · Jornada" tabs={TABS} tab={tab} setTab={setTab} onSair={onSair} />

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "0 20px" }}>
        {/* Upload */}
        <div style={{ background: C.card, border: "1px dashed " + C.brand2, borderRadius: 12, padding: "16px 18px", marginTop: 16, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={e => subir(e.target.files?.[0])} />
          <button onClick={() => inputRef.current?.click()} disabled={carregando}
            style={{ background: C.brand, color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: carregando ? "default" : "pointer" }}>
            {carregando ? "lendo…" : "📄 Carregar Excel do ponto"}
          </button>
          <div style={{ fontSize: 12.5, color: C.muted }}>
            {nomeArq ? <>Arquivo: <b style={{ color: C.ink }}>{nomeArq}</b>{s && <> · {s.totalDias} registros · {s.colaboradores} colaboradores</>}</>
              : "Suba o relatório de Apuração de Eventos (.xlsx). Os dados ficam só no seu navegador — nada é enviado a servidor."}
          </div>
        </div>

        {erro && <div style={{ marginTop: 12, padding: "10px 14px", background: "#FBEAE3", border: "1px solid " + C.clay, borderRadius: 10, color: C.clay, fontSize: 13 }}>Erro: {erro}</div>}

        {!dias && !carregando && (
          <div style={{ textAlign: "center", color: C.muted, fontSize: 14, padding: "60px 20px" }}>
            Carregue um arquivo pra ver a apuração.<br />
            <span style={{ fontSize: 12.5 }}>Tolerância: {TOL_MARCACAO} min/batida · {TOL_DIA} min/dia (CLT art. 58). Intervalo pelo Art. 71 (15 min p/ 4-6h; 1h a 2h p/ &gt; 6h). Interjornada (Art. 66) em stand-by até vir a folha completa.</span>
          </div>
        )}

        {dias && tab === "painel" && s && (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              <Card titulo="Hora extra (líquida)" valor={fmtMin(s.heTotal)} cor={C.green} sub={"bruto: " + fmtMin(s.heBruto)} />
              <Card titulo="Débito (líquido)" valor={fmtMin(s.debTotal)} cor={C.clay} sub={"bruto: " + fmtMin(s.debBruto)} />
              <Card titulo="Fora de escala" valor={s.contadores.fora_escala} cor="#8E2A2A" sub="turno diferente do escalado" />
              <Card titulo="Faltam marcações" valor={s.contadores.falta_marcacao} cor="#B5562F" sub="dias com <4 batidas" />
              <Card titulo="Intervalo abaixo do mín." valor={s.contadores.intra_curta} cor="#B07D10" sub="Art. 71 (15min / 1h)" />
              <Card titulo="Intervalo acima de 2h" valor={s.contadores.intra_longa} cor="#B07D10" sub="jornada > 6h" />
              <Card titulo="Nº ímpar de batidas" valor={s.contadores.impar} cor="#B07D10" sub="registro inconsistente" />
            </div>

            {/* Ranking de colaboradores */}
            <div style={{ marginTop: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: .5, textTransform: "uppercase", color: C.brand, marginBottom: 10 }}>Colaboradores com mais ocorrências</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {s.pessoas.slice(0, 12).map(p => {
                  const max = s.pessoas[0]?.ocorrencias || 1;
                  return (
                    <div key={p.contrato + p.nome} onClick={() => { setFColab(p.nome); setTab("detalhado"); }}
                      style={{ display: "flex", alignItems: "center", gap: 10, background: C.card, border: "1px solid " + C.line, borderRadius: 9, padding: "7px 11px", cursor: "pointer" }}>
                      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: C.ink, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nome}</div>
                        <div style={{ height: 6, background: C.sage, borderRadius: 4, marginTop: 4, overflow: "hidden" }}>
                          <div style={{ width: (p.ocorrencias / max * 100) + "%", height: "100%", background: C.brand }} />
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, textAlign: "right", whiteSpace: "nowrap" }}>
                        <b style={{ color: C.ink }}>{p.ocorrencias}</b> ocorr.<br />
                        <span style={{ color: C.green }}>+{fmtMin(p.he)}</span> · <span style={{ color: C.clay }}>−{fmtMin(p.deb)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {dias && tab === "detalhado" && (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 16, marginBottom: 12 }}>
              <select value={fColab} onChange={e => setFColab(e.target.value)} style={sel}><option value="">Todos colaboradores</option>{colaboradores.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <select value={fSetor} onChange={e => setFSetor(e.target.value)} style={sel}><option value="">Todos setores</option>{setores.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <select value={fData} onChange={e => setFData(e.target.value)} style={sel}><option value="">Todas as datas</option>{datas.map(c => <option key={c} value={c}>{c.split("-").reverse().join("/")}</option>)}</select>
              <select value={fFlag} onChange={e => setFFlag(e.target.value)} style={sel}><option value="">Todas ocorrências</option>{Object.keys(FLAGS).map(f => <option key={f} value={f}>{FLAGS[f].label}</option>)}</select>
              <button onClick={() => setSoOcorr(v => !v)} style={{ ...sel, cursor: "pointer", background: soOcorr ? C.brand : C.card, color: soOcorr ? "#fff" : C.muted, fontWeight: 600 }}>Só com ocorrência</button>
              <button onClick={exportar} style={{ marginLeft: "auto", background: C.sage, color: C.brand, border: "1px solid " + C.line, borderRadius: 8, padding: "7px 13px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>⬇ CSV</button>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{filtrados.length} registro(s)</div>

            <div style={{ overflow: "auto", background: C.card, border: "1px solid " + C.line, borderRadius: 12, maxHeight: "70vh" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                <thead><tr>
                  {["Data", "Colaborador", "Previsto", "Batidas", "Carga", "Trab.", "Intervalo", "Saldo", "Ocorrências", "Obs."].map(h => <th key={h} style={th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {filtrados.map((d, i) => (
                    <tr key={i} style={{ background: d.flags.some(f => f !== "sem_marcacao" && f !== "divergencia") ? "#FFFBF4" : "transparent" }}>
                      <td style={td}><b>{d.data.split("-").reverse().join("/")}</b><div style={{ fontSize: 10.5, color: C.muted }}>{d.sem}</div></td>
                      <td style={td}><div style={{ fontWeight: 600, color: C.ink }}>{d.nome}</div><div style={{ fontSize: 10.5, color: C.muted }}>{d.funcao || d.setor}</div></td>
                      <td style={{ ...td, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{(d.previsto || []).join(" · ") || "—"}</td>
                      <td style={{ ...td, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{(d.marcacoes || []).join(" · ") || "—"}</td>
                      <td style={td}>{d.carga != null ? fmtHM(d.carga) : "—"}</td>
                      <td style={td}>{d.trabalhado != null ? fmtHM(d.trabalhado) : "—"}</td>
                      <td style={{ ...td, color: (d.flags.includes("intra_curta") || d.flags.includes("intra_longa")) ? C.clay : C.ink, fontWeight: (d.flags.includes("intra_curta") || d.flags.includes("intra_longa")) ? 700 : 400 }}>{d.intrajornada != null ? fmtHM(d.intrajornada) : "—"}</td>
                      <td style={{ ...td, fontWeight: 700, color: d.saldoLiquido > 0 ? C.green : d.saldoLiquido < 0 ? C.clay : C.muted }}>{d.saldoLiquido != null ? fmtMin(d.saldoLiquido) : "—"}</td>
                      <td style={td}>{d.flags.length ? d.flags.map(f => <FlagChip key={f} f={f} />) : <span style={{ color: C.green }}>✓ ok</span>}</td>
                      <td style={{ ...td, fontSize: 11, color: C.muted, maxWidth: 160 }}>{d.obs}</td>
                    </tr>
                  ))}
                  {!filtrados.length && <tr><td colSpan={10} style={td}>Nenhum registro com esses filtros.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const sel = { border: "1px solid " + C.line, borderRadius: 8, padding: "7px 10px", fontSize: 13, background: C.paper, color: C.ink, maxWidth: 220 };

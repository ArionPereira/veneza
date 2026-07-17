import { C } from "../../constants.js";

// Tipos de item da reunião. "ontem" fica implícito na tela do dia (pega
// pendentes de dias anteriores automaticamente), mas o tipo existe pra quando
// você quer registrar EXPLICITAMENTE o que aconteceu ontem que não estava no
// radar (ex.: "quebrou a empacotadora ontem à noite").
export const TIPOS = [
  { id: "dificuldade", label: "Dificuldade / bloqueio", icone: "⚠", cor: C.clay },
  { id: "plano",       label: "Plano de hoje",          icone: "→", cor: C.brand },
  { id: "ontem",       label: "Nota de ontem",          icone: "↩", cor: C.muted },
  { id: "aviso",       label: "Aviso",                  icone: "!", cor: "#B07D10" },
];

// Projetos/atividades de longa duração: não entram no fluxo do dia (nem em
// "pendentes de ontem") — vivem numa lista própria dentro de cada equipe.
export const TIPO_PROJETO = { id: "projeto", label: "Projeto", icone: "◆", cor: C.accent };
export const ehProjeto = (item) => item?.tipo === TIPO_PROJETO.id;

export const STATUS = [
  { id: "aberto",       label: "Aberto",       cor: C.muted },
  { id: "em_andamento", label: "Em andamento", cor: "#B07D10" },
  { id: "resolvido",    label: "Resolvido",    cor: C.green },
  { id: "cancelado",    label: "Cancelado",    cor: C.clay },
];

export const tipoInfo   = (id) => TIPOS.find(t => t.id === id) || (id === TIPO_PROJETO.id ? TIPO_PROJETO : {});
export const statusInfo = (id) => STATUS.find(s => s.id === id) || {};
export const ehTerminal = (s)  => s === "resolvido" || s === "cancelado";

export const fmtDataHora = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }); }
  catch { return ""; }
};
export const fmtData = (iso) => {
  if (!iso) return "—";
  try { const s = String(iso).slice(0,10).split("-"); return s.length===3 ? `${s[2]}/${s[1]}/${s[0]}` : new Date(iso).toLocaleDateString("pt-BR"); }
  catch { return ""; }
};
export const hojeISO = () => new Date().toISOString().slice(0,10);

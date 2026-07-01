// Constantes do módulo PCM (Planejamento e Controle de Manutenção)
import { C } from "../../constants.js";

// Fluxo de status da OS: aberta → planejada → executando → aguardando_peca →
// concluida | cancelada
export const STATUS = [
  { id:"aberta",          label:"Aberta",          cor:"#6A7682" },
  { id:"planejada",       label:"Planejada",       cor:C.brand2 },
  { id:"executando",      label:"Executando",      cor:C.brand },
  { id:"aguardando_peca", label:"Aguardando peça", cor:"#B07D10" },
  { id:"concluida",       label:"Concluída",       cor:C.green },
  { id:"cancelada",       label:"Cancelada",       cor:C.clay },
];

// Transições permitidas a partir de cada status (usado no detalhe da OS)
export const FLUXO = {
  aberta:          ["planejada","executando","cancelada"],
  planejada:       ["executando","cancelada"],
  executando:      ["aguardando_peca","concluida","cancelada"],
  aguardando_peca: ["executando","concluida","cancelada"],
  concluida:       [],
  cancelada:       [],
};

export const TIPOS = [
  { id:"preventiva",  label:"Preventiva",  cor:C.green },
  { id:"corretiva",   label:"Corretiva",   cor:"#B07D10" },
  { id:"emergencial", label:"Emergencial", cor:C.clay },
  { id:"programada",  label:"Programada",  cor:C.brand2 },
  { id:"melhoria",    label:"Melhoria",    cor:"#6A7682" },
];

export const CRITICIDADE = [
  { id:"A", label:"A — crítica", cor:C.clay },
  { id:"B", label:"B — média",   cor:"#B07D10" },
  { id:"C", label:"C — baixa",   cor:C.green },
];

export const FOTO_TIPOS = [
  { id:"problema",   label:"Problema" },
  { id:"evidencia",  label:"Evidência" },
  { id:"causa_raiz", label:"Causa raiz" },
  { id:"outro",      label:"Outro" },
];

export const PRIORIDADES = [
  { id:"baixa", label:"Baixa", cor:C.green },
  { id:"media", label:"Média", cor:"#B07D10" },
  { id:"alta",  label:"Alta",  cor:C.clay },
];

// ordem do fluxo principal (p/ detectar reversão; cancelada é à parte)
export const ORDEM_STATUS = { aberta:0, planejada:1, executando:2, aguardando_peca:3, concluida:4 };

// data/hora em padrão BR: dd/mm/aaaa hh:mm
export const fmtDataHora = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}); }
  catch(e){ return ""; }
};

// data (sem hora) em padrão BR: dd/mm/aaaa
export const fmtDataBR = (iso) => {
  if (!iso) return "—";
  try { const s=String(iso).slice(0,10).split("-"); return s.length===3 ? s[2]+"/"+s[1]+"/"+s[0] : new Date(iso).toLocaleDateString("pt-BR"); }
  catch(e){ return ""; }
};

// duração amigável a partir de milissegundos: "2d 4h 15min"
export const fmtDuracao = (ms) => {
  if (ms==null || isNaN(ms) || ms<0) return "—";
  const min = Math.floor(ms/60000);
  if (min < 1) return "menos de 1min";
  const d = Math.floor(min/1440), h = Math.floor((min%1440)/60), m = min%60;
  const partes = [];
  if (d) partes.push(d+"d");
  if (h) partes.push(h+"h");
  if (m || partes.length===0) partes.push(m+"min");
  return partes.join(" ");
};

// diferença em ms entre dois ISO (ou null)
export const difMs = (aIso, bIso) => (aIso && bIso) ? (new Date(bIso) - new Date(aIso)) : null;

// helpers de rótulo/cor
const acha = (arr,id) => arr.find(x=>x.id===id) || {};
export const statusLabel = (id) => acha(STATUS,id).label || id;
export const statusCor   = (id) => acha(STATUS,id).cor   || "#6A7682";
export const tipoLabel   = (id) => acha(TIPOS,id).label  || id;
export const tipoCor     = (id) => acha(TIPOS,id).cor    || "#6A7682";
export const prioLabel   = (id) => acha(PRIORIDADES,id).label || id;
export const prioCor     = (id) => acha(PRIORIDADES,id).cor   || "#6A7682";
export const critLabel   = (id) => acha(CRITICIDADE,id).label || id;
export const critCor     = (id) => acha(CRITICIDADE,id).cor   || "#6A7682";

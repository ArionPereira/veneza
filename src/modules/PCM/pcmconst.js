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
  { id:"preventiva",  label:"Preventiva" },
  { id:"corretiva",   label:"Corretiva" },
  { id:"emergencial", label:"Emergencial" },
  { id:"programada",  label:"Programada" },
  { id:"melhoria",    label:"Melhoria" },
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

// helpers de rótulo/cor
const acha = (arr,id) => arr.find(x=>x.id===id) || {};
export const statusLabel = (id) => acha(STATUS,id).label || id;
export const statusCor   = (id) => acha(STATUS,id).cor   || "#6A7682";
export const tipoLabel   = (id) => acha(TIPOS,id).label  || id;
export const critLabel   = (id) => acha(CRITICIDADE,id).label || id;
export const critCor     = (id) => acha(CRITICIDADE,id).cor   || "#6A7682";

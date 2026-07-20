import { C } from "../../constants.js";

export const SECOES = [["antes","Antes do carregamento"],["depois","Depois do carregamento"]];
export const rotuloSecao = (s) => SECOES.find(x=>x[0]===s)?.[1] || s;

export const STATUS_CARGA = {
  aberta:    { label:"Aberta",    cor:C.brand },
  bloqueada: { label:"Bloqueada", cor:C.clay },
  concluida: { label:"Concluída", cor:C.green },
};
export const rotuloStatusCarga = (s) => STATUS_CARGA[s]?.label || s;
export const corStatusCarga    = (s) => STATUS_CARGA[s]?.cor || C.muted;

export const STATUS_ITEM = {
  pendente:     { label:"Pendente",       cor:C.muted },
  conforme:     { label:"Conforme",       cor:C.green },
  nao_conforme: { label:"Não conforme",   cor:C.clay },
  na:           { label:"Não se aplica",  cor:C.muted },
};
export const rotuloStatusItem = (s) => STATUS_ITEM[s]?.label || s;
export const corStatusItem    = (s) => STATUS_ITEM[s]?.cor || C.muted;

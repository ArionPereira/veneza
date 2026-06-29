let _seq = Date.now();
export const novoId = () => "x" + (++_seq);
export const clientId = Math.random().toString(36).slice(2);

export const C = {
  paper:"#FAF8F4", card:"#FFFFFF", ink:"#1C2A36", pine:"#004D94",
  pineSoft:"#2A6FB0", wheat:"#E0A400", wheatSoft:"#F3D58A", sage:"#EAF2FA",
  line:"#D5DEE8", clay:"#B5562F", muted:"#6A7682", green:"#2F8F2C",
  brand:"#004D94", brand2:"#2A6FB0", accent:"#3FA535", accent2:"#B07D10"
};
export const SERIF = "Georgia,'Times New Roman',serif";
export const SH  = "0 1px 2px rgba(16,42,67,.04), 0 2px 6px rgba(16,42,67,.06)";
export const SH2 = "0 4px 14px rgba(16,42,67,.10)";

export const DIAS      = ["Segunda","Terça","Quarta","Quinta","Sexta"];
export const CATEGORIAS = ["Prato principal","Guarnição","Acompanhamento","Salada","Sobremesa","Bebida"];

export const brl = (n) => "R$ " + (Number(n)||0).toFixed(2).replace(".", ",");
export const num = (n) => (Number(n)||0).toLocaleString("pt-BR");

// Unidades de insumo. Para kg/L a gramagem da ficha é em g/mL (÷1000 → kg/L);
// para "un" a ficha é a própria quantidade em unidades (fator 1).
export const UNIDADES   = ["kg", "L", "un"];
export const fatorUnidade = (u) => u==="un" ? 1 : 1000;
export const rotuloQtd    = (u) => u==="L" ? "mL" : (u==="un" ? "un" : "g");

export const fmtHora = (isoStr) => {
  try { const d = new Date(isoStr); return d.toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"}); }
  catch(e) { return ""; }
};

export const estaEditando = () => {
  const t = document.activeElement;
  return t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA");
};

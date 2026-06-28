export const NOMES  = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
export const NOMES3 = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
export const MESES  = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export const pad          = (n) => (n < 10 ? "0" : "") + n;
export const iso          = (d) => d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate());
export const hojeISO      = () => iso(new Date());
export const fromISO      = (s) => { const a = s.split("-").map(Number); return new Date(a[0], a[1]-1, a[2]); };
export const addDias      = (s, n) => { const d = fromISO(s); d.setDate(d.getDate()+n); return iso(d); };
export const wdDe         = (s) => fromISO(s).getDay();
export const fmtData      = (s) => { const d = fromISO(s); return pad(d.getDate()) + "/" + pad(d.getMonth()+1); };
export const fmtDataLonga = (s) => { const d = fromISO(s); return NOMES[d.getDay()] + ", " + pad(d.getDate()) + "/" + pad(d.getMonth()+1); };

export const intervalo = (de, ate) => {
  const r = []; if (!de || !ate) return r;
  let c = de, guard = 0;
  while (c <= ate && guard < 400) { r.push(c); c = addDias(c, 1); guard++; }
  return r;
};

export function confirmarExcluir(dataISO, oque) {
  const passado = dataISO < hojeISO();
  const dt = fmtData(dataISO);
  if (passado) return window.confirm(
    "⚠ ATENÇÃO: " + dt + " é um dia que JÁ PASSOU (pode estar fechado).\n\n" +
    "Tem certeza que deseja EXCLUIR " + oque + "?\nIsso altera o histórico."
  );
  return window.confirm("Excluir " + oque + " de " + dt + "?");
}

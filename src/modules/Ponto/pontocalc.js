// Motor de apuração de ponto — puro, sem dependências.
// Todas as regras que o usuário pediu:
//  - divergência do previsto (por batida)
//  - marcações faltando (ideal 4) / nº ímpar
//  - intrajornada < 1h (almoço curto)
//  - interjornada < 11h (descanso entre jornadas)
//  - hora extra / débito (trabalhado − carga prevista)
//  - tolerância CLT art. 58: 5min/batida e 10min/dia; estourou, conta tudo

export const TOL_MARCACAO = 5;   // min por batida
export const TOL_DIA = 10;       // min somados no dia
export const INTRA_MIN = 60;     // intrajornada mínima (min)
export const INTER_MIN = 11 * 60; // interjornada mínima (min)

export const toMin = (hhmm) => {
  if (!hhmm || !String(hhmm).includes(":")) return null;
  const [h, m] = String(hhmm).split(":");
  return parseInt(h, 10) * 60 + parseInt(m, 10);
};

// converte lista de "HH:MM" em minutos acumulados tratando a virada da meia-noite
export function sequencia(times) {
  const out = []; let base = 0, prev = null;
  for (const t of times) {
    const mm = toMin(t);
    if (mm == null) return null;
    if (prev != null && mm < prev) base += 1440;
    out.push(mm + base); prev = mm;
  }
  return out;
}

export const fmtMin = (min) => {
  if (min == null || isNaN(min)) return "—";
  const neg = min < 0; const a = Math.abs(Math.round(min));
  return (neg ? "-" : "") + Math.floor(a / 60) + "h" + String(a % 60).padStart(2, "0");
};
export const fmtHM = (min) => {
  if (min == null || isNaN(min)) return "—";
  const a = Math.abs(Math.round(min));
  return String(Math.floor(a / 60)).padStart(2, "0") + ":" + String(a % 60).padStart(2, "0");
};

// dias da semana pra ordenar/exibir a partir do ISO
const diaSemana = (iso) => {
  try { return new Date(iso + "T12:00:00").getDay(); } catch { return 0; }
};

// ---- apura um registro isolado (sem interjornada, que precisa do vizinho) ----
function apurarDia(reg, opts) {
  const tolMarc = opts.tolMarcacao, tolDia = opts.tolDia;
  const prev = reg.previsto || [];
  const marc = reg.marcacoes || [];
  const temPrevisto = prev.length === 4;
  const prevSeq = temPrevisto ? sequencia(prev) : null;
  const carga = prevSeq ? (prevSeq[1] - prevSeq[0]) + (prevSeq[3] - prevSeq[2]) : null;

  const nMarc = marc.length;
  const flags = [];
  const r = {
    ...reg,
    carga,
    nMarc,
    trabalhado: null,
    intrajornada: null,
    saldoBruto: null,
    saldoLiquido: null,
    difs: null,
    inicioAbs: null, // timestamp (min desde epoch local) da 1ª batida
    fimAbs: null,    // timestamp da última batida
    interjornada: null,
    flags,
  };

  if (nMarc === 0) { flags.push("sem_marcacao"); return r; }
  if (nMarc % 2 !== 0) flags.push("impar");
  if (nMarc < 4) flags.push("falta_marcacao");

  // início/fim absolutos (pra interjornada) — precisa de pelo menos 1 batida
  const marcSeqAll = sequencia(marc);
  if (marcSeqAll) {
    const baseDia = Date.parse(reg.data + "T00:00:00") / 60000; // min desde epoch
    r.inicioAbs = baseDia + marcSeqAll[0];
    r.fimAbs = baseDia + marcSeqAll[marcSeqAll.length - 1];
  }

  if (nMarc >= 4) {
    const marcSeq = sequencia(marc.slice(0, 4));
    if (marcSeq) {
      const trab = (marcSeq[1] - marcSeq[0]) + (marcSeq[3] - marcSeq[2]);
      const intra = marcSeq[2] - marcSeq[1];
      r.trabalhado = trab;
      r.intrajornada = intra;
      if (intra < opts.intraMin) flags.push("intra_curta");

      if (temPrevisto) {
        const difs = [0, 1, 2, 3].map(i => marcSeq[i] - prevSeq[i]);
        r.difs = difs;
        const somaAbs = difs.reduce((s, d) => s + Math.abs(d), 0);
        const excedeMarca = difs.some(d => Math.abs(d) > tolMarc);
        const excedeDia = somaAbs > tolDia;
        const saldoBruto = trab - carga;
        r.saldoBruto = saldoBruto;
        // CLT: dentro da tolerância → desconsidera; estourou → conta tudo
        r.saldoLiquido = (!excedeMarca && !excedeDia) ? 0 : saldoBruto;
        if (difs.some(d => Math.abs(d) > tolMarc)) flags.push("divergencia");
      }
    }
  }
  return r;
}

// ---- apura tudo: dias + interjornada entre dias consecutivos do mesmo colaborador ----
export function apurar(registros, opts = {}) {
  const o = {
    tolMarcacao: opts.tolMarcacao ?? TOL_MARCACAO,
    tolDia: opts.tolDia ?? TOL_DIA,
    intraMin: opts.intraMin ?? INTRA_MIN,
    interMin: opts.interMin ?? INTER_MIN,
  };
  const dias = registros.map(reg => apurarDia(reg, o));

  // interjornada: agrupa por colaborador, ordena por data, compara fim×início seguinte
  const porPessoa = {};
  dias.forEach(d => { (porPessoa[d.contrato + "|" + d.nome] = porPessoa[d.contrato + "|" + d.nome] || []).push(d); });
  Object.values(porPessoa).forEach(lista => {
    lista.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
    for (let i = 1; i < lista.length; i++) {
      const ant = lista[i - 1], atual = lista[i];
      if (ant.fimAbs != null && atual.inicioAbs != null) {
        const gap = atual.inicioAbs - ant.fimAbs; // min de descanso
        if (gap >= 0) {
          atual.interjornada = gap;
          if (gap < o.interMin) atual.flags.push("interjornada");
        }
      }
    }
  });

  return dias;
}

// ---- agregações pro dashboard ----
export function resumo(dias) {
  const has = (d, f) => d.flags.includes(f);
  let heTotal = 0, debTotal = 0, heBruto = 0, debBruto = 0;
  const contadores = { falta_marcacao: 0, impar: 0, intra_curta: 0, interjornada: 0, divergencia: 0, sem_marcacao: 0 };
  dias.forEach(d => {
    Object.keys(contadores).forEach(f => { if (has(d, f)) contadores[f]++; });
    if (d.saldoLiquido > 0) heTotal += d.saldoLiquido;
    else if (d.saldoLiquido < 0) debTotal += -d.saldoLiquido;
    if (d.saldoBruto > 0) heBruto += d.saldoBruto;
    else if (d.saldoBruto < 0) debBruto += -d.saldoBruto;
  });

  // por colaborador
  const porPessoa = {};
  dias.forEach(d => {
    const k = d.contrato + "|" + d.nome;
    const p = porPessoa[k] || (porPessoa[k] = {
      contrato: d.contrato, nome: d.nome, setor: d.setor, funcao: d.funcao,
      he: 0, deb: 0, ocorrencias: 0, dias: 0,
    });
    p.dias++;
    if (d.saldoLiquido > 0) p.he += d.saldoLiquido;
    else if (d.saldoLiquido < 0) p.deb += -d.saldoLiquido;
    p.ocorrencias += d.flags.filter(f => f !== "sem_marcacao").length;
  });

  return {
    totalDias: dias.length,
    colaboradores: Object.keys(porPessoa).length,
    heTotal, debTotal, heBruto, debBruto,
    contadores,
    pessoas: Object.values(porPessoa).sort((a, b) => b.ocorrencias - a.ocorrencias),
  };
}

// rótulos amigáveis das flags
export const FLAGS = {
  falta_marcacao: { label: "Faltam marcações", cor: "#B5562F", icone: "⛔" },
  impar:          { label: "Nº ímpar de marcações", cor: "#B07D10", icone: "½" },
  intra_curta:    { label: "Intrajornada < 1h", cor: "#B07D10", icone: "🍽" },
  interjornada:   { label: "Interjornada < 11h", cor: "#B5562F", icone: "🌙" },
  divergencia:    { label: "Divergência do previsto", cor: "#6A7682", icone: "≠" },
  sem_marcacao:   { label: "Sem marcações (falta/afast.)", cor: "#6A7682", icone: "—" },
};

import * as XLSX from "xlsx";

// Colunas (0-based) do relatório "Apuração de Eventos"
const COL = {
  contrato: 0,   // A
  nome: 2,       // C
  data: 4,       // E
  sem: 6,        // G
  escala: 9,     // J
  previsto: 12,  // M
  m1: 14,        // O
  m2: 16,        // Q
  m3: 18,        // S
  m4: 20,        // U
  evento: 23,    // X
  obs: 30,       // AE
  setor: 32,     // AG
  funcao: 34,    // AI
};

const txt = (v) => (v == null ? "" : String(v).trim());

// normaliza "26/06/2026" (ou serial de data) -> "2026-06-26"
function normData(v) {
  if (v == null || v === "") return "";
  if (v instanceof Date) {
    return v.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return s;
}

// extrai "HH:MM" de qualquer coisa (string, Date, número decimal de tempo)
function normHora(v) {
  if (v == null || v === "") return "";
  if (v instanceof Date) {
    return String(v.getHours()).padStart(2, "0") + ":" + String(v.getMinutes()).padStart(2, "0");
  }
  const s = String(v).trim();
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (m) return m[1].padStart(2, "0") + ":" + m[2];
  // número decimal de dia (0.5 = 12:00)
  const n = Number(s.replace(",", "."));
  if (!isNaN(n) && n >= 0 && n < 1) {
    const total = Math.round(n * 24 * 60);
    return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
  }
  return "";
}

// previsto vem como "08:00-11:00-12:12-18:00" -> ["08:00","11:00","12:12","18:00"]
function normPrevisto(v) {
  const s = txt(v);
  if (!s || s.toLowerCase().includes("previsto")) return [];
  const partes = s.split("-").map(x => normHora(x)).filter(Boolean);
  return partes.length ? partes : [];
}

// lê o File (do <input type=file>) e devolve os registros crus
export async function lerPlanilha(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const linhas = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });

  const registros = [];
  for (const row of linhas) {
    const nome = txt(row[COL.nome]);
    const data = normData(row[COL.data]);
    // pula linha em branco e cabeçalhos repetidos
    if (!nome || nome.toLowerCase() === "nome") continue;
    if (!data || data.toLowerCase() === "data") continue;

    const marc = [row[COL.m1], row[COL.m2], row[COL.m3], row[COL.m4]]
      .map(normHora).filter(Boolean);

    registros.push({
      contrato: txt(row[COL.contrato]),
      nome,
      data,
      sem: txt(row[COL.sem]),
      escala: txt(row[COL.escala]),
      previsto: normPrevisto(row[COL.previsto]),
      marcacoes: marc,
      evento: txt(row[COL.evento]).replace(/^\d+\s*-\s*/, ""), // tira o código, deixa o nome
      obs: txt(row[COL.obs]),
      setor: txt(row[COL.setor]).replace(/^\d+\s*-\s*/, ""),
      funcao: txt(row[COL.funcao]).replace(/^\d+\s*-\s*/, ""),
    });
  }
  return registros;
}

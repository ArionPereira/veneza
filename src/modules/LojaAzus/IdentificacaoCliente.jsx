import React from "react";
const { useState } = React;
import { BEBAS, AZ as C, logoAzus } from "./azusTheme.js";

const inp = { width: "100%", padding: "12px 14px", borderRadius: 9, border: "1px solid " + C.line, fontSize: 15, background: "#fff", color: C.ink, boxSizing: "border-box" };
const lbl = { fontSize: 12, fontWeight: 700, color: C.brand, marginBottom: 6, display: "block" };

function apenasDigitos(s) { return (s || "").replace(/\D/g, ""); }

// Aceita CPF (11 dígitos) ou CNPJ (14 dígitos) — só checa a quantidade de
// dígitos, não o dígito verificador (não é validação fiscal, é só pra
// pegar erro de digitação óbvio).
function documentoValido(s) {
  const d = apenasDigitos(s);
  return d.length === 11 || d.length === 14;
}

export function IdentificacaoCliente({ onConfirmar }) {
  const [nome, setNome] = useState("");
  const [documento, setDocumento] = useState("");
  const [contato, setContato] = useState("");
  const [erro, setErro] = useState("");
  const logo = logoAzus();

  const confirmar = (e) => {
    e.preventDefault();
    if (!nome.trim()) { setErro("Informe seu nome."); return; }
    if (!documentoValido(documento)) { setErro("Informe um CNPJ (14 dígitos) ou CPF (11 dígitos) válido."); return; }
    if (!contato.trim()) { setErro("Informe um telefone/WhatsApp de contato."); return; }
    onConfirmar({ nome: nome.trim(), documento: documento.trim(), contato: contato.trim() });
  };

  return (
    <div style={{ minHeight: "100vh", background: C.brand, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form onSubmit={confirmar} style={{ background: "#fff", borderRadius: 16, padding: "30px 26px", width: "100%", maxWidth: 380, boxShadow: "0 10px 40px rgba(0,0,0,.25)" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          {logo
            ? <img src={logo} alt="Azus Menswear" style={{ height: 40, margin: "0 auto" }} />
            : (
              <div>
                <div style={{ fontFamily: BEBAS, fontSize: 32, color: C.brand, letterSpacing: 1 }}>AZUS</div>
                <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: C.accent, fontWeight: 700, marginTop: -4 }}>Menswear</div>
              </div>
            )}
        </div>
        <p style={{ fontSize: 13.5, color: C.muted, textAlign: "center", margin: "0 0 22px" }}>
          Antes de ver o catálogo, conta pra gente quem está comprando.
        </p>

        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Nome / Razão social</label>
          <input style={inp} value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome ou da loja" autoFocus />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>CNPJ ou CPF</label>
          <input style={inp} value={documento} onChange={e => setDocumento(e.target.value)} placeholder="00.000.000/0000-00" inputMode="numeric" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Telefone / WhatsApp</label>
          <input style={inp} value={contato} onChange={e => setContato(e.target.value)} placeholder="(00) 00000-0000" inputMode="tel" />
        </div>

        {erro && <div style={{ color: C.clay, fontSize: 13, marginBottom: 14 }}>{erro}</div>}

        <button style={{ width: "100%", background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          Entrar na loja
        </button>
      </form>
    </div>
  );
}

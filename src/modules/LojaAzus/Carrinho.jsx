import React from "react";
const { useState, useMemo } = React;
import { C, SERIF, SH, brl } from "../../constants.js";
import { ESTADOS, calcularFrete } from "./frete.js";

// percentual aplicado sobre o subtotal dos produtos (negativo = desconto)
const AJUSTE_FORMA_PAGAMENTO = { "Pix": -0.05, "Boleto": 0, "Cartão": 0.07 };
const FORMAS_PAGAMENTO = Object.keys(AJUSTE_FORMA_PAGAMENTO);
const AVIAMENTO_OPCOES = ["Azus", "Private Label"];
const MINIMO_PRIVATE_LABEL = 10;
const ACRESCIMO_PRIVATE_LABEL = 3;

const inp = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid " + C.line, fontSize: 14.5, background: C.paper, color: C.ink };
const lbl = { fontSize: 12, fontWeight: 700, color: C.brand, marginBottom: 6, display: "block" };

// Regra do Private Label: mínimo de 10 peças por cor (somando os
// tamanhos daquela cor, dentro do mesmo produto); abaixo disso, +R$3,00
// em cada peça daquela cor. Só se aplica quando o aviamento é Private
// Label — no Azus o preço fica exatamente o do carrinho.
function aplicarAviamento(itens, aviamento) {
  if (aviamento !== "Private Label") return { itens, avisos: [] };

  const totalPorCor = new Map();
  for (const it of itens) {
    const chave = it.produtoId + "|" + it.corCodigo + "|" + it.corNome;
    totalPorCor.set(chave, (totalPorCor.get(chave) || 0) + it.quantidade);
  }

  const avisos = [];
  const ajustados = itens.map(it => {
    const chave = it.produtoId + "|" + it.corCodigo + "|" + it.corNome;
    const total = totalPorCor.get(chave);
    if (total < MINIMO_PRIVATE_LABEL) {
      if (!avisos.some(a => a.chave === chave)) {
        avisos.push({ chave, produtoNome: it.produtoNome, corNome: it.corNome, total });
      }
      return { ...it, precoUnit: it.precoUnit + ACRESCIMO_PRIVATE_LABEL };
    }
    return it;
  });

  return { itens: ajustados, avisos };
}

export function Carrinho({ itens, onAtualizarQtd, onRemover, onVoltar, onEnviar, enviando }) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [formaPagamento, setFormaPagamento] = useState(FORMAS_PAGAMENTO[0]);
  const [aviamento, setAviamento] = useState("");
  const [estado, setEstado] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState("");

  const { itens: itensComPreco, avisos } = useMemo(() => aplicarAviamento(itens, aviamento), [itens, aviamento]);
  const subtotalProdutos = itensComPreco.reduce((s, it) => s + it.precoUnit * it.quantidade, 0);
  const percentualPagamento = AJUSTE_FORMA_PAGAMENTO[formaPagamento] ?? 0;
  const ajustePagamento = subtotalProdutos * percentualPagamento;
  const frete = estado ? calcularFrete(estado, subtotalProdutos) : null;
  const total = subtotalProdutos + ajustePagamento + (frete?.valor || 0);

  const confirmar = () => {
    if (!nome.trim()) { setErro("Informe seu nome."); return; }
    if (!itens.length) { setErro("O carrinho está vazio."); return; }
    if (!aviamento) { setErro("Escolha o aviamento (Azus ou Private Label)."); return; }
    if (!estado) { setErro("Escolha o estado pra calcular o frete."); return; }
    if (frete?.indisponivel) { setErro("Frete pra essa região ainda não está configurado — fala direto com a vendedora pelo WhatsApp pra fechar esse pedido."); return; }
    setErro("");
    onEnviar({
      clienteNome: nome.trim(), clienteTelefone: telefone.trim(), formaPagamento, aviamento, estado,
      observacoes: observacoes.trim(), itensParaEnviar: itensComPreco, ajustePagamento, frete: frete?.valor || 0, subtotalProdutos, total,
    });
  };

  return (
    <div>
      <button onClick={onVoltar} style={{ background: "transparent", border: "none", color: C.brand, fontSize: 13.5, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 14 }}>← Continuar comprando</button>
      <h1 style={{ fontFamily: SERIF, fontSize: 22, margin: "0 0 16px", color: C.brand }}>Seu carrinho</h1>

      {!itens.length && <div style={{ color: C.muted, fontSize: 14 }}>Seu carrinho está vazio.</div>}

      {itensComPreco.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", background: C.card, border: "1px solid " + C.line, borderRadius: 12, padding: "12px 14px", marginBottom: 10, boxShadow: SH }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: C.ink, fontSize: 14.5 }}>{it.produtoNome}</div>
            <div style={{ fontSize: 12.5, color: C.muted }}>
              {it.corNome && <>Cor {it.corCodigo} {it.corNome} · </>}
              {it.tamanho && <>Tam. {it.tamanho} · </>}
              {brl(it.precoUnit)} un.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", border: "1px solid " + C.line, borderRadius: 8, overflow: "hidden" }}>
            <button onClick={() => onAtualizarQtd(i, Math.max(1, it.quantidade - 1))} style={{ border: "none", background: C.sage, width: 28, height: 28, cursor: "pointer" }}>−</button>
            <div style={{ width: 30, textAlign: "center", fontSize: 13.5, fontWeight: 700 }}>{it.quantidade}</div>
            <button onClick={() => onAtualizarQtd(i, it.quantidade + 1)} style={{ border: "none", background: C.sage, width: 28, height: 28, cursor: "pointer" }}>+</button>
          </div>
          <div style={{ width: 78, textAlign: "right", fontWeight: 700, fontSize: 14 }}>{brl(it.precoUnit * it.quantidade)}</div>
          <button onClick={() => onRemover(i)} title="Remover" style={{ background: "transparent", border: "none", color: C.clay, fontSize: 18, cursor: "pointer", padding: "0 4px" }}>×</button>
        </div>
      ))}

      {itens.length > 0 && (
        <>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Aviamento *</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {AVIAMENTO_OPCOES.map(op => (
                <button key={op} onClick={() => { setAviamento(op); setErro(""); }} style={{
                  border: "1px solid " + C.line, borderRadius: 9, padding: "9px 14px", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
                  background: aviamento === op ? C.brand : C.card, color: aviamento === op ? "#fff" : C.ink,
                }}>{op}</button>
              ))}
            </div>
            {aviamento === "Private Label" && (
              <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
                Mínimo de {MINIMO_PRIVATE_LABEL} peças por cor. Abaixo disso, acréscimo de {brl(ACRESCIMO_PRIVATE_LABEL)} por peça.
              </div>
            )}
          </div>

          {avisos.length > 0 && (
            <div style={{ background: "#FBEFC9", color: C.ink, borderRadius: 8, padding: "10px 12px", fontSize: 12.5, marginBottom: 16 }}>
              ⚠ Não atingiu o mínimo de {MINIMO_PRIVATE_LABEL} peças (acréscimo de {brl(ACRESCIMO_PRIVATE_LABEL)}/peça já aplicado nos itens abaixo):
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {avisos.map(a => <li key={a.chave}>{a.produtoNome} — {a.corNome}: {a.total} peça(s)</li>)}
              </ul>
            </div>
          )}

          <div style={{ marginBottom: 22 }}>
            <div style={{ textAlign: "right", fontSize: 14, color: C.muted }}>Subtotal produtos: {brl(subtotalProdutos)}</div>
            {percentualPagamento !== 0 && (
              <div style={{ textAlign: "right", fontSize: 14, color: percentualPagamento < 0 ? C.green : C.clay }}>
                {percentualPagamento < 0 ? "Desconto" : "Acréscimo"} {formaPagamento} ({Math.round(Math.abs(percentualPagamento) * 100)}%): {percentualPagamento < 0 ? "−" : "+"}{brl(Math.abs(ajustePagamento))}
              </div>
            )}
            {frete && !frete.indisponivel && (
              <div style={{ textAlign: "right", fontSize: 14, color: frete.gratis ? C.green : C.muted }}>
                Frete ({frete.regiao}): {frete.gratis ? "Grátis 🎉" : brl(frete.valor)}
              </div>
            )}
            {frete?.indisponivel && (
              <div style={{ textAlign: "right", fontSize: 13, color: C.clay }}>⚠ Frete pra {frete.regiao} ainda não configurado</div>
            )}
            <div style={{ textAlign: "right", fontSize: 18, fontWeight: 700, color: C.ink, marginTop: 4 }}>
              Total: {brl(total)}
            </div>
          </div>

          <div style={{ background: C.card, border: "1px solid " + C.line, borderRadius: 14, padding: 18, boxShadow: SH }}>
            <h2 style={{ fontFamily: SERIF, fontSize: 17, margin: "0 0 14px", color: C.brand }}>Seus dados</h2>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Nome</label>
              <input style={inp} value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Telefone / WhatsApp</label>
              <input style={inp} value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Estado (pra calcular o frete) *</label>
              <select style={inp} value={estado} onChange={e => { setEstado(e.target.value); setErro(""); }}>
                <option value="">Selecione…</option>
                {ESTADOS.map(([uf, nome]) => <option key={uf} value={uf}>{nome}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Forma de pagamento</label>
              <select style={inp} value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)}>
                {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}{AJUSTE_FORMA_PAGAMENTO[f] ? " (" + (AJUSTE_FORMA_PAGAMENTO[f] < 0 ? "-" : "+") + Math.round(Math.abs(AJUSTE_FORMA_PAGAMENTO[f]) * 100) + "%)" : ""}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Observações (opcional)</label>
              <textarea style={{ ...inp, minHeight: 64, resize: "vertical" }} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Ex.: prefiro entrega em outubro" />
            </div>

            {erro && <div style={{ color: C.clay, fontSize: 13, marginBottom: 12 }}>{erro}</div>}

            <button onClick={confirmar} disabled={enviando} style={{
              width: "100%", background: "#25D366", color: "#fff", border: "none", borderRadius: 10, padding: "13px",
              fontSize: 15, fontWeight: 700, cursor: enviando ? "default" : "pointer", opacity: enviando ? 0.7 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {enviando ? "Enviando..." : "Finalizar e enviar no WhatsApp"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

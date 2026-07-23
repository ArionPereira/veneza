import React from "react";
const { useState, useEffect } = React;
import { SERIF, SH } from "../../constants.js";
import { AZ as C, BEBAS, logoAzus } from "./azusTheme.js";
import { listarProdutos, criarPedido } from "./lojaazusdb.js";
import { montarMensagem, abrirWhatsapp } from "./mensagemWhatsapp.js";
import { Catalogo } from "./Catalogo.jsx";
import { ProdutoDetalhe } from "./ProdutoDetalhe.jsx";
import { Carrinho } from "./Carrinho.jsx";
import { Recibo } from "./Recibo.jsx";
import { IdentificacaoCliente } from "./IdentificacaoCliente.jsx";

const CHAVE_CARRINHO = "azus_carrinho";
const CHAVE_IDENTIFICACAO = "azus_identificacao";

function carregarCarrinho() {
  try { return JSON.parse(localStorage.getItem(CHAVE_CARRINHO) || "[]"); }
  catch { return []; }
}

function carregarIdentificacao() {
  try { return JSON.parse(localStorage.getItem(CHAVE_IDENTIFICACAO) || "null"); }
  catch { return null; }
}

function CabecalhoLoja({ qtdCarrinho, onCarrinho, onLogo, identificacao, onTrocarIdentificacao }) {
  const logo = logoAzus();
  return (
    <header style={{ background: C.brand, borderBottom: "3px solid " + C.accent, boxShadow: SH, position: "sticky", top: 0, zIndex: 20 }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "12px 18px", display: "flex", alignItems: "center", gap: 12 }}>
        <div onClick={onLogo} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
          {logo
            // logo é navy sobre fundo transparente — precisa de um fundo
            // claro por trás pra não sumir na barra navy do cabeçalho.
            ? <div style={{ background: "#fff", borderRadius: 8, padding: "5px 10px", display: "flex", alignItems: "center" }}>
                <img src={logo} alt="Azus Menswear" style={{ height: 26 }} />
              </div>
            : (
              <div style={{ lineHeight: 1 }}>
                <div style={{ fontFamily: BEBAS, fontSize: 27, color: "#fff", letterSpacing: 1 }}>AZUS</div>
                <div style={{ fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: C.accent, fontWeight: 700, marginTop: 1 }}>Menswear</div>
              </div>
            )}
          <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,.25)" }} />
          <h1 style={{ fontFamily: SERIF, fontSize: 15, margin: 0, fontWeight: 600, color: "rgba(255,255,255,.85)" }}>Loja de calças</h1>
        </div>
        <button onClick={onCarrinho} style={{
          marginLeft: "auto", background: C.accent, color: "#fff", border: "none", borderRadius: 9,
          padding: "9px 14px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
        }}>
          🛒 Carrinho{qtdCarrinho > 0 && <span style={{ background: "#fff", color: C.brand, borderRadius: 999, padding: "1px 7px", fontSize: 12 }}>{qtdCarrinho}</span>}
        </button>
      </div>
      {identificacao && (
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 18px 8px", fontSize: 11.5, color: "rgba(255,255,255,.65)" }}>
          Comprando como <b style={{ color: "#fff" }}>{identificacao.nome}</b> ·{" "}
          <span onClick={onTrocarIdentificacao} style={{ textDecoration: "underline", cursor: "pointer" }}>não é você?</span>
        </div>
      )}
    </header>
  );
}

export function LojaAzus() {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [view, setView] = useState("catalogo"); // catalogo | produto | carrinho | sucesso
  const [slugAtual, setSlugAtual] = useState(null);
  const [carrinho, setCarrinho] = useState(carregarCarrinho);
  const [enviando, setEnviando] = useState(false);
  const [pedidoFeito, setPedidoFeito] = useState(null);
  const [ultimoPedidoCompleto, setUltimoPedidoCompleto] = useState(null);
  const [identificacao, setIdentificacao] = useState(carregarIdentificacao);

  useEffect(() => { document.title = "Loja Azus"; }, []);

  useEffect(() => {
    listarProdutos()
      .then(setProdutos)
      .catch(e => setErro(e.message || "Não foi possível carregar o catálogo."))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(carrinho));
  }, [carrinho]);

  const confirmarIdentificacao = (dados) => {
    localStorage.setItem(CHAVE_IDENTIFICACAO, JSON.stringify(dados));
    setIdentificacao(dados);
  };
  const trocarIdentificacao = () => {
    localStorage.removeItem(CHAVE_IDENTIFICACAO);
    setIdentificacao(null);
  };

  const adicionarVariosAoCarrinho = (itens) => {
    setCarrinho(c => [...c, ...itens]);
    setView("catalogo");
  };
  const atualizarQtd = (i, qtd) => setCarrinho(c => c.map((it, idx) => idx === i ? { ...it, quantidade: qtd } : it));
  const removerItem = (i) => setCarrinho(c => c.filter((_, idx) => idx !== i));

  // itensParaEnviar já vem com o acréscimo do Private Label aplicado
  // (calculado em Carrinho.jsx) quando for o caso.
  const enviarPedido = async ({ clienteNome, clienteTelefone, formaPagamento, aviamento, estado, observacoes, itensParaEnviar, subtotalProdutos, acrescimoAviamento, ajustePagamento, frete, total }) => {
    const clienteDocumento = identificacao?.documento || null;
    setEnviando(true);
    try {
      const resultado = await criarPedido({
        clienteNome, clienteTelefone, clienteDocumento, formaPagamento, aviamento, observacoes,
        itens: itensParaEnviar, ajustePagamento, frete, estado,
      });
      const mensagem = montarMensagem({
        numero: resultado.numero,
        clienteNome, clienteDocumento, clienteTelefone, formaPagamento, aviamento, estado, observacoes,
        itens: itensParaEnviar, subtotalProdutos, acrescimoAviamento, ajustePagamento, frete, total: resultado.total,
      });
      abrirWhatsapp(mensagem);
      setPedidoFeito(resultado);
      setUltimoPedidoCompleto({
        numero: resultado.numero, clienteNome, clienteDocumento, clienteTelefone, formaPagamento, aviamento, estado, observacoes,
        itens: itensParaEnviar, subtotalProdutos, acrescimoAviamento, ajustePagamento, frete, total: resultado.total,
        data: new Date().toLocaleString("pt-BR"),
      });
      setCarrinho([]);
      setView("sucesso");
    } catch (e) {
      alert("Não foi possível enviar o pedido: " + (e.message || e));
    } finally {
      setEnviando(false);
    }
  };

  const produtoAtual = produtos.find(p => p.slug === slugAtual);
  const qtdCarrinho = carrinho.reduce((s, it) => s + it.quantidade, 0);

  if (!identificacao) return <IdentificacaoCliente onConfirmar={confirmarIdentificacao} />;

  return (
    <div style={{ minHeight: "100vh", background: C.paper }}>
      <CabecalhoLoja qtdCarrinho={qtdCarrinho} onCarrinho={() => setView("carrinho")} onLogo={() => setView("catalogo")}
        identificacao={identificacao} onTrocarIdentificacao={trocarIdentificacao} />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 18px 60px" }}>
        {carregando && <div style={{ textAlign: "center", color: C.muted, padding: 60 }}>Carregando catálogo…</div>}
        {erro && <div style={{ textAlign: "center", color: C.clay, padding: 60 }}>{erro}</div>}

        {!carregando && !erro && view === "catalogo" && (
          <Catalogo produtos={produtos} onAbrirProduto={slug => { setSlugAtual(slug); setView("produto"); }} />
        )}

        {view === "produto" && produtoAtual && (
          <ProdutoDetalhe produto={produtoAtual} onVoltar={() => setView("catalogo")} onAdicionarVarios={adicionarVariosAoCarrinho} />
        )}

        {view === "carrinho" && (
          <Carrinho itens={carrinho} onAtualizarQtd={atualizarQtd} onRemover={removerItem}
            onVoltar={() => setView("catalogo")} onEnviar={enviarPedido} enviando={enviando}
            nomePadrao={identificacao.nome} contatoPadrao={identificacao.contato} />
        )}

        {view === "sucesso" && pedidoFeito && (
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div>
            <h2 style={{ fontFamily: BEBAS, color: C.brand, fontSize: 30, letterSpacing: .5 }}>Pedido #{pedidoFeito.numero} enviado!</h2>
            <p style={{ color: C.muted, fontSize: 14.5, maxWidth: 420, margin: "10px auto 24px" }}>
              Abrimos o WhatsApp com o resumo do seu pedido — é só confirmar o envio por lá.
              A vendedora vai entrar em contato para fechar os detalhes.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => window.print()} style={{ background: C.sage, color: C.brand, border: "1px solid " + C.line, borderRadius: 9, padding: "11px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                🖨️ Baixar recibo (PDF)
              </button>
              <button onClick={() => setView("catalogo")} style={{ background: C.brand, color: "#fff", border: "none", borderRadius: 9, padding: "11px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Voltar ao catálogo
              </button>
            </div>
          </div>
        )}
      </main>
      <Recibo pedido={ultimoPedidoCompleto} />
    </div>
  );
}

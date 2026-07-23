// Agrupa os itens do carrinho por produto e, dentro de cada produto, por
// cor — usado na mensagem do WhatsApp e no recibo em PDF, pra listar
// "CALÇA X / Cor Y: tamanho A (qtd), tamanho B (qtd)" em vez de uma
// linha solta por combinação de cor/tamanho.
export function agruparPorProduto(itens) {
  const porProduto = new Map();
  for (const it of itens) {
    if (!porProduto.has(it.produtoNome)) porProduto.set(it.produtoNome, new Map());
    const porCor = porProduto.get(it.produtoNome);
    const chaveCor = it.corNome || "—";
    if (!porCor.has(chaveCor)) porCor.set(chaveCor, []);
    porCor.get(chaveCor).push(it);
  }

  return [...porProduto.entries()].map(([produtoNome, porCor]) => {
    const cores = [...porCor.entries()].map(([corNome, linhas]) => ({
      corNome,
      linhas: linhas.map(l => ({ tamanho: l.tamanho, quantidade: l.quantidade, precoUnit: l.precoUnit })),
      totalPecas: linhas.reduce((s, l) => s + l.quantidade, 0),
    }));
    const totalPecas = cores.reduce((s, c) => s + c.totalPecas, 0);
    const subtotal = cores.reduce((s, c) => s + c.linhas.reduce((s2, l) => s2 + l.precoUnit * l.quantidade, 0), 0);
    return { produtoNome, cores, totalPecas, subtotal };
  });
}

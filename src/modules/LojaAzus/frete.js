// Tabela de frete da Azus (por região). "Frete grátis acima de" é sobre
// o subtotal dos produtos (antes do ajuste por forma de pagamento).
// Norte ainda não tem valor definido pela Azus — calcularFrete() retorna
// indisponivel:true nesse caso, e o carrinho bloqueia a finalização.

export const ESTADOS = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"],
  ["CE", "Ceará"], ["DF", "Distrito Federal"], ["ES", "Espírito Santo"], ["GO", "Goiás"],
  ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"],
  ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"], ["PE", "Pernambuco"], ["PI", "Piauí"],
  ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"], ["RS", "Rio Grande do Sul"],
  ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "São Paulo"],
  ["SE", "Sergipe"], ["TO", "Tocantins"],
];

const REGIAO_POR_ESTADO = {
  AC: "Norte", AP: "Norte", AM: "Norte", PA: "Norte", RO: "Norte", RR: "Norte", TO: "Norte",
  AL: "Nordeste", BA: "Nordeste", CE: "Nordeste", MA: "Nordeste", PB: "Nordeste", PE: "Nordeste", PI: "Nordeste", RN: "Nordeste", SE: "Nordeste",
  DF: "Centro-Oeste", GO: "Centro-Oeste", MT: "Centro-Oeste", MS: "Centro-Oeste",
  ES: "Sudeste", MG: "Sudeste", RJ: "Sudeste", SP: "Sudeste",
  PR: "Sul", RS: "Sul", SC: "Sul",
};

// null = Azus ainda não passou o valor pra essa região
export const REGRAS_FRETE = {
  "Norte": null,
  "Nordeste": { gratisAcima: 6000, taxa: 230 },
  "Centro-Oeste": { gratisAcima: 6000, taxa: 200 },
  "Sudeste": { gratisAcima: 5000, taxa: 180 },
  "Sul": { gratisAcima: 4500, taxa: 150 },
};

export function regiaoDoEstado(uf) {
  return REGIAO_POR_ESTADO[uf] || null;
}

export function calcularFrete(uf, subtotalProdutos) {
  const regiao = regiaoDoEstado(uf);
  const regra = regiao ? REGRAS_FRETE[regiao] : null;
  if (!regiao || !regra) return { regiao, indisponivel: true, gratis: false, valor: 0 };
  const gratis = subtotalProdutos >= regra.gratisAcima;
  return { regiao, indisponivel: false, gratis, valor: gratis ? 0 : regra.taxa, gratisAcima: regra.gratisAcima, taxa: regra.taxa };
}

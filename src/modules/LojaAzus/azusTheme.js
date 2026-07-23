// Paleta visual da Loja Azus — marca própria (Azus Menswear), independente
// da paleta verde/dourada do Hub Sementes Veneza. Mesmas chaves de C
// (src/constants.js) pra servir de substituto direto (import { AZ as C }).
export const AZ = {
  paper: "#F4F6F9", card: "#FFFFFF", ink: "#0F1B2A",
  brand: "#09294d", brand2: "#123B66", brandDark: "#061627",
  sage: "#EAF0F7", line: "#DCE3EC", muted: "#5C6B7D",
  clay: "#B5562F", green: "#2F8F2C", accent: "#B08A2E",
};

// Fonte padrão da marca Azus — display condensada, só para títulos/preços
// em destaque (não serve pra texto corrido, é toda em caixa alta).
export const BEBAS = "'Bebas Neue', Impact, sans-serif";

export const logoAzus = () => (typeof window !== "undefined" ? window.AZUS_LOGO : null);
export const fotoAmanda = () => (typeof window !== "undefined" ? window.AZUS_AMANDA_FOTO : null);

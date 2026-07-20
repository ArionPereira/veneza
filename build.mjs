// Build do app do Refeitório — Sementes Veneza
// Uso:  npm run build   (gera dist/index.html + assets)
import * as esbuild from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from "fs";

// ---------------------------------------------------------------------------
// CONFIGURAÇÃO (edite aqui se mudar de Supabase / função de IA)
// ---------------------------------------------------------------------------
const CONFIG = {
  SUPABASE_URL: "https://undvgacxhmawifcfpknv.supabase.co",
  SUPABASE_ANON: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuZHZnYWN4aG1hd2lmY2Zwa252Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODM0MTMsImV4cCI6MjA5ODA1OTQxM30.h7sqWylkkwa6e1LHppVEXs3TeuFg-9DmOBTSi1A4My0",
  CHAVE: "cardapio-refeitorio-veneza",
  AI_PRICE_URL: "https://undvgacxhmawifcfpknv.supabase.co/functions/v1/sugerir-preco",
  AI_MENU_URL: "https://undvgacxhmawifcfpknv.supabase.co/functions/v1/sugerir-cardapio",
};

const CSS = `
  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%}
  body{margin:0;font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#F2F5F9;color:#1C2A36;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}
  input,select,button{font-family:inherit}
  button{transition:filter .15s ease, transform .06s ease, box-shadow .15s ease, color .15s ease}
  button:hover{filter:brightness(1.04)}
  button:active{transform:translateY(1px)}
  input,select{transition:box-shadow .15s ease}
  input:focus,select:focus{outline:none;box-shadow:0 0 0 3px rgba(0,77,148,.18)}
  table{border-collapse:collapse}
  img{display:block}
  a{color:#004D94}
  ::selection{background:rgba(0,77,148,.18)}
  ::-webkit-scrollbar{width:11px;height:11px}
  ::-webkit-scrollbar-thumb{background:#C7D2DE;border-radius:8px;border:3px solid transparent;background-clip:content-box}
  ::-webkit-scrollbar-thumb:hover{background:#AEBDCC;background-clip:content-box}
  ::-webkit-scrollbar-track{background:transparent}
  @media (max-width:640px){
    main{padding-left:12px!important;padding-right:12px!important}
  }
  .pcm-os-print{display:none}
  .exp-print{display:none}
  @media print{
    .no-print{display:none!important}
    body{background:#fff!important}
    main{padding:0!important;max-width:100%!important}
    @page{margin:12mm}
    /* PCM: imprimir só a OS quando o body tem a classe pcm-printing */
    body.pcm-printing *{visibility:hidden}
    body.pcm-printing .pcm-os-print, body.pcm-printing .pcm-os-print *{visibility:visible}
    body.pcm-printing .pcm-os-print{display:block;position:absolute;left:0;top:0;width:100%;padding:0;color:#000}
    /* Expedição: imprimir só o checklist da carga quando o body tem a classe exp-printing */
    body.exp-printing *{visibility:hidden}
    body.exp-printing .exp-print, body.exp-printing .exp-print *{visibility:visible}
    body.exp-printing .exp-print{display:block;position:absolute;left:0;top:0;width:100%;padding:0;color:#000}
  }
`;

// 1) bundla o entry.jsx em memória
const result = await esbuild.build({
  entryPoints: ["src/entry.jsx"],
  bundle: true,
  platform: "browser",
  format: "iife",
  minify: true,
  define: { "process.env.NODE_ENV": '"production"' },
  loader: { ".jsx": "jsx" },
  write: false,
});
let bundle = result.outputFiles[0].text.replaceAll("</script>", "<\\/script>");

// 2) logo embutido (base64)
const logo = "data:image/png;base64," + readFileSync("public/logo_b64.txt", "utf8").trim();

// 3) monta o index.html
const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Sementes Veneza</title>
<link rel="manifest" href="manifest.webmanifest" />
<meta name="theme-color" content="#004D94" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Veneza" />
<link rel="apple-touch-icon" href="icon-192.png" />
<link rel="icon" href="icon-192.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>${CSS}</style>
</head>
<body>
<div id="root"></div>
<script>
  window.SUPABASE_URL  = "${CONFIG.SUPABASE_URL}";
  window.SUPABASE_ANON = "${CONFIG.SUPABASE_ANON}";
  window.CHAVE = "${CONFIG.CHAVE}";
  window.LOGO = "${logo}";
  window.AI_PRICE_URL = "${CONFIG.AI_PRICE_URL}";
  window.AI_MENU_URL = "${CONFIG.AI_MENU_URL}";
</script>
<script>
${bundle}
</script>
</body>
</html>
`;

// 4) escreve dist/ com index.html + assets do public (menos o logo_b64)
mkdirSync("dist", { recursive: true });
writeFileSync("dist/index.html", html);
for (const f of readdirSync("public")) {
  if (f === "logo_b64.txt") continue;
  copyFileSync("public/" + f, "dist/" + f);
}
console.log("OK -> dist/index.html (" + Math.round(html.length / 1024) + " KB) + assets");

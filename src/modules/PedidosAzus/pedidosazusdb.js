// Acesso aos pedidos e à sincronização do catálogo da Loja Azus, via
// Edge Functions (não lê azus_pedidos direto — ver justificativa em
// supabase/functions/azus-pedidos/index.ts).
import { sb } from "../../db.js";

async function chamarFuncao(nome, payload) {
  const { data, error } = await sb.functions.invoke(nome, { body: payload });
  if (error) throw error;
  if (data?.erro) throw new Error(data.erro);
  return data;
}

export const listarPedidos = (usuario, senha) =>
  chamarFuncao("azus-pedidos", { usuario, senha, action: "listar" }).then(r => r.pedidos || []);

export const atualizarStatusPedido = (usuario, senha, id, status) =>
  chamarFuncao("azus-pedidos", { usuario, senha, action: "atualizar_status", id, status });

// Roda a sincronização do catálogo Canva agora (fora do horário do cron).
export const sincronizarCatalogoAgora = (usuario, senha) =>
  chamarFuncao("azus-sync-catalogo", { usuario, senha });

// Histórico de sincronizações — sem dado pessoal, pode ler a tabela direto.
export const buscarUltimaSincronizacao = () =>
  sb.from("azus_sync_log").select("*").order("executado_em", { ascending: false }).limit(1)
    .then(({ data, error }) => { if (error) throw error; return data?.[0] || null; });

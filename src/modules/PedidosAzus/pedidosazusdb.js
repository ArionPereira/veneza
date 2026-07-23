// Acesso aos pedidos da Loja Azus via Edge Function (não lê a tabela
// direto — ver justificativa em supabase/functions/azus-pedidos/index.ts).
import { sb } from "../../db.js";

async function chamar(payload) {
  const { data, error } = await sb.functions.invoke("azus-pedidos", { body: payload });
  if (error) throw error;
  if (data?.erro) throw new Error(data.erro);
  return data;
}

export const listarPedidos = (usuario, senha) =>
  chamar({ usuario, senha, action: "listar" }).then(r => r.pedidos || []);

export const atualizarStatusPedido = (usuario, senha, id, status) =>
  chamar({ usuario, senha, action: "atualizar_status", id, status });

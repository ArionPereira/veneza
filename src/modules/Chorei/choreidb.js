import { sb } from "../../db.js";

async function ok(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}

export const listEquipes = () => ok(sb.from("chorei_equipes").select("*").order("ordem"));
export const listItens   = () => ok(sb.from("chorei_itens").select("*").order("criado_em", { ascending: false }));

export const salvarEquipe = (masterId, { id, nome, cor, ordem, responsavelId, ativo }) =>
  ok(sb.rpc("chorei_salvar_equipe", {
    p_master_id: masterId, p_id: id || null, p_nome: nome, p_cor: cor || null,
    p_ordem: ordem ?? null, p_responsavel_id: responsavelId || null, p_ativo: ativo ?? true,
  }));

export const criarItem = (userId, { equipeId, tipo, texto, responsavelId, responsavelNome, prazo }) =>
  ok(sb.rpc("chorei_criar_item", {
    p_user_id: userId, p_equipe_id: equipeId, p_tipo: tipo, p_texto: texto,
    p_responsavel_id: responsavelId || null, p_responsavel_nome: responsavelNome || null,
    p_prazo: prazo || null,
  }));

export const atualizarItem = (userId, id, { texto, responsavelId, responsavelNome, prazo, status, resolucao }) =>
  ok(sb.rpc("chorei_atualizar_item", {
    p_user_id: userId, p_id: id,
    p_texto: texto ?? null,
    p_responsavel_id: responsavelId ?? null,
    p_responsavel_nome: responsavelNome ?? null,
    p_prazo: prazo ?? null,
    p_status: status ?? null,
    p_resolucao: resolucao ?? null,
  }));

export const apagarItem = (userId, id) =>
  ok(sb.rpc("chorei_apagar_item", { p_user_id: userId, p_id: id }));

// Realtime — assina mudanças nas duas tabelas e reload quando algo muda
export function assinarChorei(onChange) {
  const ch = sb.channel("chorei-realtime");
  ["chorei_equipes","chorei_itens"].forEach(t => {
    ch.on("postgres_changes", { event:"*", schema:"public", table:t }, (payload) => onChange(t, payload));
  });
  ch.subscribe();
  return () => { try { sb.removeChannel(ch); } catch(e){} };
}

// Camada de acesso ao Supabase para o PCM. Tabelas/bucket prefixados pcm_.
// Reaproveita o mesmo cliente `sb` do resto do Ambiente Veneza.
import { sb } from "../../db.js";

const BUCKET = "pcm_fotos"; // TODO(pcm): se virar 'pcm-fotos', muda só aqui

// desembrulha {data,error} -> data (lança em erro, p/ o caller tratar)
async function ok(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}

// ---- Setores ----
export const listSetores  = ()        => ok(sb.from("pcm_setores").select("*").order("ordem"));
export const addSetor     = (nome, ordem=0) => ok(sb.from("pcm_setores").insert({ nome, ordem }).select().single());
export const updateSetor  = (id, patch)=> ok(sb.from("pcm_setores").update(patch).eq("id", id).select().single());
export const removeSetor  = (id)       => ok(sb.from("pcm_setores").delete().eq("id", id));

// ---- Equipamentos ----
export const listEquipamentos = ()        => ok(sb.from("pcm_equipamentos").select("*").order("tag"));
export const addEquipamento   = (obj)      => ok(sb.from("pcm_equipamentos").insert(obj).select().single());
export const updateEquipamento= (id, patch)=> ok(sb.from("pcm_equipamentos").update(patch).eq("id", id).select().single());
export const removeEquipamento= (id)       => ok(sb.from("pcm_equipamentos").delete().eq("id", id));

// ---- Ordens de serviço ----
export const listOrdens        = ()        => ok(sb.from("pcm_ordens").select("*").order("aberta_em", { ascending:false }));
export const listOrdensDoEquip = (equipId) => ok(sb.from("pcm_ordens").select("*").eq("equipamento_id", equipId).order("aberta_em", { ascending:false }));
export const addOrdem          = (obj)     => ok(sb.from("pcm_ordens").insert(obj).select().single());
export const updateOrdem       = (id, patch)=> ok(sb.from("pcm_ordens").update(patch).eq("id", id).select().single());

// fecha a OS (a trava de causa raiz/solução/tempo também existe no banco)
export const fecharOrdem = (id, { causa_raiz, solucao, tempo_parada_min }) =>
  updateOrdem(id, { status:"concluida", concluida_em:new Date().toISOString(), causa_raiz, solucao, tempo_parada_min });

export const cancelarOrdem = (id, motivo_cancelamento) =>
  updateOrdem(id, { status:"cancelada", motivo_cancelamento });

// muda o status, carimbando datas conforme o passo
export const mudarStatus = (id, status, extra={}) => {
  const patch = { status, ...extra };
  if (status === "executando" && !("iniciada_em" in patch)) patch.iniciada_em = new Date().toISOString();
  return updateOrdem(id, patch);
};

// ---- Fotos da OS ----
export const listFotos = (osId) => ok(sb.from("pcm_os_fotos").select("*").eq("os_id", osId).order("criado_em"));
export const addFoto   = (obj)  => ok(sb.from("pcm_os_fotos").insert(obj).select().single());
export const removeFoto= (id)   => ok(sb.from("pcm_os_fotos").delete().eq("id", id));

export async function uploadFoto(file, prefixo="os") {
  const ext  = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = prefixo + "/" + Date.now() + "-" + Math.random().toString(36).slice(2,8) + "." + ext;
  const { error } = await sb.storage.from(BUCKET).upload(path, file, { upsert:false, contentType:file.type || undefined });
  if (error) throw error;
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

// ---- Realtime: avisa quando qualquer tabela pcm_ muda ----
export function assinarPCM(onChange) {
  const ch = sb.channel("pcm-realtime");
  ["pcm_setores","pcm_equipamentos","pcm_ordens","pcm_os_fotos"].forEach(t=>{
    ch.on("postgres_changes", { event:"*", schema:"public", table:t }, (payload)=>onChange(t, payload));
  });
  ch.subscribe();
  return () => { try { sb.removeChannel(ch); } catch(e){} };
}

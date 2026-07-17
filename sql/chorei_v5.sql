-- =====================================================================
-- Chōrei v5 · Transferir projeto de equipe
-- Move um projeto/atividade de longa duração para outra equipe. Etapas
-- e observações não precisam de nada especial: elas dependem só do
-- item_id, que não muda — só o dono (equipe_id) do item muda.
-- Idempotente e autossuficiente: recria a coluna "auto" e a função
-- chorei_nota_auto (do chorei_v4.sql) caso ainda não existam, sem
-- exigir que o v4 tenha rodado antes. Pressupõe só o v1 e o v3.
-- =====================================================================
begin;

alter table public.chorei_projeto_notas add column if not exists auto boolean not null default false;

create or replace function public.chorei_nota_auto(p_user_id uuid, p_item_id uuid, p_texto text)
returns void language sql security definer set search_path = public as $$
  insert into public.chorei_projeto_notas(item_id, texto, autor_id, autor_nome, auto)
  values (p_item_id, p_texto, p_user_id,
    (select nome from public.app_usuarios where id = p_user_id), true);
$$;
revoke execute on function public.chorei_nota_auto(uuid, uuid, text) from public, anon, authenticated;

create or replace function public.chorei_transferir_projeto(
  p_user_id uuid, p_id uuid, p_equipe_destino_id uuid
) returns public.chorei_itens
language plpgsql security definer set search_path = public as $$
declare
  v_old public.chorei_itens;
  v_item public.chorei_itens;
  v_origem text;
  v_destino text;
begin
  select * into v_old from public.chorei_itens where id = p_id for update;
  if v_old.id is null then raise exception 'Projeto não encontrado'; end if;
  if v_old.tipo <> 'projeto' then raise exception 'Só projetos podem ser transferidos de equipe'; end if;
  if not public.chorei_pode_escrever(p_user_id, v_old.equipe_id) then
    raise exception 'Você não é o responsável desta equipe';
  end if;
  if p_equipe_destino_id = v_old.equipe_id then
    raise exception 'O projeto já está nessa equipe';
  end if;

  select nome into v_destino from public.chorei_equipes where id = p_equipe_destino_id and ativo;
  if v_destino is null then raise exception 'Equipe de destino inválida ou inativa'; end if;
  select nome into v_origem from public.chorei_equipes where id = v_old.equipe_id;

  update public.chorei_itens set equipe_id = p_equipe_destino_id
  where id = p_id
  returning * into v_item;

  perform public.chorei_nota_auto(p_user_id, p_id,
    '🔀 Transferido de "' || coalesce(v_origem, '—') || '" para "' || v_destino || '"');
  return v_item;
end $$;

grant execute on function public.chorei_transferir_projeto(uuid, uuid, uuid) to anon, authenticated;

commit;

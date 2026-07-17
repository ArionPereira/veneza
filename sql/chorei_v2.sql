-- =====================================================================
-- Chōrei v2 · Projetos e atividades de longa duração
-- Adiciona o tipo 'projeto' aos itens: atividades/projetos que atravessam
-- vários dias e não serão resolvidos no dia. Ficam numa lista própria
-- dentro de cada equipe, fora do fluxo diário da reunião.
-- Idempotente — pode rodar mais de uma vez.
-- (Instalação nova? O chorei_v1.sql atual já cria tudo com 'projeto';
--  este arquivo é pra quem já tinha o módulo rodando.)
-- =====================================================================
begin;

alter table public.chorei_itens drop constraint if exists chorei_itens_tipo_check;
alter table public.chorei_itens add constraint chorei_itens_tipo_check
  check (tipo in ('ontem','dificuldade','plano','aviso','projeto'));

-- Recria a RPC de criação aceitando o novo tipo
create or replace function public.chorei_criar_item(
  p_user_id uuid, p_equipe_id uuid, p_tipo text, p_texto text,
  p_responsavel_id uuid, p_responsavel_nome text, p_prazo date
) returns public.chorei_itens language plpgsql security definer set search_path=public as $$
declare v_item public.chorei_itens; v_autor text;
begin
  if not public.chorei_pode_escrever(p_user_id, p_equipe_id) then
    raise exception 'Você não é o responsável desta equipe';
  end if;
  if p_tipo not in ('ontem','dificuldade','plano','aviso','projeto') then raise exception 'Tipo inválido'; end if;
  if nullif(trim(coalesce(p_texto,'')),'') is null then raise exception 'Escreva o texto do item'; end if;
  select nome into v_autor from public.app_usuarios where id=p_user_id;
  insert into public.chorei_itens(equipe_id, tipo, texto, autor_id, autor_nome,
    responsavel_id, responsavel_nome, prazo, status)
  values (p_equipe_id, p_tipo, trim(p_texto), p_user_id, v_autor,
    p_responsavel_id, nullif(trim(coalesce(p_responsavel_nome,'')),''), p_prazo, 'aberto')
  returning * into v_item;
  return v_item;
end $$;

grant execute on function public.chorei_criar_item(uuid, uuid, text, text, uuid, text, date) to anon, authenticated;

commit;

-- =====================================================================
-- Chōrei v4 · Diário automático + converter item em projeto
-- 1) Notas automáticas no diário do projeto quando muda status, prazo
--    ou etapa (marcadas com auto=true, o app mostra discreto).
-- 2) RPC pra transformar uma dificuldade/plano do dia em projeto de
--    longa duração, levando dono, prazo e histórico junto.
-- Idempotente — pode rodar mais de uma vez. Pressupõe o v3.
-- =====================================================================
begin;

alter table public.chorei_projeto_notas add column if not exists auto boolean not null default false;

-- Nota automática (uso interno das RPCs; sem grant público de propósito)
create or replace function public.chorei_nota_auto(p_user_id uuid, p_item_id uuid, p_texto text)
returns void language sql security definer set search_path=public as $$
  insert into public.chorei_projeto_notas(item_id, texto, autor_id, autor_nome, auto)
  values (p_item_id, p_texto, p_user_id,
    (select nome from public.app_usuarios where id = p_user_id), true);
$$;
revoke execute on function public.chorei_nota_auto(uuid, uuid, text) from public, anon, authenticated;

-- ---------- Atualizar item: registra mudanças no diário ----------------
create or replace function public.chorei_atualizar_item(
  p_user_id uuid, p_id uuid, p_texto text, p_responsavel_id uuid,
  p_responsavel_nome text, p_prazo date, p_status text, p_resolucao text,
  p_prioridade text default null, p_inicio date default null
) returns public.chorei_itens language plpgsql security definer set search_path=public as $$
declare v_item public.chorei_itens; v_old public.chorei_itens;
begin
  select * into v_old from public.chorei_itens where id=p_id;
  if v_old.id is null then raise exception 'Item não encontrado'; end if;
  if not public.chorei_pode_escrever(p_user_id, v_old.equipe_id) then
    raise exception 'Você não é o responsável desta equipe';
  end if;
  if p_status is not null and p_status not in ('aberto','em_andamento','pausado','resolvido','cancelado') then
    raise exception 'Status inválido';
  end if;
  if p_prioridade is not null and p_prioridade not in ('alta','media','baixa') then
    raise exception 'Prioridade inválida';
  end if;
  update public.chorei_itens set
    texto            = coalesce(nullif(trim(coalesce(p_texto,'')),''), texto),
    responsavel_id   = p_responsavel_id,
    responsavel_nome = nullif(trim(coalesce(p_responsavel_nome,'')),''),
    prazo            = p_prazo,
    status           = coalesce(p_status, status),
    resolucao        = nullif(trim(coalesce(p_resolucao,'')),''),
    prioridade       = coalesce(p_prioridade, prioridade),
    inicio           = coalesce(p_inicio, inicio),
    resolvido_em     = case
                         when coalesce(p_status, status) in ('resolvido','cancelado')
                           then coalesce(resolvido_em, now())
                         else null
                       end
  where id = p_id
  returning * into v_item;

  -- diário automático (só projetos)
  if v_item.tipo = 'projeto' then
    if v_item.status is distinct from v_old.status then
      perform public.chorei_nota_auto(p_user_id, p_id,
        '⚙ Status: ' || initcap(replace(v_old.status,'_',' ')) || ' → ' || initcap(replace(v_item.status,'_',' '))
        || coalesce(' — ' || nullif(trim(coalesce(p_resolucao,'')),''), ''));
    end if;
    if v_item.prazo is distinct from v_old.prazo then
      perform public.chorei_nota_auto(p_user_id, p_id,
        '📅 Prazo: ' || coalesce(to_char(v_old.prazo,'DD/MM/YYYY'),'sem prazo')
        || ' → ' || coalesce(to_char(v_item.prazo,'DD/MM/YYYY'),'sem prazo'));
    end if;
  end if;
  return v_item;
end $$;

-- ---------- Marcar etapa: registra no diário ---------------------------
create or replace function public.chorei_marcar_etapa(p_user_id uuid, p_id uuid, p_feito boolean)
returns public.chorei_projeto_etapas language plpgsql security definer set search_path=public as $$
declare v_row public.chorei_projeto_etapas; v_old boolean; v_item uuid;
begin
  select item_id, feito into v_item, v_old from public.chorei_projeto_etapas where id = p_id;
  if v_item is null then raise exception 'Etapa não encontrada'; end if;
  if not public.chorei_pode_escrever_item(p_user_id, v_item) then
    raise exception 'Você não é o responsável desta equipe';
  end if;
  update public.chorei_projeto_etapas set
    feito    = coalesce(p_feito, false),
    feito_em = case when coalesce(p_feito, false) then coalesce(feito_em, now()) else null end
  where id = p_id
  returning * into v_row;

  if v_row.feito is distinct from v_old then
    perform public.chorei_nota_auto(p_user_id, v_item,
      case when v_row.feito then '✔ Etapa concluída: ' else '↩ Etapa reaberta: ' end || v_row.texto);
  end if;
  return v_row;
end $$;

-- ---------- Converter item do dia em projeto ---------------------------
create or replace function public.chorei_converter_em_projeto(p_user_id uuid, p_id uuid)
returns public.chorei_itens language plpgsql security definer set search_path=public as $$
declare v_item public.chorei_itens; v_old public.chorei_itens; v_rotulo text;
begin
  select * into v_old from public.chorei_itens where id=p_id;
  if v_old.id is null then raise exception 'Item não encontrado'; end if;
  if not public.chorei_pode_escrever(p_user_id, v_old.equipe_id) then
    raise exception 'Você não é o responsável desta equipe';
  end if;
  if v_old.tipo = 'projeto' then raise exception 'Este item já é um projeto'; end if;
  if v_old.status in ('resolvido','cancelado') then raise exception 'Item já encerrado não vira projeto'; end if;

  update public.chorei_itens set
    tipo   = 'projeto',
    inicio = coalesce(inicio, (criado_em at time zone 'America/Sao_Paulo')::date)
  where id = p_id
  returning * into v_item;

  v_rotulo := case v_old.tipo
    when 'dificuldade' then 'Dificuldade / bloqueio'
    when 'plano'       then 'Plano de hoje'
    when 'aviso'       then 'Aviso'
    when 'ontem'       then 'Nota de ontem'
    else v_old.tipo end;
  perform public.chorei_nota_auto(p_user_id, p_id,
    '🔁 Virou projeto — era "' || v_rotulo || '" criado em ' || to_char(v_old.criado_em,'DD/MM/YYYY'));
  return v_item;
end $$;

grant execute on function public.chorei_atualizar_item(uuid, uuid, text, uuid, text, date, text, text, text, date) to anon, authenticated;
grant execute on function public.chorei_marcar_etapa(uuid, uuid, boolean) to anon, authenticated;
grant execute on function public.chorei_converter_em_projeto(uuid, uuid) to anon, authenticated;

commit;

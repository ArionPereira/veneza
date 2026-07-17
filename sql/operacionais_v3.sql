begin;

-- =====================================================================
-- Edição/cancelamento de lançamentos, ativar/inativar cadastros e
-- histórico de auditoria (quem alterou o quê) nos módulos Almoxarifado
-- e Abastecimento. Idempotente — depende só do operacionais_v2.sql.
-- =====================================================================

-- ---------- Auditoria ---------------------------------------------------
create table if not exists public.op_auditoria (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  usuario_id uuid,
  usuario_nome text,
  modulo text not null,        -- 'almoxarifado' | 'abastecimento'
  entidade text not null,      -- movimentacao|abastecimento|entrada|item|categoria|unidade|veiculo|tanque
  registro_id uuid,
  acao text not null,          -- editar|cancelar|ativar|inativar
  resumo text,
  antes jsonb,
  depois jsonb
);
grant select on public.op_auditoria to anon, authenticated;

create or replace function public._op_log(
  p_usuario_id uuid,p_usuario_nome text,p_modulo text,p_entidade text,
  p_registro_id uuid,p_acao text,p_resumo text,p_antes jsonb,p_depois jsonb
) returns void
language sql security definer set search_path = public as $$
  insert into public.op_auditoria(usuario_id,usuario_nome,modulo,entidade,registro_id,acao,resumo,antes,depois)
  values(p_usuario_id,nullif(trim(p_usuario_nome),''),p_modulo,p_entidade,p_registro_id,p_acao,p_resumo,p_antes,p_depois);
$$;

-- ---------- Colunas de cancelamento ------------------------------------
alter table public.alm_movimentacoes   add column if not exists cancelado boolean not null default false;
alter table public.comb_abastecimentos add column if not exists cancelado boolean not null default false;
alter table public.comb_entradas       add column if not exists cancelado boolean not null default false;

-- ---------- Ativar / inativar cadastros (categoria, unidade, veículo, tanque) --
-- (item já tem edição completa própria — alm_atualizar_item, abaixo)
create or replace function public.op_definir_ativo(
  p_usuario_id uuid,p_usuario_nome text,p_entidade text,p_id uuid,p_ativo boolean
) returns void
language plpgsql security definer set search_path = public as $$
declare v_tab text; v_mod text; v_nome text;
begin
  v_tab := case p_entidade
    when 'categoria' then 'alm_categorias' when 'unidade' then 'alm_unidades'
    when 'veiculo' then 'comb_veiculos' when 'tanque' then 'comb_tanques' end;
  if v_tab is null then raise exception 'Entidade inválida'; end if;
  v_mod := case when p_entidade in ('veiculo','tanque') then 'abastecimento' else 'almoxarifado' end;
  execute format('update public.%I set ativo=$1 where id=$2 returning %I', v_tab, case p_entidade when 'veiculo' then 'identificacao' else 'nome' end)
    into v_nome using coalesce(p_ativo,true), p_id;
  if v_nome is null then raise exception 'Registro não encontrado'; end if;
  perform public._op_log(p_usuario_id,p_usuario_nome,v_mod,p_entidade,p_id,
    case when p_ativo then 'ativar' else 'inativar' end, v_nome, null, jsonb_build_object('ativo',p_ativo));
end $$;

-- ---------- Almoxarifado: editar / cancelar movimentação ---------------
create or replace function public.alm_editar_movimentacao(
  p_usuario_id uuid,p_usuario_nome text,p_id uuid,p_data date,p_tipo text,
  p_quantidade numeric,p_documento text,p_observacao text
) returns public.alm_movimentacoes
language plpgsql security definer set search_path = public as $$
declare v_old public.alm_movimentacoes; v_outros numeric; v_new public.alm_movimentacoes;
begin
  if p_tipo not in ('entrada','saida') then raise exception 'Tipo de movimentação inválido'; end if;
  if p_quantidade is null or p_quantidade<=0 then raise exception 'Informe uma quantidade maior que zero'; end if;
  select * into v_old from public.alm_movimentacoes where id=p_id for update;
  if not found then raise exception 'Movimentação não encontrada'; end if;
  if v_old.cancelado then raise exception 'Movimentação cancelada não pode ser editada'; end if;
  if v_old.origem <> 'manual' then raise exception 'Somente movimentações manuais podem ser editadas'; end if;
  select coalesce(sum(case when tipo='entrada' then quantidade else -quantidade end),0) into v_outros
    from public.alm_movimentacoes where item_id=v_old.item_id and not cancelado and id<>p_id;
  if p_tipo='saida' and (v_outros - p_quantidade) < 0 then raise exception 'A edição deixaria o estoque negativo'; end if;
  update public.alm_movimentacoes set data=coalesce(p_data,data),tipo=p_tipo,quantidade=p_quantidade,
    documento=nullif(trim(p_documento),''),observacao=nullif(trim(p_observacao),'')
    where id=p_id returning * into v_new;
  perform public._op_log(p_usuario_id,p_usuario_nome,'almoxarifado','movimentacao',p_id,'editar',
    v_new.tipo||' '||v_new.quantidade, to_jsonb(v_old), to_jsonb(v_new));
  return v_new;
end $$;

create or replace function public.alm_cancelar_movimentacao(
  p_usuario_id uuid,p_usuario_nome text,p_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
declare v_old public.alm_movimentacoes; v_outros numeric;
begin
  select * into v_old from public.alm_movimentacoes where id=p_id for update;
  if not found then raise exception 'Movimentação não encontrada'; end if;
  if v_old.cancelado then return; end if;
  if v_old.origem <> 'manual' then raise exception 'Somente movimentações manuais podem ser canceladas'; end if;
  if v_old.tipo='entrada' then
    select coalesce(sum(case when tipo='entrada' then quantidade else -quantidade end),0) into v_outros
      from public.alm_movimentacoes where item_id=v_old.item_id and not cancelado and id<>p_id;
    if v_outros < 0 then raise exception 'Cancelar esta entrada deixaria o estoque negativo'; end if;
  end if;
  update public.alm_movimentacoes set cancelado=true where id=p_id;
  perform public._op_log(p_usuario_id,p_usuario_nome,'almoxarifado','movimentacao',p_id,'cancelar',
    v_old.tipo||' '||v_old.quantidade, to_jsonb(v_old), null);
end $$;

-- ---------- Almoxarifado: item — passa a logar auditoria também --------
drop function if exists public.alm_atualizar_item(uuid,text,uuid,uuid,numeric,boolean);

create or replace function public.alm_atualizar_item(
  p_usuario_id uuid, p_usuario_nome text,
  p_id uuid, p_nome text, p_categoria_id uuid, p_unidade_id uuid,
  p_estoque_minimo numeric default 0, p_ativo boolean default true
) returns public.alm_itens
language plpgsql security definer set search_path=public as $$
declare v_cat public.alm_categorias; v_un public.alm_unidades; v_old public.alm_itens; v_item public.alm_itens;
begin
  if nullif(trim(p_nome),'') is null then raise exception 'Informe o nome do item'; end if;
  select * into v_cat from public.alm_categorias where id=p_categoria_id and ativo;
  if not found then raise exception 'Categoria inválida ou inativa'; end if;
  select * into v_un from public.alm_unidades where id=p_unidade_id and ativo;
  if not found then raise exception 'Unidade de medida inválida ou inativa'; end if;
  select * into v_old from public.alm_itens where id=p_id for update;
  if not found then raise exception 'Item não encontrado'; end if;
  update public.alm_itens set
    nome           = trim(p_nome),
    categoria_id   = v_cat.id,
    categoria      = v_cat.nome,
    unidade_id     = v_un.id,
    unidade        = v_un.sigla,
    estoque_minimo = greatest(coalesce(p_estoque_minimo,0),0),
    ativo          = coalesce(p_ativo,true)
  where id = p_id
  returning * into v_item;
  perform public._op_log(p_usuario_id,p_usuario_nome,'almoxarifado','item',p_id,'editar',
    v_item.codigo||' · '||v_item.nome, to_jsonb(v_old), to_jsonb(v_item));
  return v_item;
end $$;

-- ---------- Abastecimento: editar / cancelar abastecimento -------------
create or replace function public.comb_editar_abastecimento(
  p_usuario_id uuid,p_usuario_nome text,p_id uuid,p_data date,p_quantidade numeric,
  p_odometro numeric,p_observacao text
) returns public.comb_abastecimentos
language plpgsql security definer set search_path = public as $$
declare v_old public.comb_abastecimentos; v_tanque public.comb_tanques; v_delta numeric; v_new public.comb_abastecimentos;
begin
  if p_quantidade is null or p_quantidade<=0 then raise exception 'Informe uma quantidade maior que zero'; end if;
  select * into v_old from public.comb_abastecimentos where id=p_id for update;
  if not found then raise exception 'Abastecimento não encontrado'; end if;
  if v_old.cancelado then raise exception 'Abastecimento cancelado não pode ser editado'; end if;
  v_delta := p_quantidade - v_old.litros;  -- quanto sai a mais(+)/a menos(-) do tanque
  if v_old.tanque_id is not null then
    select * into v_tanque from public.comb_tanques where id=v_old.tanque_id for update;
    if v_tanque.saldo_l - v_delta < 0 then raise exception 'Saldo insuficiente no tanque para esta edição'; end if;
    update public.comb_tanques set saldo_l = saldo_l - v_delta where id=v_tanque.id;
  end if;
  update public.comb_abastecimentos set data=coalesce(p_data,data),litros=p_quantidade,
    odometro=p_odometro,observacao=nullif(trim(p_observacao),'')
    where id=p_id returning * into v_new;
  perform public._op_log(p_usuario_id,p_usuario_nome,'abastecimento','abastecimento',p_id,'editar',
    v_new.litros||' '||coalesce(v_new.unidade,'L'), to_jsonb(v_old), to_jsonb(v_new));
  return v_new;
end $$;

create or replace function public.comb_cancelar_abastecimento(
  p_usuario_id uuid,p_usuario_nome text,p_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
declare v_old public.comb_abastecimentos;
begin
  select * into v_old from public.comb_abastecimentos where id=p_id for update;
  if not found then raise exception 'Abastecimento não encontrado'; end if;
  if v_old.cancelado then return; end if;
  if v_old.tanque_id is not null then
    update public.comb_tanques set saldo_l = saldo_l + v_old.litros where id=v_old.tanque_id;
  end if;
  update public.comb_abastecimentos set cancelado=true where id=p_id;
  perform public._op_log(p_usuario_id,p_usuario_nome,'abastecimento','abastecimento',p_id,'cancelar',
    v_old.litros||' '||coalesce(v_old.unidade,'L'), to_jsonb(v_old), null);
end $$;

-- ---------- Abastecimento: editar / cancelar entrada -------------------
create or replace function public.comb_editar_entrada(
  p_usuario_id uuid,p_usuario_nome text,p_id uuid,p_data date,p_quantidade numeric,
  p_fornecedor text,p_documento text,p_observacao text
) returns public.comb_entradas
language plpgsql security definer set search_path = public as $$
declare v_old public.comb_entradas; v_tanque public.comb_tanques; v_delta numeric; v_new public.comb_entradas;
begin
  if p_quantidade is null or p_quantidade<=0 then raise exception 'Informe uma quantidade maior que zero'; end if;
  select * into v_old from public.comb_entradas where id=p_id for update;
  if not found then raise exception 'Entrada não encontrada'; end if;
  if v_old.cancelado then raise exception 'Entrada cancelada não pode ser editada'; end if;
  v_delta := p_quantidade - v_old.quantidade;  -- quanto entra a mais(+)/a menos(-) no tanque
  select * into v_tanque from public.comb_tanques where id=v_old.tanque_id for update;
  if v_tanque.saldo_l + v_delta < 0 then raise exception 'A edição deixaria o saldo do tanque negativo'; end if;
  if v_tanque.saldo_l + v_delta > v_tanque.capacidade_l then raise exception 'A edição ultrapassa a capacidade do tanque'; end if;
  update public.comb_tanques set saldo_l = saldo_l + v_delta where id=v_tanque.id;
  update public.comb_entradas set data=coalesce(p_data,data),quantidade=p_quantidade,
    fornecedor=nullif(trim(p_fornecedor),''),documento=nullif(trim(p_documento),''),observacao=nullif(trim(p_observacao),'')
    where id=p_id returning * into v_new;
  perform public._op_log(p_usuario_id,p_usuario_nome,'abastecimento','entrada',p_id,'editar',
    v_new.quantidade||' '||coalesce(v_new.unidade,'L'), to_jsonb(v_old), to_jsonb(v_new));
  return v_new;
end $$;

create or replace function public.comb_cancelar_entrada(
  p_usuario_id uuid,p_usuario_nome text,p_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
declare v_old public.comb_entradas; v_tanque public.comb_tanques;
begin
  select * into v_old from public.comb_entradas where id=p_id for update;
  if not found then raise exception 'Entrada não encontrada'; end if;
  if v_old.cancelado then return; end if;
  select * into v_tanque from public.comb_tanques where id=v_old.tanque_id for update;
  if v_tanque.saldo_l - v_old.quantidade < 0 then raise exception 'Combustível já consumido: cancelar deixaria o saldo negativo'; end if;
  update public.comb_tanques set saldo_l = saldo_l - v_old.quantidade where id=v_tanque.id;
  update public.comb_entradas set cancelado=true where id=p_id;
  perform public._op_log(p_usuario_id,p_usuario_nome,'abastecimento','entrada',p_id,'cancelar',
    v_old.quantidade||' '||coalesce(v_old.unidade,'L'), to_jsonb(v_old), null);
end $$;

grant execute on function public.op_definir_ativo(uuid,text,text,uuid,boolean) to anon, authenticated;
grant execute on function public.alm_editar_movimentacao(uuid,text,uuid,date,text,numeric,text,text) to anon, authenticated;
grant execute on function public.alm_cancelar_movimentacao(uuid,text,uuid) to anon, authenticated;
grant execute on function public.alm_atualizar_item(uuid,text,uuid,text,uuid,uuid,numeric,boolean) to anon, authenticated;
grant execute on function public.comb_editar_abastecimento(uuid,text,uuid,date,numeric,numeric,text) to anon, authenticated;
grant execute on function public.comb_cancelar_abastecimento(uuid,text,uuid) to anon, authenticated;
grant execute on function public.comb_editar_entrada(uuid,text,uuid,date,numeric,text,text,text) to anon, authenticated;
grant execute on function public.comb_cancelar_entrada(uuid,text,uuid) to anon, authenticated;

commit;

begin;

create table if not exists public.alm_categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tag text not null,
  proximo_numero integer not null default 1 check (proximo_numero > 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  constraint alm_categorias_nome_chk check (length(trim(nome)) > 0),
  constraint alm_categorias_tag_chk check (tag ~ '^[A-Z0-9]{2,8}$'),
  constraint alm_categorias_tag_key unique (tag)
);
create unique index if not exists alm_categorias_nome_lower_key on public.alm_categorias(lower(nome));

create table if not exists public.alm_unidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  sigla text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  constraint alm_unidades_nome_chk check (length(trim(nome)) > 0),
  constraint alm_unidades_sigla_chk check (length(trim(sigla)) between 1 and 10)
);
create unique index if not exists alm_unidades_sigla_lower_key on public.alm_unidades(lower(sigla));

insert into public.alm_unidades(nome,sigla) values
  ('Unidade','un'),('Quilograma','kg'),('Litro','L'),('Metro','m'),('Caixa','cx'),('Pacote','pct')
on conflict do nothing;

insert into public.alm_categorias(nome,tag)
select distinct trim(categoria),
       coalesce(nullif(left(regexp_replace(upper(trim(categoria)),'[^A-Z0-9]','','g'),8),''),'CAT')
from public.alm_itens
where nullif(trim(categoria),'') is not null
on conflict do nothing;

alter table public.alm_itens add column if not exists categoria_id uuid;
alter table public.alm_itens add column if not exists unidade_id uuid;

update public.alm_itens i
set categoria_id=c.id
from public.alm_categorias c
where i.categoria_id is null and lower(c.nome)=lower(trim(i.categoria));

update public.alm_itens i
set unidade_id=u.id
from public.alm_unidades u
where i.unidade_id is null and lower(u.sigla)=lower(trim(i.unidade));

do $$ begin
  if not exists (select 1 from pg_constraint where conname='alm_itens_categoria_id_fkey') then
    alter table public.alm_itens add constraint alm_itens_categoria_id_fkey foreign key(categoria_id) references public.alm_categorias(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname='alm_itens_unidade_id_fkey') then
    alter table public.alm_itens add constraint alm_itens_unidade_id_fkey foreign key(unidade_id) references public.alm_unidades(id) on delete restrict;
  end if;
end $$;

update public.alm_categorias c
set proximo_numero=greatest(c.proximo_numero,coalesce((
  select max(nullif(regexp_replace(i.codigo,'\D','','g'),'')::integer)+1
  from public.alm_itens i
  where i.categoria_id=c.id and i.codigo ~ ('^'||c.tag||'[0-9]+$')
),1));

create or replace function public.alm_criar_item(
  p_nome text, p_categoria_id uuid, p_unidade_id uuid, p_estoque_minimo numeric default 0
) returns public.alm_itens
language plpgsql security definer set search_path=public as $$
declare v_cat public.alm_categorias; v_un public.alm_unidades; v_codigo text; v_item public.alm_itens;
begin
  if nullif(trim(p_nome),'') is null then raise exception 'Informe o nome do item'; end if;
  select * into v_cat from public.alm_categorias where id=p_categoria_id and ativo for update;
  if not found then raise exception 'Categoria inválida ou inativa'; end if;
  select * into v_un from public.alm_unidades where id=p_unidade_id and ativo;
  if not found then raise exception 'Unidade de medida inválida ou inativa'; end if;
  v_codigo := v_cat.tag || lpad(v_cat.proximo_numero::text,4,'0');
  update public.alm_categorias set proximo_numero=proximo_numero+1 where id=v_cat.id;
  insert into public.alm_itens(codigo,nome,categoria,unidade,estoque_minimo,ativo,categoria_id,unidade_id)
  values(v_codigo,trim(p_nome),v_cat.nome,v_un.sigla,greatest(coalesce(p_estoque_minimo,0),0),true,v_cat.id,v_un.id)
  returning * into v_item;
  return v_item;
end $$;

create or replace function public.alm_abrir_inventario(
  p_data date default current_date, p_responsavel text default null, p_observacao text default null
) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  insert into public.alm_inventarios(data,status,responsavel,observacao)
  values(coalesce(p_data,current_date),'aberto',nullif(trim(p_responsavel),''),nullif(trim(p_observacao),''))
  returning id into v_id;
  insert into public.alm_inventario_itens(inventario_id,item_id,saldo_sistema,contagem_fisica,diferenca)
  select v_id,i.id,
    coalesce(sum(case when m.tipo='entrada' then m.quantidade else -m.quantidade end),0),
    greatest(coalesce(sum(case when m.tipo='entrada' then m.quantidade else -m.quantidade end),0),0),
    0
  from public.alm_itens i
  left join public.alm_movimentacoes m on m.item_id=i.id
  where i.ativo
  group by i.id;
  return v_id;
end $$;

insert into public.alm_inventario_itens(inventario_id,item_id,saldo_sistema,contagem_fisica,diferenca)
select inv.id,i.id,
  coalesce(sum(case when m.tipo='entrada' then m.quantidade else -m.quantidade end),0),
  greatest(coalesce(sum(case when m.tipo='entrada' then m.quantidade else -m.quantidade end),0),0),
  0
from public.alm_inventarios inv
cross join public.alm_itens i
left join public.alm_movimentacoes m on m.item_id=i.id
where inv.status='aberto' and i.ativo
group by inv.id,i.id
on conflict(inventario_id,item_id) do nothing;

create or replace function public.alm_atualizar_contagem(p_inventario_item_id uuid,p_contagem numeric)
returns public.alm_inventario_itens
language plpgsql security definer set search_path=public as $$
declare v_item public.alm_inventario_itens;
begin
  if p_contagem < 0 then raise exception 'A contagem não pode ser negativa'; end if;
  update public.alm_inventario_itens ii
  set contagem_fisica=p_contagem,diferenca=p_contagem-ii.saldo_sistema
  from public.alm_inventarios inv
  where ii.id=p_inventario_item_id and inv.id=ii.inventario_id and inv.status='aberto'
  returning ii.* into v_item;
  if not found then raise exception 'Inventário não encontrado ou já encerrado'; end if;
  return v_item;
end $$;

create or replace function public.alm_concluir_inventario(p_inventario_id uuid,p_responsavel text default null)
returns void
language plpgsql security definer set search_path=public as $$
declare v_inv public.alm_inventarios; r record;
begin
  select * into v_inv from public.alm_inventarios where id=p_inventario_id for update;
  if not found or v_inv.status<>'aberto' then raise exception 'Inventário não encontrado ou já encerrado'; end if;
  for r in select * from public.alm_inventario_itens where inventario_id=p_inventario_id and coalesce(diferenca,0)<>0 loop
    insert into public.alm_movimentacoes(item_id,data,tipo,quantidade,valor_unitario,documento,responsavel,observacao,origem)
    values(r.item_id,current_date,case when r.diferenca>0 then 'entrada' else 'saida' end,abs(r.diferenca),0,
      'INV-'||to_char(v_inv.data,'YYYYMMDD'),coalesce(nullif(trim(p_responsavel),''),v_inv.responsavel),
      'Ajuste automático do inventário','inventario');
  end loop;
  update public.alm_inventarios set status='concluido',concluido_em=now() where id=p_inventario_id;
end $$;

alter table public.comb_tanques add column if not exists unidade text not null default 'L';
alter table public.comb_abastecimentos add column if not exists unidade text not null default 'L';

do $$ begin
  if not exists(select 1 from pg_constraint where conname='comb_tanques_unidade_check') then
    alter table public.comb_tanques add constraint comb_tanques_unidade_check check(unidade in ('L','m3','kg'));
  end if;
  if not exists(select 1 from pg_constraint where conname='comb_abastecimentos_unidade_check') then
    alter table public.comb_abastecimentos add constraint comb_abastecimentos_unidade_check check(unidade in ('L','m3','kg'));
  end if;
end $$;

update public.comb_tanques set combustivel=lower(combustivel);
update public.comb_veiculos set combustivel=lower(combustivel);
update public.comb_abastecimentos set combustivel=lower(combustivel);

create table if not exists public.comb_entradas (
  id uuid primary key default gen_random_uuid(),
  tanque_id uuid not null references public.comb_tanques(id) on delete restrict,
  data date not null default current_date,
  combustivel text not null,
  quantidade numeric not null check(quantidade>0),
  unidade text not null check(unidade in ('L','m3','kg')),
  fornecedor text,
  documento text,
  responsavel text,
  observacao text,
  criado_em timestamptz not null default now()
);

create or replace function public.comb_registrar_abastecimento(
  p_veiculo_id uuid,p_tanque_id uuid,p_data date,p_quantidade numeric,p_odometro numeric default null,p_observacao text default null
) returns public.comb_abastecimentos
language plpgsql security definer set search_path=public as $$
declare v_tanque public.comb_tanques; v_veiculo public.comb_veiculos; v_ab public.comb_abastecimentos;
begin
  if p_quantidade is null or p_quantidade<=0 then raise exception 'Informe uma quantidade maior que zero'; end if;
  select * into v_tanque from public.comb_tanques where id=p_tanque_id and ativo for update;
  if not found then raise exception 'Tanque inválido ou inativo'; end if;
  select * into v_veiculo from public.comb_veiculos where id=p_veiculo_id and ativo;
  if not found then raise exception 'Veículo/equipamento inválido ou inativo'; end if;
  if lower(v_veiculo.combustivel)<>lower(v_tanque.combustivel) then raise exception 'O combustível do veículo não corresponde ao tanque'; end if;
  if v_tanque.saldo_l<p_quantidade then raise exception 'Saldo insuficiente no tanque'; end if;
  insert into public.comb_abastecimentos(veiculo_id,tanque_id,data,combustivel,litros,unidade,valor,odometro,posto,motorista,observacao)
  values(p_veiculo_id,p_tanque_id,coalesce(p_data,current_date),lower(v_tanque.combustivel),p_quantidade,v_tanque.unidade,0,p_odometro,null,null,nullif(trim(p_observacao),''))
  returning * into v_ab;
  update public.comb_tanques set saldo_l=saldo_l-p_quantidade where id=v_tanque.id;
  return v_ab;
end $$;

create or replace function public.comb_registrar_entrada(
  p_tanque_id uuid,p_data date,p_quantidade numeric,p_fornecedor text default null,p_documento text default null,
  p_responsavel text default null,p_observacao text default null
) returns public.comb_entradas
language plpgsql security definer set search_path=public as $$
declare v_tanque public.comb_tanques; v_ent public.comb_entradas;
begin
  if p_quantidade is null or p_quantidade<=0 then raise exception 'Informe uma quantidade maior que zero'; end if;
  select * into v_tanque from public.comb_tanques where id=p_tanque_id and ativo for update;
  if not found then raise exception 'Tanque inválido ou inativo'; end if;
  if v_tanque.saldo_l+p_quantidade>v_tanque.capacidade_l then raise exception 'A entrada ultrapassa a capacidade do tanque'; end if;
  insert into public.comb_entradas(tanque_id,data,combustivel,quantidade,unidade,fornecedor,documento,responsavel,observacao)
  values(v_tanque.id,coalesce(p_data,current_date),lower(v_tanque.combustivel),p_quantidade,v_tanque.unidade,
    nullif(trim(p_fornecedor),''),nullif(trim(p_documento),''),nullif(trim(p_responsavel),''),nullif(trim(p_observacao),''))
  returning * into v_ent;
  update public.comb_tanques set saldo_l=saldo_l+p_quantidade where id=v_tanque.id;
  return v_ent;
end $$;


create or replace function public.alm_registrar_movimentacao(
  p_item_id uuid,p_data date,p_tipo text,p_quantidade numeric,p_documento text default null,
  p_responsavel text default null,p_observacao text default null
) returns public.alm_movimentacoes
language plpgsql security definer set search_path=public as $
declare v_saldo numeric; v_mov public.alm_movimentacoes;
begin
  if p_tipo not in ('entrada','saida') then raise exception 'Tipo de movimentação inválido'; end if;
  if p_quantidade is null or p_quantidade<=0 then raise exception 'Informe uma quantidade maior que zero'; end if;
  perform 1 from public.alm_itens where id=p_item_id and ativo for update;
  if not found then raise exception 'Item inválido ou inativo'; end if;
  select coalesce(sum(case when tipo='entrada' then quantidade else -quantidade end),0)
    into v_saldo from public.alm_movimentacoes where item_id=p_item_id;
  if p_tipo='saida' and p_quantidade>v_saldo then raise exception 'Saldo insuficiente para esta saída'; end if;
  insert into public.alm_movimentacoes(item_id,data,tipo,quantidade,valor_unitario,documento,responsavel,observacao,origem)
  values(p_item_id,coalesce(p_data,current_date),p_tipo,p_quantidade,0,nullif(trim(p_documento),''),
    nullif(trim(p_responsavel),''),nullif(trim(p_observacao),''),'manual')
  returning * into v_mov;
  return v_mov;
end $;

grant select,insert,update,delete on public.alm_categorias,public.alm_unidades,public.comb_entradas to anon,authenticated;
grant execute on function public.alm_criar_item(text,uuid,uuid,numeric) to anon,authenticated;
grant execute on function public.alm_registrar_movimentacao(uuid,date,text,numeric,text,text,text) to anon,authenticated;
grant execute on function public.alm_abrir_inventario(date,text,text) to anon,authenticated;
grant execute on function public.alm_atualizar_contagem(uuid,numeric) to anon,authenticated;
grant execute on function public.alm_concluir_inventario(uuid,text) to anon,authenticated;
grant execute on function public.comb_registrar_abastecimento(uuid,uuid,date,numeric,numeric,text) to anon,authenticated;
grant execute on function public.comb_registrar_entrada(uuid,date,numeric,text,text,text,text) to anon,authenticated;

commit;

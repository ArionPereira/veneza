-- =====================================================================
-- Loja Azus (vitrine pública de calças + carrinho + pré-pedido)
-- Rode UMA vez no SQL Editor do Supabase (é idempotente, pode re-rodar).
-- Tudo prefixado com azus_ para conviver com os outros módulos no mesmo
-- projeto Supabase.
--
-- IMPORTANTE — desvio deliberado do padrão "sem RLS / grant liberado pro
-- anon" usado no resto do projeto: este é o primeiro módulo exposto à
-- internet pública (todo o resto do Hub vive atrás do login da equipe).
-- azus_produtos/azus_produto_fotos/azus_produto_cores são catálogo (sem
-- dado pessoal) e ficam com select público. Já azus_pedidos/
-- azus_pedido_itens têm nome/telefone de cliente — o anon só pode INSERIR
-- (via a função azus_criar_pedido), nunca ler. A tela interna "Pedidos
-- Azus" lê por uma Edge Function separada (service-role key no servidor,
-- ver supabase/functions/azus-pedidos), não direto na tabela.
-- =====================================================================

create extension if not exists pgcrypto;   -- p/ gen_random_uuid()

-- ---------------------------------------------------------------------
-- PRODUTOS
-- ---------------------------------------------------------------------
create table if not exists azus_produtos (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  nome               text not null,
  descricao          text,
  composicao         text,
  preco_varejo       numeric(10,2),          -- null p/ produtos só-atacado (ex.: Marca D'Água)
  preco_atacado      jsonb,                  -- [{"min":1,"preco":59.98}, ...] — faixas por quantidade
  producao_limitada  text,                   -- aviso opcional (ex.: prazo de encomenda)
  ordem              int not null default 0,
  ativo              boolean not null default true,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now()
);

create table if not exists azus_produto_fotos (
  id          uuid primary key default gen_random_uuid(),
  produto_id  uuid not null references azus_produtos(id) on delete cascade,
  url         text not null,
  ordem       int not null default 0,
  criado_em   timestamptz not null default now()
);
create index if not exists azus_fotos_produto_idx on azus_produto_fotos(produto_id);

create table if not exists azus_produto_cores (
  id            uuid primary key default gen_random_uuid(),
  produto_id    uuid not null references azus_produtos(id) on delete cascade,
  codigo        text not null,   -- código de cor do catálogo (ex.: "15")
  nome          text not null,   -- ex.: "marinho"
  tamanho_min   int,
  tamanho_max   int,
  entrega       text,            -- ex.: "imediato", "10/08", "outubro"
  observacao    text,            -- ex.: "verificar disponibilidade", "novo tom, solicitar foto"
  ordem         int not null default 0
);
create index if not exists azus_cores_produto_idx on azus_produto_cores(produto_id);

create or replace function azus_touch()
returns trigger language plpgsql as $$
begin new.atualizado_em := now(); return new; end $$;

drop trigger if exists azus_produtos_touch on azus_produtos;
create trigger azus_produtos_touch before update on azus_produtos
  for each row execute function azus_touch();

-- ---------------------------------------------------------------------
-- PEDIDOS (pré-pedido montado pelo cliente na vitrine)
-- ---------------------------------------------------------------------
create sequence if not exists azus_pedidos_numero_seq;

create table if not exists azus_pedidos (
  id                uuid primary key default gen_random_uuid(),
  numero            int not null default nextval('azus_pedidos_numero_seq'),
  cliente_nome      text not null,
  cliente_telefone  text,
  forma_pagamento   text,
  observacoes       text,
  status            text not null default 'novo' check (status in ('novo','lancado','cancelado')),
  total             numeric(10,2) not null default 0,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);

drop trigger if exists azus_pedidos_touch on azus_pedidos;
create trigger azus_pedidos_touch before update on azus_pedidos
  for each row execute function azus_touch();

create table if not exists azus_pedido_itens (
  id            uuid primary key default gen_random_uuid(),
  pedido_id     uuid not null references azus_pedidos(id) on delete cascade,
  produto_id    uuid references azus_produtos(id) on delete set null,
  produto_nome  text not null,   -- snapshot (sobrevive mesmo se o produto mudar/sumir depois)
  cor_codigo    text,
  cor_nome      text,
  tamanho       int,
  quantidade    int not null default 1 check (quantidade > 0),
  preco_unit    numeric(10,2) not null,
  subtotal      numeric(10,2) not null
);
create index if not exists azus_itens_pedido_idx on azus_pedido_itens(pedido_id);

-- ---------------------------------------------------------------------
-- Cria o pedido + itens de forma atômica (chamada pela vitrine pública).
-- security definer pra poder escrever mesmo com o anon sem select nas
-- tabelas de pedido.
-- ---------------------------------------------------------------------
create or replace function azus_criar_pedido(
  p_cliente_nome     text,
  p_cliente_telefone text,
  p_forma_pagamento  text,
  p_observacoes      text,
  p_itens            jsonb   -- [{produto_id, produto_nome, cor_codigo, cor_nome, tamanho, quantidade, preco_unit}, ...]
)
returns table(id uuid, numero int, total numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_pedido_id uuid;
  v_numero    int;
  v_total     numeric(10,2) := 0;
  v_item      jsonb;
  v_qtd       int;
  v_preco     numeric(10,2);
begin
  if p_cliente_nome is null or length(btrim(p_cliente_nome)) = 0 then
    raise exception 'Nome do cliente é obrigatório';
  end if;
  if p_itens is null or jsonb_array_length(p_itens) = 0 then
    raise exception 'Pedido sem itens';
  end if;

  insert into azus_pedidos (cliente_nome, cliente_telefone, forma_pagamento, observacoes)
  values (btrim(p_cliente_nome), p_cliente_telefone, p_forma_pagamento, p_observacoes)
  returning azus_pedidos.id, azus_pedidos.numero into v_pedido_id, v_numero;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_qtd   := coalesce((v_item->>'quantidade')::int, 1);
    v_preco := coalesce((v_item->>'preco_unit')::numeric, 0);
    insert into azus_pedido_itens (pedido_id, produto_id, produto_nome, cor_codigo, cor_nome, tamanho, quantidade, preco_unit, subtotal)
    values (
      v_pedido_id,
      nullif(v_item->>'produto_id','')::uuid,
      v_item->>'produto_nome',
      v_item->>'cor_codigo',
      v_item->>'cor_nome',
      nullif(v_item->>'tamanho','')::int,
      v_qtd,
      v_preco,
      v_qtd * v_preco
    );
    v_total := v_total + (v_qtd * v_preco);
  end loop;

  update azus_pedidos set total = v_total where azus_pedidos.id = v_pedido_id;

  return query select v_pedido_id, v_numero, v_total;
end $$;

-- ---------------------------------------------------------------------
-- Acesso
--   catálogo: leitura pública (sem PII, é vitrine)
--   pedidos:  anon NÃO lê a tabela direto — só grava via a função acima.
--             A tela interna lê por Edge Function com service-role key.
-- ---------------------------------------------------------------------
grant select on azus_produtos, azus_produto_fotos, azus_produto_cores to anon, authenticated;
grant execute on function azus_criar_pedido(text,text,text,text,jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Storage: bucket público p/ fotos dos produtos
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('azus_fotos','azus_fotos', true)
  on conflict (id) do nothing;

drop policy if exists "azus_fotos leitura" on storage.objects;
create policy "azus_fotos leitura" on storage.objects
  for select to public using (bucket_id = 'azus_fotos');

drop policy if exists "azus_fotos envio" on storage.objects;
create policy "azus_fotos envio" on storage.objects
  for insert to public with check (bucket_id = 'azus_fotos');

drop policy if exists "azus_fotos remove" on storage.objects;
create policy "azus_fotos remove" on storage.objects
  for delete to public using (bucket_id = 'azus_fotos');

-- =====================================================================
-- SEED — os 18 modelos do catálogo "Alfaiatarias 2026/3" (Azus), com
-- texto extraído do próprio catálogo (nome, descrição, composição,
-- preço, cores/tamanho/entrega). Fotos entram depois via
-- scripts/seed-azus-fotos.mjs (precisam de upload, não dá em SQL puro).
-- =====================================================================
insert into azus_produtos (slug, nome, descricao, composicao, preco_varejo, preco_atacado, producao_limitada, ordem) values
  ('atenas-slim', 'Atenas Slim', 'É a calça mais vendida da Azus na versão um pouco mais solta. Tecido leve e extremamente macio, com ponteira em bico e ajuste de fivelas de catraca que aumentam ou diminuem em até 2 tamanhos.', '62% poliéster 33% viscose 5% elastano', 169.98, null, null, 1),
  ('atenas-super-slim', 'Atenas Super Slim', 'Best Seller absoluto, a Atenas vai revolucionar as vendas da sua loja. Nesta versão, a modelagem super slim é na medida e dispensa qualquer ajuste.', '62% poliéster 33% viscose 5% elastano', 169.98, null, null, 2),
  ('verona', 'Verona', 'Best Seller. Uma das calças mais vendidas, a Verona vai te impressionar pelo acabamento, caimento e durabilidade. Feita para durar, seu tecido não desbota nem faz pilling mesmo após uso intenso.', '94% poliéster 6% elastano', 119.98, null, null, 3),
  ('viena', 'Viena', 'A Viena é uma calça da linha social, com ajuste de fivelas de catraca. Seu tecido é o mais durável entre todas as nossas linhas, com zero pilling, zero desbotamento e excelente custo benefício.', '94% poliéster 6% elastano', 139.98, null, null, 4),
  ('toquio-com-fivelas', 'Tóquio com Fivelas', 'A peça que faltava na nossa coleção. Confeccionada em tecido tecnológico com fibra elastomultiéster, a Tóquio com Fivelas entrega a aparência sofisticada da sarja com máxima performance: não desbota, não marca os joelhos e oferece conforto excepcional. Elegância, resistência e tecnologia em uma única peça.', '60% poliéster 40% elastomultiéster', 139.98, null, null, 5),
  ('versalhes', 'Versalhes', 'A Versalhes é um modelo validado, com cós mais largo, ponteira arredondada com botões sobrepostos e ajuste de fivela nas duas laterais. Seu tecido é um PV com elastano, tecido fresco e macio, com uma padronagem bem discreta. Novo modelo de fivela, ajuste mais firme.', '76% poliéster 23% viscose 1% elastano', 159.98, null, null, 6),
  ('gurkha-lisboa', 'Gurkha Lisboa', 'Lançamento. A Gurkha Lisboa se destaca pelo design alinhado com os detalhes nobres da alfaiataria, com destaque aos passantes largos com botão e fivela para dar charme e autenticidade ao produto.', '100% poliéster', 134.98, null, null, 7),
  ('gurkha-phuket', 'Gurkha Phuket', 'Com cós mais alto e largo, e transpasse alongado, a calça Gurkha Phuket é feita em puro linho, de uma qualidade excepcional com alta gramatura, sem transparências. Com corte reto, pregas e fivelas laterais, essa peça é puro refinamento.', '100% linho', 249.98, null, 'Produção limitada: pedidos até 31/07 ou até durar o estoque de tecido.', 8),
  ('patan', 'Patan', 'Inspirada nas clássicas calças gurkhas, a Patan traz a cintura mais alta, com ajuste de botões em cós cruzado. Uma peça que foge do comum, conferindo destaque e sofisticação a qualquer produção.', '70% poliéster 30% viscose', 134.98, null, null, 9),
  ('gurkha-york', 'Gurkha York', 'Lançamento. A Gurkha York é a peça mais elaborada da coleção, e ainda assim, entrega um resultado clean. Seu fechamento se dá por uma argola em meio círculo e nos bolsos traseiros, a lapela com costura em ponto picado é recolhível. Seu tecido é um nobre PV com elastano.', '73% poliéster 25% viscose 2% elastano', 159.98, null, null, 10),
  ('gurkha-veneto', 'Gurkha Veneto', 'Lançamento. A Gurkha Veneto é elaborada com um PV com elastano maquinetado em padronagem olho de perdiz. Seu modelo se destaca pelo cós mais largo com transpasse longo, abotoado após um passante diferenciado, e em um dos lados ajuste com uma belíssima fivela.', '80% poliéster 18% viscose 2% elastano', 159.98, null, null, 11),
  ('gurkha-veneza', 'Gurkha Veneza', 'Lançamento. Minimalista e com grande impacto visual, a Gurkha Veneza é feita em sarja leve e acetinada, a mesma dos modelos consagrados Trento e Harbin Cetim. Seu fechamento se dá por uma fivela bastante diferenciada, o que a torna uma peça única.', '98% algodão 2% elastano', 159.98, null, null, 12),
  ('bellagio', 'Bellagio', 'Lançamento. Elaborada com o mesmo linho de alta gramatura da Gurkha Phuket e bermuda Ponza, a Bellagio chega com um design elaborado, belíssimo. Cós duplo, cintura alta, transpasse reto com botões sobrepostos. Duas pregas e ajuste por fivelas.', '100% linho (mesmo tecido da Phuket e Ponza)', 259.98, null, 'Produção limitada: pedidos até 31/07 ou até durar o estoque de tecido.', 13),
  ('porto', 'Porto', 'Lançamento. A Porto vem para revolucionar o vestir das calças sociais. Seu modelo clássico de alfaiataria, com poucas costuras, ganha uma leve casualidade com o fechamento em botão aparente e muita vestibilidade e conforto com o discreto cós em elástico. Excelente opção para vendas online.', '100% poliéster', 99.98, null, null, 14),
  ('luso-principe-de-galles', 'Luso Príncipe de Galles', 'A Luso Príncipe de Galles é uma das peças mais atemporais nas alfaiatarias. Uma padronagem que transcende o tempo se mantendo sempre elegante e versátil. Ela conta com cós transpassado e modelagem slim. Seu tecido é fluido e durável.', '100% poliéster', 89.98, null, null, 15),
  ('marca-dagua', 'Marca D''Água', 'Linha Clássica. A Marca D''Água é uma calça social com construção clássica de alfaiataria, com sobras internas para ajustes e barra por fazer. Tecido com maquinetado bem discreto. Com bom corte e boa costura, é um produto essencial.', '100% poliéster', null, '[{"min":1,"preco":59.98},{"min":100,"preco":55.98},{"min":200,"preco":49.98},{"min":400,"preco":44.98}]'::jsonb, null, 16),
  ('florenca', 'Florença', 'A Florença possui uma discreta padronagem xadrez com traços quadriculados. Seu tecido nobre de PV com elastano tem toque gelado e excelente durabilidade. Por dentro é belíssima, com acabamento em tricoline.', '76% poliéster 23% viscose 1% elastano', 169.98, null, null, 17),
  ('marselha', 'Marselha', 'Lançamento. A charmosa Marselha possui o mesmo durável tecido da Verona e Viena. Ela é uma peça de grande destaque visual com o detalhe de ponteiras e botões, somado a prega frontal.', '94% poliéster 6% elastano', 109.98, null, null, 18)
on conflict (slug) do nothing;

-- Cores/tamanho/entrega por produto (join pelo slug).
-- Obs.: em "gurkha-veneto" o próprio catálogo original repete o código
-- "15" para marinho e cinza (provável erro de digitação de origem) —
-- mantido fiel ao catálogo, não corrigido aqui.
insert into azus_produto_cores (produto_id, codigo, nome, tamanho_min, tamanho_max, entrega, observacao, ordem)
select p.id, c.codigo, c.nome, c.tamanho_min, c.tamanho_max, c.entrega, c.observacao, c.ordem
from (values
  ('atenas-slim', '01', 'branco', 38, 52, '10/08', null::text, 1),
  ('atenas-slim', '08', 'areia', 38, 52, '10/08', null, 2),
  ('atenas-slim', '13', 'azul claro', 38, 50, 'imediato', null, 3),
  ('atenas-slim', '15', 'marinho', 38, 52, '10/08', null, 4),
  ('atenas-slim', '24', 'militar', 38, 52, 'imediato', null, 5),
  ('atenas-slim', '31', 'cinza claro', 38, 52, '10/08', null, 6),
  ('atenas-slim', '33', 'chumbo', 38, 52, 'imediato', null, 7),
  ('atenas-slim', '38', 'marrom', 38, 52, 'imediato', null, 8),
  ('atenas-slim', '44', 'khaki', 38, 52, 'imediato', null, 9),
  ('atenas-slim', '70', 'preto', 38, 48, 'imediato', null, 10),

  ('atenas-super-slim', '08', 'areia', 38, 52, 'imediato', null, 1),
  ('atenas-super-slim', '13', 'azul claro', 38, 52, 'imediato', null, 2),
  ('atenas-super-slim', '14', 'royal', 38, 52, 'imediato', null, 3),
  ('atenas-super-slim', '15', 'marinho', 38, 52, 'imediato', null, 4),
  ('atenas-super-slim', '24', 'militar', 38, 52, 'imediato', null, 5),
  ('atenas-super-slim', '31', 'cinza claro', 38, 52, 'imediato', null, 6),
  ('atenas-super-slim', '33', 'chumbo', 38, 52, 'imediato', null, 7),
  ('atenas-super-slim', '38', 'marrom', 38, 52, 'imediato', null, 8),
  ('atenas-super-slim', '44', 'khaki', 38, 52, 'imediato', null, 9),
  ('atenas-super-slim', '70', 'preto', 38, 52, 'imediato', null, 10),

  ('verona', '08', 'areia', 38, 52, 'imediato', null, 1),
  ('verona', '13', 'azul claro', 38, 52, 'imediato', null, 2),
  ('verona', '15', 'marinho', 38, 52, 'imediato', null, 3),
  ('verona', '21', 'verde escuro', 38, 50, 'imediato', null, 4),
  ('verona', '22', 'verde claro', 38, 52, 'imediato', null, 5),
  ('verona', '24', 'verde militar', 38, 52, 'imediato', null, 6),
  ('verona', '31', 'cinza claro', 38, 52, 'imediato', null, 7),
  ('verona', '33', 'chumbo', null, null, null, 'verificar disponibilidade', 8),
  ('verona', '38', 'marrom', 38, 52, 'imediato', null, 9),
  ('verona', '44', 'khaki', 38, 52, 'imediato', null, 10),
  ('verona', '70', 'preto', 38, 50, 'imediato', null, 11),

  ('viena', '08', 'areia', 40, 52, 'imediato', null, 1),
  ('viena', '13', 'azul claro', 38, 52, 'imediato', null, 2),
  ('viena', '15', 'marinho', 38, 52, 'imediato', null, 3),
  ('viena', '21', 'verde escuro', 38, 52, 'imediato', null, 4),
  ('viena', '24', 'militar', 38, 50, 'imediato', null, 5),
  ('viena', '31', 'cinza', 38, 52, 'imediato', null, 6),
  ('viena', '33', 'chumbo', 38, 52, 'imediato', null, 7),
  ('viena', '38', 'marrom', 38, 46, '30/07', null, 8),
  ('viena', '44', 'khaki', 38, 52, 'imediato', null, 9),
  ('viena', '70', 'preto', 38, 52, 'imediato', null, 10),
  ('viena', '72', 'risca de giz', 38, 52, 'imediato', null, 11),

  ('toquio-com-fivelas', '08', 'areia', 38, 52, '15/08', 'metais cromados', 1),
  ('toquio-com-fivelas', '15', 'marinho', 38, 52, '15/08', 'metais pretos', 2),
  ('toquio-com-fivelas', '33', 'chumbo', 38, 50, '15/08', 'metais pretos', 3),
  ('toquio-com-fivelas', '44', 'khaki', 38, 52, '15/08', 'metais cromados', 4),
  ('toquio-com-fivelas', '70', 'preto', 38, 52, '15/08', 'metais pretos', 5),

  ('versalhes', '15', 'marinho', 38, 50, 'imediato', null, 1),
  ('versalhes', '31', 'cinza', 38, 50, 'imediato', null, 2),
  ('versalhes', '70', 'preto', 38, 46, 'imediato', null, 3),

  ('gurkha-lisboa', '08', 'areia', 38, 52, 'imediato', null, 1),
  ('gurkha-lisboa', '31', 'cinza', 38, 52, 'imediato', null, 2),
  ('gurkha-lisboa', '33', 'chumbo', 38, 52, 'imediato', null, 3),
  ('gurkha-lisboa', '70', 'preto', 40, 48, 'imediato', null, 4),
  ('gurkha-lisboa', '72', 'risca de giz', 38, 52, 'imediato', null, 5),

  ('gurkha-phuket', '03', 'natural', 38, 50, '20/09', null, 1),
  ('gurkha-phuket', '15', 'marinho', 38, 50, '20/09', null, 2),
  ('gurkha-phuket', '24', 'militar', 38, 50, '20/09', null, 3),
  ('gurkha-phuket', '38', 'marrom', 38, 50, '20/09', 'novo tom, solicitar foto', 4),

  ('patan', '14', 'royal', 38, 46, 'imediato', null, 1),
  ('patan', '31', 'cinza', 38, 48, 'imediato', null, 2),
  ('patan', '36', 'marsala', 38, 46, 'imediato', null, 3),

  ('gurkha-york', '15', 'marinho', 38, 48, 'imediato', null, 1),
  ('gurkha-york', '31', 'cinza', 38, 46, 'imediato', null, 2),
  ('gurkha-york', '38', 'marrom', 38, 48, 'imediato', null, 3),
  ('gurkha-york', '70', 'preto', 38, 48, 'imediato', null, 4),

  ('gurkha-veneto', '15', 'marinho', 38, 52, 'imediato', null, 1),
  ('gurkha-veneto', '15', 'cinza', 38, 50, 'imediato', null, 2),
  ('gurkha-veneto', '24', 'chumbo', 38, 52, 'imediato', null, 3),
  ('gurkha-veneto', '38', 'khaki', 38, 52, 'imediato', null, 4),
  ('gurkha-veneto', '70', 'preto', 38, 52, 'imediato', null, 5),

  ('gurkha-veneza', '08', 'areia', 38, 52, 'imediato', null, 1),
  ('gurkha-veneza', '33', 'chumbo', 38, 50, 'imediato', null, 2),
  ('gurkha-veneza', '70', 'preto', 38, 52, 'imediato', null, 3),

  ('bellagio', '01', 'branca', 38, 52, 'outubro', null, 1),
  ('bellagio', '03', 'natural', 38, 52, 'outubro', null, 2),
  ('bellagio', '15', 'marinho', 38, 52, 'outubro', null, 3),
  ('bellagio', '24', 'militar', 38, 52, 'outubro', null, 4),
  ('bellagio', '38', 'marrom', 38, 52, 'outubro', null, 5),

  ('porto', '15', 'marinho', 38, 52, 'imediato', null, 1),
  ('porto', '24', 'militar', 38, 52, 'imediato', null, 2),
  ('porto', '33', 'chumbo', 38, 52, 'imediato', null, 3),

  ('luso-principe-de-galles', '15', 'marinho', 38, 50, 'imediato', null, 1),
  ('luso-principe-de-galles', '33', 'chumbo', 38, 50, 'imediato', null, 2),

  ('marca-dagua', '15', 'marinho', null, null, null, 'tom bem escuro', 1),
  ('marca-dagua', '70', 'preto', 36, 52, 'imediato', null, 2),

  ('florenca', '15', 'marinho', 38, 52, 'agosto', null, 1),
  ('florenca', '31', 'cinza claro', 38, 52, 'agosto', null, 2),
  ('florenca', '44', 'khaki', 38, 52, 'agosto', null, 3),
  ('florenca', '70', 'preto', 38, 52, 'agosto', null, 4),

  ('marselha', '15', 'marinho', 38, 48, 'setembro', null, 1),
  ('marselha', '38', 'marrom', 38, 48, 'setembro', null, 2),
  ('marselha', '44', 'khaki', 38, 48, 'setembro', null, 3),
  ('marselha', '70', 'preto', 38, 48, 'setembro', null, 4)
) as c(slug, codigo, nome, tamanho_min, tamanho_max, entrega, observacao, ordem)
join azus_produtos p on p.slug = c.slug
where not exists (
  select 1 from azus_produto_cores existing
  where existing.produto_id = p.id and existing.codigo = c.codigo and existing.nome = c.nome
);

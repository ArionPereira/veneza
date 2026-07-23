-- =====================================================================
-- Loja Azus — outras linhas de catálogo (Bermudas/Malhas/Linhos e
-- Sarjas/Tech), além da Alfaiataria já cadastrada.
-- Rode UMA vez no SQL Editor do Supabase (é idempotente, pode re-rodar).
-- Depende de sql/catalogo_azus_v1.sql já ter rodado antes.
--
-- Adiciona a coluna azus_produtos.linha pra separar as três linhas de
-- catálogo da Azus (cada uma é um site Canva próprio):
--   'Alfaiataria'                  — já cadastrada (sql/catalogo_azus_v1.sql)
--   'Bermudas, Malhas e Linhos'    — 18 produtos novos aqui
--   'Sarjas e Tech'                — 9 produtos novos aqui
--
-- Os slugs dos produtos novos levam sufixo -bml / -st porque alguns
-- nomes se repetem entre linhas (ex.: "Madrid FlexSense", "Havana",
-- "Tóquio" existem tanto em Bermudas quanto em Sarjas) e até dentro da
-- mesma linha (duas calças "Munique" — a calça comprida e a versão
-- bermuda — viraram munique-bml e munique-2-bml).
-- =====================================================================

alter table azus_produtos add column if not exists linha text not null default 'Alfaiataria';

-- ---------------------------------------------------------------------
-- SEED — Bermudas, Malhas e Linhos (18) + Sarjas e Tech (9)
-- ---------------------------------------------------------------------
insert into azus_produtos (slug, nome, descricao, composicao, preco_varejo, preco_atacado, producao_limitada, linha, ordem) values
  ('positano-bml', 'Positano', 'Tecido em malha Ponto Roma, leve e macio, adequado para todas as regiões.
 A Positano tem uma proposta casual elegante, com discreto elástico no cós traseiro e friso frontal permanente. Internamente conta com ajuste de cordão.', '73% poliéster 24%viscose 3% elastano', 139.98, null, null, 'Bermudas, Malhas e Linhos', 1),
  ('munique-bml', 'Munique', 'O tecido leve e confortável da Best Seller Atenas ganha uma versão super diferenciada na calça Munique. São muitos detalhes que compõem essa calça, elaborada, mas com visual minimalista. Friso frontal, botão metálico de pressão e bolsos traseiros com zípers perfeitamente embutidos, a Munique carrega a nossa excelência em costura de alto padrão.', '62% poliéster 33% viscose  6%elastano', 139.98, null, null, 'Bermudas, Malhas e Linhos', 2),
  ('turim-bml', 'Turim', 'Lançamento. O charmoso detalhe de ajustes de botões no cós da nossa calça Lyon, juntamente com o elegante cós transpassado, ganha uma versão confortável em um tecido de malha  muito confortável, que não amassa, adequado a todos os climas.', '85% poliéster 15%algodão', 139.98, null, null, 'Bermudas, Malhas e Linhos', 3),
  ('kingston-bml', 'Kingston', 'A nossa calça Kingston, tem um visual leve com proposta casual, com cós inteiro de elástico, cordão frontal para dar estilo ao produto, além de contar com uma barra italiana que pode ser opcional, em tecido fluido de viscolinho com elastano.', '68% viscose 30% linho  2%elastano', 109.98, null, null, 'Bermudas, Malhas e Linhos', 4),
  ('anderlecht-bml', 'Anderlecht', 'A primeira calça feita com linho da Azus segue ano após ano atemporal. Possui bolso reto e o cordão, feito no próprio tecido, pode ser retirado sem deixar marcas.', '68% viscose 30% linho 2%elastano', 109.98, null, null, 'Bermudas, Malhas e Linhos', 5),
  ('samoa-bml', 'Samoa', 'Lançamento. Calça Samoa é um produto feito com Rami, que é uma fibra natural forte, leve, respirável e sustentável,  com efeito muito semelhante ao puro linho e excelente custo benefício, tem maior resistentencia ao encolhimento , feita com corte alfaiataria com transpasse e pesponto no bolso dianteiro ela ainda conta com o charmoso detalhe de alheta para abotoamento do bolso traseiro.', '70% rami 30% algodão', 159.98, null, null, 'Bermudas, Malhas e Linhos', 6),
  ('valencia-bml', 'Valência', 'Lançamento. Costruída em tecido com Rami, fibra natural com muita semelhança ao puro linho, a Valência vem com uma proposta casual elegante, em cós misto com elástico e fechamento em botão.  Possui uma modelagem mais solta, e o charmoso detalhe de abotoamento com alheta no bolso traseiro.', '70% rami 30%algodão', 169.98, null, null, 'Bermudas, Malhas e Linhos', 7),
  ('miami-bml', 'Miami', 'A bermuda mais icônica da Azus é a versão curta da nossa calça best seller, Atenas. Elaborada com tecido leve e flexível, com ajuste de fivelas com guias e design minimalista, ela eleva para outro patamar as composições de verão.', '62%POLIÉSTER 33%VISCOSE 5%ELASTANO', 134.98, null, null, 'Bermudas, Malhas e Linhos', 8),
  ('munique-2-bml', 'Munique', 'Lançamento. Versão curta da calça Munique, com fechamento de botão de pressão metálico e friso permanente frontal, é uma boa opção para looks elegantes de verão.', '62%POLIÉSTER 33%VISCOSE 5%ELASTANO', 114.98, null, null, 'Bermudas, Malhas e Linhos', 9),
  ('barcelona-bml', 'Barcelona', 'A Barcelona é sucesso absoluto. Uma bermuda super elaborada, com sarja nobre, fechamento invisível com dois botões de pressão, elástico no cós traseiro e bolso com zíper embutido. A modelagem mais soltinha proporciona um caimento perfeito.', '98%ALGODÃO 2%ELASTANO', 104.98, null, null, 'Bermudas, Malhas e Linhos', 10),
  ('havana-bml', 'Havana', 'Lançamento. A Havana é a nossa nova bermuda essencial em sarja leve com toque macio e flexível.
O tecido, muito consagrado no mercado, é durável e tem efeito de trama sarjada, com o conforto de moletom.
Por dentro conta com o discreto ajuste de cordão.', '58%algodão 40%poliéster 2%elastano', 99.98, null, null, 'Bermudas, Malhas e Linhos', 11),
  ('madrid-flexsense-bml', 'Madrid FlexSense', 'A bermuda Madrid FlexSense é elaborada com sarja de excelente qualidade e possui o discreto e funcional sistema de ajuste por elásticos, FlexSense, que acompanha os movimentos do corpo. A modelagem com comprimento regular é bastante democrática.', '98%algodão 2%ELASTANO', 124.98, null, null, 'Bermudas, Malhas e Linhos', 12),
  ('toquio-bml', 'Tóquio', 'Lançamento. A Bermuda Tóquio une um design atemporal com tecido feito com a tenológica fibra de elastomultiéster. Promessa do ramo têxtil, esse tecido resiste a amassados, desbotamentos e é extremamente macio e flexível, com um belo e discreto efeito maquinetado.  O bolso lápis, reto, completa a diferenciação da peça.', '60%poliéster 40%elastOMULTIÉSTER', 99.98, null, null, 'Bermudas, Malhas e Linhos', 13),
  ('toquio-flexsense-bml', 'Tóquio FlexSense', 'Lançamento. A Bermuda Tóquio Flexsense  possui menos costuras aparentes e o exclusivo e discreto sistema de ajuste por elásticos no cós, que acompanha de forma automática os movimentos do corpo. É uma excelente opção para vendas online, pois aumenta potencialmente a vestibilidade da peça.', '60%poliéster 40%elastOMULTIÉSTER', 114.98, null, null, 'Bermudas, Malhas e Linhos', 14),
  ('ipanema-bml', 'Ipanema', 'Sucesso em vendas, a bermuda Ipanema é um dos nossos produtos de maior destaque. Com um lindíssimo cós em meio elástico, ela tem uma modelagem perfeita, com o caimento bem fluido.', '68%VISCOSE 30%LINHO 2%elastano', 99.98, null, null, 'Bermudas, Malhas e Linhos', 15),
  ('ponza-bml', 'Ponza', 'A Ponza é uma bermuda elabora em um nobre tecido de puro linho de alta gramatura, sem transparências.
Seu cós em meio elástico proporciona um efeito visual belíssimo e minimalista, aliado ao fechamento embutido.', '100% LINHO', 169.98, null, 'PRODUÇÃO LIMITADA: PEDIDOS ATÉ 03/08 OU ATÉ DURAR O ESTOQUE DE TECIDO', 'Bermudas, Malhas e Linhos', 16),
  ('floripa-bml', 'Floripa', 'A bermuda mais vendida da linha Tech Resort. Com tecido ultra-leve e com secagem rápida, seu design mais casual tem modelagem fluida. O fechamento com botão de pressão metalizado é completado com o ajuste interno por cordões. E a vestibilidade perfeita fica por conta do elástico nas laterais do cós.', '58%algodão 40%poliéster 2%elastano', 89.98, null, null, 'Bermudas, Malhas e Linhos', 17),
  ('serena-bml', 'Serena', 'A mais elegante da linha Tech Resort, bermuda Serena, possui cós com transpasse em bico, fivelas laterais e um detalhe super diferenciado de bolso traseiro embutido com pingente no zíper. Uma peça bem leve, para compor visuais de verão com bastante estilo. A modelagem é mais curta, sem excessos.', '90%poliéster 10%elastano', 119.98, null, null, 'Bermudas, Malhas e Linhos', 18),
  ('chicago-st', 'Chicago', 'Lançamento. O tecido em puro algodão é encorpado na medida e a proposta de modelagem mais ampla proporcionam um ótimo caimento.
Os passantes largos, pregas e cós com fechamento limpo, com colchete embutido, fazem da Chicago uma das peças mais estilosas da coleção.', '100% ALGODÃO', 124.98, null, null, 'Sarjas e Tech', 1),
  ('madrid-flexsense-st', 'Madrid FlexSense', 'Calça em sarja lisa de alta qualidade, com o nosso exclusivo sistema de ajustes por jogo de elásticos internos: FlexSense.
De forma discreta, a cintura se ajusta de forma a acompanhar seus movimentos.', '98%algodão 2%ELASTANO', 139.98, null, null, 'Sarjas e Tech', 2),
  ('montreal-st', 'Montreal', 'Lançamento.  A Montreal é a nossa nova calça de sarja essencial.  Básica bem feita, muito bem costurada,  ela é muito elegante com cós alfaiataria, discreto bolso relógio e bolso traseiro com duas pences e abotoamento.', '98%ALGODÃO 2%ELASTANO', 109.98, null, null, 'Sarjas e Tech', 3),
  ('havana-st', 'Havana', 'Lançamento. O tecido da Havana é leve e com muita maleabilidade, já consagrado por grandes marcas. Ótima escolha para dias quentes ou  para quem busca uma dose extra de conforto. Possui cordão interno para um ajuste perfeito.', '58%algodão 40%poliéster 2%ELASTANO', 114.98, null, null, 'Sarjas e Tech', 4),
  ('freemont-st', 'Freemont', 'Todo o conforto e tecnologia dos tecidos esportivos de alta performance, aplicado à alfaiataria. A Freemont já é sucesso validado na Azus. O seu tecido é extremamente maleável, com controle térmico. Tecido de poliamida de alta gramatura. Fechamento duplo com botão âncora e um potente botão de pressão. Com fácil manutenção, este produto dispensa passadoria.', '84%poliamida 16%ELASTANO', 179.98, null, null, 'Sarjas e Tech', 5),
  ('rhodium-st', 'Rhodium', 'Com modelo clássico, com cós alfaiataria e poucas costuras aparentes , a Rhodium possui tecido tecnológico com ultra leveza, muita elasticidade e repelencia a liquidos. Com fácil manutenção, este produto dispensa passadoria.', '88%poliamida 12%ELASTANO', 119.98, null, null, 'Sarjas e Tech', 6),
  ('titanium-st', 'Titanium', 'A Titanium é um modelo de calça com tecido tecnológico ultra-leve. Com toque gelado e fácil manutenção, este modelo possui um prático bolso extra  com fechamento com zíper embutido.', '88%poliamida 12%ELASTANO', 129.98, null, null, 'Sarjas e Tech', 7),
  ('toquio-st', 'Tóquio', 'Lançamento. Com modelo essencial, com bolso reto e cós anatômico o grande destaque da Tóquio é o seu tecido com  elastomultiéster, a fibra mais falada da indústria têxtil. Conforto extremo com toque de moletom, cores vibrantes e resistentes ao desbotamento, esta peça vem para revolucionar o guarda-roupas masculino.', '60%POLIÉSTER 40%ELASTOMULTIÉSTER', 109.98, null, null, 'Sarjas e Tech', 8),
  ('toquio-flexsense-st', 'Tóquio FlexSense', 'Lançamento. A Tóquio FlexSense une o tecido de alta tecnologia, com elastomultiéster com o nosso  sistema de ajustes por elásticos, discreto e efetivo. Tecnologia de ponta a ponta para conforto e durabilidade sem precedentes.', '60%POLIÉSTER 40%ELASTOMULTIÉSTER', 134.98, null, null, 'Sarjas e Tech', 9)
on conflict (slug) do nothing;

insert into azus_produto_cores (produto_id, codigo, nome, tamanho_min, tamanho_max, entrega, observacao, ordem)
select p.id, c.codigo, c.nome, c.tamanho_min, c.tamanho_max, c.entrega, c.observacao, c.ordem
from (values
  ('positano-bml', '04', 'xadrez', 38, 52, 'imediato', null::text, 1),
  ('positano-bml', '15', 'marinho', 38, 52, 'imediato', null, 2),
  ('positano-bml', '31', 'cinza', 38, 52, 'imediato', null, 3),
  ('positano-bml', '44', 'khaki', 38, 52, 'imediato', null, 4),
  ('positano-bml', '70', 'preto', 38, 52, 'imediato', null, 5),
  ('munique-bml', '08', 'areia', 38, 52, '15/09', null, 1),
  ('munique-bml', '33', 'chumbo', 38, 52, '15/09', null, 2),
  ('munique-bml', '38', 'marrom', 38, 52, '15/09', null, 3),
  ('munique-bml', '70', 'preto', 38, 52, '15/09', null, 4),
  ('turim-bml', '08', 'areia', 38, 48, 'imediato', null, 1),
  ('turim-bml', '15', 'marinho', 38, 50, 'imediato', null, 2),
  ('turim-bml', '24', 'militar', 40, 52, 'imediato', null, 3),
  ('turim-bml', '70', 'preto', 38, 48, 'imediato', null, 4),
  ('kingston-bml', '13', 'azul claro', 38, 52, 'imediato', null, 1),
  ('kingston-bml', '70', 'preto', 38, 52, 'mediato', null, 2),
  ('anderlecht-bml', '03', 'natural', 38, 48, 'imediato', null, 1),
  ('anderlecht-bml', '37', 'terracota', 38, 44, 'IMEDIATO', null, 2),
  ('samoa-bml', '03', 'natural', 38, 50, 'imediato', null, 1),
  ('samoa-bml', '15', 'marinho', 38, 50, 'imediato', null, 2),
  ('samoa-bml', '24', 'militar', 38, 48, 'imediato', null, 3),
  ('valencia-bml', '03', 'natural', 38, 50, 'imediato', null, 1),
  ('valencia-bml', '15', 'marinho', 38, 50, 'imediato', null, 2),
  ('valencia-bml', '24', 'militar', 38, 50, 'imediato', null, 3),
  ('miami-bml', '01', 'branca', 38, 52, 'imediato', null, 1),
  ('miami-bml', '02', 'off white', 38, 46, 'imediato', null, 2),
  ('miami-bml', '08', 'areia', 38, 52, 'imediato', null, 3),
  ('miami-bml', '13', 'azul claro', 38, 52, 'imediato', null, 4),
  ('miami-bml', '14', 'royal', 38, 52, 'imediato', null, 5),
  ('miami-bml', '15', 'marinho', 38, 52, 'imediato', null, 6),
  ('miami-bml', '24', 'militar', 38, 52, 'imediato', null, 7),
  ('miami-bml', '31', 'cinza', 38, 52, 'imediato', null, 8),
  ('miami-bml', '33', 'chumbo', 38, 52, 'imediato', null, 9),
  ('miami-bml', '44', 'khaki', 38, 52, 'imediato', null, 10),
  ('miami-bml', '70', 'preto', 38, 52, 'IMEDIATO', null, 11),
  ('munique-2-bml', '08', 'areia', 38, 50, 'imediato', null, 1),
  ('munique-2-bml', '31', 'chumbo', 38, 50, 'imediato', null, 2),
  ('munique-2-bml', '70', 'preto', 38, 50, 'imediato', null, 3),
  ('barcelona-bml', '08', 'areia', 38, 52, '20/07', null, 1),
  ('barcelona-bml', '15', 'marinho', 38, 52, '20/07', null, 2),
  ('barcelona-bml', '33', 'chumbo', 38, 52, 'imediato', null, 3),
  ('barcelona-bml', '44', 'khaki', 38, 52, 'imediato', null, 4),
  ('barcelona-bml', '70', 'preto', 38, 52, '20/07', null, 5),
  ('havana-bml', '15', 'marinho', 38, 52, 'setembro', null, 1),
  ('havana-bml', '31', 'cinza claro', 38, 52, 'setembro', null, 2),
  ('havana-bml', '44', 'khaki', 38, 52, 'setembro', null, 3),
  ('madrid-flexsense-bml', '08', 'areia', 38, 52, 'imediato', null, 1),
  ('madrid-flexsense-bml', '15', 'marinho', 38, 50, 'imediato', null, 2),
  ('madrid-flexsense-bml', '44', 'khaki', 38, 52, 'imediato', null, 3),
  ('madrid-flexsense-bml', '70', 'preto', 38, 52, 'imediato', null, 4),
  ('toquio-bml', '15', 'marinho', 38, 52, 'setembro*', null, 1),
  ('toquio-bml', '33', 'chumbo', 38, 52, 'setembro*', null, 2),
  ('toquio-bml', '44', 'khaki', 38, 52, 'setembro*', null, 3),
  ('toquio-bml', '70', 'preto', 38, 52, 'setembro*', null, 4),
  ('toquio-flexsense-bml', '15', 'marinho', 38, 52, 'imediato', null, 1),
  ('toquio-flexsense-bml', '33', 'chumbo', 38, 52, 'imediato', null, 2),
  ('toquio-flexsense-bml', '44', 'khaki', 38, 52, 'imediato', null, 3),
  ('toquio-flexsense-bml', '70', 'preto', 38, 52, 'imediato', null, 4),
  ('ipanema-bml', '01', 'branco', 38, 52, 'outubro', null, 1),
  ('ipanema-bml', '08', 'natural', 38, 52, 'imediato', null, 2),
  ('ipanema-bml', '13', 'azul claro', 38, 52, 'imediato', null, 3),
  ('ipanema-bml', '15', 'marinho', 38, 52, '10/08', null, 4),
  ('ipanema-bml', '22', 'verde claro', 38, 52, 'imediato', null, 5),
  ('ipanema-bml', '23', 'verde oliva', 38, 52, '10/08', null, 6),
  ('ipanema-bml', '24', 'militar', 38, 50, 'imediato', null, 7),
  ('ipanema-bml', '38', 'marrom', 38, 50, '10/08', null, 8),
  ('ipanema-bml', '44', 'khaki', 38, 52, '10/08', null, 9),
  ('ipanema-bml', '70', 'preto', 38, 52, '10/08', null, 10),
  ('ponza-bml', '03', 'natural', 38, 46, '20/09', null, 1),
  ('ponza-bml', '15', 'marinho', 38, 46, '20/09', null, 2),
  ('ponza-bml', '24', 'militar', 38, 48, '20/09', null, 3),
  ('ponza-bml', '38', 'marrom', 38, 52, '20/09', null, 4),
  ('floripa-bml', '15', 'marinho', 38, 52, '20/09', null, 1),
  ('floripa-bml', '33', 'chumbo', 38, 52, '20/09', null, 2),
  ('floripa-bml', '44', 'khaki', 38, 52, '20/09', null, 3),
  ('serena-bml', '15', 'marinho', 38, 52, 'setembro', null, 1),
  ('serena-bml', '31', 'cinza', 38, 52, 'setembro', null, 2),
  ('serena-bml', '33', 'chumbo', 38, 52, 'setembro', null, 3),
  ('serena-bml', '44', 'khaki', 38, 52, 'setembro', null, 4),
  ('chicago-st', '01', 'branca', 38, 52, 'imediato', null, 1),
  ('chicago-st', '15', 'marinho', 38, 48, 'imediato', null, 2),
  ('chicago-st', '24', 'militar', 38, 48, 'imediato', null, 3),
  ('chicago-st', '38', 'marrom', 38, 52, 'imediato', null, 4),
  ('chicago-st', '70', 'preto', 38, 48, 'mediato', null, 5),
  ('madrid-flexsense-st', '08', 'areia', 38, 52, 'IMEDIATO', null, 1),
  ('madrid-flexsense-st', '15', 'marinho', 38, 52, 'IMEDIATO', null, 2),
  ('madrid-flexsense-st', '33', 'chumbo', 38, 52, 'IMEDIATO', null, 3),
  ('madrid-flexsense-st', '44', 'khaki', 38, 52, 'IMEDIATO', null, 4),
  ('madrid-flexsense-st', '70', 'preto', 38, 52, 'IMEDIATO', null, 5),
  ('montreal-st', '08', 'areia', 38, 52, 'imediato', null, 1),
  ('montreal-st', '15', 'marinho', 38, 46, 'imediato', null, 2),
  ('montreal-st', '24', 'militar', 38, 48, 'imediato', null, 3),
  ('montreal-st', '33', 'chumbo', 38, 46, 'imediato', null, 4),
  ('montreal-st', '38', 'marrom', 38, 50, 'imediato', null, 5),
  ('montreal-st', '44', 'khaki', 38, 46, 'imediato', null, 6),
  ('montreal-st', '70', 'preto', 38, 52, '30/07', null, 7),
  ('havana-st', '31', 'cinza claro', 38, 52, 'imediato', null, 1),
  ('havana-st', '44', 'khaki', 38, 52, 'imediato', null, 2),
  ('havana-st', '70', 'preto', 38, 52, 'imediato', null, 3),
  ('freemont-st', '08', 'areia', 38, 52, 'IMEDIATO', null, 1),
  ('freemont-st', '15', 'marinho', 38, 52, 'IMEDIATO', null, 2),
  ('freemont-st', '33', 'chumbo', 38, 52, 'IMEDIATO', null, 3),
  ('freemont-st', '38', 'marrom', 38, 52, 'IMEDIATO', null, 4),
  ('freemont-st', '70', 'preto', 38, 52, 'IMEDIATO', null, 5),
  ('rhodium-st', '05', 'gelo', 38, 52, 'imediato', null, 1),
  ('rhodium-st', '15', 'marinho', 38, 52, 'imediato', null, 2),
  ('rhodium-st', '24', 'militar', 38, 52, 'imediato', null, 3),
  ('rhodium-st', '33', 'chumbo', 38, 52, 'imediato', null, 4),
  ('rhodium-st', '44', 'khaki', 38, 52, 'imediato', null, 5),
  ('rhodium-st', '70', 'preto', 38, 52, 'imediato', null, 6),
  ('titanium-st', '15', 'marinho', 38, 52, '10/08 - repele líquidos', null, 1),
  ('titanium-st', '24', 'militar', 38, 48, 'imediato', null, 2),
  ('titanium-st', '33', 'chumbo', 38, 46, '10/08 - repele líquidos', null, 3),
  ('titanium-st', '44', 'khaki', 38, 52, '10/08 - repele líquidos', null, 4),
  ('titanium-st', '70', 'preto', 38, 48, '10/08 - repele líquidos', null, 5),
  ('toquio-st', '08', 'areia', 38, 52, '20/09', null, 1),
  ('toquio-st', '15', 'marinho', 40, 52, 'imediato', null, 2),
  ('toquio-st', '33', 'chumbo', 38, 52, 'imediato', null, 3),
  ('toquio-st', '44', 'khaki', 38, 52, 'imediato', null, 4),
  ('toquio-st', '70', 'preto', 40, 52, 'imediato', null, 5),
  ('toquio-flexsense-st', '08', 'areia', 38, 52, '20/07', null, 1),
  ('toquio-flexsense-st', '15', 'marinho', 38, 52, '20/07', null, 2),
  ('toquio-flexsense-st', '33', 'chumbo', 38, 52, '20/07', null, 3),
  ('toquio-flexsense-st', '44', 'khaki', 38, 52, '20/07', null, 4),
  ('toquio-flexsense-st', '70', 'preto', 38, 52, '20/07', null, 5)
) as c(slug, codigo, nome, tamanho_min, tamanho_max, entrega, observacao, ordem)
join azus_produtos p on p.slug = c.slug
where not exists (
  select 1 from azus_produto_cores existing
  where existing.produto_id = p.id and existing.codigo = c.codigo and existing.nome = c.nome
);

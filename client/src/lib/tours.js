function passoTour(alvo, titulo, content, opcoes = {}) {
    return { target: `[data-tour="${alvo}"]`, title: titulo, content, ...opcoes };
}

const tourGeral = [
    passoTour('menu-lateral', 'Menu do sistema', 'Use os grupos do menu para encontrar as telas da operação, dos cadastros, do financeiro e dos relatórios.', { fixed: true, sidebar: true }),
    passoTour('menu-alternar', 'Alternar menu', 'Recolha ou expanda o menu aqui. No celular, este botão abre o menu lateral.', { fixed: true }),
    passoTour('perfil', 'Sua conta', 'Abra o perfil para conferir seu nome e sua função no sistema ou escolher Sair.', { fixed: true }),
    passoTour('ajuda', 'Ajuda da tela', 'Use este botão quando quiser ver a explicação da tela atual.', { fixed: true }),
];

const tours = {
    '/': [
        tourGeral[0],
        passoTour('menu-alternar', 'Atalhos da barra superior', 'Alterne o menu por aqui. Do outro lado da barra, abra o perfil para ver sua função ou sair, e use Ajuda para conhecer a tela atual.', { fixed: true }),
        passoTour('dashboard-cartoes', 'Resumo de hoje', 'Os cartões mostram como estão os pedidos de hoje. Quem acompanha o caixa também pode ver as vendas e o saldo esperado na gaveta.'),
        passoTour('dashboard-grafico', 'Vendas e despesas', 'Compare o valor das vendas com o das despesas nos últimos sete dias.'),
        passoTour('dashboard-pedidos', 'Pedidos recentes', 'Veja os últimos pedidos, o cliente, o valor e a situação de cada um.'),
        passoTour('dashboard-estoque', 'Estoque abaixo do mínimo', 'Confira quais insumos estão abaixo da quantidade mínima definida no cadastro.'),
    ],
    '/pedidos': [
        passoTour('pedidos-novo', 'Novo pedido', 'Abra o caixa antes de lançar um pedido. Se todos os itens forem sem preparo, como bebidas, o pedido já começa como Pronto.'),
        passoTour('pedidos-filtros', 'Pedidos do dia', 'Escolha a data e o status para encontrar os pedidos que precisa acompanhar.'),
        passoTour('pedidos-detalhe', 'Detalhes e comanda', 'Clique no número para ver os itens e o pagamento. No detalhe, use Imprimir comanda quando precisar.'),
        passoTour('pedidos-status', 'Acompanhar pedidos', 'No detalhe, avance o preparo conforme sua função. Se tiver permissão para cancelar, informe o motivo do cancelamento.'),
    ],
    '/cardapio': [
        passoTour('cardapio-data', 'Dia do cardápio', 'Escolha o dia que quer montar ou consultar. Use Hoje para voltar à data atual.'),
        passoTour('cardapio-fixos', 'Itens fixos', 'Adicione o que acompanha as marmitas do dia, como arroz, feijão e salada.'),
        passoTour('cardapio-misturas', 'Opções de mistura', 'Cadastre as opções que a pessoa pode escolher no pedido, como frango ou carne.'),
        passoTour('cardapio-adicionais', 'Adicionais do dia', 'Marque os adicionais disponíveis para os pedidos desta data.'),
        passoTour('cardapio-reutilizar', 'Reutilizar outro dia', 'Escolha uma data de origem e use Reutilizar para aplicar o cardápio dela à data selecionada.'),
        passoTour('cardapio-salvar', 'Salvar cardápio', 'Salve para gravar as alterações na data escolhida.'),
    ],
    '/clientes': [
        passoTour('clientes-novo', 'Novo cliente', 'Cadastre o nome e, se quiser, o telefone. O cadastro permite vincular pedidos e acompanhar valores em aberto.'),
        passoTour('clientes-lista', 'Clientes cadastrados', 'Os cartões mostram o nome, o telefone e a situação de cada cliente.'),
        passoTour('clientes-acoes', 'Ações do cliente', 'Edite os dados, desative ou reative o cadastro. Use Excluir definitivamente para remover um cadastro quando permitido.'),
    ],
    '/produtos': [
        passoTour('produtos-novo', 'Novo produto', 'Cadastre o item e seu preço. No formulário, marque a opção de cardápio para oferecer as misturas e os adicionais do dia.'),
        passoTour('produtos-cardapio', 'Escolhe mistura e adicionais do dia', 'Marque para usar as escolhas do cardápio. Pedidos só com produtos desmarcados, como bebidas, já começam como Pronto.'),
        passoTour('produtos-lista', 'Produtos cadastrados', 'Consulte os preços, a situação e quais produtos usam o cardápio do dia.'),
        passoTour('produtos-acoes', 'Ações do produto', 'Edite, desative ou reative um produto. A exclusão definitiva fica disponível quando o cadastro pode ser removido.'),
    ],
    '/adicionais': [
        passoTour('adicionais-novo', 'Novo adicional', 'Informe o nome e o preço. Para oferecer o adicional em um dia, selecione-o no Cardápio do Dia.'),
        passoTour('adicionais-lista', 'Adicionais cadastrados', 'Consulte os preços e veja quais adicionais estão ativos. Use a busca acima da lista para encontrar um pelo nome.'),
        passoTour('adicionais-acoes', 'Ações do adicional', 'Edite, desative, reative ou exclua um adicional. Se já foi usado em pedidos ou no cardápio, desative para preservar o histórico.'),
    ],
    '/insumos': [
        passoTour('insumos-novo', 'Novo insumo', 'Cadastre a matéria-prima com categoria, unidade e estoque mínimo.'),
        passoTour('insumos-lista', 'Insumos cadastrados', 'Consulte a unidade, o estoque mínimo e a situação. Para ver o saldo atual, abra Estoque.'),
        passoTour('insumos-acoes', 'Ações do insumo', 'Edite, desative, reative ou exclua um insumo. Se ele estiver em uso, desative para manter o histórico.'),
    ],
    '/estoque': [
        passoTour('estoque-saldos', 'Saldos dos insumos', 'Compare o saldo atual com o mínimo e veja quais insumos precisam de atenção.'),
        passoTour('estoque-registrar', 'Registrar movimentação', 'Registre compras, perdas ou ajustes de quantidade. A movimentação é manual.'),
        passoTour('estoque-valor', 'Valor pago na compra', 'Se quiser lançar a despesa junto com a entrada de compra, informe o valor pago aqui.'),
        passoTour('estoque-historico', 'Histórico de movimentações', 'Veja o que entrou, saiu ou foi ajustado. Use o filtro para consultar um insumo.'),
    ],
    '/caixa': [
        passoTour('caixa-abrir', 'Abrir caixa', 'Informe quanto dinheiro há na gaveta para começar o turno, incluindo o troco inicial.'),
        passoTour('caixa-resumo', 'Recebido neste caixa', 'Veja o que entrou por forma de pagamento e quanto dinheiro deveria estar na gaveta.'),
        passoTour('caixa-conferencia', 'Conferir a gaveta', 'Conte o dinheiro, informe o valor e compare com o saldo esperado.'),
        passoTour('caixa-fechar', 'Fechar caixa', 'Finalize o caixa após a conferência. Pedidos recebidos ou em preparo precisam ser finalizados ou cancelados antes.'),
        passoTour('caixa-historico', 'Últimos caixas', 'Confira as aberturas e os fechamentos anteriores. Use Ver resumo para consultar um caixa.'),
    ],
    '/financeiro': [
        passoTour('financeiro-novo', 'Novo lançamento', 'Registre uma entrada avulsa ou uma despesa. Os recebimentos do caixa aparecem automaticamente após o fechamento.'),
        passoTour('financeiro-filtros', 'Filtrar lançamentos', 'Escolha as datas, o tipo ou a categoria e clique em Consultar.'),
        passoTour('financeiro-totais', 'Totais do período', 'Compare entradas, saídas e saldo. Para conferir o dinheiro na gaveta, use a tela Caixa.'),
        passoTour('financeiro-lista', 'Lançamentos do período', 'Veja o valor, a origem e o responsável por cada lançamento.'),
    ],
    '/devedores': [
        passoTour('devedores-total', 'Total em aberto', 'Veja quanto ainda falta receber de todos os clientes devedores.'),
        passoTour('devedores-lista', 'Clientes devedores', 'Cada cliente aparece com o total em aberto e a quantidade de pagamentos pendentes.'),
        passoTour('devedores-pedidos', 'Ver pedidos', 'Abra a lista de pedidos do cliente para conferir ou quitar um por vez.'),
        passoTour('devedores-quitar', 'Quitar todos', 'Com o caixa aberto, registre de uma vez o recebimento de todos os pedidos pendentes deste cliente.'),
    ],
    '/pagamento': [
        passoTour('pagamento-filtros', 'Filtrar pagamentos', 'Escolha data, forma, situação ou número do caixa e clique em Consultar.'),
        passoTour('pagamento-lista', 'Pagamentos dos pedidos', 'Confira o cliente, o valor, a forma original e a situação de cada pagamento.'),
        passoTour('pagamento-quitacao', 'Dados da quitação', 'Quando um pagamento de cliente devedor é recebido, confira a data, a forma e o caixa do recebimento.'),
    ],
    '/relatorios': [
        passoTour('relatorios-abas', 'Escolher relatório', 'Abra a aba de vendas e pedidos, estoque, produtos mais vendidos ou devedores. A aba Financeiro aparece para administradores.'),
        passoTour('relatorios-periodo', 'Período da consulta', 'Escolha as datas e clique em Consultar. O período começa no primeiro dia do mês e vai até hoje por padrão.'),
        passoTour('relatorios-imprimir', 'Imprimir relatório', 'Abra a impressão do relatório da aba atual com o período selecionado.'),
    ],
    '/usuarios': [
        passoTour('usuarios-novo', 'Novo usuário', 'Cadastre a pessoa e selecione o perfil que define o que ela pode acessar.'),
        passoTour('usuarios-lista', 'Usuários cadastrados', 'Os cartões mostram o e-mail, o perfil e a situação de cada pessoa.'),
        passoTour('usuarios-acoes', 'Ações do usuário', 'Nos outros cadastros, você pode editar, desativar, reativar ou excluir quando permitido. A própria conta tem restrições.'),
    ],
};

export function obterTour(caminho) {
    return Object.hasOwn(tours, caminho) ? tours[caminho] : tourGeral;
}

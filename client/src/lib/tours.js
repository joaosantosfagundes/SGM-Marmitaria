export function passoTour(alvo, titulo, content, opcoes = {}) {
    return { target: `[data-tour="${alvo}"]`, title: titulo, content, ...opcoes };
}

const tourGeral = [
    passoTour('menu-lateral', 'Menu do sistema', 'Use os grupos do menu para encontrar as telas da operação, dos cadastros, do financeiro e dos relatórios.', { fixed: true, sidebar: true }),
    passoTour('menu-alternar', 'Alternar menu', 'Recolha ou expanda o menu aqui. No celular, este botão abre o menu lateral.', { fixed: true }),
    passoTour('perfil', 'Sua conta', 'Abra o perfil para conferir seu nome e sua função no sistema ou escolher Sair.', { fixed: true }),
    passoTour('ajuda', 'Ajuda da tela', 'Use este botão quando quiser ver a explicação da tela atual.', { fixed: true }),
];

const tours = {
    '/pedidos': [
        passoTour('pedidos-novo', 'Novo pedido', 'Abra o caixa antes de lançar um pedido. Se todos os itens forem sem preparo, como bebidas, o pedido já começa como Pronto.'),
        passoTour('pedidos-filtros', 'Pedidos do dia', 'Escolha a data e o status para encontrar os pedidos que precisa acompanhar.'),
        passoTour('pedidos-detalhe', 'Detalhes e comanda', 'Clique no número para ver os itens e o pagamento. No detalhe, use Imprimir comanda quando precisar.'),
        passoTour('pedidos-status', 'Acompanhar pedidos', 'No detalhe, avance o preparo conforme sua função. Se tiver permissão para cancelar, informe o motivo do cancelamento.'),
    ],
};

export function obterTour(caminho) {
    return Object.hasOwn(tours, caminho) ? tours[caminho] : tourGeral;
}

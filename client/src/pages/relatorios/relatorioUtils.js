const formatoQuantidade = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });

export function periodoHoje() {
    let hoje = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return { dataInicio: hoje, dataFim: hoje };
}

export function formatarDia(data) {
    return data.split('-').reverse().join('/');
}

export function formatarQuantidade(quantidade) {
    return formatoQuantidade.format(quantidade);
}

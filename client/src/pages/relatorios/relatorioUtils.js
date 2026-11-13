const formatoQuantidade = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });

export function formatarDia(data) {
    return data.split('-').reverse().join('/');
}

export function formatarQuantidade(quantidade) {
    return formatoQuantidade.format(quantidade);
}

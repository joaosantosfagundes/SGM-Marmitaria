export function formatarValor(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarDataHora(valor) {
    // DATETIME chega como texto: preserva o horário registrado pelo banco.
    let partes = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2}:\d{2})$/.exec(valor ?? '');
    return partes ? `${partes[3]}/${partes[2]}/${partes[1]} ${partes[4]}` : '—';
}

export function converterValor(texto) {
    let valor = texto.trim();
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(valor)) return null;
    let numero = Number(valor.replace(',', '.'));
    return Number.isFinite(numero) && numero <= 99999999.99 ? numero : null;
}

export function calcularDiferenca(valorContado, saldoEsperado) {
    return (Math.round(valorContado * 100) - Math.round(saldoEsperado * 100)) / 100;
}

export function situacaoConferencia(diferenca) {
    if (diferenca === 0) return { texto: 'Conferido', classe: 'success' };
    return diferenca > 0 ? { texto: 'Sobra de dinheiro', classe: 'warning' } : { texto: 'Falta de dinheiro', classe: 'danger' };
}

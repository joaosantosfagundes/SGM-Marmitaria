export const STATUS_PEDIDO = {
    RECEBIDO: ['Recebido', 'text-bg-primary'],
    EM_PREPARO: ['Em preparo', 'text-bg-warning'],
    PRONTO: ['Pronto', 'text-bg-success'],
    SAIU_ENTREGA: ['Saiu para entrega', 'text-bg-info'],
    CANCELADO: ['Cancelado', 'text-bg-secondary'],
};

export function StatusPedido({ status }) {
    let [texto, classe] = STATUS_PEDIDO[status] || [status || '—', 'text-bg-secondary'];
    return <span className={`badge ${classe}`}>{texto}</span>;
}

export function StatusPagamento({ status, forma }) {
    let devedor = forma === 'FIADO';
    let texto = { PAGO: devedor ? 'Quitado' : 'Pago', PENDENTE: devedor ? 'A receber' : 'Pendente', CANCELADO: 'Cancelado' }[status] || status || '—';
    let classe = status === 'PAGO' ? 'text-bg-success' : status === 'PENDENTE' ? 'text-bg-warning' : 'text-bg-secondary';
    return <span className={`badge ${classe}`}>{texto}</span>;
}

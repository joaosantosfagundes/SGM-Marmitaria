import { FORMAS_PAGAMENTO, formatarValor } from './pedidoUtils.js';
import { StatusPagamento } from './PedidoBadges.jsx';

export default function ResumoPagamento({ pagamento }) {
    if (!pagamento) return <p className="text-secondary">Pagamento não informado.</p>;
    return (
        <div>
            <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
                <strong>{FORMAS_PAGAMENTO[pagamento.forma] || pagamento.forma}</strong>
                <StatusPagamento status={pagamento.status} />
            </div>
            <p className="mb-2">Valor: <strong>{formatarValor(pagamento.valor)}</strong></p>
            {pagamento.forma === 'DINHEIRO' && <>
                <p className="mb-2">Valor recebido: {pagamento.valorRecebido == null ? 'Não informado' : formatarValor(pagamento.valorRecebido)}</p>
                <div className="bg-success-subtle text-success-emphasis rounded p-3" aria-live="polite">
                    <span className="d-block fw-semibold">Troco</span>
                    {pagamento.troco == null ? <span>Não calculado: valor recebido não informado.</span> : <strong className="fs-3">{formatarValor(pagamento.troco)}</strong>}
                </div>
            </>}
            {pagamento.forma === 'FIADO' && <p className="text-warning-emphasis mb-0">Em aberto: <strong>{formatarValor(pagamento.valor)}</strong></p>}
        </div>
    );
}

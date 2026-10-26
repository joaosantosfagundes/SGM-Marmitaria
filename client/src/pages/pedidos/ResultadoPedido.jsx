import { formatarValor } from './pedidoUtils.js';
import ResumoPagamento from './ResumoPagamento.jsx';
import ComandaPedido from './ComandaPedido.jsx';

export default function ResultadoPedido({ pedido, onDetalhar }) {
    return (
        <section className="page-card p-3 p-sm-4 mb-4 border-success" aria-labelledby="pedido-lancado-titulo">
            <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between mb-3">
                <div><h2 id="pedido-lancado-titulo" className="h5 mb-1">Pedido #{pedido.id} lançado</h2><p className="mb-0">Total: <strong>{formatarValor(pedido.valorTotal)}</strong></p></div>
                <div className="d-flex flex-wrap gap-2">
                    <button type="button" className="btn btn-outline-primary" onClick={() => onDetalhar(pedido.id)}>Ver pedido completo</button>
                    <ComandaPedido pedido={pedido} />
                </div>
            </div>
            <ResumoPagamento pagamento={pedido.pagamento} />
        </section>
    );
}

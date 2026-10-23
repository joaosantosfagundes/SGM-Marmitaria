import { centavos, converterValor, FORMAS_PAGAMENTO, formatarValor } from './pedidoUtils.js';

export default function PagamentoPedido({ forma, valorRecebido, total, onForma, onValor }) {
    let preenchido = valorRecebido.trim() !== '';
    let recebido = preenchido ? converterValor(valorRecebido) : null;
    let insuficiente = recebido !== null && centavos(recebido) < total;
    return (
        <section className="mt-4" aria-labelledby="pagamento-pedido-titulo">
            <h3 className="h6" id="pagamento-pedido-titulo">Pagamento</h3>
            <label htmlFor="pedido-forma" className="form-label">Forma de pagamento</label>
            <select id="pedido-forma" className="form-select" value={forma} required onChange={event => onForma(event.target.value)}>
                <option value="">Selecione a forma</option>
                {Object.entries(FORMAS_PAGAMENTO).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
            </select>
            {forma === 'DINHEIRO' && <div className="mt-3">
                <label htmlFor="pedido-recebido" className="form-label">Valor recebido (R$) <span className="text-secondary small">(opcional)</span></label>
                <input id="pedido-recebido" className="form-control" type="text" inputMode="decimal" placeholder="Ex.: 50,00" value={valorRecebido} onChange={event => onValor(event.target.value)} aria-describedby="pedido-recebido-ajuda pedido-troco" aria-invalid={preenchido && (recebido === null || insuficiente)} />
                <p id="pedido-recebido-ajuda" className="form-text">Aceita vírgula ou ponto e até duas casas decimais. Deixe vazio se não precisar calcular o troco.</p>
                <div id="pedido-troco" aria-live="polite">
                    {preenchido && recebido === null ? <p className="text-danger">Informe um valor válido com até duas casas decimais.</p>
                        : insuficiente ? <p className="text-danger">Valor insuficiente. Faltam {formatarValor((total - centavos(recebido)) / 100)}.</p>
                            : recebido !== null && <p className="fw-semibold text-success">Troco: {formatarValor((centavos(recebido) - total) / 100)}</p>}
                </div>
            </div>}
            {forma === 'FIADO' && <p className="alert alert-warning mt-3 mb-0">Ficará em aberto: <strong>{formatarValor(total / 100)}</strong>. Selecione um cliente para registrar o fiado.</p>}
        </section>
    );
}

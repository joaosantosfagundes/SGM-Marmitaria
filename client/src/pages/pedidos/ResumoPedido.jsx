import { formatarValor, subtotalItem } from './pedidoUtils.js';

export default function ResumoPedido({ itens, total, bloqueado, onEditar, onRemover }) {
    return (
        <section aria-labelledby="resumo-pedido-titulo">
            <h3 id="resumo-pedido-titulo" className="h6">Resumo do pedido</h3>
            {itens.length === 0 ? <p className="text-secondary py-3">Escolha um produto para começar o pedido.</p> : <ul className="list-unstyled mb-3">
                {itens.map((item, indice) => <li key={indice} className="border-bottom py-3">
                    <div className="d-flex justify-content-between gap-2 flex-wrap">
                        <strong>{item.quantidade} × {item.nomeProduto}</strong>
                        <strong>{formatarValor(subtotalItem(item) / 100)}</strong>
                    </div>
                    <div className="small text-secondary">Produto: {formatarValor(item.precoUnitario)} por unidade</div>
                    {item.opcaoMistura && <div className="small mt-1">Mistura: {item.opcaoMistura}</div>}
                    {item.adicionais.length > 0 && <ul className="small ps-3 mt-1 mb-1">
                        {item.adicionais.map(adicional => <li key={adicional.idAdicional}>{adicional.quantidade} × {adicional.nomeAdicional} — {formatarValor(adicional.precoUnitario * adicional.quantidade)}</li>)}
                    </ul>}
                    {item.observacao && <p className="small text-secondary mb-1 pedido-texto">{item.observacao}</p>}
                    <div className="d-flex flex-wrap gap-2 mt-2">
                        <button type="button" className="btn btn-sm btn-light" disabled={bloqueado} onClick={() => onEditar(indice)} aria-label={`Editar item ${indice + 1}: ${item.nomeProduto}`}><i className="ti ti-pencil me-1" />Editar</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" disabled={bloqueado} onClick={() => onRemover(indice)} aria-label={`Remover item ${indice + 1}: ${item.nomeProduto}`}><i className="ti ti-trash me-1" />Remover</button>
                    </div>
                </li>)}
            </ul>}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 bg-light rounded p-3 mb-2">
                <strong>Total</strong><strong className="fs-4 text-primary">{formatarValor(total / 100)}</strong>
            </div>
            <p className="small text-secondary mb-4">Os valores serão conferidos ao lançar o pedido.</p>
        </section>
    );
}

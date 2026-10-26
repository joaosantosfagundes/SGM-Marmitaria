import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { FORMAS_PAGAMENTO, formatarDataHora, formatarValor, TIPOS_ATENDIMENTO } from './pedidoUtils.js';

export default function ComandaPedido({ pedido, disabled = false }) {
    const [imprimindo, setImprimindo] = useState(false);

    useLayoutEffect(() => {
        if (!imprimindo) return;
        function terminar() { setImprimindo(false); }
        window.addEventListener('afterprint', terminar);
        let quadro = window.requestAnimationFrame(() => {
            try { window.print(); }
            catch (error) { console.error(error); toast.error('Não foi possível abrir a impressão da comanda.'); terminar(); }
        });
        return () => {
            window.cancelAnimationFrame(quadro);
            window.removeEventListener('afterprint', terminar);
        };
    }, [imprimindo]);

    return <>
        <button type="button" className="btn btn-outline-secondary" disabled={disabled || imprimindo} onClick={() => setImprimindo(true)}>
            <i className="ti ti-printer me-1" />Imprimir comanda
        </button>
        {imprimindo && createPortal(<section className="pedido-comanda" aria-label={`Comanda do pedido ${pedido.id}`}>
            <h1>Pedido #{pedido.id}</h1>
            {pedido.status === 'CANCELADO' && <p className="comanda-cancelado">CANCELADO</p>}
            <p>{formatarDataHora(pedido.dataHora)}<br /><strong>{TIPOS_ATENDIMENTO[pedido.tipoAtendimento] || pedido.tipoAtendimento}</strong></p>
            <p>Cliente: {pedido.nomeCliente || 'Não vinculado'}</p>
            {pedido.tipoAtendimento === 'DELIVERY' && <p><strong>Entregar em:</strong> {pedido.enderecoEntrega}</p>}
            <hr />
            {pedido.itens.map(item => <div className="comanda-item" key={item.id}>
                <h2>{item.quantidade} × {item.nomeProduto}</h2>
                {item.opcaoMistura && <p>Mistura: {item.opcaoMistura}</p>}
                {item.adicionais.map(adicional => <p key={adicional.id}>+ {adicional.quantidade} × {adicional.nomeAdicional}</p>)}
                {item.observacao && <p><strong>Obs.:</strong> {item.observacao}</p>}
            </div>)}
            {pedido.observacao && <><hr /><p><strong>Observação do pedido:</strong> {pedido.observacao}</p></>}
            <hr />
            {pedido.pagamento && <>
                <p><strong>Pagamento:</strong> {pedido.pagamento.forma === 'FIADO' ? `FIADO — ${pedido.nomeCliente}` : FORMAS_PAGAMENTO[pedido.pagamento.forma]}</p>
                {pedido.pagamento.forma === 'DINHEIRO' && pedido.pagamento.valorRecebido !== null && <p>Troco para {formatarValor(pedido.pagamento.valorRecebido)}<br />Troco: {formatarValor(pedido.pagamento.troco)}</p>}
            </>}
            <p className="comanda-total">Total: {formatarValor(pedido.valorTotal)}</p>
        </section>, document.body)}
    </>;
}

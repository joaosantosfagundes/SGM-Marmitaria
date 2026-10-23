import { useId, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import useConsulta from './useConsulta.js';
import { centavos, formatarDataHora, formatarValor, TIPOS_ATENDIMENTO } from './pedidoUtils.js';
import { StatusPedido } from './PedidoBadges.jsx';
import ResumoPagamento from './ResumoPagamento.jsx';

export default function DetalhePedido({ id, onFechar }) {
    const consulta = useConsulta(`pedido/${id}`);
    const dialogoRef = useRef(null);
    const fecharRef = useRef(null);
    const tituloId = useId();
    let pedido = consulta.dados;

    useLayoutEffect(() => {
        let anterior = document.activeElement;
        let overflowAnterior = document.body.style.overflow;
        let raiz = document.getElementById('root');
        let inertAnterior = raiz?.inert;
        document.body.style.overflow = 'hidden';
        if (raiz) raiz.inert = true;
        fecharRef.current?.focus();
        function aoTeclar(event) {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onFechar(); }
            if (event.key === 'Tab') {
                let botoes = [...dialogoRef.current.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]')].filter(elemento => elemento.getClientRects().length);
                let primeiro = botoes[0], ultimo = botoes.at(-1);
                let fora = !dialogoRef.current.contains(document.activeElement);
                if (event.shiftKey && (document.activeElement === primeiro || fora)) { event.preventDefault(); ultimo?.focus(); }
                else if (!event.shiftKey && (document.activeElement === ultimo || fora)) { event.preventDefault(); primeiro?.focus(); }
            }
        }
        function manterFoco(event) {
            if (!dialogoRef.current?.contains(event.target)) fecharRef.current?.focus();
        }
        document.addEventListener('keydown', aoTeclar, true);
        document.addEventListener('focusin', manterFoco);
        return () => {
            document.removeEventListener('keydown', aoTeclar, true);
            document.removeEventListener('focusin', manterFoco);
            document.body.style.overflow = overflowAnterior;
            if (raiz) raiz.inert = inertAnterior;
            if (anterior?.isConnected) anterior.focus({ preventScroll: true });
        };
    }, [onFechar]);

    return createPortal(<>
        <div className="modal-backdrop show" />
        <div className="modal d-block pedido-detalhe" role="dialog" aria-modal="true" aria-labelledby={tituloId} ref={dialogoRef} onClick={event => { if (event.target === event.currentTarget) onFechar(); }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content page-card">
                    <div className="modal-header">
                        <h2 className="modal-title fs-5" id={tituloId}>Pedido #{id}</h2>
                        <button type="button" className="btn-close" aria-label="Fechar detalhes do pedido" ref={fecharRef} onClick={onFechar} />
                    </div>
                    <div className="modal-body p-3 p-sm-4" aria-busy={consulta.carregando}>
                        {consulta.carregando && <p className="text-secondary" role="status">Carregando pedido...</p>}
                        {consulta.erro && <div className="alert alert-danger" role="alert"><p>{consulta.erro}</p><button type="button" className="btn btn-outline-danger" onClick={consulta.recarregar}>Tentar novamente</button></div>}
                        {!consulta.carregando && !consulta.erro && !pedido && <p className="text-secondary">Pedido não encontrado.</p>}
                        {pedido && <>
                            <div className="d-flex flex-wrap gap-2 align-items-center mb-3"><StatusPedido status={pedido.status} /><span className="text-secondary">{formatarDataHora(pedido.dataHora)}</span></div>
                            <dl className="row g-3">
                                <div className="col-12 col-sm-6"><dt>Atendimento</dt><dd>{TIPOS_ATENDIMENTO[pedido.tipoAtendimento] || pedido.tipoAtendimento}</dd></div>
                                <div className="col-12 col-sm-6"><dt>Cliente</dt><dd>{pedido.nomeCliente || 'Não vinculado'}</dd></div>
                                <div className="col-12"><dt>Lançado por</dt><dd>{pedido.nomeUsuario}</dd></div>
                                {pedido.enderecoEntrega && <div className="col-12"><dt>Endereço de entrega</dt><dd className="pedido-texto">{pedido.enderecoEntrega}</dd></div>}
                                {pedido.observacao && <div className="col-12"><dt>Observação do pedido</dt><dd className="pedido-texto">{pedido.observacao}</dd></div>}
                            </dl>
                            <h3 className="h6">Itens</h3>
                            <ul className="list-unstyled">
                                {pedido.itens.map(item => <li key={item.id} className="border rounded p-3 mb-3">
                                    <strong>{item.quantidade} × {item.nomeProduto}</strong>
                                    <p className="small text-secondary mb-1">Unitário: {formatarValor(item.precoUnitario)} · Subtotal do produto: {formatarValor(item.subtotal)}</p>
                                    {item.opcaoMistura && <p className="mb-1">Mistura: {item.opcaoMistura}</p>}
                                    {item.adicionais.length > 0 && <ul className="small ps-3 my-2">
                                        {item.adicionais.map(adicional => <li key={adicional.id}>{adicional.quantidade} × {adicional.nomeAdicional} ({formatarValor(adicional.precoUnitario)} por unidade) — {formatarValor(adicional.subtotal)}</li>)}
                                    </ul>}
                                    {item.observacao && <p className="small pedido-texto mb-1">Observação: {item.observacao}</p>}
                                    <div className="small fw-semibold mt-2">Total da linha: {formatarValor((centavos(item.subtotal) + item.adicionais.reduce((total, adicional) => total + centavos(adicional.subtotal), 0)) / 100)}</div>
                                </li>)}
                            </ul>
                            <p className="fs-5">Total do pedido: <strong className="text-primary">{formatarValor(pedido.valorTotal)}</strong></p>
                            <h3 className="h6">Pagamento</h3><ResumoPagamento pagamento={pedido.pagamento} />
                        </>}
                    </div>
                    <div className="modal-footer"><button type="button" className="btn btn-light" onClick={onFechar}>Fechar</button></div>
                </div>
            </div>
        </div>
    </>, document.body);
}

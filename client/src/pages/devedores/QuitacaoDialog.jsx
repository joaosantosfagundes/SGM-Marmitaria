import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import ApiClient from '../../services/apiClient.js';
import { converterValor, formatarValor } from '../caixa/caixaUtils.js';

const FORMAS = { DINHEIRO: 'Dinheiro', PIX: 'Pix', DEBITO: 'Débito', CREDITO: 'Crédito' };

export default function QuitacaoDialog({ alvo, onFechar, onSucesso }) {
    const [forma, setForma] = useState('');
    const [valorRecebido, setValorRecebido] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState('');
    const dialogoRef = useRef(null), cancelarRef = useRef(null), ocupadoRef = useRef(false), fecharRef = useRef(onFechar);
    const tituloId = useId(), formId = useId(), formaId = useId(), valorId = useId();
    let total = alvo.pagamento ? alvo.pagamento.valor : alvo.cliente.totalEmAberto;
    let recebido = valorRecebido.trim() === '' ? null : converterValor(valorRecebido);
    let troco = recebido === null ? null : (Math.round(recebido * 100) - Math.round(total * 100)) / 100;

    useLayoutEffect(() => { fecharRef.current = onFechar; });
    useLayoutEffect(() => {
        let anterior = document.activeElement, overflow = document.body.style.overflow;
        let raiz = document.getElementById('root'), inert = raiz?.inert;
        document.body.style.overflow = 'hidden'; if (raiz) raiz.inert = true;
        cancelarRef.current?.focus();
        function teclar(event) {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!ocupadoRef.current) fecharRef.current(); }
            if (event.key === 'Tab') {
                let elementos = [...dialogoRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled])')].filter(el => el.getClientRects().length);
                let primeiro = elementos[0], ultimo = elementos.at(-1), fora = !dialogoRef.current.contains(document.activeElement);
                if (event.shiftKey && (document.activeElement === primeiro || fora)) { event.preventDefault(); ultimo?.focus(); }
                else if (!event.shiftKey && (document.activeElement === ultimo || fora)) { event.preventDefault(); primeiro?.focus(); }
            }
        }
        function focar(event) { if (!dialogoRef.current.contains(event.target)) dialogoRef.current.focus(); }
        document.addEventListener('keydown', teclar, true); document.addEventListener('focusin', focar);
        return () => {
            document.removeEventListener('keydown', teclar, true); document.removeEventListener('focusin', focar);
            document.body.style.overflow = overflow; if (raiz) raiz.inert = inert;
            if (anterior?.isConnected) anterior.focus({ preventScroll: true });
        };
    }, []);

    async function quitar(event) {
        event.preventDefault();
        if (ocupadoRef.current) return;
        if (!forma) { setErro('Escolha a forma de recebimento.'); return; }
        if (forma === 'DINHEIRO' && valorRecebido.trim() && (recebido === null || troco < 0)) {
            setErro('Informe um valor recebido válido, com até duas casas decimais e maior ou igual ao total.'); return;
        }
        ocupadoRef.current = true; setEnviando(true); setErro('');
        try {
            let dados = { forma };
            if (forma === 'DINHEIRO' && recebido !== null) dados.valorRecebido = recebido;
            let endpoint = alvo.pagamento ? `pagamento/${alvo.pagamento.id}/quitar` : `pagamento/cliente/${alvo.cliente.idCliente}/quitar`;
            let resultado = await ApiClient.post(endpoint, dados);
            toast.success('Quitação registrada com sucesso!'); onSucesso(resultado);
        } catch (error) {
            console.error(error); let mensagem = error?.msg || 'Não foi possível registrar a quitação. Tente novamente.';
            setErro(mensagem); if (!error?.status) toast.error(mensagem);
        } finally { ocupadoRef.current = false; setEnviando(false); }
    }

    return createPortal(<>
        <div className="modal-backdrop show" />
        <div className="modal d-block confirm-dialog" role="dialog" aria-modal="true" aria-labelledby={tituloId} aria-busy={enviando}
            ref={dialogoRef} tabIndex={-1} style={{ overflowWrap: 'anywhere' }}
            onClick={event => { if (!enviando && event.target === event.currentTarget) onFechar(); }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content page-card">
                    <div className="modal-body p-3 p-sm-4">
                        <div className="text-center">
                            <span className="confirm-dialog-icon rounded-circle bg-primary-subtle text-primary mb-3" aria-hidden="true"><i className="ti ti-cash fs-2" /></span>
                            <h2 id={tituloId} className="h5">Confirmar quitação</h2>
                            <p className="mb-1">{alvo.cliente.nome}</p>
                            <p>{alvo.pagamento ? `Pedido #${alvo.pagamento.idPedido}` : `${alvo.cliente.quantidade} pagamentos pendentes`}</p>
                            <p className="fs-4 fw-semibold text-primary">{formatarValor(total)}</p>
                        </div>
                        <form id={formId} onSubmit={quitar} noValidate>
                            <label htmlFor={formaId} className="form-label">Forma de recebimento</label>
                            <select id={formaId} className="form-select mb-3" value={forma} disabled={enviando} onChange={event => { setForma(event.target.value); setValorRecebido(''); setErro(''); }}>
                                <option value="">Selecione</option>
                                {Object.entries(FORMAS).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}
                            </select>
                            {forma === 'DINHEIRO' && <>
                                <label htmlFor={valorId} className="form-label">Valor recebido (R$) — opcional</label>
                                <input id={valorId} type="text" inputMode="decimal" className="form-control" placeholder="0,00" value={valorRecebido} disabled={enviando} onChange={event => setValorRecebido(event.target.value)} />
                                {troco !== null && <p className={`mt-2 ${troco < 0 ? 'text-danger' : 'text-success'}`}>{troco < 0 ? 'Valor insuficiente.' : `Troco: ${formatarValor(troco)}`}</p>}
                            </>}
                            <p className="small text-secondary mt-3">Confirme somente após receber. A quitação será registrada no caixa aberto e não poderá ser desfeita por esta tela.</p>
                            {erro && <div className="alert alert-danger mb-0" role="alert">{erro}</div>}
                        </form>
                    </div>
                    <div className="modal-footer border-0 gap-2 p-3 p-sm-4 pt-0">
                        <button type="button" className="btn btn-light flex-grow-1" ref={cancelarRef} disabled={enviando} onClick={onFechar}>Cancelar</button>
                        <button type="submit" form={formId} className="btn btn-primary flex-grow-1" disabled={enviando || !forma}>{enviando ? 'Registrando...' : 'Confirmar recebimento'}</button>
                    </div>
                </div>
            </div>
        </div>
    </>, document.body);
}

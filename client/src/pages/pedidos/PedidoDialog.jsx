import { useId, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function PedidoDialog({ titulo, onFechar, ocupado = false, pequeno = false, children, rodape }) {
    const dialogoRef = useRef(null);
    const fecharRef = useRef(null);
    const estadoRef = useRef({ onFechar, ocupado });
    const tituloId = useId();

    useLayoutEffect(() => { estadoRef.current = { onFechar, ocupado }; });
    useLayoutEffect(() => {
        let anterior = document.activeElement;
        let overflowAnterior = document.body.style.overflow;
        let raiz = document.getElementById('root');
        let inertAnterior = raiz?.inert;
        document.body.style.overflow = 'hidden';
        if (raiz) raiz.inert = true;
        fecharRef.current?.focus();
        function aoTeclar(event) {
            if (event.key === 'Escape') {
                event.preventDefault(); event.stopPropagation();
                if (!estadoRef.current.ocupado) estadoRef.current.onFechar();
            }
            if (event.key === 'Tab') {
                let focaveis = [...dialogoRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]')]
                    .filter(elemento => elemento.getClientRects().length);
                let primeiro = focaveis[0], ultimo = focaveis.at(-1);
                let fora = !dialogoRef.current.contains(document.activeElement);
                if (event.shiftKey && (document.activeElement === primeiro || fora)) { event.preventDefault(); ultimo?.focus(); }
                else if (!event.shiftKey && (document.activeElement === ultimo || fora)) { event.preventDefault(); primeiro?.focus(); }
            }
        }
        function manterFoco(event) {
            if (!dialogoRef.current?.contains(event.target)) dialogoRef.current?.focus();
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
    }, []);

    return createPortal(<>
        <div className="modal-backdrop show" />
        <div className="modal d-block pedido-detalhe" role="dialog" aria-modal="true" aria-labelledby={tituloId}
            aria-busy={ocupado} ref={dialogoRef} tabIndex={-1}
            onClick={event => { if (!ocupado && event.target === event.currentTarget) onFechar(); }}>
            <div className={`modal-dialog ${pequeno ? '' : 'modal-lg'} modal-dialog-centered modal-dialog-scrollable`}>
                <div className="modal-content page-card">
                    <div className="modal-header">
                        <h2 className="modal-title fs-5" id={tituloId}>{titulo}</h2>
                        <button type="button" className="btn-close" disabled={ocupado} aria-label="Fechar diálogo do pedido" ref={fecharRef} onClick={onFechar} />
                    </div>
                    <div className="modal-body p-3 p-sm-4">{children}</div>
                    <div className="modal-footer gap-2">{rodape}</div>
                </div>
            </div>
        </div>
    </>, document.body);
}

import { useId, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmDialog({ titulo, mensagem, textoConfirmar, tipo, onResponder }) {
    const dialogoRef = useRef(null);
    const cancelarRef = useRef(null);
    const confirmarRef = useRef(null);
    const tituloId = useId();
    const mensagemId = useId();
    const perigo = tipo === 'perigo';

    useLayoutEffect(() => {
        let anterior = document.activeElement;
        let overflowAnterior = document.body.style.overflow;
        let raiz = document.getElementById('root');
        let inertAnterior = raiz?.inert;
        document.body.style.overflow = 'hidden';
        if (raiz) raiz.inert = true;

        let focoInicial = perigo ? cancelarRef.current : confirmarRef.current;
        focoInicial?.focus();

        function aoTeclar(event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                onResponder(false);
            }
            if (event.key === 'Tab') {
                let primeiro = cancelarRef.current;
                let ultimo = confirmarRef.current;
                let fora = !dialogoRef.current?.contains(document.activeElement);
                if (event.shiftKey && (document.activeElement === primeiro || fora)) {
                    event.preventDefault();
                    ultimo?.focus();
                } else if (!event.shiftKey && (document.activeElement === ultimo || fora)) {
                    event.preventDefault();
                    primeiro?.focus();
                }
            }
        }

        function manterFoco(event) {
            if (!dialogoRef.current?.contains(event.target)) focoInicial?.focus();
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
    }, [perigo, onResponder]);

    return createPortal(
        <>
            <div className="modal-backdrop show" />
            <div className="modal d-block confirm-dialog" role="dialog" aria-modal="true"
                aria-labelledby={tituloId} aria-describedby={mensagemId} ref={dialogoRef}
                onClick={event => { if (event.target === event.currentTarget) onResponder(false); }}>
                <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                    <div className="modal-content page-card">
                        <div className="modal-body p-4 text-center">
                            <span className={`confirm-dialog-icon rounded-circle mb-3 ${perigo ? 'bg-danger-subtle text-danger' : 'bg-primary-subtle text-primary'}`} aria-hidden="true">
                                <i className={`ti ${perigo ? 'ti-alert-triangle' : 'ti-help'} fs-2`} />
                            </span>
                            <h2 id={tituloId} className="h5 mb-3">{titulo}</h2>
                            <p id={mensagemId} className="confirm-dialog-message text-secondary mb-0">{mensagem}</p>
                        </div>
                        <div className="modal-footer border-0 p-4 pt-0 gap-2">
                            <button type="button" className="btn btn-light flex-grow-1 flex-sm-grow-0" ref={cancelarRef} onClick={() => onResponder(false)}>Cancelar</button>
                            <button type="button" className={`btn ${perigo ? 'btn-danger' : 'btn-primary'} flex-grow-1 flex-sm-grow-0`} ref={confirmarRef} onClick={() => onResponder(true)}>{textoConfirmar}</button>
                        </div>
                    </div>
                </div>
            </div>
        </>, document.body
    );
}

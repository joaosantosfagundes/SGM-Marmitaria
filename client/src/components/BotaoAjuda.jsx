import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { TourGuideClient } from '@sjmc11/tourguidejs/src/Tour';
import '@sjmc11/tourguidejs/src/scss/tour.scss';
import { obterTour } from '../lib/tours.js';
import '../styles/tour.scss';

function prepararDialogo(dialogo) {
    dialogo.setAttribute('role', 'dialog');
    dialogo.setAttribute('aria-modal', 'true');
    dialogo.setAttribute('aria-labelledby', 'tg-dialog-title');
    dialogo.setAttribute('aria-describedby', 'tg-dialog-body');

    const fechar = dialogo.querySelector('#tg-dialog-close-btn');
    fechar.setAttribute('role', 'button');
    fechar.setAttribute('aria-label', 'Fechar tour');
    fechar.tabIndex = 0;
    dialogo.addEventListener('keydown', evento => {
        if (evento.target === fechar && ['Enter', ' '].includes(evento.key)) {
            evento.preventDefault();
            fechar.click();
        }
        if (evento.key === 'Tab') {
            const botoes = dialogo.querySelectorAll('button:not(:disabled), [tabindex="0"]');
            const limite = evento.shiftKey ? botoes[0] : botoes[botoes.length - 1];
            if (evento.target === limite) {
                evento.preventDefault();
                (evento.shiftKey ? botoes[botoes.length - 1] : botoes[0]).focus();
            }
        }
    });
    fechar.focus({ preventScroll: true });
}

export default function BotaoAjuda() {
    const { pathname } = useLocation();
    const botaoRef = useRef(null);
    const sessaoRef = useRef(null);

    useLayoutEffect(() => () => sessaoRef.current?.encerrar(), [pathname]);

    function iniciarTour() {
        if (sessaoRef.current) return;

        const mobile = window.matchMedia('(max-width: 992px)').matches;
        const descartados = [];
        const steps = obterTour(pathname).flatMap(({ target, sidebar, ...passo }) => {
            if (mobile && sidebar) return [];
            const elemento = [...document.querySelectorAll(target)].find(alvo =>
                alvo.getClientRects().length && !alvo.closest('[hidden], [inert]'));
            if (elemento) return [{ ...passo, target: elemento }];
            descartados.push(target);
            return [];
        });

        if (import.meta.env.DEV && descartados.length) {
            console.warn('Passos do tour sem alvo disponível:', pathname, descartados);
        }
        if (!steps.length) {
            toast('Esta tela ainda não tem tour.');
            return;
        }

        const reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const tour = new TourGuideClient({
            steps,
            nextLabel: 'Próximo',
            prevLabel: 'Voltar',
            finishLabel: 'Concluir',
            closeButton: true,
            showStepProgress: true,
            showStepDots: false,
            keyboardControls: true,
            exitOnEscape: true,
            rememberStep: false,
            completeOnFinish: false,
            targetPadding: 8,
            autoScroll: true,
            autoScrollSmooth: !reduzMovimento,
            dialogAnimate: !reduzMovimento,
            backdropAnimate: !reduzMovimento,
            dialogMaxWidth: Math.min(340, window.innerWidth - 32),
            dialogZ: 2000,
            dialogClass: 'sgm-tour',
            backdropClass: 'sgm-tour-backdrop',
            backdropColor: 'rgba(0, 0, 0, 0.20)',
            progressBar: '#D85A30',
            activeStepInteraction: false,
            allowDialogOverlap: true,
            debug: false,
        });

        let encerrando = false;
        function liberar() {
            tour.dialog.remove();
            tour.backdrop.remove();
            if (sessaoRef.current === sessao) {
                sessaoRef.current = null;
                requestAnimationFrame(() => {
                    if (!sessaoRef.current) botaoRef.current?.focus({ preventScroll: true });
                });
            }
        }

        tour.onAfterExit(liberar);
        const inicio = tour.start();
        const sessao = {
            async encerrar() {
                if (encerrando) return;
                encerrando = true;
                // O início da biblioteca pode ainda estar posicionando o balão.
                tour.dialog.style.visibility = 'hidden';
                tour.backdrop.style.visibility = 'hidden';
                try {
                    await inicio;
                    if (tour.isVisible) await tour.exit();
                } catch {
                    await tour.destroyListeners();
                } finally {
                    liberar();
                }
            },
        };
        sessaoRef.current = sessao;
        inicio.then(() => {
            if (!encerrando && tour.isVisible) prepararDialogo(tour.dialog);
        }).catch(async () => {
            await tour.destroyListeners();
            liberar();
            if (!encerrando) toast.error('Não foi possível iniciar o tour.');
        });
    }

    return <button type="button" ref={botaoRef} className="btn btn-light btn-sm d-inline-flex align-items-center gap-1"
        data-tour="ajuda" aria-label="Ajuda sobre esta tela" title="Ajuda sobre esta tela" onClick={iniciarTour}>
        <i className="ti ti-help-circle" aria-hidden="true" />
        <span className="d-none d-sm-inline">Ajuda</span>
    </button>;
}

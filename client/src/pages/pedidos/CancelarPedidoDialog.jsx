import { useId, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ApiClient from '../../services/apiClient.js';
import PedidoDialog from './PedidoDialog.jsx';
import { tratarErro } from './pedidoUtils.js';

export default function CancelarPedidoDialog({ pedido, onFechar, onSucesso }) {
    const [motivo, setMotivo] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState('');
    const enviandoRef = useRef(false);
    const campoId = useId();
    const formId = useId();

    async function cancelar(event) {
        event.preventDefault();
        if (enviandoRef.current) return;
        if (motivo.trim().length < 3 || motivo.trim().length > 255) {
            setErro('Informe o motivo do cancelamento com 3 a 255 caracteres.');
            return;
        }
        enviandoRef.current = true; setEnviando(true); setErro('');
        try {
            let atualizado = await ApiClient.post(`pedido/${pedido.id}/cancelar`, { motivo: motivo.trim() });
            toast.success('Pedido cancelado.');
            onSucesso(atualizado);
        } catch (error) {
            setErro(tratarErro(error));
        } finally { enviandoRef.current = false; setEnviando(false); }
    }

    return <PedidoDialog titulo={`Cancelar pedido #${pedido.id}`} pequeno ocupado={enviando} onFechar={onFechar}
        rodape={<>
            <button type="button" className="btn btn-light" disabled={enviando} onClick={onFechar}>Voltar</button>
            <button type="submit" form={formId} className="btn btn-danger" disabled={enviando}>{enviando ? 'Cancelando...' : 'Confirmar cancelamento'}</button>
        </>}>
        <div className="text-center mb-3">
            <span className="confirm-dialog-icon rounded-circle bg-danger-subtle text-danger mb-3" aria-hidden="true"><i className="ti ti-alert-triangle fs-2" /></span>
            <p className="text-secondary mb-0">O pedido e seus pagamentos serão cancelados. Esta ação não pode ser desfeita.</p>
        </div>
        <form id={formId} onSubmit={cancelar}>
            <label htmlFor={campoId} className="form-label">Motivo do cancelamento</label>
            <textarea id={campoId} className="form-control" required minLength={3} maxLength={255} rows={3}
                value={motivo} disabled={enviando} onChange={event => setMotivo(event.target.value)} aria-describedby={`${campoId}-ajuda`} />
            <p id={`${campoId}-ajuda`} className="small text-secondary mt-1">De 3 a 255 caracteres.</p>
            {erro && <div className="alert alert-danger pedido-texto mb-0" role="alert">{erro}</div>}
        </form>
    </PedidoDialog>;
}

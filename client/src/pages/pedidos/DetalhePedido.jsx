import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import ApiClient from '../../services/apiClient.js';
import useConsulta from './useConsulta.js';
import { centavos, formatarDataHora, formatarValor, proximaAcaoPedido, TIPOS_ATENDIMENTO, tratarErro } from './pedidoUtils.js';
import { StatusPedido } from './PedidoBadges.jsx';
import ResumoPagamento from './ResumoPagamento.jsx';
import PedidoDialog from './PedidoDialog.jsx';
import CancelarPedidoDialog from './CancelarPedidoDialog.jsx';
import ComandaPedido from './ComandaPedido.jsx';

export default function DetalhePedido({ id, onFechar, onAlterado }) {
    const { usuario } = useAuth();
    const consulta = useConsulta(`pedido/${id}`);
    const [cancelando, setCancelando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [erroAcao, setErroAcao] = useState('');
    const enviandoRef = useRef(false);
    let pedido = consulta.dados;
    let proximaAcao = pedido && proximaAcaoPedido(pedido, usuario?.perfil);
    let podeCancelar = pedido && pedido.status !== 'CANCELADO' && ['ADMIN', 'ATENDENTE'].includes(usuario?.perfil);

    function pedidoAtualizado(atualizado) {
        setCancelando(false);
        consulta.recarregar();
        onAlterado(atualizado);
    }

    async function avancarStatus() {
        if (!proximaAcao || enviandoRef.current) return;
        enviandoRef.current = true; setEnviando(true); setErroAcao('');
        try {
            let atualizado = await ApiClient.put(`pedido/${id}/status`, { status: proximaAcao.status });
            toast.success('Status do pedido atualizado.');
            pedidoAtualizado(atualizado);
        } catch (error) {
            setErroAcao(tratarErro(error));
            if (error?.status === 409) consulta.recarregar();
        } finally { enviandoRef.current = false; setEnviando(false); }
    }

    if (cancelando) return <CancelarPedidoDialog pedido={pedido} onFechar={() => setCancelando(false)} onSucesso={pedidoAtualizado} />;

    return <PedidoDialog titulo={`Pedido #${id}`} onFechar={onFechar} ocupado={enviando}
        rodape={<>
            <button type="button" className="btn btn-light" disabled={enviando} onClick={onFechar}>Fechar</button>
            {pedido && !consulta.erro && !consulta.carregando && <>
                <ComandaPedido pedido={pedido} disabled={enviando} />
                {podeCancelar && <button type="button" className="btn btn-danger" disabled={enviando} onClick={() => setCancelando(true)}>Cancelar pedido</button>}
                {proximaAcao && <button type="button" className="btn btn-primary" disabled={enviando} onClick={avancarStatus}>{enviando ? 'Atualizando...' : proximaAcao.texto}</button>}
            </>}
        </>}>
        {erroAcao && <div className="alert alert-danger" role="alert">{erroAcao}</div>}
        {consulta.carregando && <p className="text-secondary" role="status">Carregando pedido...</p>}
        {consulta.erro && <div className="alert alert-danger" role="alert"><p>{consulta.erro}</p><button type="button" className="btn btn-outline-danger" onClick={consulta.recarregar}>Tentar novamente</button></div>}
        {!consulta.carregando && !consulta.erro && !pedido && <p className="text-secondary">Pedido não encontrado.</p>}
        {pedido && <>
            <div className="d-flex flex-wrap gap-2 align-items-center mb-3"><StatusPedido status={pedido.status} /><span className="text-secondary">{formatarDataHora(pedido.dataHora)}</span></div>
            {pedido.status === 'CANCELADO' && <div className="alert alert-warning pedido-texto" role="status">
                <strong>Pedido cancelado</strong>
                <p className="mb-1">Motivo: {pedido.motivoCancelamento}</p>
                <p className="mb-0">Cancelado por {pedido.nomeUsuarioCancelamento || '—'} em {formatarDataHora(pedido.horaCancelamento)}</p>
            </div>}
            <dl className="row g-3">
                <div className="col-12 col-sm-6"><dt>Atendimento</dt><dd>{TIPOS_ATENDIMENTO[pedido.tipoAtendimento] || pedido.tipoAtendimento}</dd></div>
                <div className="col-12 col-sm-6"><dt>Cliente</dt><dd>{pedido.nomeCliente || 'Não vinculado'}</dd></div>
                <div className="col-12"><dt>Lançado por</dt><dd>{pedido.nomeUsuario}</dd></div>
                {pedido.horaPronto && <div className="col-12 col-sm-6"><dt>Pronto em</dt><dd>{formatarDataHora(pedido.horaPronto)}</dd></div>}
                {pedido.horaSaiuEntrega && <div className="col-12 col-sm-6"><dt>Saiu para entrega em</dt><dd>{formatarDataHora(pedido.horaSaiuEntrega)}</dd></div>}
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
    </PedidoDialog>;
}

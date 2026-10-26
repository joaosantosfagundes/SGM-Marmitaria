import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { dataLocal } from '../../lib/dataLocal.js';
import useConsulta from './useConsulta.js';
import NovoPedido from './NovoPedido.jsx';
import ListaPedidos from './ListaPedidos.jsx';
import DetalhePedido from './DetalhePedido.jsx';
import ResultadoPedido from './ResultadoPedido.jsx';
import './pedidos.scss';

export default function PedidosPage() {
    const { usuario } = useAuth();
    const podeCriar = ['ADMIN', 'ATENDENTE'].includes(usuario?.perfil);
    const podeConsultar = ['ADMIN', 'ATENDENTE', 'COZINHA'].includes(usuario?.perfil);
    const [dataConsulta, setDataConsulta] = useState(dataLocal);
    const [statusConsulta, setStatusConsulta] = useState('');
    const [detalheId, setDetalheId] = useState(null);
    const caixa = useConsulta(podeCriar ? 'caixa/atual' : null);
    const lista = useConsulta(podeConsultar && dataConsulta ? `pedido?data=${encodeURIComponent(dataConsulta)}${statusConsulta ? `&status=${statusConsulta}` : ''}` : null,
        { atualizarAutomaticamente: dataConsulta === dataLocal(), pausada: detalheId !== null, dataAtualizacao: dataConsulta });
    const [mostrarForm, setMostrarForm] = useState(false);
    const [pedidoLancado, setPedidoLancado] = useState(null);
    const [avisoCaixa, setAvisoCaixa] = useState('');
    const fecharDetalhe = useCallback(() => setDetalheId(null), []);
    let semCaixa = !caixa.carregando && !caixa.erro && !caixa.dados;
    let bloqueado = caixa.carregando || Boolean(caixa.erro) || semCaixa || Boolean(avisoCaixa);

    function atualizarCaixa() {
        setAvisoCaixa('');
        caixa.recarregar();
    }

    function pedidoCriado(pedido) {
        setMostrarForm(false);
        setPedidoLancado(pedido);
        setDataConsulta(dataLocal());
        lista.recarregar();
        caixa.recarregar();
    }

    function consultarHoje() {
        let hoje = dataLocal();
        if (dataConsulta === hoje) lista.recarregar();
        else setDataConsulta(hoje);
    }

    function pedidoAlterado(pedido) {
        lista.recarregar();
        setPedidoLancado(anterior => anterior?.id === pedido.id ? pedido : anterior);
    }

    if (!podeConsultar) return <div className="alert alert-warning">Você não tem acesso aos pedidos.</div>;

    return (
        <div className="pedidos-page">
            <div className="page-header d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div><h1 className="fs-3 mb-1">Pedidos</h1><p className="text-secondary mb-0">Lançamento e consulta dos pedidos por dia.</p></div>
                {podeCriar && !mostrarForm && <button type="button" className="btn btn-primary" disabled={bloqueado} onClick={() => { setMostrarForm(true); setPedidoLancado(null); }}><i className="ti ti-plus me-1" />Novo pedido</button>}
            </div>
            {podeCriar && <>
                {caixa.carregando && <div className="page-card p-3 mb-4 text-secondary" role="status">Consultando caixa...</div>}
                {caixa.erro && <div className="alert alert-danger mb-4" role="alert"><p>Não foi possível consultar o caixa. {caixa.erro}</p><button type="button" className="btn btn-outline-danger" disabled={caixa.carregando} onClick={atualizarCaixa}>Tentar novamente</button></div>}
                {(semCaixa || avisoCaixa) && <div className="alert alert-warning mb-4" role="alert">
                    <h2 className="h6">Nenhum caixa aberto</h2>
                    <p>{avisoCaixa || 'Abra o caixa para lançar um pedido.'} <Link to="/caixa" className="alert-link">Ir para Caixa</Link></p>
                    <button type="button" className="btn btn-sm btn-outline-secondary" disabled={caixa.carregando} onClick={atualizarCaixa}>Atualizar caixa</button>
                </div>}
                {mostrarForm && <NovoPedido bloqueado={bloqueado} onCancelar={() => setMostrarForm(false)} onSucesso={pedidoCriado} onCaixaFechado={mensagem => { setAvisoCaixa(mensagem); caixa.recarregar(); }} />}
                {pedidoLancado && <ResultadoPedido pedido={pedidoLancado} onDetalhar={setDetalheId} />}
            </>}
            <ListaPedidos consulta={lista} data={dataConsulta} onData={setDataConsulta} onHoje={consultarHoje} status={statusConsulta} onStatus={setStatusConsulta} onDetalhar={setDetalheId} />
            {detalheId !== null && <DetalhePedido key={detalheId} id={detalheId} onFechar={fecharDetalhe} onAlterado={pedidoAlterado} />}
        </div>
    );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import useConsulta from '../pedidos/useConsulta.js';
import { formatarDataHora, formatarValor } from '../caixa/caixaUtils.js';
import QuitacaoDialog from './QuitacaoDialog.jsx';

export default function DevedoresPage() {
    const { usuario } = useAuth();
    const podeAcessar = ['ADMIN', 'ATENDENTE'].includes(usuario?.perfil);
    const consulta = useConsulta(podeAcessar ? 'pagamento/fiado' : null);
    const caixa = useConsulta(podeAcessar ? 'caixa/atual' : null);
    const [expandido, setExpandido] = useState(null);
    const [alvo, setAlvo] = useState(null);
    const [recibo, setRecibo] = useState(null);
    let total = (consulta.dados || []).reduce((soma, cliente) => soma + Math.round(cliente.totalEmAberto * 100), 0) / 100;
    let bloqueado = caixa.carregando || Boolean(caixa.erro) || !caixa.dados;

    function atualizar() { consulta.recarregar(); caixa.recarregar(); }
    function quitado(resultado) { setAlvo(null); setRecibo(resultado); atualizar(); }

    if (!podeAcessar) return <div className="alert alert-warning">Devedores está disponível para administradores e atendentes.</div>;
    return <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
        <div className="page-header d-flex flex-wrap gap-3 align-items-center justify-content-between mb-4">
            <div><h1 className="fs-3 mb-1">Devedores</h1><p className="text-secondary mb-0">Consulte os valores em aberto e registre os recebimentos.</p></div>
            <button type="button" className="btn btn-outline-primary" onClick={atualizar} disabled={consulta.carregando || caixa.carregando}>Atualizar</button>
        </div>
        {caixa.carregando && <p className="text-secondary" role="status">Consultando caixa...</p>}
        {caixa.erro && <div className="alert alert-danger" role="alert">{caixa.erro} <button type="button" className="btn btn-outline-danger btn-sm" onClick={caixa.recarregar}>Tentar novamente</button></div>}
        {!caixa.carregando && !caixa.erro && !caixa.dados && <div className="alert alert-warning">Abra o caixa para quitar valores em aberto. <Link to="/caixa" className="alert-link">Ir para Caixa</Link></div>}
        {recibo && <section className="page-card p-3 p-sm-4 mb-4 border-success" role="status">
            <h2 className="h5">Quitação registrada</h2>
            <p>{recibo.quantidade} pagamento(s) · Total: <strong>{formatarValor(recibo.total)}</strong> · Caixa #{recibo.idCaixaQuitacao}</p>
            <p className="mb-0">Recebido em {{ DINHEIRO: 'dinheiro', PIX: 'Pix', DEBITO: 'débito', CREDITO: 'crédito' }[recibo.forma]}.</p>
            {recibo.troco !== null && <p className="fs-4 text-success mb-0 mt-2">Troco: <strong>{formatarValor(recibo.troco)}</strong></p>}
        </section>}
        <section className="page-card p-3 p-sm-4 mb-4">
            <div className="small text-secondary">Total em aberto</div><strong className="fs-3 text-primary">{formatarValor(total)}</strong>
        </section>
        {consulta.erro && <div className="alert alert-danger" role="alert"><p>{consulta.erro}</p><button type="button" className="btn btn-outline-danger" onClick={consulta.recarregar}>Tentar novamente</button></div>}
        <section className="page-card">
            <h2 className="h6 px-3 px-sm-4 py-3 border-bottom mb-0">Clientes devedores</h2>
            {consulta.carregando ? <p className="text-secondary p-4" role="status">Carregando devedores...</p>
                : !consulta.erro && !consulta.dados?.length ? <p className="text-secondary p-4">Nenhum valor a receber de devedores.</p>
                : !consulta.erro && consulta.dados?.map(cliente => <div key={cliente.idCliente} className="p-3 p-sm-4 border-bottom">
                    <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between">
                        <div style={{ minWidth: 0 }}><h3 className="h6 mb-1">{cliente.nome}</h3><p className="small text-secondary mb-1">{cliente.telefone || 'Telefone não informado'} · {cliente.quantidade} pagamento(s)</p><strong>{formatarValor(cliente.totalEmAberto)}</strong></div>
                        <div className="d-flex flex-wrap gap-2">
                            <button type="button" className="btn btn-outline-primary" aria-expanded={expandido === cliente.idCliente} aria-controls={`devedor-cliente-${cliente.idCliente}`} onClick={() => setExpandido(atual => atual === cliente.idCliente ? null : cliente.idCliente)}>{expandido === cliente.idCliente ? 'Ocultar pedidos' : 'Ver pedidos'}</button>
                            <button type="button" className="btn btn-primary" disabled={bloqueado} onClick={() => setAlvo({ cliente })}>Quitar todos</button>
                        </div>
                    </div>
                    {expandido === cliente.idCliente && <div className="table-responsive mt-3" id={`devedor-cliente-${cliente.idCliente}`}>
                        <table className="table align-middle mb-0">
                            <thead className="text-nowrap"><tr><th>Pedido</th><th>Lançamento</th><th>Caixa da venda</th><th>Valor</th><th>Ação</th></tr></thead>
                            <tbody>{cliente.pedidos.map(pagamento => <tr key={pagamento.id}>
                                <td>#{pagamento.idPedido}</td><td className="text-nowrap">{formatarDataHora(pagamento.dataHora)}</td><td>#{pagamento.idCaixa}</td><td className="text-nowrap">{formatarValor(pagamento.valor)}</td>
                                <td><button type="button" className="btn btn-sm btn-outline-primary" disabled={bloqueado} aria-label={`Quitar pedido ${pagamento.idPedido}`} onClick={() => setAlvo({ cliente, pagamento })}>Quitar</button></td>
                            </tr>)}</tbody>
                        </table>
                    </div>}
                </div>)}
        </section>
        {alvo && <QuitacaoDialog alvo={alvo} onFechar={() => setAlvo(null)} onSucesso={quitado} />}
    </div>;
}

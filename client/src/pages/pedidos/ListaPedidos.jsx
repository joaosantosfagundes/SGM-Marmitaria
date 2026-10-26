import { FORMAS_PAGAMENTO, formatarDataHora, formatarValor, TIPOS_ATENDIMENTO } from './pedidoUtils.js';
import { STATUS_PEDIDO, StatusPagamento, StatusPedido } from './PedidoBadges.jsx';

export default function ListaPedidos({ consulta, data, onData, onHoje, status, onStatus, onDetalhar }) {
    let { dados, carregando, erro, recarregar, atualizadoEm } = consulta;
    return (
        <section className="page-card">
            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between px-3 px-sm-4 py-3 border-bottom">
                <div><h2 className="h6 mb-1">Pedidos do dia</h2><p className="small text-secondary mb-0">Selecione um pedido para ver os detalhes.</p>
                    {atualizadoEm && <p className="small text-secondary mb-0">Atualizado às {atualizadoEm.toLocaleTimeString('pt-BR')}</p>}
                </div>
                <button type="button" className="btn btn-outline-primary" disabled={carregando || !data} onClick={recarregar}><i className="ti ti-refresh me-1" />Atualizar</button>
            </div>
            <div className="px-3 px-sm-4 py-3 border-bottom">
                <div className="row g-3 align-items-end">
                    <div className="col-12 col-md-6 col-xl-4">
                        <label htmlFor="data-pedidos" className="form-label small">Consultar pedidos de</label>
                        <div className="input-group">
                            <input id="data-pedidos" type="date" className="form-control" value={data} onChange={event => onData(event.target.value)} />
                            <button type="button" className="btn btn-light" onClick={onHoje}>Hoje</button>
                        </div>
                    </div>
                    <div className="col-12 col-md-6 col-xl-4">
                        <label htmlFor="status-pedidos" className="form-label small">Status do pedido</label>
                        <select id="status-pedidos" className="form-select" value={status} onChange={event => onStatus(event.target.value)}>
                            <option value="">Todos</option>
                            {Object.entries(STATUS_PEDIDO).map(([valor, [texto]]) => <option key={valor} value={valor}>{texto}</option>)}
                        </select>
                    </div>
                </div>
                {data && !carregando && !erro && <p className="small text-secondary mt-3 mb-0" role="status">
                    {dados?.length ?? 0} {dados?.length === 1 ? 'pedido listado' : 'pedidos listados'} em {data.split('-').reverse().join('/')}.
                    {dados?.length === 200 && ' Limite de 200 pedidos nesta consulta.'}
                </p>}
            </div>
            {erro && <div className="alert alert-danger m-3" role="alert">
                <p>{erro}</p><button type="button" className="btn btn-sm btn-outline-danger" onClick={recarregar}>Tentar novamente</button>
            </div>}
            <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                    <caption className="visually-hidden">Pedidos da data selecionada com pagamento, situação e responsável.</caption>
                    <thead><tr><th scope="col" className="ps-3 ps-sm-4">Número</th><th scope="col">Data e hora</th><th scope="col">Tipo</th><th scope="col">Cliente</th><th scope="col">Total</th><th scope="col">Forma</th><th scope="col">Pagamento</th><th scope="col">Status do pedido</th><th scope="col" className="pe-4">Lançado por</th></tr></thead>
                    <tbody>
                        {!data ? <tr><td colSpan={9} className="text-center text-secondary p-4">Selecione uma data para consultar os pedidos.</td></tr>
                            : carregando ? <tr><td colSpan={9} className="text-center text-secondary p-4" role="status">Carregando pedidos...</td></tr>
                            : erro ? <tr><td colSpan={9} className="text-center text-secondary p-4">Consulta indisponível.</td></tr>
                                : !dados?.length ? <tr><td colSpan={9} className="text-center text-secondary p-4">Nenhum pedido encontrado para os filtros selecionados.</td></tr>
                                    : dados.map(pedido => <tr key={pedido.id} className="pedido-linha" onClick={() => onDetalhar(pedido.id)}>
                                        <td className="ps-3 ps-sm-4"><button type="button" className="btn btn-sm btn-outline-primary text-nowrap" aria-label={`Ver detalhes do pedido ${pedido.id}`} onClick={event => { event.stopPropagation(); onDetalhar(pedido.id); }}>#{pedido.id}</button></td>
                                        <td className="text-nowrap">{formatarDataHora(pedido.dataHora)}</td>
                                        <td>{TIPOS_ATENDIMENTO[pedido.tipoAtendimento] || pedido.tipoAtendimento}</td>
                                        <td>{pedido.nomeCliente || '—'}</td>
                                        <td className="text-nowrap">{formatarValor(pedido.valorTotal)}</td>
                                        <td>{FORMAS_PAGAMENTO[pedido.formaPagamento] || '—'}</td>
                                        <td><StatusPagamento status={pedido.statusPagamento} /></td>
                                        <td><StatusPedido status={pedido.status} /></td>
                                        <td className="pe-4">{pedido.nomeUsuario}</td>
                                    </tr>)}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

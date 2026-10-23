import { FORMAS_PAGAMENTO, formatarDataHora, formatarValor, TIPOS_ATENDIMENTO } from './pedidoUtils.js';
import { StatusPagamento, StatusPedido } from './PedidoBadges.jsx';

export default function ListaPedidos({ consulta, onDetalhar }) {
    let { dados, carregando, erro, recarregar } = consulta;
    return (
        <section className="page-card">
            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between px-3 px-sm-4 py-3 border-bottom">
                <div><h2 className="h6 mb-1">Pedidos recentes</h2><p className="small text-secondary mb-0">Últimos 20 pedidos. Selecione um pedido para ver os detalhes.</p></div>
                <button type="button" className="btn btn-outline-primary" disabled={carregando} onClick={recarregar}><i className="ti ti-refresh me-1" />Atualizar</button>
            </div>
            {erro && <div className="alert alert-danger m-3" role="alert">
                <p>{erro}</p><button type="button" className="btn btn-sm btn-outline-danger" onClick={recarregar}>Tentar novamente</button>
            </div>}
            <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                    <caption className="visually-hidden">Pedidos recentes com pagamento, situação e responsável.</caption>
                    <thead><tr><th scope="col" className="ps-3 ps-sm-4">Número</th><th scope="col">Data e hora</th><th scope="col">Tipo</th><th scope="col">Cliente</th><th scope="col">Total</th><th scope="col">Forma</th><th scope="col">Pagamento</th><th scope="col">Status do pedido</th><th scope="col" className="pe-4">Lançado por</th></tr></thead>
                    <tbody>
                        {carregando ? <tr><td colSpan={9} className="text-center text-secondary p-4" role="status">Carregando pedidos...</td></tr>
                            : erro ? <tr><td colSpan={9} className="text-center text-secondary p-4">Consulta indisponível.</td></tr>
                                : !dados?.length ? <tr><td colSpan={9} className="text-center text-secondary p-4">Nenhum pedido registrado.</td></tr>
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

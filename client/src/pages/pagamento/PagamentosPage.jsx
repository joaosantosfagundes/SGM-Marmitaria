import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { dataLocal } from '../../lib/dataLocal.js';
import useConsulta from '../pedidos/useConsulta.js';
import { StatusPagamento } from '../pedidos/PedidoBadges.jsx';
import { FORMAS_PAGAMENTO } from '../pedidos/pedidoUtils.js';
import { formatarDataHora, formatarValor } from '../caixa/caixaUtils.js';

export default function PagamentosPage() {
    const { usuario } = useAuth();
    const podeAcessar = ['ADMIN', 'ATENDENTE'].includes(usuario?.perfil);
    const [filtros, setFiltros] = useState({ data: dataLocal(), forma: '', status: '', idCaixa: '' });
    const [busca, setBusca] = useState(filtros);
    let parametros = new URLSearchParams(Object.entries(busca).filter(([, valor]) => valor !== ''));
    const consulta = useConsulta(podeAcessar ? `pagamento?${parametros}` : null);

    function alterar(event) { setFiltros(atual => ({ ...atual, [event.target.name]: event.target.value })); }
    function consultar(event) { event.preventDefault(); setBusca({ ...filtros }); consulta.recarregar(); }

    if (!podeAcessar) return <div className="alert alert-warning">Pagamentos estão disponíveis para administradores e atendentes.</div>;
    return <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
        <div className="page-header d-flex flex-wrap gap-3 align-items-center justify-content-between mb-4">
            <div><h1 className="fs-3 mb-1">Pagamento</h1><p className="text-secondary mb-0">Consulta de pagamentos e quitações de devedores.</p></div>
            <button type="button" className="btn btn-outline-primary" disabled={consulta.carregando} onClick={consulta.recarregar}>Atualizar</button>
        </div>
        <form data-tour="pagamento-filtros" className="page-card p-3 p-sm-4 mb-4" onSubmit={consultar}>
            <div className="row g-3 align-items-end">
                <div className="col-12 col-sm-6 col-xl-3"><label htmlFor="pagamento-data" className="form-label">Data</label><input id="pagamento-data" name="data" type="date" className="form-control" value={filtros.data} onChange={alterar} /></div>
                <div className="col-12 col-sm-6 col-xl-3"><label htmlFor="pagamento-forma" className="form-label">Forma</label><select id="pagamento-forma" name="forma" className="form-select" value={filtros.forma} onChange={alterar}><option value="">Todas</option>{Object.entries(FORMAS_PAGAMENTO).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></div>
                <div className="col-12 col-sm-6 col-xl-3"><label htmlFor="pagamento-status" className="form-label">Status</label><select id="pagamento-status" name="status" className="form-select" value={filtros.status} onChange={alterar}><option value="">Todos</option><option value="PAGO">Pago</option><option value="PENDENTE">Pendente</option><option value="CANCELADO">Cancelado</option></select></div>
                <div className="col-12 col-sm-6 col-xl-3"><label htmlFor="pagamento-caixa" className="form-label">Número do caixa</label><input id="pagamento-caixa" name="idCaixa" type="number" min="1" step="1" className="form-control" value={filtros.idCaixa} onChange={alterar} placeholder="Todos" /></div>
                <div className="col-12 d-flex flex-wrap gap-2"><button type="submit" className="btn btn-primary" disabled={consulta.carregando}>Consultar</button><button type="button" className="btn btn-light" onClick={() => { let vazios = { data: '', forma: '', status: '', idCaixa: '' }; setFiltros(vazios); setBusca(vazios); }}>Limpar filtros</button></div>
            </div>
            <p className="form-text mb-0 mt-3">Após a quitação, os filtros usam a data, forma e caixa do recebimento. Antes dela, usam os dados do lançamento.</p>
        </form>
        {consulta.erro && <div className="alert alert-danger" role="alert"><p>{consulta.erro}</p><button type="button" className="btn btn-outline-danger" onClick={consulta.recarregar}>Tentar novamente</button></div>}
        <section className="page-card">
            <div className="p-3 p-sm-4 border-bottom"><h2 data-tour="pagamento-lista" className="h6 mb-1">Pagamentos</h2><p className="small text-secondary mb-0">{consulta.dados?.length ?? 0} pagamento(s) listado(s). Até 200 registros mais recentes. Esta tela é somente consulta.</p></div>
            <div className="table-responsive">
                <table className="table align-middle mb-0">
                    <thead className="text-nowrap"><tr><th>Pagamento / pedido</th><th>Cliente</th><th>Lançamento</th><th>Valor</th><th>Forma original</th><th>Status</th><th>Caixa da venda</th><th data-tour="pagamento-quitacao">Quitação</th><th>Forma recebida</th><th>Caixa do recebimento</th><th>Quitado por</th></tr></thead>
                    <tbody>{consulta.carregando ? <tr><td colSpan={11} className="text-secondary text-center p-4" role="status">Carregando pagamentos...</td></tr>
                        : consulta.erro ? <tr><td colSpan={11} className="text-secondary text-center p-4">Consulta indisponível.</td></tr>
                        : !consulta.dados?.length ? <tr><td colSpan={11} className="text-secondary text-center p-4">Nenhum pagamento encontrado.</td></tr>
                        : consulta.dados.map(pg => <tr key={pg.id}>
                            <td>#{pg.id} / #{pg.idPedido}</td><td>{pg.nomeCliente || '—'}</td><td className="text-nowrap">{formatarDataHora(pg.dataHora)}</td><td className="text-nowrap">{formatarValor(pg.valor)}</td>
                            <td>{FORMAS_PAGAMENTO[pg.forma]}</td><td><StatusPagamento status={pg.status} forma={pg.forma} /></td><td>#{pg.idCaixa}</td><td className="text-nowrap">{formatarDataHora(pg.dataQuitacao)}</td>
                            <td>{FORMAS_PAGAMENTO[pg.formaQuitacao || pg.forma]}</td><td>#{pg.idCaixaQuitacao || pg.idCaixa}</td><td>{pg.nomeUsuarioQuitacao || '—'}</td>
                        </tr>)}</tbody>
                </table>
            </div>
        </section>
    </div>;
}

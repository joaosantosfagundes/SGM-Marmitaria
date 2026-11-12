import StatCard from './StatCard.jsx';
import DashboardChart from './DashboardChart.jsx';
import useConsulta from '../pages/pedidos/useConsulta.js';
import { STATUS_PEDIDO, StatusPedido } from '../pages/pedidos/PedidoBadges.jsx';
import { formatarValor } from '../pages/caixa/caixaUtils.js';
import { formatarQuantidade } from '../pages/relatorios/relatorioUtils.js';

function PedidosPorStatus({ contagem }) {
  return (
    <section aria-labelledby="pedidos-por-status">
      <h2 id="pedidos-por-status" className="h5 mb-3">Pedidos de hoje por status</h2>
      <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-5 g-3">
        {Object.entries(STATUS_PEDIDO).map(([status, [rotulo, classe]]) => (
          <div className="col" key={status}>
            <StatCard icon="ti-receipt" title={rotulo} value={contagem[status] ?? 0} tone={classe.replace('text-bg-', '')} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ResumoOperacao({ dados }) {
  const { pedidosHoje, vendasHoje, fiadoPendenteHoje, pedidosEmPreparo, caixa, movimentacao, pedidosRecentes, estoqueAbaixoDoMinimo } = dados;

  return (
    <>
      <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3 mb-3">
        <div className="col">
          <StatCard icon="ti-shopping-cart" title="Pedidos hoje" value={pedidosHoje} />
        </div>
        <div className="col">
          <StatCard icon="ti-cash" title="Vendas hoje" value={formatarValor(vendasHoje)}
            helper={`${formatarValor(fiadoPendenteHoje)} em fiado pendente`} tone="success" />
        </div>
        <div className="col">
          <StatCard icon="ti-chef-hat" title="Em preparo" value={pedidosEmPreparo} tone="warning" />
        </div>
        <div className="col">
          <StatCard icon="ti-wallet" title="Saldo esperado na gaveta" value={caixa ? formatarValor(caixa.saldoEsperadoDinheiro) : '—'}
            helper={caixa ? `Caixa ${caixa.status.toLowerCase()}` : 'Nenhum caixa registrado'} tone="info" />
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-8">
          <section className="page-card">
            <div className="px-4 py-3 border-bottom">
              <h2 className="h5 mb-0">Vendas e despesas dos últimos 7 dias</h2>
            </div>
            <div className="p-3">
              <DashboardChart movimentacao={movimentacao} />
            </div>
          </section>
        </div>

        <div className="col-lg-4">
          <section className="page-card h-100">
            <div className="px-4 py-3 border-bottom">
              <h2 className="h5 mb-0">Pedidos recentes</h2>
            </div>
            {pedidosRecentes.length === 0 && <p className="text-secondary px-4 py-3 mb-0">Nenhum pedido registrado.</p>}
            {pedidosRecentes.length > 0 && <ul className="list-group list-group-flush">
              {pedidosRecentes.map(({ id, nomeCliente, status, valorTotal }) => (
                <li key={id} className="list-group-item px-4 py-3">
                  <div className="d-flex justify-content-between gap-2">
                    <strong>#{id}</strong>
                    <span className="small text-secondary">{formatarValor(valorTotal)}</span>
                  </div>
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <span className="small text-secondary">{nomeCliente ?? '—'}</span>
                    <StatusPedido status={status} />
                  </div>
                </li>
              ))}
            </ul>}
          </section>
        </div>
      </div>

      <section className="page-card">
        <h2 className="h5 px-4 py-3 mb-0 border-bottom">Insumos abaixo do mínimo ({estoqueAbaixoDoMinimo.quantidade})</h2>
        {estoqueAbaixoDoMinimo.quantidade === 0 && <p className="text-secondary px-4 py-3 mb-0">Nenhum insumo abaixo do mínimo.</p>}
        {estoqueAbaixoDoMinimo.quantidade > 0 && <ul className="list-group list-group-flush">
          {estoqueAbaixoDoMinimo.insumos.map(({ id, nome, quantidade, estoqueMinimo, siglaUnidade }) => (
            <li key={id} className="list-group-item d-flex flex-wrap justify-content-between gap-2 px-4 py-3">
              <strong>{nome}</strong>
              <span className="small text-secondary">
                {formatarQuantidade(quantidade)} {siglaUnidade} · mínimo {formatarQuantidade(estoqueMinimo)} {siglaUnidade}
              </span>
            </li>
          ))}
        </ul>}
      </section>
    </>
  );
}

export default function Dashboard() {
  const { dados, carregando, erro, recarregar } = useConsulta('dashboard/resumo', { atualizarAutomaticamente: true });

  return (
    <>
      <h1 className="fs-3 mb-4">Dashboard</h1>
      {carregando && <div className="page-card p-4 text-secondary" role="status">Carregando resumo...</div>}
      {erro && <div className="alert alert-danger" role="alert">
        <p className="mb-2">{erro}</p>
        <button type="button" className="btn btn-outline-danger" onClick={recarregar}>Tentar novamente</button>
      </div>}
      {dados && (dados.pedidosPorStatus
        ? <PedidosPorStatus contagem={dados.pedidosPorStatus} />
        : <ResumoOperacao dados={dados} />)}
    </>
  );
}

import StatCard from "./StatCard";
import DashboardChart from "./DashboardChart";

// TODO: os valores abaixo são mockados. Trocar por chamadas reais
// (ex: GET /api/pedido/resumo-hoje, GET /api/caixa/atual) quando
// RF_F2/F3/F8 estiverem implementados.
export default function Dashboard() {
  return (
    <>
      <div className="mb-4">
        <h1 className="fs-3 mb-1">Dashboard</h1>
        <p className="text-secondary mb-0">Visão geral da marmitaria.</p>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-3 col-md-6">
          <StatCard icon="ti-shopping-cart" title="Pedidos hoje" value="75" helper="+5% no período" />
        </div>
        <div className="col-lg-3 col-md-6">
          <StatCard icon="ti-cash" title="Vendas hoje" value="R$ 357" helper="+8% no período" tone="success" />
        </div>
        <div className="col-lg-3 col-md-6">
          <StatCard icon="ti-chef-hat" title="Em preparo" value="6" helper="Pedidos ativos" tone="warning" />
        </div>
        <div className="col-lg-3 col-md-6">
          <StatCard icon="ti-wallet" title="Caixa" value="R$ 1.280" helper="Aberto" tone="info" />
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-8">
          <section className="page-card">
            <div className="px-4 py-3 border-bottom d-flex justify-content-between align-items-center">
              <h2 className="h5 mb-0">Movimentação</h2>
              <select className="form-select form-select-sm w-auto">
                <option>Esta semana</option>
                <option>Este mês</option>
              </select>
            </div>
            <div className="p-3">
              <DashboardChart />
            </div>
          </section>
        </div>

        <div className="col-lg-4">
          <section className="page-card h-100">
            <div className="px-4 py-3 border-bottom">
              <h2 className="h5 mb-0">Pedidos recentes</h2>
            </div>
            <div className="list-group list-group-flush">
              {[
                ["#1024", "João", "R$ 32,00", "Em preparo"],
                ["#1023", "Maria", "R$ 45,00", "Pronto"],
                ["#1022", "Carlos", "R$ 28,00", "Recebido"],
                ["#1021", "Ana", "R$ 51,00", "Saiu para entrega"],
              ].map(([id, customer, value, status]) => (
                <div key={id} className="list-group-item px-4 py-3">
                  <div className="d-flex justify-content-between">
                    <strong>{id}</strong>
                    <span className="small text-secondary">{value}</span>
                  </div>
                  <div className="small text-secondary">{customer} · {status}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

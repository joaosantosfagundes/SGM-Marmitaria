import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import useConsulta from '../pedidos/useConsulta.js';
import RelatorioVendas from './RelatorioVendas.jsx';
import RelatorioEstoque from './RelatorioEstoque.jsx';
import RelatorioProdutos from './RelatorioProdutos.jsx';
import { formatarDia, periodoHoje } from './relatorioUtils.js';
import './relatorios.scss';

const ABAS = [
    { id: 'vendas', titulo: 'Vendas e pedidos', componente: RelatorioVendas },
    { id: 'estoque', titulo: 'Estoque', componente: RelatorioEstoque },
    { id: 'produtos-mais-vendidos', titulo: 'Produtos mais vendidos', componente: RelatorioProdutos }
];

function ResultadoRelatorio({ aba, periodo }) {
    let { dataInicio, dataFim } = periodo;
    let parametros = new URLSearchParams({ dataInicio, dataFim });
    const { dados, carregando, erro, recarregar } = useConsulta(`relatorio/${aba.id}?${parametros}`);
    const Conteudo = aba.componente;

    return <>
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
            <div>
                <h2 className="h4 mb-1">{aba.titulo}</h2>
                <p className="text-secondary mb-0">Período de {formatarDia(dataInicio)} a {formatarDia(dataFim)} (UTC−3).</p>
            </div>
            <button type="button" className="btn btn-outline-primary relatorio-controles" disabled={!dados || carregando}
                onClick={() => window.print()}>
                <i className="ti ti-printer me-1" aria-hidden="true" />Imprimir
            </button>
        </div>
        {carregando && <p className="text-secondary" role="status">Carregando relatório...</p>}
        {erro && <div className="alert alert-danger" role="alert">
            <p className="mb-2">{erro}</p>
            <button type="button" className="btn btn-outline-danger relatorio-controles" onClick={recarregar}>Tentar novamente</button>
        </div>}
        {dados && <Conteudo dados={dados} />}
    </>;
}

export default function RelatoriosPage() {
    const [abaAtiva, setAbaAtiva] = useState(0);
    const [consulta, setConsulta] = useState(() => ({ ...periodoHoje(), revisao: 0 }));
    const botoes = useRef([]);

    function aplicarPeriodo(event) {
        event.preventDefault();
        let campos = new FormData(event.currentTarget);
        let dataInicio = campos.get('dataInicio');
        let dataFim = campos.get('dataFim');

        if (dataInicio > dataFim) {
            toast.error('A data inicial não pode ser posterior à data final.');
            return;
        }

        setConsulta(atual => ({ dataInicio, dataFim, revisao: atual.revisao + 1 }));
    }

    function navegarAbas(event, indice) {
        let destinos = {
            ArrowRight: (indice + 1) % ABAS.length,
            ArrowLeft: (indice - 1 + ABAS.length) % ABAS.length,
            Home: 0,
            End: ABAS.length - 1
        };
        let destino = destinos[event.key];
        if (destino === undefined) return;

        event.preventDefault();
        setAbaAtiva(destino);
        botoes.current[destino]?.focus();
    }

    return <div className="relatorios-page">
        <header className="relatorio-controles mb-3">
            <h1 className="fs-3 mb-1">Relatórios</h1>
            <p className="text-secondary mb-0">Consulte vendas, estoque e os itens mais vendidos da operação.</p>
        </header>
        <div className="nav nav-tabs relatorio-controles mb-3" role="tablist" aria-label="Relatórios de operação">
            {ABAS.map((aba, indice) => <button key={aba.id} type="button" role="tab"
                className={`nav-link ${abaAtiva === indice ? 'active' : ''}`} id={`aba-relatorio-${aba.id}`}
                aria-selected={abaAtiva === indice} aria-controls={`painel-relatorio-${aba.id}`}
                tabIndex={abaAtiva === indice ? 0 : -1} ref={elemento => { botoes.current[indice] = elemento; }}
                onClick={() => setAbaAtiva(indice)} onKeyDown={event => navegarAbas(event, indice)}>
                {aba.titulo}
            </button>)}
        </div>
        <form className="page-card relatorio-controles p-3 mb-4" onSubmit={aplicarPeriodo}>
            <div className="row g-3 align-items-end">
                <div className="col-12 col-sm-5 col-lg-3">
                    <label className="form-label" htmlFor="relatorio-data-inicio">Data inicial</label>
                    <input className="form-control" type="date" id="relatorio-data-inicio" name="dataInicio"
                        min="1000-01-01" max="9999-12-31" defaultValue={consulta.dataInicio} required />
                </div>
                <div className="col-12 col-sm-5 col-lg-3">
                    <label className="form-label" htmlFor="relatorio-data-fim">Data final</label>
                    <input className="form-control" type="date" id="relatorio-data-fim" name="dataFim"
                        min="1000-01-01" max="9999-12-31" defaultValue={consulta.dataFim} required />
                </div>
                <div className="col-auto"><button type="submit" className="btn btn-primary">Consultar</button></div>
            </div>
        </form>
        {ABAS.map((aba, indice) => <section key={aba.id} role="tabpanel" id={`painel-relatorio-${aba.id}`}
            aria-labelledby={`aba-relatorio-${aba.id}`} tabIndex={0} hidden={abaAtiva !== indice}>
            {abaAtiva === indice && <ResultadoRelatorio key={consulta.revisao} aba={aba} periodo={consulta} />}
        </section>)}
    </div>;
}

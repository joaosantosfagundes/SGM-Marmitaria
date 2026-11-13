import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import useConsulta from '../pedidos/useConsulta.js';
import RelatorioVendas from './RelatorioVendas.jsx';
import RelatorioEstoque from './RelatorioEstoque.jsx';
import RelatorioFinanceiro from './RelatorioFinanceiro.jsx';
import RelatorioProdutos from './RelatorioProdutos.jsx';
import RelatorioDevedores from './RelatorioDevedores.jsx';
import { dataLocal } from '../../lib/dataLocal.js';
import { formatarDia } from './relatorioUtils.js';
import './relatorios.scss';

const ABAS = [
    { id: 'vendas', titulo: 'Vendas e pedidos', componente: RelatorioVendas },
    { id: 'estoque', titulo: 'Estoque', componente: RelatorioEstoque },
    { id: 'financeiro', titulo: 'Financeiro', componente: RelatorioFinanceiro, apenasAdmin: true },
    { id: 'produtos-mais-vendidos', titulo: 'Produtos mais vendidos', componente: RelatorioProdutos },
    { id: 'fiado', titulo: 'Devedores por cliente', componente: RelatorioDevedores }
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
                <p className="text-secondary mb-0">Período de {formatarDia(dataInicio)} a {formatarDia(dataFim)}.</p>
            </div>
            <button data-tour="relatorios-imprimir" type="button" className="btn btn-outline-primary relatorio-controles" disabled={!dados || carregando}
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
    const { usuario } = useAuth();
    const [abaAtiva, setAbaAtiva] = useState(ABAS[0].id);
    const [consulta, setConsulta] = useState(() => {
        const hoje = dataLocal();
        return { dataInicio: `${hoje.slice(0, 7)}-01`, dataFim: hoje, revisao: 0 };
    });
    const botoes = useRef([]);
    const abas = ABAS.filter(aba => !aba.apenasAdmin || usuario?.perfil === 'ADMIN');
    const abaVisivel = abas.some(aba => aba.id === abaAtiva) ? abaAtiva : abas[0].id;

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
            ArrowRight: (indice + 1) % abas.length,
            ArrowLeft: (indice - 1 + abas.length) % abas.length,
            Home: 0,
            End: abas.length - 1
        };
        let destino = destinos[event.key];
        if (destino === undefined) return;

        event.preventDefault();
        setAbaAtiva(abas[destino].id);
        botoes.current[destino]?.focus();
    }

    return <div className="relatorios-page">
        <header className="relatorio-controles mb-3">
            <h1 className="fs-3 mb-1">Relatórios</h1>
            <p className="text-secondary mb-0">Consulte os relatórios da operação por período.</p>
        </header>
        <div data-tour="relatorios-abas" className="nav nav-tabs relatorio-controles mb-3" role="tablist" aria-label="Relatórios de operação">
            {abas.map((aba, indice) => <button key={aba.id} type="button" role="tab"
                className={`nav-link ${abaVisivel === aba.id ? 'active' : ''}`} id={`aba-relatorio-${aba.id}`}
                aria-selected={abaVisivel === aba.id} aria-controls={`painel-relatorio-${aba.id}`}
                tabIndex={abaVisivel === aba.id ? 0 : -1} ref={elemento => { botoes.current[indice] = elemento; }}
                onClick={() => setAbaAtiva(aba.id)} onKeyDown={event => navegarAbas(event, indice)}>
                {aba.titulo}
            </button>)}
        </div>
        <form data-tour="relatorios-periodo" className="page-card relatorio-controles p-3 mb-4" onSubmit={aplicarPeriodo}>
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
        {abas.map(aba => <section key={aba.id} role="tabpanel" id={`painel-relatorio-${aba.id}`}
            aria-labelledby={`aba-relatorio-${aba.id}`} tabIndex={0} hidden={abaVisivel !== aba.id}>
            {abaVisivel === aba.id && <ResultadoRelatorio key={consulta.revisao} aba={aba} periodo={consulta} />}
        </section>)}
    </div>;
}

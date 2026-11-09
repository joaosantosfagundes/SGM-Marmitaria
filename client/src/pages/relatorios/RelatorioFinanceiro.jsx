import { formatarValor } from '../caixa/caixaUtils.js';
import { FORMAS_PAGAMENTO } from '../pedidos/pedidoUtils.js';
import TabelaRelatorio from './TabelaRelatorio.jsx';

export default function RelatorioFinanceiro({ dados }) {
    let { totais, porCategoria, porFormaPagamento, fiadoAReceber } = dados;
    let indicadores = [
        { titulo: 'Entradas', valor: totais.entradas,
            detalhe: `${formatarValor(totais.recebimentosCaixas)} em caixas fechados e ${formatarValor(totais.entradasAvulsas)} em entradas avulsas` },
        { titulo: 'Saídas', valor: totais.saidas },
        { titulo: 'Saldo do período', valor: totais.saldo }
    ];

    return <>
        <p className="text-secondary">
            Vendas pagas e quitações entram no período pela data de fechamento do caixa que recebeu o pagamento.
        </p>
        <div className="row g-3 mb-3 relatorio-indicadores">
            {indicadores.map(indicador => <div className="col-12 col-sm-4" key={indicador.titulo}>
                <div className="page-card p-3 h-100">
                    <div className="small text-secondary">{indicador.titulo}</div>
                    <strong className="fs-5">{formatarValor(indicador.valor)}</strong>
                    {indicador.detalhe && <div className="small text-secondary">{indicador.detalhe}</div>}
                </div>
            </div>)}
        </div>
        <TabelaRelatorio titulo="Lançamentos por categoria" colunas={['Categoria', 'Tipo', 'Total']}>
            {porCategoria.map(({ categoria, tipo, valor }) => <tr key={`${categoria}-${tipo}`}>
                <th scope="row">{categoria}</th>
                <td>{tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}</td>
                <td className="text-nowrap">{formatarValor(valor)}</td>
            </tr>)}
        </TabelaRelatorio>
        <TabelaRelatorio titulo="Recebimentos por forma de pagamento" colunas={['Forma', 'Total recebido']}
            mensagemVazia="Nenhum recebimento de caixa fechado no período.">
            {porFormaPagamento.map(({ forma, valor }) => <tr key={forma}>
                <th scope="row">{FORMAS_PAGAMENTO[forma] || forma}</th>
                <td className="text-nowrap">{formatarValor(valor)}</td>
            </tr>)}
        </TabelaRelatorio>
        <section className="page-card p-3 p-sm-4 mb-3">
            <h3 className="h5 mb-2">Fiado a receber</h3>
            <strong className="fs-5">{formatarValor(fiadoAReceber)}</strong>
            <p className="text-secondary mb-0">Saldo atual dos fiados pendentes, apresentado à parte do saldo do período.</p>
        </section>
    </>;
}

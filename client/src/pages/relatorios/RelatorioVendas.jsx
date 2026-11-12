import { useEffect, useRef } from 'react';
import ApexCharts from 'apexcharts';
import { formatarValor } from '../caixa/caixaUtils.js';
import { FORMAS_PAGAMENTO, TIPOS_ATENDIMENTO } from '../pedidos/pedidoUtils.js';
import { StatusPedido } from '../pedidos/PedidoBadges.jsx';
import { formatarDia, formatarQuantidade } from './relatorioUtils.js';
import TabelaRelatorio from './TabelaRelatorio.jsx';

function GraficoVendas({ porDia }) {
    const elemento = useRef(null);

    useEffect(() => {
        const grafico = new ApexCharts(elemento.current, {
            series: [{ name: 'Total vendido', data: porDia.map(linha => linha.totalVendido) }],
            chart: {
                type: 'bar', height: 240, toolbar: { show: false },
                animations: { enabled: false }, fontFamily: 'Poppins, sans-serif'
            },
            colors: ['#D85A30'],
            dataLabels: { enabled: false },
            xaxis: {
                categories: porDia.map(linha => formatarDia(linha.chave)),
                tickAmount: Math.min(porDia.length, 7),
                labels: { hideOverlappingLabels: true, trim: true }
            },
            yaxis: { min: 0, labels: { formatter: formatarValor } },
            tooltip: { y: { formatter: formatarValor } }
        });

        grafico.render().catch(error => console.error('Não foi possível desenhar o gráfico de vendas.', error));
        return () => grafico.destroy();
    }, [porDia]);

    return <section className="page-card p-3 p-sm-4 mb-3 relatorio-grafico">
        <h3 className="h5 mb-3">Total vendido por dia</h3>
        <div ref={elemento} className="relatorio-grafico-area" />
    </section>;
}

function TabelaVendas({ titulo, coluna, linhas, rotulo, mostrarAReceber = false }) {
    let colunas = [coluna, 'Pedidos válidos', 'Total vendido', 'Cancelados', 'Valor cancelado'];
    if (mostrarAReceber) colunas.push('Vendido, a receber');

    return <TabelaRelatorio titulo={titulo} colunas={colunas}>
        {linhas.map(linha => <tr key={linha.chave}>
            <th scope="row">{rotulo(linha.chave)}</th>
            <td>{formatarQuantidade(linha.quantidadeVendidos)}</td>
            <td className="text-nowrap">{formatarValor(linha.totalVendido)}</td>
            <td>{formatarQuantidade(linha.quantidadeCancelados)}</td>
            <td className="text-nowrap">{formatarValor(linha.totalCancelado)}</td>
            {mostrarAReceber && <td className="text-nowrap">
                {linha.chave === 'FIADO' ? formatarValor(linha.fiadoPendente) : '—'}
            </td>}
        </tr>)}
    </TabelaRelatorio>;
}

export default function RelatorioVendas({ dados }) {
    let { resumo, porDia, porFormaPagamento, porTipoAtendimento, porStatus } = dados;
    let indicadores = [
        { titulo: 'Pedidos válidos', valor: formatarQuantidade(resumo.quantidadeVendidos) },
        { titulo: 'Total vendido', valor: formatarValor(resumo.totalVendido) },
        { titulo: 'Ticket médio', valor: formatarValor(resumo.ticketMedio) },
        { titulo: 'A receber', valor: formatarValor(resumo.fiadoPendente), detalhe: 'Vendido para clientes devedores' },
        { titulo: 'Pedidos cancelados', valor: formatarQuantidade(resumo.quantidadeCancelados), detalhe: `${formatarValor(resumo.totalCancelado)} em pedidos cancelados` }
    ];

    return <>
        <p className="text-secondary">
            As vendas são apuradas pela data do pedido. O Financeiro consolida os recebimentos pela data de fechamento do caixa.
        </p>
        <div className="row g-3 mb-3 relatorio-indicadores">
            {indicadores.map(indicador => <div className="col-12 col-sm-6 col-lg-4 col-xl" key={indicador.titulo}>
                <div className="page-card p-3 h-100">
                    <div className="small text-secondary">{indicador.titulo}</div>
                    <strong className="fs-5">{indicador.valor}</strong>
                    {indicador.detalhe && <div className="small text-secondary">{indicador.detalhe}</div>}
                </div>
            </div>)}
        </div>
        {porDia.length > 0 && <GraficoVendas porDia={porDia} />}
        <TabelaVendas titulo="Por dia do pedido" coluna="Dia" linhas={porDia} rotulo={formatarDia} />
        <TabelaVendas titulo="Por forma de pagamento" coluna="Forma original" linhas={porFormaPagamento}
            rotulo={forma => FORMAS_PAGAMENTO[forma] || 'Sem pagamento registrado'} mostrarAReceber />
        <TabelaVendas titulo="Por tipo de atendimento" coluna="Atendimento" linhas={porTipoAtendimento}
            rotulo={tipo => TIPOS_ATENDIMENTO[tipo] || tipo} />
        <TabelaVendas titulo="Por status do pedido" coluna="Status" linhas={porStatus}
            rotulo={status => <StatusPedido status={status} />} />
    </>;
}

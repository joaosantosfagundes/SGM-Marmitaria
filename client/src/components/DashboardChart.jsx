import { useEffect, useRef } from 'react';
import ApexCharts from 'apexcharts';
import { formatarValor } from '../pages/caixa/caixaUtils.js';
import { formatarDia } from '../pages/relatorios/relatorioUtils.js';

export default function DashboardChart({ movimentacao }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    const chart = new ApexCharts(ref.current, {
      series: [
        { name: 'Vendas', data: movimentacao.map(dia => dia.vendas) },
        { name: 'Despesas', data: movimentacao.map(dia => dia.despesas) },
      ],
      chart: {
        type: "area",
        height: 280,
        toolbar: { show: false },
        animations: { enabled: false },
        fontFamily: "Poppins, sans-serif",
      },
      colors: ["#D85A30", "#198754"],
      stroke: { curve: "smooth", width: 2 },
      dataLabels: { enabled: false },
      grid: { borderColor: "#e5e5e5" },
      xaxis: {
        categories: movimentacao.map(dia => formatarDia(dia.data).slice(0, 5)),
        labels: { hideOverlappingLabels: true },
      },
      yaxis: { min: 0, labels: { formatter: formatarValor } },
      tooltip: { y: { formatter: formatarValor } },
      legend: { position: "top" },
    });

    chart.render().catch(error => console.error('Não foi possível desenhar o gráfico do Dashboard.', error));
    return () => chart.destroy();
  }, [movimentacao]);

  return <div ref={ref} className="chart-box" />;
}

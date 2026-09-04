import { useEffect, useRef } from "react";
import ApexCharts from "apexcharts";

export default function DashboardChart() {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    const chart = new ApexCharts(ref.current, {
      series: [
        { name: "Vendas", data: [32, 45, 38, 52, 44, 61, 55] },
        { name: "Despesas", data: [18, 24, 21, 29, 26, 31, 28] },
      ],
      chart: {
        type: "area",
        height: 280,
        toolbar: { show: false },
        fontFamily: "Poppins, sans-serif",
      },
      colors: ["#D85A30", "#198754"],
      stroke: { curve: "smooth", width: 2 },
      dataLabels: { enabled: false },
      grid: { borderColor: "#e5e5e5" },
      xaxis: {
        categories: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
      },
      legend: { position: "top" },
    });

    chart.render();
    return () => chart.destroy();
  }, []);

  return <div ref={ref} className="chart-box" />;
}

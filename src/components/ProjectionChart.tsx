"use client";

import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip
);

interface ProjectionChartProps {
  data: { week: number; weight: number }[];
  goalWeight?: number;
}

export default function ProjectionChart({
  data,
  goalWeight,
}: ProjectionChartProps) {
  const chartRef = useRef(null);

  const chartData = {
    labels: data.map((d) => (d.week === 0 ? "Now" : `Wk ${d.week}`)),
    datasets: [
      {
        data: data.map((d) => d.weight),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: data.map((_, i) =>
          i === 0 || i === data.length - 1 ? 6 : 0
        ),
        pointBackgroundColor: "#10b981",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        borderWidth: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: "easeOutQuart" as const,
    },
    plugins: {
      tooltip: {
        backgroundColor: "#111",
        titleFont: { size: 13 },
        bodyFont: { size: 14, weight: "bold" as const },
        padding: 12,
        cornerRadius: 12,
        displayColors: false,
        callbacks: {
          label: (ctx: { parsed: { y: number | null } }) =>
            `${ctx.parsed.y ?? 0} lbs`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 11 },
          color: "#9ca3af",
          maxTicksLimit: 8,
        },
        border: { display: false },
      },
      y: {
        grid: {
          color: "rgba(0,0,0,0.04)",
        },
        ticks: {
          font: { size: 11 },
          color: "#9ca3af",
          callback: (v: string | number) => `${v} lbs`,
        },
        border: { display: false },
      },
    },
  };

  return (
    <div className="h-64 w-full">
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
}

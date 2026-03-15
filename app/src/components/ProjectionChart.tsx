"use client";

import { useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  annotationPlugin
);

interface GoalMarker {
  weight: number;
  label: string;
  color: string;
}

interface ProjectionChartProps {
  data: { week: number; weight: number }[];
  goalWeight?: number;
  startDate?: Date;
  goalMarkers?: GoalMarker[];
  sprintWeek?: number;
}

function weekToMonthLabel(week: number, startDate?: Date): string {
  if (week === 0) return "Now";
  if (!startDate) return `Wk ${week}`;
  const d = new Date(startDate);
  d.setDate(d.getDate() + week * 7);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default function ProjectionChart({
  data,
  goalMarkers,
  startDate,
  sprintWeek = 12,
}: ProjectionChartProps) {
  const chartRef = useRef(null);

  // Show labels every 4 weeks to avoid crowding
  const labels = data.map((d, i) => {
    if (d.week === 0) return "Now";
    if (d.week % 4 === 0 || i === data.length - 1) {
      return weekToMonthLabel(d.week, startDate);
    }
    return "";
  });

  // Build annotation lines for goal markers and sprint marker
  const annotations: Record<string, object> = {};

  if (goalMarkers) {
    for (const marker of goalMarkers) {
      annotations[`goal_${marker.weight}`] = {
        type: "line" as const,
        yMin: marker.weight,
        yMax: marker.weight,
        borderColor: marker.color,
        borderWidth: 1,
        borderDash: [6, 4],
        label: {
          display: true,
          content: `${marker.label} (${marker.weight} lbs)`,
          position: "end" as const,
          backgroundColor: "rgba(0,0,0,0.7)",
          color: marker.color,
          font: { size: 11, weight: "bold" as const },
          padding: 4,
        },
      };
    }
  }

  // Sprint marker at week 12
  if (sprintWeek && sprintWeek < data.length) {
    const sprintWeight = data.find((d) => d.week === sprintWeek)?.weight;
    annotations["sprint"] = {
      type: "line" as const,
      xMin: sprintWeek,
      xMax: sprintWeek,
      borderColor: "rgba(99, 102, 241, 0.5)",
      borderWidth: 2,
      borderDash: [4, 4],
      label: {
        display: true,
        content: `12 weeks (${sprintWeight} lbs)`,
        position: "start" as const,
        backgroundColor: "rgba(99, 102, 241, 0.15)",
        color: "#818cf8",
        font: { size: 11 },
        padding: 4,
      },
    };
  }

  const chartData = {
    labels,
    datasets: [
      {
        data: data.map((d) => d.weight),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.08)",
        fill: true,
        tension: 0.4,
        pointRadius: data.map((_, i) =>
          i === 0 || i === data.length - 1 ? 6 : 0
        ),
        pointHoverRadius: 6,
        pointHitRadius: 20,
        pointBackgroundColor: "#10b981",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointHoverBackgroundColor: "#10b981",
        pointHoverBorderColor: "#fff",
        pointHoverBorderWidth: 2,
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
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    hover: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      tooltip: {
        enabled: true,
        mode: "index" as const,
        intersect: false,
        backgroundColor: "rgba(0,0,0,0.85)",
        titleFont: { size: 13 },
        bodyFont: { size: 16, weight: "bold" as const },
        padding: 14,
        cornerRadius: 12,
        displayColors: false,
        callbacks: {
          title: (items: { dataIndex: number }[]) => {
            const idx = items[0]?.dataIndex ?? 0;
            const week = data[idx]?.week ?? 0;
            if (week === 0) return "Now";
            const dateStr = weekToMonthLabel(week, startDate);
            return `Week ${week} — ${dateStr}`;
          },
          label: (ctx: { parsed: { y: number | null } }) =>
            `${ctx.parsed.y ?? 0} lbs`,
          afterLabel: (ctx: { dataIndex: number }) => {
            const week = data[ctx.dataIndex]?.week ?? 0;
            if (week === 0 || !startDate) return "";
            const d = new Date(startDate);
            d.setDate(d.getDate() + week * 7);
            return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
          },
        },
      },
      annotation: {
        annotations,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 11 },
          color: "#9ca3af",
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
        border: { display: false },
      },
      y: {
        grid: {
          color: "rgba(255,255,255,0.04)",
        },
        ticks: {
          font: { size: 11 },
          color: "#9ca3af",
          callback: (v: string | number) => `${v}`,
        },
        border: { display: false },
      },
    },
  };

  return (
    <div className="h-72 w-full">
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
}

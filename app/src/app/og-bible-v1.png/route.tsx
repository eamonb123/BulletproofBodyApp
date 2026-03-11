import { ImageResponse } from "next/og";

export const runtime = "edge";

// Option 1: Logo grid — restaurant names as colorful branded pills
export async function GET() {
  const restaurants = [
    { name: "McDonald's", bg: "#DA291C", color: "#FFC72C" },
    { name: "Chipotle", bg: "#441500", color: "#FFFFFF" },
    { name: "Chick-fil-A", bg: "#E51636", color: "#FFFFFF" },
    { name: "Subway", bg: "#008C15", color: "#FFC600" },
    { name: "Taco Bell", bg: "#702082", color: "#FFFFFF" },
    { name: "Wendy's", bg: "#E2203D", color: "#FFFFFF" },
    { name: "Panda Express", bg: "#D12421", color: "#FFFFFF" },
    { name: "CAVA", bg: "#2D5F2B", color: "#FFFFFF" },
    { name: "Panera", bg: "#4A7C2E", color: "#FFFFFF" },
    { name: "Pizza Hut", bg: "#EE3A23", color: "#FFFFFF" },
    { name: "Popeyes", bg: "#F15A22", color: "#FFFFFF" },
    { name: "KFC", bg: "#B40000", color: "#FFFFFF" },
    { name: "Dunkin'", bg: "#FF671F", color: "#4B1A53" },
    { name: "In-N-Out", bg: "#FFD700", color: "#B22222" },
    { name: "Burger King", bg: "#FF8732", color: "#502314" },
    { name: "Outback", bg: "#8B4513", color: "#FFD700" },
    { name: "Olive Garden", bg: "#5C4033", color: "#C5A55A" },
    { name: "Denny's", bg: "#FFC425", color: "#1C3A6B" },
    { name: "Sweetgreen", bg: "#000000", color: "#4CAF50" },
    { name: "Sonic", bg: "#003478", color: "#FFD700" },
  ];

  const row1 = restaurants.slice(0, 10);
  const row2 = restaurants.slice(10, 20);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#000000",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "40px 50px",
        }}
      >
        {/* Row 1 */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "14px", flexWrap: "wrap", justifyContent: "center" }}>
          {row1.map((r) => (
            <div
              key={r.name}
              style={{
                background: r.bg,
                borderRadius: "14px",
                padding: "14px 22px",
                color: r.color,
                fontSize: "22px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {r.name}
            </div>
          ))}
        </div>

        {/* Row 2 */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "40px", flexWrap: "wrap", justifyContent: "center" }}>
          {row2.map((r) => (
            <div
              key={r.name}
              style={{
                background: r.bg,
                borderRadius: "14px",
                padding: "14px 22px",
                color: r.color,
                fontSize: "22px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {r.name}
            </div>
          ))}
        </div>

        {/* CTA button */}
        <div
          style={{
            background: "#10b981",
            borderRadius: "50px",
            padding: "16px 48px",
            color: "#000000",
            fontSize: "24px",
            fontWeight: 700,
          }}
        >
          Show me how.
        </div>

        {/* Subtle tagline */}
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "16px", marginTop: "16px" }}>
          Takes 30 seconds. No sign-up required.
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

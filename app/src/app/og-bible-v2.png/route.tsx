import { ImageResponse } from "next/og";

export const runtime = "edge";

// Option 2: Swap side-by-side — the "aha moment" preview
export async function GET() {
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
          padding: "40px 60px",
        }}
      >
        {/* Restaurant label */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "30px" }}>
          <div style={{
            background: "#441500",
            borderRadius: "10px",
            padding: "8px 16px",
            color: "#FFFFFF",
            fontSize: "18px",
            fontWeight: 700,
          }}>
            Chipotle
          </div>
          <div style={{
            background: "#DA291C",
            borderRadius: "10px",
            padding: "8px 16px",
            color: "#FFC72C",
            fontSize: "18px",
            fontWeight: 700,
          }}>
            McDonald's
          </div>
          <div style={{
            background: "#E51636",
            borderRadius: "10px",
            padding: "8px 16px",
            color: "#FFFFFF",
            fontSize: "18px",
            fontWeight: 700,
          }}>
            Chick-fil-A
          </div>
          <div style={{
            background: "#702082",
            borderRadius: "10px",
            padding: "8px 16px",
            color: "#FFFFFF",
            fontSize: "18px",
            fontWeight: 700,
          }}>
            Taco Bell
          </div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "18px", fontWeight: 600 }}>
            + 20 more
          </div>
        </div>

        {/* Swap comparison */}
        <div style={{ display: "flex", alignItems: "center", gap: "40px", marginBottom: "30px" }}>
          {/* Original */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "rgba(239,68,68,0.08)",
            border: "2px solid rgba(239,68,68,0.25)",
            borderRadius: "24px",
            padding: "30px 50px",
          }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "18px", marginBottom: "8px" }}>Your current order</div>
            <div style={{ color: "#fca5a5", fontSize: "72px", fontWeight: 800, lineHeight: 1 }}>1,130</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "20px", marginTop: "4px" }}>calories</div>
          </div>

          {/* Arrow */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
          }}>
            <div style={{ color: "#10b981", fontSize: "48px", fontWeight: 800 }}>→</div>
          </div>

          {/* Swap */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "rgba(34,197,94,0.08)",
            border: "2px solid rgba(34,197,94,0.25)",
            borderRadius: "24px",
            padding: "30px 50px",
          }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "18px", marginBottom: "8px" }}>The smarter order</div>
            <div style={{ color: "#86efac", fontSize: "72px", fontWeight: 800, lineHeight: 1 }}>470</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "20px", marginTop: "4px" }}>calories</div>
          </div>
        </div>

        {/* Savings banner */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(16,185,129,0.12)",
          border: "1px solid rgba(16,185,129,0.25)",
          borderRadius: "50px",
          padding: "12px 32px",
        }}>
          <div style={{ color: "#10b981", fontSize: "24px", fontWeight: 700 }}>
            660 calories saved — same restaurant, same vibe
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

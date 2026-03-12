import { ImageResponse } from "next/og";

export const runtime = "edge";

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
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
          fontFamily: "system-ui, sans-serif",
          padding: "60px",
        }}
      >
        {/* Swap visual */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "32px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              background: "rgba(239,68,68,0.15)",
              border: "2px solid rgba(239,68,68,0.3)",
              borderRadius: "16px",
              padding: "16px 28px",
              color: "#fca5a5",
              fontSize: "22px",
            }}
          >
            320 cal
          </div>
          <div
            style={{
              fontSize: "36px",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            &rarr;
          </div>
          <div
            style={{
              background: "rgba(34,197,94,0.15)",
              border: "2px solid rgba(34,197,94,0.3)",
              borderRadius: "16px",
              padding: "16px 28px",
              color: "#86efac",
              fontSize: "22px",
            }}
          >
            140 cal
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "52px",
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.15,
            marginBottom: "24px",
            maxWidth: "900px",
          }}
        >
          Lose Fat Without Giving Up Your Favorite Snacks
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "26px",
            color: "rgba(255,255,255,0.7)",
            textAlign: "center",
            maxWidth: "700px",
            lineHeight: 1.4,
          }}
        >
          See the swap. Same craving, no prep, already packaged.
        </div>

        {/* Bottom brand */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "#22c55e",
            }}
          />
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "20px" }}>
            bulletproofbody.ai
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

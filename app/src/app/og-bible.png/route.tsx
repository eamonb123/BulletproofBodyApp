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
        {/* Restaurant logos row */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            marginBottom: "40px",
            opacity: 0.6,
          }}
        >
          {["Chipotle", "McDonald's", "Chick-fil-A", "Subway", "Panda Express", "Wendy's"].map(
            (name) => (
              <div
                key={name}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  padding: "10px 20px",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "18px",
                }}
              >
                {name}
              </div>
            )
          )}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "56px",
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.15,
            marginBottom: "24px",
            maxWidth: "900px",
          }}
        >
          Lose Your Next 10 lbs Without Giving Up DoorDash
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
          Pick what you normally order. We'll show you exactly where the fat is hiding.
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

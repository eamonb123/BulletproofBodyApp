"use client";

import { useEffect } from "react";

const calendlyUrl = "https://calendly.com/eamon-barkhordarian/connect-time-clone";

export default function BookCallPage() {
  useEffect(() => {
    const existing = document.querySelector('script[src*="calendly.com/assets/external/widget.js"]');
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Back button */}
      <div className="px-4 pt-6">
        <a
          href="/concierge"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </a>
      </div>

      {/* Calendly embed */}
      <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-8">
        <div
          className="calendly-inline-widget rounded-2xl overflow-hidden"
          data-url={`${calendlyUrl}?hide_gdpr_banner=1&background_color=0a0a0a&text_color=e4e4e7&primary_color=10b981`}
          style={{ minWidth: 320, height: 700 }}
        />
      </div>
    </div>
  );
}

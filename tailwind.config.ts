import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: ["var(--font-display)", "Georgia", "serif"],
        serif: ["Georgia", "'Times New Roman'", "ui-serif", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        smc: {
          // Canvas / surfaces
          canvas: "#08152C",
          canvasDeep: "#050E20",
          surface: "#0E2147",
          surfaceRaised: "#142A56",
          surfaceMuted: "#0B1B3B",
          // Lines
          line: "rgba(245, 241, 232, 0.07)",
          lineStrong: "rgba(245, 241, 232, 0.14)",
          lineGold: "rgba(212, 175, 92, 0.22)",
          lineGoldStrong: "rgba(212, 175, 92, 0.42)",
          // Cream text
          cream: "#F5F1E8",
          creamMuted: "rgba(245, 241, 232, 0.72)",
          creamFaint: "rgba(245, 241, 232, 0.48)",
          creamDim: "rgba(245, 241, 232, 0.28)",
          // Gold
          gold: "#D4AF5C",
          goldBright: "#E8C575",
          goldDeep: "#A98425",
          goldSoft: "rgba(212, 175, 92, 0.12)",
          goldGlow: "rgba(212, 175, 92, 0.28)",
          // Heritage navy (used in shield + buttons)
          brand: "#0B1F3A",
          brandDeep: "#071632",
          // Status colors
          confHigh: "#7AD7A5",
          confMed: "#D4AF5C",
          confLow: "#E8B86B",
          confEsc: "#E58A7E",
          // Legacy aliases retained for compatibility
          ink: "#0F172A",
          steel: "#1F2937",
          slate: "#334155",
          fog: "#F8FAFC",
          brandSoft: "#1B355C",
          goldSoftHex: "#F3E8C9",
          accent: "#D4AF5C",
          accentSoft: "#F3E8C9",
        },
      },
      boxShadow: {
        panel: "0 1px 0 rgba(212,175,92,0.06), 0 24px 60px -20px rgba(0,0,0,0.5)",
        panelHover:
          "0 1px 0 rgba(212,175,92,0.10), 0 30px 70px -20px rgba(0,0,0,0.6)",
        innerGold: "inset 0 1px 0 rgba(212,175,92,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;

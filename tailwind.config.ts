import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        serif: ["Georgia", "'Times New Roman'", "ui-serif", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        smc: {
          ink: "#0F172A",
          steel: "#1F2937",
          slate: "#334155",
          fog: "#F8FAFC",
          line: "#E2E8F0",
          brand: "#0B1F3A",
          brandDeep: "#071632",
          brandSoft: "#1B355C",
          gold: "#C9A23E",
          goldDeep: "#A98425",
          goldSoft: "#F3E8C9",
          cream: "#F5F1E8",
          accent: "#C9A23E",
          accentSoft: "#F3E8C9",
        },
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

// Brand tokens read from the live cybersecinfo.com theme so GRC Audit looks like part of the
// same site: navy-black page, gray-900 cards, cyan accents, Orbitron display type + Roboto body.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a1a", // page background (cybersecinfo.com body)
        panel: "#111827", // cards
        panel2: "#0e1022", // subtle section backgrounds / header
        line: "#1f2937", // card borders
        accent: {
          DEFAULT: "#22d3ee", // headings, active nav, highlights
          strong: "#06b6d4", // primary buttons
          deep: "#0891b2", // glow tail
        },
        // The brand's neutrals are Tailwind's gray scale; map the app's slate-* classes onto it.
        slate: colors.gray,
      },
      fontFamily: {
        sans: ["Roboto", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Arial", "sans-serif"],
        display: ["Orbitron", "Roboto", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        // --cyan-glow from cybersecinfo.com
        glow: "0 0 5px #06b6d4, 0 0 10px #06b6d4, 0 0 20px #06b6d4, 0 0 40px #0891b2",
      },
    },
  },
  plugins: [],
};

export default config;

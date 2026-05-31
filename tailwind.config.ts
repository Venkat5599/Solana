import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        solana: {
          purple: "#9945FF",
          green: "#14F195",
          dark: "#0a0a0f",
          card: "#13131a",
          border: "#1e1e2e",
          muted: "#8b8b9e",
        },
      },
      backgroundImage: {
        "solana-gradient": "linear-gradient(135deg, #9945FF 0%, #14F195 100%)",
        "card-gradient": "linear-gradient(135deg, rgba(153,69,255,0.08) 0%, rgba(20,241,149,0.04) 100%)",
        "glow-purple": "radial-gradient(ellipse at top left, rgba(153,69,255,0.15) 0%, transparent 60%)",
        "glow-green": "radial-gradient(ellipse at bottom right, rgba(20,241,149,0.10) 0%, transparent 60%)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 2s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      boxShadow: {
        "glow-purple": "0 0 40px rgba(153,69,255,0.3)",
        "glow-green": "0 0 40px rgba(20,241,149,0.2)",
        "card": "0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
      },
    },
  },
  plugins: [],
};

export default config;

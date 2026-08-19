import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // shadcn/ui semantic tokens — wired to the CSS variables in globals.css.
        // Keep these so every shadcn component (Button, Card, Input, Tabs...)
        // continues to work out of the box.
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // Ajo brand tokens — used on the dark auth brand panel and the
        // rotation-ring signature graphic.
        ink: "#0A1022",
        "ink-surface": "#121B33",
        "ink-surface-2": "#1B2745",
        gold: { DEFAULT: "#D4A64A", soft: "#E8C878" },
        "ajo-success": "#4FAE7C",
        "ajo-danger": "#E2685A",
        paper: "#F7F5F0",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "ring-sweep": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "node-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        "ring-sweep": "ring-sweep 18s linear infinite",
        "node-pulse": "node-pulse 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

// Design tokens for the "Elysia" home decor brand.
// Base neutral is now white/near-white (changed from the original warm
// cream/beige "bone" tone per explicit brand direction) — warmth now
// comes from the brass/clay/sage accent colors instead of the background
// itself. Token names (ink/bone/brass/clay/sage/charcoal) are unchanged
// so no component className needed to change — only the hex values here.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#1F2E28",
          50: "#F2F5F3",
          100: "#DDE6E1",
          300: "#8FA79C",
          500: "#3F544C",
          700: "#26362F",
          900: "#161F1B",
        },
        bone: {
          DEFAULT: "#FFFFFF", // was #F3EEE4 (warm beige) — now white per explicit request
          100: "#FFFFFF",
          200: "#F4F4F2", // subtle near-white for card/section contrast against pure-white body
        },
        brass: {
          DEFAULT: "#B08D57",
          400: "#C4A374",
          600: "#8F6E3F",
        },
        clay: {
          DEFAULT: "#A85C42",
        },
        sage: {
          DEFAULT: "#8A9A82",
          100: "#E4E9E1",
          600: "#5F6E58",
        },
        charcoal: "#26221D",

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
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-manrope)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        none: "0px",
        sm: "calc(var(--radius) - 4px)",
        DEFAULT: "4px",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
      },
      boxShadow: {
        card: "0 1px 2px rgba(38,34,29,0.06), 0 8px 24px rgba(38,34,29,0.06)",
      },
      backgroundImage: {
        jali: "url('/patterns/jali.svg')",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
export default config;

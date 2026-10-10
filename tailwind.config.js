/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          0: "#05060a",
          50: "#0a0c14",
          100: "#0d0f1a",
          200: "#121526",
          300: "#191d33",
          400: "#232842",
          500: "#2e3454",
        },
        accent: {
          violet: "#8b5cf6",
          violetSoft: "#a78bfa",
          cyan: "#22d3ee",
          blue: "#3b82f6",
          pink: "#f472b6",
        },
        success: "#34d399",
        warning: "#fbbf24",
        danger: "#f87171",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(139,92,246,0.15), 0 8px 24px -8px rgba(139,92,246,0.35)",
        glowCyan: "0 0 0 1px rgba(34,211,238,0.15), 0 8px 24px -8px rgba(34,211,238,0.35)",
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 12px 32px -16px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
        "radial-fade": "radial-gradient(60% 50% at 50% 0%, rgba(139,92,246,0.18) 0%, rgba(5,6,10,0) 70%)",
      },
      backgroundSize: {
        grid: "28px 28px",
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease both",
        shimmer: "shimmer 2.2s linear infinite",
        "pulse-glow": "pulseGlow 2.4s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
}

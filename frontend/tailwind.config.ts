import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Islamic-themed color palette
        islamic: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
        gold: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        slate: {
          850: "#1e293b",
          950: "#020617",
        },
      },
      fontFamily: {
        arabic: ["'Amiri', 'Traditional Arabic', serif"],
      },
      boxShadow: {
        "islamic": "0 4px 14px 0 rgba(6, 95, 70, 0.3)",
        "islamic-lg": "0 10px 25px 0 rgba(6, 95, 70, 0.4)",
        "gold": "0 4px 14px 0 rgba(180, 83, 9, 0.3)",
        "card": "0 2px 8px -2px rgba(0, 0, 0, 0.3), 0 4px 12px -4px rgba(0, 0, 0, 0.2)",
        "card-hover": "0 8px 24px -4px rgba(0, 0, 0, 0.4), 0 12px 32px -8px rgba(0, 0, 0, 0.3)",
      },
      backgroundImage: {
        "gradient-islamic": "linear-gradient(135deg, #065f46 0%, #059669 50%, #047857 100%)",
        "gradient-gold": "linear-gradient(135deg, #b45309 0%, #f59e0b 50%, #d97706 100%)",
        "gradient-dark": "linear-gradient(180deg, #0f172a 0%, #020617 100%)",
        "gradient-card": "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
        "gradient-mesh": "radial-gradient(at 40% 20%, rgba(6, 95, 70, 0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(180, 83, 9, 0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(6, 95, 70, 0.1) 0px, transparent 50%)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "shimmer": "shimmer 2s infinite",
        "pulse-slow": "pulse 3s infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;

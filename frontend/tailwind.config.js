/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Cabinet Grotesk'", "'Syne'", "sans-serif"],
        body:    ["'Satoshi'", "'DM Sans'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        night:  { DEFAULT: "#070D18", 50: "#0D1525", 100: "#121E30", 200: "#1A2A42", 300: "#223459" },
        jade:   { DEFAULT: "#10B981", light: "#34D399", dark: "#059669" },
        amber:  { DEFAULT: "#F59E0B", light: "#FCD34D", dark: "#B45309" },
        rose:   { DEFAULT: "#F43F5E", light: "#FB7185", dark: "#BE123C" },
        slate:  { DEFAULT: "#94A3B8", dark: "#475569", light: "#CBD5E1" },
      },
      animation: {
        "fade-up":    "fadeUp 0.4s ease-out both",
        "fade-in":    "fadeIn 0.25s ease-out both",
        "slide-in":   "slideIn 0.3s ease-out both",
        "float":      "float 4s ease-in-out infinite",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
        "shimmer":    "shimmer 2.5s linear infinite",
      },
      keyframes: {
        fadeUp:    { "0%":{opacity:0,transform:"translateY(16px)"},     "100%":{opacity:1,transform:"translateY(0)"}     },
        fadeIn:    { "0%":{opacity:0},                                    "100%":{opacity:1}                              },
        slideIn:   { "0%":{opacity:0,transform:"translateX(-16px)"},    "100%":{opacity:1,transform:"translateX(0)"}    },
        float:     { "0%,100%":{transform:"translateY(0)"},              "50%":{transform:"translateY(-8px)"}            },
        pulseSoft: { "0%,100%":{opacity:1},                              "50%":{opacity:0.6}                             },
        shimmer:   { "0%":{backgroundPosition:"-200% 0"},               "100%":{backgroundPosition:"200% 0"}            },
      },
      boxShadow: {
        "glow-jade":  "0 0 24px rgba(16,185,129,0.35)",
        "glow-amber": "0 0 24px rgba(245,158,11,0.30)",
        "glow-rose":  "0 0 24px rgba(244,63,94,0.30)",
        "card":       "0 4px 32px rgba(0,0,0,0.45)",
        "card-lg":    "0 8px 48px rgba(0,0,0,0.55)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ],
};
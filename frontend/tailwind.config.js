/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Roboto", "system-ui", "sans-serif"],
        display: ["Inter", "Roboto", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#E8F0FE",
          100: "#C6DAFF",
          200: "#A0C0FF",
          300: "#72A0F5",
          400: "#4285F4",
          500: "#1A73E8",
          600: "#1558C0",
          700: "#11409A",
          800: "#0E2C6B",
          900: "#0B1E4A",
        },
        success: "#34A853",
        warning: "#FBBC05",
        error: "#EA4335",
        neutral: "#5F6368",
        surface: {
          50: "#F8F9FA",
          100: "#F1F3F4",
          200: "#E8EAED",
          300: "#DADCE0",
        },
      },
      spacing: {
        "page": "var(--page-spacing, 1.5rem)",
      },
      boxShadow: {
        card: "0 8px 30px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        stellar: {
          primary: "#1A73E8",
          "primary-content": "#f6f7fb",
          secondary: "#34A853",
          accent: "#34d399",
          neutral: "#5F6368",
          "base-100": "#ffffff",
          "base-200": "#F8F9FA",
          "base-300": "#E8EAED",
          info: "#1A73E8",
          success: "#22c55e",
          warning: "#f97316",
          error: "#ef4444",
        },
      },
      "corporate",
      "dark",
    ],
    logs: false,
  },
};

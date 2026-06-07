/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{ts,tsx}",
    "../web/index.html",
    "../web/src/**/*.{ts,tsx}",
    "../host-desktop/index.html",
    "../host-desktop/src/**/*.{ts,tsx}",
    "../host-mobile/index.html",
    "../host-mobile/src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        'surface-solid': "var(--surface-solid)",
        text: "var(--text)",
        accent: "var(--accent)",
        danger: "var(--danger)",
        secondary: "var(--secondary)",
        success: "var(--success)",
      },
      fontFamily: {
        heading: ['Cinzel', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderColor: {
        DEFAULT: "var(--border)",
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.3s ease-out forwards',
        'shimmer': 'shimmer 3s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}

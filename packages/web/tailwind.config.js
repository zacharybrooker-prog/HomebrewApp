/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../ui/src/**/*.{js,ts,jsx,tsx}",
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

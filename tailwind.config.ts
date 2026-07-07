import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-public-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "var(--font-public-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

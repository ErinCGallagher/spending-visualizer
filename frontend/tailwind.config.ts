import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        warning: "#ea580c", // orange-600 — used for cautionary inline text
        "brand-primary": "#064E3B",   // emerald-800 — primary accent
        "brand-secondary": "#053d2f", // darker hover state for brand-primary
      },
    },
  },
  plugins: [],
};

export default config;

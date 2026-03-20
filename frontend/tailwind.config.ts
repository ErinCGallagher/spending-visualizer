import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        warning: "#ea580c", // orange-600 — used for cautionary inline text
      },
    },
  },
  plugins: [],
};

export default config;

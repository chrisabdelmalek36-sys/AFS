import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        platinum: "#7c3aed",
        gold: "#d97706",
        silver: "#64748b",
      },
    },
  },
  plugins: [],
} satisfies Config;

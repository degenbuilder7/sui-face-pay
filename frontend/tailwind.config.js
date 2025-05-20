import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // backgroundImage: {
      //   "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      //   "gradient-conic":
      //     "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      // },
      spacing: {
        1.25: "0.3125rem",
        1.6: "0.4rem",
        4.5: "1.125rem",
        5.5: "1.375rem",
        7.5: "1.875rem",
        9: "2.25rem",
        10.5: "2.625rem",
        12.5: "3.125rem",
        13: "3.25rem",
        13.5: "3.375rem",
        15: "3.75rem",
        17: "4.25rem",
        18: "4.5rem",
        18.75: "4.6875rem",
        19: "4.75rem",
        19.5: "4.875rem",
        22: "5.5rem",
        25: "6.25rem",
        26: "6.5rem",
        27: "6.75rem",
        28: "7rem",
        30: "7.5rem",
        31: "7.75rem",
        32: "8rem",
        32.5: "8.125rem",
        44: "11rem",
        51: "12.75rem",
        52: "13rem",
        56: "14rem",
        65: "16.25rem",
        83.5: "20.875rem",
        92: "23rem",
        128: "32rem",
        160: "40rem",
        300: "75rem",
        301: "75.25rem",
      },
      minWidth: {
        6: "1.5rem",
        9: "2.25rem",
      },
      maxWidth: {
        258: "64.5rem",
      },
      zIndex: {
        100: 100,
      },
      backgroundImage: {
        main: "url('/images/background.svg')",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: "#2E79DC",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },

    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
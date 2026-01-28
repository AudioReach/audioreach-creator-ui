/** @type {import('tailwindcss').Config} */
export default {
  content: ["src/**/*.tsx"],
  plugins: [],
  safelist: [
    // Background colors for group icons - dynamically generated via `bg-${colorName}`
    // Used in: group-label-tab and group-label-tab-button classes
    "bg-blue",
    "bg-green",
    "bg-grey",
    "bg-lavender",
    "bg-lime",
    "bg-magenta",
    "bg-mint",
    "bg-navy",
    "bg-orange",
    "bg-pink",
    "bg-purple",
    "bg-quartz",
    "bg-queen",
    "bg-quicksilver",
    "bg-quincy",
    "bg-red",
    "bg-teal",
    "bg-yellow",
    "bg-zinc",
    "bg-zircon",

    // Border colors for tab top borders - dynamically generated via `border-${colorName}`
    // Used in: border-t-2 border-${colorName} for visual tab grouping
    "border-blue",
    "border-green",
    "border-grey",
    "border-lavender",
    "border-lime",
    "border-magenta",
    "border-mint",
    "border-navy",
    "border-orange",
    "border-pink",
    "border-purple",
    "border-quartz",
    "border-queen",
    "border-quicksilver",
    "border-quincy",
    "border-red",
    "border-teal",
    "border-yellow",
    "border-zinc",
    "border-zircon",
  ],
  theme: {
    extend: {
      colors: {
        // 20 Group Colors for the layout system -  semantic names
        blue: "#4363d8",
        // Theme-aware colors for Card component
        // These map to Qualcomm CSS variables that change with light/dark theme
        border: "var(--q-border-1, hsl(214.3 31.8% 91.4%))",
        card: {
          DEFAULT: "var(--q-background-1)",
          foreground: "var(--q-text-1-primary)",
        },
        green: "#3cb44b",
        grey: "#929090ff",
        lavender: "#bc89f6ff",
        lime: "#bfef45",
        magenta: "#ec1be2ff",
        mint: "#8cfbadff",
        muted: {
          foreground: "var(--q-text-2-secondary, hsl(215.4 16.3% 46.9%))",
        },
        navy: "#070767ff",
        orange: "#f58231",
        pink: "#f995baff",
        purple: "#911eb4",
        quartz: "#7e5f77ff",
        queen: "#f3bd86ff",
        quicksilver: "#f57272ff",
        quincy: "#6a5445",
        red: "#e6194b",
        teal: "#469990",

        yellow: "#e8cb12ff",
        zinc: "#8888daff",
        zircon: "#07f6f2ff",
      },
    },
  },
}

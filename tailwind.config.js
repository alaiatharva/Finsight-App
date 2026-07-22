/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/features/**/*.{js,jsx,ts,tsx}",
    "./src/hooks/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#1B2D36",
        secondary: "#122129",
        accent: "#C99B61",
        lightBg: "#EEF6F8",
        cardBorder: "#DDE4E5",
        textMuted: "#6E858B",
      }
    },
  },
  plugins: [],
}

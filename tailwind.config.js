const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  purge: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter var", ...defaultTheme.fontFamily.sans],
      },
      gridAutoColumns: {
        "min-auto": "min-content auto",
      },
      gridTemplateRows: {
        "auto-min-zero": "auto minmax(0, 1fr)",
      },
      gridAutoRows: {
        "min-auto": "min-content auto",
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [require("tailwind-scrollbar")],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/*.{ejs,html}"],

  theme: {
    extend: {
      fontFamily: {
        sans: ["Figtree", "serif"],
        mono: ["Dancing Script", "serif"],
        serif: ["IBM Plex Sans", "serif"],
      },
    },
  },
  plugins: [],
};

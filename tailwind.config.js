/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./modules/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./utils/**/*.{ts,tsx}",
    "./*.{ts,tsx}"
  ],
  darkMode: "class",
  mode: "jit",
  plugins: [],
  safelist: [
    // 确保渐变类不被清除
    {
      pattern: /^bg-gradient-to-r/,
      variants: []
    },
    {
      pattern: /^from-(rose|orange|amber|emerald|cyan|blue|indigo|pink|teal|yellow|sky)-500$/,
      variants: []
    },
    {
      pattern: /^to-(rose|orange|amber|emerald|cyan|blue|indigo|pink|teal|yellow|sky)-500$/,
      variants: []
    }
  ]
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,js}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'monospace'],
        sans: ['"IBM Plex Sans"', 'sans-serif'],
      },
      colors: {
        surface:  '#0f1117',
        panel:    '#171b24',
        border:   '#252a35',
        muted:    '#3d4458',
        text:     '#e2e8f0',
        dim:      '#8892a4',
        accent:   '#4f8ef7',
        success:  '#34d399',
        warning:  '#fbbf24',
        danger:   '#f87171',
      },
    },
  },
  plugins: [],
};

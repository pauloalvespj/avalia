/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy:    { DEFAULT: '#1a2e4a', mid: '#243c5c', light: '#2f4f6e' },
        primary: { DEFAULT: '#3a7bd5', dark: '#2a6bc5', light: '#ddeeff' },
        accent:  { DEFAULT: '#e8a020', light: '#f5b840' },
        success: { DEFAULT: '#2d8a5e', light: '#e0f5ec' },
        danger:  { DEFAULT: '#c94040', light: '#fde8e8' },
        warning: { DEFAULT: '#d08030', light: '#fff8e8' },
        border:  { DEFAULT: '#d4dbe8', light: '#e8ecf4' },
        muted:   '#6b7a99',
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(26,46,74,0.10)',
        lg:   '0 8px 32px rgba(26,46,74,0.15)',
        top:  '0 2px 12px rgba(0,0,0,0.2)',
      },
      fontSize: {
        '2xs': '10px',
        xs:    '12px',
        sm:    '13px',
        base:  '14px',
      },
    },
  },
  plugins: [],
}

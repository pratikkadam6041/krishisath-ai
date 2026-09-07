/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:             '#fafafa',
        surface:        '#ffffff',
        'surface-2':    '#f5f5f5',
        card:           '#ffffff',
        primary:        '#000000',
        'primary-light':'#333333',
        amber:          '#f5a623',
        danger:         '#e00000',
        water:          '#0070f3',
        purple:         '#7928ca',
        border:         '#eaeaea',
        'text-primary':   '#0a0a0a',
        'text-secondary': '#737373',
        'text-muted':     '#a3a3a3',
        'dark-bg':      '#020617',   /* slate-950 */
        'dark-surface': '#0f172a',   /* slate-900 */
        'dark-card':    '#1e293b',   /* slate-800 */
        'dark-border':  '#334155',   /* slate-700 */
        'dark-muted':   '#475569',   /* slate-600 */
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
        noto:  ['"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        heading:    ['24px', { lineHeight: '1.2', fontWeight: '800' }],
        subheading: ['17px', { lineHeight: '1.3', fontWeight: '700' }],
        body:       ['15px', { lineHeight: '1.5', fontWeight: '400' }],
        small:      ['13px', { lineHeight: '1.4', fontWeight: '500' }],
        micro:      ['11px', { lineHeight: '1.2', fontWeight: '600' }],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0,0,0,0.06), 0 0 1px rgba(0,0,0,0.04)',
        'float': '0 8px 24px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
};

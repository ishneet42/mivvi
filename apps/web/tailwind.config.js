/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    // Adds a smaller mobile breakpoint between default and sm. iPhone Mini
    // (375px) and SE (320px) hit the no-prefix base; xs: kicks in for
    // larger phones and small foldables (Pixel 7a, iPhone Plus) where the
    // viewport is wide enough to put hero buttons side-by-side without
    // jumping to the tablet sm: layout.
    screens: {
      xs: '480px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // ── Mivvi receipt-diner tokens (see design handoff README) ──
        // Additive: existing classes (bg-card, text-foreground, etc.)
        // continue to work. Legacy names (acid/clay) are remapped onto
        // the new palette so existing usage shifts automatically.
        ink: {
          DEFAULT: '#20242B',
          soft: '#5C5848',            // body muted
          mute: 'rgba(32, 36, 43, 0.55)',
          deep: '#16140F',            // footer / CTA / phone bezel
        },
        paper: {
          cream: '#F8F2E4',     // receipt cards, list rows, panels
          deep: '#E8DCC4',      // kraft page bg
          edge: '#ECE2CB',      // 1px card/row borders
          screen: '#FBF7EE',    // phone screen bg
          dashed: '#C9BFA6',    // perforations / dashed dividers
        },
        redpen: {
          DEFAULT: '#D8412A',   // primary accent: circles, stamps, mic
          avatar: '#E0452B',
        },
        highlighter: {
          DEFAULT: '#F5D83F',
          shadow: '#C9AE1F',    // hard ticket shadow under yellow CTA
        },
        inkblue: {
          DEFAULT: '#2F4E78',   // secondary accent, notes
        },
        acid: {
          DEFAULT: '#7ED9A6',   // positive green ("you're owed", paid)
          soft: '#D2F0DF',      // settled-state pill bg
          ink: '#2E9E68',       // positive amounts on light bg
        },
        clay: {
          DEFAULT: '#D8412A',   // owe / negative — red pen
          soft: '#F6D7CE',      // owe pill bg
          ink: '#8A2314',       // legible text on clay bg
        },
        coral: {
          DEFAULT: '#D8412A',   // genuine errors only
          soft: 'rgba(216, 65, 42, 0.12)',
          ink: '#7A1F10',
        },
        label: {
          DEFAULT: '#9A8E72',   // mono labels
          soft: '#6E695A',      // captions
        },
      },
      fontFamily: {
        // Receipt-diner families (loaded via next/font in layout.tsx).
        sans: ['var(--font-hanken)', 'system-ui', 'sans-serif'],
        display: ['var(--font-anton)', 'Arial Narrow', 'sans-serif'],
        hand: ['var(--font-caveat)', 'cursive'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        rounded: [
          'ui-rounded',
          'Hiragino Maru Gothic ProN',
          'Quicksand',
          'Comfortaa',
          'Manjari',
          'Arial Rounded MT',
          'Arial Rounded MT Bold',
          'Calibri',
          'source-sans-pro',
          'sans-serif',
        ],
      },
      boxShadow: {
        // Receipt "paper-lift" shadows — warm-toned per the handoff.
        'paper-flat': '0 1px 0 rgba(40, 30, 10, 0.06)',
        'paper-lift': '0 24px 40px -28px rgba(40, 30, 10, 0.4)',
        'paper-pop': '0 40px 64px -30px rgba(40, 30, 10, 0.55)',
        'card-dark': '0 24px 44px -24px rgba(40, 30, 10, 0.6)',
        phone: '0 60px 100px -44px rgba(0, 0, 0, 0.7)',
        // Signature hard "ticket" shadow — solid offset block, no blur.
        ticket: '0 7px 0 rgba(40, 30, 10, 0.28)',
        'ticket-press': '0 3px 0 rgba(40, 30, 10, 0.28)',
        'ticket-yellow': '0 7px 0 #C9AE1F',
        'ticket-yellow-press': '0 3px 0 #C9AE1F',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        // Receipt-diner motion (keyframes defined in globals.css)
        'mv-bob': 'mv-bob 7s ease-in-out infinite',
        'mv-scan': 'mv-scan 2.6s ease-in-out infinite',
        'mv-pop': 'mv-pop 0.5s ease-out both',
        'mv-float': 'mv-float 5s ease-in-out infinite',
      },
      dropShadow: {
        title: '.25vw .25vw 0 rgb(252 165 165 / var(--tw-text-opacity))',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
}

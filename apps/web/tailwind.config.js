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
        // ── Mivvi receipt-brand tokens (see DESIGN.md §1) ──
        // Additive: existing classes (bg-card, text-foreground, etc.)
        // continue to work. New utilities here are for receipt cards,
        // settled/owe states, and the count-up balance numbers.
        ink: {
          DEFAULT: '#1A1410',
          soft: '#3A3328',
          mute: 'rgba(26, 20, 16, 0.55)',
        },
        paper: {
          cream: '#FAF6EC',     // receipt card bg (warmer than the page)
          deep: '#F4ECDB',      // page bg (existing --sx-cream)
          edge: '#EDE3CB',      // perforation tint, dividers
        },
        acid: {
          DEFAULT: '#3BFF66',   // pulled from the W logo gradient peak
          soft: '#BDFFD4',      // settled-state pill bg
          ink: '#0A6E1F',       // legible text on acid bg
        },
        clay: {
          DEFAULT: '#C97A4A',   // owe / negative — warmer than coral
          soft: '#F4D9C5',      // owe pill bg
          ink: '#5C2F12',       // legible text on clay bg
        },
        coral: {
          DEFAULT: '#E5634E',   // existing — for genuine errors only
          soft: 'rgba(229, 99, 78, 0.12)',
          ink: '#7A1F10',
        },
      },
      fontFamily: {
        // Receipt brand families. body inherits Inter from globals.css
        // @import; we add display + mono to the Tailwind utility surface.
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
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
        // Receipt "paper-lift" shadows — gives cards a sense of physical
        // thickness without going skeuomorphic.
        'paper-flat': '0 1px 0 rgba(26, 20, 16, 0.06)',
        'paper-lift':
          '0 8px 24px -10px rgba(26, 20, 16, 0.18), 0 1px 0 rgba(26, 20, 16, 0.04)',
        'paper-pop':
          '0 16px 40px -16px rgba(26, 20, 16, 0.28), 0 2px 0 rgba(26, 20, 16, 0.06)',
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
      },
      dropShadow: {
        title: '.25vw .25vw 0 rgb(252 165 165 / var(--tw-text-opacity))',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
}

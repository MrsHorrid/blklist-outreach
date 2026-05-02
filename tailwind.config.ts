import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Surface tokens (light)
        canvas:     'var(--canvas)',
        surface:    'var(--surface)',
        subtle:     'var(--subtle)',
        // Border tokens
        line:       'var(--line)',
        // Text tokens
        ink:        'var(--ink)',
        muted:      'var(--muted)',
        faint:      'var(--faint)',
        // Accent
        accent: {
          DEFAULT: 'var(--accent)',
          hover:   'var(--accent-hover)',
          soft:    'var(--accent-soft)',
          ink:     'var(--accent-ink)',
        },
      },
      borderRadius: {
        '4xl': '32px',
      },
      boxShadow: {
        xs:    '0 1px 2px rgba(15, 17, 22, 0.04)',
        soft:  '0 1px 2px rgba(15, 17, 22, 0.04), 0 2px 6px rgba(15, 17, 22, 0.04)',
        card:  '0 1px 2px rgba(15, 17, 22, 0.03), 0 4px 12px rgba(15, 17, 22, 0.04)',
        lift:  '0 4px 8px rgba(15, 17, 22, 0.04), 0 16px 32px rgba(15, 17, 22, 0.06)',
        float: '0 8px 16px rgba(15, 17, 22, 0.06), 0 24px 48px rgba(15, 17, 22, 0.08)',
        glow:  '0 0 0 1px rgba(80, 70, 229, 0.18), 0 8px 24px rgba(80, 70, 229, 0.18)',
        ring:  '0 0 0 4px rgba(80, 70, 229, 0.18)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'fade-in':   'fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in':  'slideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in':  'scaleIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer':   'shimmer 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideIn:   { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        scaleIn:   { from: { transform: 'scale(0.96)', opacity: '0' }, to: { transform: 'scale(1)', opacity: '1' } },
        shimmer:   { '0%, 100%': { opacity: '0.4' }, '50%': { opacity: '0.7' } },
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter:  '-0.025em',
      },
    },
  },
  plugins: [],
}
export default config

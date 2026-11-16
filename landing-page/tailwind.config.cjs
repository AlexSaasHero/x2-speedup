// Tailwind config for the landing page. Build: `npm run landing:css` → landing-page/styles.css
// (commit the generated file: Vercel serves the folder as is, with no build step).
// Not published: listed in .vercelignore. Palette and fonts: docs/LANDING_DESIGN_PLAN.md.
module.exports = {
  content: ['./landing-page/*.html', './landing-page/*.js'],
  theme: {
    extend: {
      colors: {
        ink: '#1B1E3C',
        paper: '#F5F7FB',
        highlighter: '#FFE14D',
        timeline: { DEFAULT: '#3D5AFE', light: '#8C9EFF' },
        graphite: '#5A6278',
        mist: '#B4BAD0',
        saved: { DEFAULT: '#14A870', ink: '#0B7A50' }
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Atkinson Hyperlegible"', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      maxWidth: { prose: '65ch' }
    }
  },
  plugins: []
};

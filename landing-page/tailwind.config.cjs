// Tailwind config for the landing page. Build: `npm run landing:css` → landing-page/styles.css
// (commit the generated file: Vercel serves the folder as is, with no build step).
// Not published: listed in .vercelignore.
module.exports = {
  content: ['./landing-page/*.html', './landing-page/site.js'],
  theme: { extend: {} },
  plugins: []
};

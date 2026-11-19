# Shared template for the SEO guides in landing-page/ (same look as the home page).
# Each guide is a small data script (e.g. panopto-faster-than-2x.py) that calls render().
# The FAQ list feeds both the visible FAQ and the FAQPage JSON-LD, so they always match:
# answers are written once as HTML (links allowed); the JSON-LD gets the same text without tags.
import html
import json
import re
from pathlib import Path

SITE = 'https://lecturespeed.vercel.app'
STORE = 'https://chromewebstore.google.com/detail/lecturespeed-%E2%80%93-watch-reco/bhbogbkkghkempphmaffejebjiimbimh'
ROOT = Path(__file__).resolve().parents[3]
e = html.escape


def plain(fragment: str) -> str:
    """HTML fragment → the text a reader sees (for JSON-LD)."""
    return html.unescape(re.sub(r'<[^>]+>', '', fragment))


def install(dark=False, center=False):
    note = 'text-mist' if dark else 'text-graphite'
    box = 'border-paper/20 bg-paper/5' if dark else 'border-ink/15 bg-white'
    j = ' justify-center' if center else ''
    return f'''        <div class="desktop-only mt-6">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-3{j}">
            <a href="{STORE}" class="inline-block bg-highlighter hover:brightness-95 text-ink font-bold text-lg px-6 py-4 rounded-xl shadow-[0_2px_0_#1B1E3C]">Add to Chrome, it's free</a>
            <a href="{STORE}" class="inline-block shrink-0" aria-label="Available in the Chrome Web Store"><img src="/img/cws-badge-border.png" width="132" height="40" alt="Available in the Chrome Web Store"></a>
          </div>
          <p class="mt-3 text-sm {note}">Works in Chrome and Edge. No account needed.</p>
        </div>
        <div class="mobile-only mt-6 rounded-xl border {box} p-4 text-center">
          <p class="text-[15px]{' text-mist' if dark else ''}">💻 Open this page on your computer to install.</p>
          <button type="button" data-copy-link class="mt-3 w-full bg-highlighter text-ink font-bold py-3 rounded-xl">Copy link for your laptop</button>
        </div>'''


def h2(text):
    return f'      <h2 class="mt-14 text-3xl sm:text-4xl font-extrabold leading-[1.08]">{text}</h2>'


def para(text):
    return f'      <p class="mt-4 text-lg text-graphite">{text}</p>'


def link(href, text):
    return f'<a href="{href}" class="text-timeline underline underline-offset-2">{text}</a>'


def steps(items, image_alt):
    lis = []
    for i, (title, body) in enumerate(items):
        dot = 'bg-highlighter' if i == len(items) - 1 else 'bg-timeline'
        lis.append(f'''          <li class="relative">
            <span class="absolute -left-[33px] top-1 w-4 h-4 rounded-full {dot} ring-4 ring-paper" aria-hidden="true"></span>
            <h3 class="text-xl font-bold">{i + 1}. {title}</h3>
            <p class="mt-1.5 text-graphite">{body}</p>
          </li>''')
    return f'''      <div class="mt-8 grid sm:grid-cols-[1fr_220px] gap-8 items-start">
        <ol class="space-y-6 border-l-[3px] border-timeline/20 pl-6">
{chr(10).join(lis)}
        </ol>
        <figure class="mx-auto w-full max-w-[220px]">
          <img src="/img/popup-free.webp" width="350" height="489" loading="lazy" decoding="async" class="w-full h-auto rounded-2xl shadow-[0_24px_48px_-24px_rgba(27,30,60,0.5)]" alt="{e(image_alt)}">
          <figcaption class="mt-3 text-sm text-graphite text-center">The LectureSpeed popup (free plan).</figcaption>
        </figure>
      </div>'''


PRO_BOX = '''      <aside class="mt-14 rounded-2xl border-2 border-timeline bg-white p-6 sm:p-8" aria-labelledby="pro-title">
        <div class="flex items-center justify-between gap-3"><h2 id="pro-title" class="text-2xl font-bold">LectureSpeed Pro, for exam review</h2><span class="font-display font-bold text-sm bg-highlighter px-2.5 py-1 rounded-md shrink-0">7 days free</span></div>
        <p class="mt-2 text-graphite">Speed is free. Pro adds the tools for coming back to what matters:</p>
        <ul class="mt-4 space-y-2">
          <li><strong>Bookmarks with notes:</strong> save the moment the professor says "this will be on the exam" and jump back in one click.</li>
          <li><strong>A-B loop:</strong> replay a hard explanation until it clicks.</li>
        </ul>
        <p class="mt-4"><span class="font-display font-extrabold text-2xl">$4.99</span> <span class="text-graphite">a year after the 7-day free trial. Cancel anytime.</span></p>
        <a href="/#pricing" data-pro-cta data-pro-label="Try Pro free for 7 days" class="mt-5 inline-block text-center bg-ink hover:bg-ink/90 text-paper font-bold px-6 py-3.5 rounded-xl">See Pro</a>
      </aside>'''


def render(*, slug, title, description, h1, og_title, image_alt, date, lead, sections, faq, final_cta, disclaimer, after_pro=''):
    # after_pro: optional sections placed between the Pro box and the FAQ.
    url = f'{SITE}/{slug}.html'
    assert len(title) < 60 and len(description) < 155, (len(title), len(description))
    article_ld = {
        "@context": "https://schema.org", "@type": "Article",
        "headline": h1, "description": description,
        "datePublished": date, "dateModified": date,
        "mainEntityOfPage": url, "url": url, "image": f"{SITE}/og-image.png",
        "author": {"@type": "Organization", "name": "LectureSpeed", "url": f"{SITE}/"},
        "publisher": {"@type": "Organization", "name": "LectureSpeed", "logo": {"@type": "ImageObject", "url": f"{SITE}/favicon-128.png"}}
    }
    faq_ld = {"@context": "https://schema.org", "@type": "FAQPage",
              "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": plain(a)}} for q, a in faq]}
    faq_html = '\n'.join(f'''        <details class="group">
          <summary class="flex justify-between items-start gap-4 cursor-pointer py-4 sm:py-5 text-lg font-display font-bold"><span>{e(q)}</span><span class="chev text-timeline text-2xl leading-none transition-transform" aria-hidden="true">+</span></summary>
          <p class="pb-5 sm:pb-6 text-graphite max-w-prose">{a}</p>
        </details>''' for q, a in faq)

    page = f'''<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{e(title)}</title>
  <meta name="description" content="{e(description)}">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
  <link rel="icon" type="image/png" sizes="128x128" href="/favicon-128.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta name="theme-color" content="#F5F7FB" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#1B1E3C" media="(prefers-color-scheme: dark)">
  <link rel="canonical" href="{url}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="LectureSpeed">
  <meta property="og:url" content="{url}">
  <meta property="og:title" content="{e(og_title)}">
  <meta property="og:description" content="{e(description)}">
  <meta property="og:image" content="{SITE}/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="LectureSpeed: lectures at your speed, not your player's.">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{e(og_title)}">
  <meta name="twitter:description" content="{e(description)}">
  <meta name="twitter:image" content="{SITE}/og-image.png">
  <link rel="preload" href="/fonts/bricolage-grotesque-700-800-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/atkinson-hyperlegible-400-latin.woff2" as="font" type="font/woff2" crossorigin>
  <!-- Vercel Web Analytics: cookie-free page views -->
  <script>window.va = window.va || function () {{ (window.vaq = window.vaq || []).push(arguments); }};</script>
  <script defer src="/_vercel/insights/script.js"></script>
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/site.css">
  <script src="/site.js"></script>
  <style>
    details > summary {{ list-style: none; }}
    details > summary::-webkit-details-marker {{ display: none; }}
    details[open] .chev {{ transform: rotate(45deg); }}
  </style>
  <script type="application/ld+json">
{json.dumps(article_ld, indent=2, ensure_ascii=False)}
  </script>
  <script type="application/ld+json">
{json.dumps(faq_ld, indent=2, ensure_ascii=False)}
  </script>
</head>
<body>
  <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60] bg-highlighter text-ink font-bold px-4 py-2 rounded-lg">Skip to content</a>

  <header class="sticky top-0 z-50 bg-paper/90 backdrop-blur border-b border-ink/10">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
      <a href="/" class="flex items-center gap-2 font-display font-extrabold text-xl tracking-tight" aria-label="LectureSpeed home"><img src="/img/logo-mark.svg" width="30" height="30" alt=""><span>LectureSpeed</span></a>
      <nav class="flex items-center gap-3 sm:gap-5 text-[15px]" aria-label="Main">
        <a href="/#pricing" class="text-graphite hover:text-ink py-3 px-1">Pricing</a>
        <a href="#faq" class="hidden min-[360px]:inline text-graphite hover:text-ink py-3 px-1">FAQ</a>
        <a href="{STORE}" class="desktop-only bg-highlighter hover:brightness-95 text-ink font-bold px-4 py-2 rounded-lg">Add to Chrome</a>
      </nav>
    </div>
  </header>

  <main id="main">
    <article class="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-10 sm:pb-16">
      <p class="text-sm font-display font-bold text-timeline"><a href="/" class="hover:underline">LectureSpeed</a> · Guide</p>
      <h1 class="mt-3 text-[38px] sm:text-6xl font-extrabold leading-[1.04]">{e(h1)}</h1>
      <p class="mt-5 text-lg sm:text-xl">{lead}</p>
{install()}

{sections}

{PRO_BOX}
{(chr(10) + after_pro + chr(10)) if after_pro else ''}
      <section id="faq" class="mt-14" aria-labelledby="faq-title">
        <h2 id="faq-title" class="text-3xl sm:text-4xl font-extrabold leading-[1.08]">Questions</h2>
        <div class="mt-6 divide-y divide-ink/10 border-y border-ink/10">
{faq_html}
        </div>
      </section>
    </article>

    <section class="on-ink bg-ink text-paper">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
        <h2 class="text-3xl sm:text-5xl font-extrabold leading-[1.05]">{e(final_cta)}</h2>
{install(dark=True, center=True)}
      </div>
    </section>
  </main>

  <footer class="border-t border-ink/10 py-8 sm:py-10 text-sm text-graphite">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between gap-4 sm:gap-6">
      <div>
        <p class="flex items-center gap-2 font-display font-extrabold text-ink text-lg"><img src="/img/logo-mark.svg" width="26" height="26" alt="">LectureSpeed</p>
        <p class="mt-2 max-w-md">{e(disclaimer)}</p>
      </div>
      <div class="flex flex-wrap gap-x-6">
        <a href="/" class="hover:text-ink py-2">Home</a>
        <a href="privacy.html" class="hover:text-ink py-2">Privacy</a>
        <a href="terms.html" class="hover:text-ink py-2">Terms</a>
        <a href="mailto:speedupvideopro.help@gmail.com" class="hover:text-ink py-2">Contact</a>
      </div>
    </div>
  </footer>
</body>
</html>
'''
    out = ROOT / 'landing-page' / f'{slug}.html'
    out.write_text(page)
    body = re.sub(r'(?s)<head>.*?</head>|<footer.*?</footer>|<header.*?</header>', '', page)
    words = len(html.unescape(re.sub(r'<[^>]+>', ' ', body)).split())
    print(f'{out.relative_to(ROOT)}: title {len(title)}, description {len(description)}, {words} words')

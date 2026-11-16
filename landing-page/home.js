// Home page: interactive lecture demo + time calculator. Vanilla JS, no dependencies.
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);

  /** 4500 → "1:15:00", 1800 → "30:00". */
  function clock(totalSeconds) {
    const s = Math.round(totalSeconds);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const mm = String(m).padStart(h ? 2 : 1, '0'), ss = String(sec).padStart(2, '0');
    return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }
  const label = (speed) => `${speed}x`;

  // ---- Demo ------------------------------------------------------------------------------
  const LECTURE = 75 * 60; // seconds
  const START_AT = 19 * 60 + 48;
  const SLIDE_SECONDS = 9; // lecture seconds per slide (at 1x a slide lasts 9 s)
  const SPEEDS = [1, 1.5, 2, 2.5, 3];

  // Made-up lecture content. Each slide: title, SVG markup (viewBox 0 0 300 110), captions.
  const curve = 'M10 100 C 70 100, 95 12, 150 12 S 230 100, 290 100';
  const SLIDES = [
    { title: 'The Normal Distribution',
      svg: `<path class="demo-curve" d="${curve}" fill="none" stroke="#3D5AFE" stroke-width="3" stroke-linecap="round"/><line x1="10" y1="100" x2="290" y2="100" stroke="#1B1E3C" stroke-opacity=".25"/>`,
      captions: ['…so most of the values sit close to the mean.', 'The curve is symmetric around μ.', 'Its width depends on σ, the standard deviation.'] },
    { title: 'The 68–95–99.7 rule',
      svg: `<rect x="112" y="10" width="76" height="90" fill="#FFE14D" fill-opacity=".55"/><path class="demo-curve" d="${curve}" fill="none" stroke="#3D5AFE" stroke-width="3" stroke-linecap="round"/><line x1="10" y1="100" x2="290" y2="100" stroke="#1B1E3C" stroke-opacity=".25"/><text x="150" y="70" text-anchor="middle" font-size="16" font-weight="700" fill="#1B1E3C">68%</text>`,
      captions: ['68% of the values fall within one σ of the mean.', '95% within two, 99.7% within three.', 'This one is on every exam. Bookmark it.'] },
    { title: 'Z-scores',
      svg: `<text x="150" y="62" text-anchor="middle" font-size="30" font-weight="700" fill="#1B1E3C" font-family="Georgia, serif">z = (x − μ) / σ</text><path class="demo-curve" d="M60 82 L240 82" stroke="#3D5AFE" stroke-width="3" stroke-linecap="round"/>`,
      captions: ['A z-score tells you how many σ a value is from μ.', 'Positive above the mean, negative below.', 'Now let\'s try one with real numbers.'] },
    { title: 'Worked example',
      svg: `<g fill="#3D5AFE"><rect x="40" y="70" width="28" height="30" rx="3"/><rect x="88" y="45" width="28" height="55" rx="3"/><rect x="136" y="18" width="28" height="82" rx="3"/><rect x="184" y="40" width="28" height="60" rx="3"/><rect x="232" y="68" width="28" height="32" rx="3"/></g><path class="demo-curve" d="M30 98 C 80 96, 110 14, 150 14 S 230 96, 270 98" fill="none" stroke="#1B1E3C" stroke-width="2.5" stroke-dasharray="600"/>`,
      captions: ['Exam scores: μ = 70, σ = 8.', 'A score of 86 gives z = 2.', 'So it beats about 97.5% of the class.'] }
  ];

  const demo = $('demo');
  if (demo) {
    const pill = $('demo-pill'), titleEl = $('demo-slide-title'), svg = $('demo-svg'), caption = $('demo-caption');
    const progress = $('demo-progress'), timeEl = $('demo-time'), lengthEl = $('demo-length'), lengthSr = $('demo-length-sr');
    const beyond = $('demo-beyond'), playBtn = $('demo-play'), playIcon = $('demo-play-icon');
    const radios = [...document.querySelectorAll('input[name="demo-speed"]')];

    let speed = 1, playing = !reduceMotion, visible = true, interacted = false;
    let t = 0; // lecture seconds since START_AT
    let slideIndex = -1, captionIndex = -1, shownLength = LECTURE, lengthAnim = 0, last = performance.now();

    function renderSlide(i) {
      slideIndex = i;
      titleEl.textContent = SLIDES[i].title;
      svg.innerHTML = SLIDES[i].svg;
    }

    function animateLength(target) {
      cancelAnimationFrame(lengthAnim);
      const from = shownLength, start = performance.now(), dur = reduceMotion ? 0 : 450;
      const step = (now) => {
        const k = dur ? Math.min(1, (now - start) / dur) : 1;
        const eased = 1 - Math.pow(1 - k, 3);
        shownLength = from + (target - from) * eased;
        lengthEl.textContent = clock(shownLength);
        if (k < 1) lengthAnim = requestAnimationFrame(step);
      };
      lengthAnim = requestAnimationFrame(step);
    }

    function setSpeed(next, fromUser = true) {
      if (fromUser) interacted = true;
      speed = next;
      pill.textContent = label(speed);
      radios.forEach((r) => { r.checked = Number(r.value) === speed; });
      beyond.classList.toggle('invisible', speed <= 2);
      animateLength(LECTURE / speed);
      lengthSr.textContent = `This 75-minute lecture takes ${clock(LECTURE / speed)} at ${label(speed)}.`;
    }

    function setPlaying(next) {
      playing = next;
      playBtn.setAttribute('aria-label', playing ? 'Pause the demo' : 'Play the demo');
      playIcon.innerHTML = playing
        ? '<rect x="2" y="1" width="3.5" height="12" rx="1" fill="currentColor"/><rect x="8.5" y="1" width="3.5" height="12" rx="1" fill="currentColor"/>'
        : '<path d="M3 1.5v11l9.5-5.5z" fill="currentColor"/>';
      last = performance.now();
    }

    function frame(now) {
      // rAF timestamps can be slightly older than performance.now() taken at setup: never go backwards.
      const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
      last = now;
      if (playing && visible) t += dt * speed;
      const lectureT = (START_AT + t) % LECTURE;
      const slidePos = t / SLIDE_SECONDS;
      const i = Math.floor(slidePos) % SLIDES.length;
      if (i !== slideIndex) renderSlide(i);
      const within = slidePos - Math.floor(slidePos); // 0..1 inside the slide
      const c = Math.min(2, Math.floor(within * 3));
      if (i * 10 + c !== captionIndex) { captionIndex = i * 10 + c; caption.textContent = SLIDES[i].captions[c]; }
      const drawn = reduceMotion ? 1 : Math.min(1, within * 1.8);
      svg.querySelectorAll('.demo-curve').forEach((el) => { el.style.strokeDashoffset = String(600 * (1 - drawn)); });
      progress.style.width = `${(lectureT / LECTURE) * 100}%`;
      timeEl.textContent = `${clock(lectureT)} / ${clock(LECTURE)}`;
      requestAnimationFrame(frame);
    }

    radios.forEach((r) => r.addEventListener('change', () => setSpeed(Number(r.value))));
    playBtn.addEventListener('click', () => { interacted = true; setPlaying(!playing); });

    // D / S / R on the page, like the extension (ignored while typing or with modifiers).
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const tag = (e.target && e.target.tagName) || '';
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) && e.target.type !== 'radio') return;
      const k = e.key.toLowerCase(), idx = SPEEDS.indexOf(speed);
      if (k === 'd' && idx < SPEEDS.length - 1) setSpeed(SPEEDS[idx + 1]);
      else if (k === 's' && idx > 0) setSpeed(SPEEDS[idx - 1]);
      else if (k === 'r') setSpeed(1);
    });

    // Don't burn CPU when the demo is off screen.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; last = performance.now(); }).observe(demo);
    }

    setPlaying(playing);
    renderSlide(0);
    setSpeed(1, false);
    requestAnimationFrame(frame);

    // Show the effect once to visitors who don't touch anything: 1x → 2x after 2 s.
    if (!reduceMotion) setTimeout(() => { if (!interacted) setSpeed(2, false); }, 2000);
  }

  // ---- Calculator --------------------------------------------------------------------------
  const hours = $('calc-hours');
  if (hours) {
    const out = $('calc-hours-out'), result = $('calc-result'), beyondEl = $('calc-beyond');
    const speedRadios = [...document.querySelectorAll('input[name="calc-speed"]')];
    const WEEKS = 15;

    function update() {
      const h = Number(hours.value);
      const s = Number((speedRadios.find((r) => r.checked) || { value: 2 }).value);
      out.textContent = `${h} h`;
      hours.style.setProperty('--fill', `${((h - 1) / 19) * 100}%`);
      result.textContent = String(Math.round(h * (1 - 1 / s) * WEEKS));
      if (s > 2) {
        const past = Math.round(h * (1 / 2 - 1 / s) * WEEKS);
        beyondEl.textContent = `${past} of those hours are past your player's 2x limit.`;
        beyondEl.hidden = false;
      } else {
        beyondEl.hidden = true;
      }
    }

    hours.addEventListener('input', update);
    speedRadios.forEach((r) => r.addEventListener('change', update));
    update();
  }
})();

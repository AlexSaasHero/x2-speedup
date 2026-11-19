# Guide: landing-page/best-speed-to-watch-lectures.html
# Run from the repo root:  python3 docs/landing-assets/guides/best-speed-to-watch-lectures.py  then  npm run landing:css
# Sources, checked 2026-11-18 against the full texts:
# - Murphy, Hoover, Agadzhanyan, Kuehn & Castel (2022), Applied Cognitive Psychology 36(1), 69-82,
#   doi 10.1002/acp.3899. Exp. 1: n = 231, Table 2 performance (immediate / 1 week):
#   1x .65/.59, 1.5x .60/.54, 2x .62/.53, 2.5x .55/.50; only 1x vs 2.5x significant (p = .004);
#   no speed x time interaction. Comparison group (n = 123, did not watch): .41; the same 123 were asked their usual speed:
#   15% 1x, 60% 1.5x, 23% 2x, 3% 2.5x. Exp. 2a: twice at 2x back to back .63 vs once at 1x .64 (n.s.).
#   Exp. 2b: once at 1x, test a week later .55 vs 2x + 2x again right before the test .63 (p = .005).
#   Table 1: 157-166 words per minute at 1x, 314-332 at 2x.
# - Murphy, Hoover & Castel (2023), Memory 31(6), 802-817, doi 10.1080/09658211.2023.2198326 (PMC10330257):
#   combined analysis of 3 experiments: younger adults' performance similar regardless of speed, older adults
#   (ages 61-94) decreased at faster speeds. Exp. 3 without mind-wandering probes: younger adults also dropped at 2x,
#   hence "generally kept up", not "no cost".
# Lang et al. 2020 (LAK) left out on purpose: observational MOOC data at 1.25x, not a controlled test.
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from guide import h2, link, para, steps  # noqa: E402
from guide import render  # noqa: E402

STUDY = 'https://doi.org/10.1002/acp.3899'
STUDY_2023 = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10330257/'

TABLE = '''      <div class="mt-6 overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <caption class="text-sm text-graphite text-left pb-2">Average share of questions answered correctly (Murphy et al., 2022, Experiment 1)</caption>
          <thead>
            <tr class="border-b-2 border-ink/20 font-display">
              <th scope="col" class="py-2 pr-3">Speed</th>
              <th scope="col" class="py-2 pr-3">Right after watching</th>
              <th scope="col" class="py-2">One week later</th>
            </tr>
          </thead>
          <tbody class="num">
            <tr class="border-b border-ink/10"><th scope="row" class="py-2 pr-3">1x</th><td class="py-2 pr-3">65%</td><td class="py-2">59%</td></tr>
            <tr class="border-b border-ink/10"><th scope="row" class="py-2 pr-3">1.5x</th><td class="py-2 pr-3">60%</td><td class="py-2">54%</td></tr>
            <tr class="border-b border-ink/10"><th scope="row" class="py-2 pr-3">2x</th><td class="py-2 pr-3">62%</td><td class="py-2">53%</td></tr>
            <tr class="border-b border-ink/10"><th scope="row" class="py-2 pr-3">2.5x</th><td class="py-2 pr-3">55%</td><td class="py-2">50%</td></tr>
          </tbody>
        </table>
      </div>'''

sections = '\n\n'.join([
    '\n'.join([
        h2('What the UCLA study measured'),
        para(f"The most direct test of this question is a {link(STUDY, 'UCLA study')} by Murphy, Hoover, Agadzhanyan, Kuehn and Castel, published in <em>Applied Cognitive Psychology</em> in 2022. 231 undergraduates watched two recorded lectures (one on real estate appraisals, one on the history of the Roman Empire, about 13 and 14 minutes at normal speed) at 1x, 1.5x, 2x or 2.5x. They answered 20 comprehension questions per lecture right after watching, and another 20 one week later."),
        TABLE,
        para("The only difference the authors found statistically reliable was between 1x and 2.5x. Scores at 1.5x and 2x were a few points lower than at 1x, but not by a reliable margin. Over the week, scores dropped by 6 points at 1x and 9 points at 2x; the authors found no reliable difference in how much was forgotten at different speeds. For comparison, students who never watched the lectures scored 41%."),
        para("Most students already speed up. In the same paper, the 123 UCLA undergraduates in the comparison group were asked how fast they usually watch: only 15% said normal speed; 60% said 1.5x, 23% said 2x and 3% said 2.5x."),
        para(f"A {link(STUDY_2023, '2023 follow-up from the same lab')} (published in <em>Memory</em>) found that, across three experiments, younger adults generally kept up at 2x, while older adults (over 60) scored lower at faster speeds."),
        para("Keep the limits in mind: these were short lectures on new topics, watched online. The authors note that results may differ for faster speakers, more complex material, or lectures where the slides and the speech carry different information."),
    ]),
    '\n'.join([
        h2('How to pick your speed'),
        para("There's no single right number. What matters is how much information reaches you per minute, and that depends on:"),
        '''      <ul class="mt-3 space-y-2 text-lg text-graphite list-disc pl-6">
        <li><strong class="text-ink">The lecturer.</strong> In the study, 2x meant 314 to 332 words per minute. A slow, clear speaker leaves more room than a fast one.</li>
        <li><strong class="text-ink">The material.</strong> A review of familiar ideas can go faster than a new proof or a dense derivation.</li>
        <li><strong class="text-ink">The language.</strong> If the lecture isn't in your first language, start lower.</li>
        <li><strong class="text-ink">First watch or review.</strong> Rewatching something you've already seen is easier to follow at high speed.</li>
      </ul>''',
        steps([
            ('Start at 1.5x', 'Open the lecture and set 1.5x from the LectureSpeed popup.'),
            ('Press D to go up by 0.1x', 'Keep going while you can still follow every sentence.'),
            ('Step back when you lose the thread', 'Press S to slow down by 0.1x, or R to go back to 1x for the hard part.'),
            ('Keep the speed that works', 'LectureSpeed keeps your speed through pause, play and seeks, so you set it once per session.'),
        ], 'The LectureSpeed popup with the speed controls.'),
    ]),
    '\n'.join([
        h2('Watching fast is not the same as studying'),
        para("Speed only helps if you use the time you save. The same UCLA paper tested this. Students who watched each lecture twice at 2x, back to back, scored about the same as students who watched once at 1x (63% vs 64%). But students who watched once at 2x, then again at 2x a week later right before the test, scored 63%, compared with 55% for students who watched once at 1x a week before the test. Same total time; better result, because the second viewing came just before the exam."),
        para("So the useful habit is: watch at a speed you can follow, then spend the saved time coming back to the parts that matter before the exam."),
    ]),
])

after_pro = '\n'.join([
    h2('Your player stops at 2x?'),
    para("Many lecture platforms cap their own speed menu at 2x. LectureSpeed sets the speed of the video directly, so you can go past it: see the guides for " + link('panopto-faster-than-2x.html', 'Panopto') + ' and ' + link('echo360-playback-speed.html', 'Echo360') + '.'),
])

render(
    slug='best-speed-to-watch-lectures',
    title='Best Speed to Watch Recorded Lectures · LectureSpeed',
    description='1.5x or 2x? What a UCLA study found about lecture speed and comprehension, right after watching and a week later, and how to pick your speed.',
    h1="What's the Best Speed to Watch Recorded Lectures?",
    og_title="What's the Best Speed to Watch Recorded Lectures?",
    image_alt='',
    date='2026-11-18',
    lead=f"For most recorded lectures, <strong>1.5x to 2x</strong>. In a {link(STUDY, 'UCLA study')}, students who watched at 1.5x or 2x scored 3 to 6 percentage points lower than at normal speed, right after watching and a week later. At 2.5x, scores dropped more. Slow down for the hard parts. <strong>LectureSpeed</strong> is a free Chrome extension that lets you set any speed, including past your player's 2x limit, and change it with one key.",
    sections=sections,
    after_pro=after_pro,
    faq=[
        ("Is watching lectures at 2x bad?",
         "Not for most students, according to the evidence so far. In the UCLA study, students at 2x scored 62% right after watching and 53% a week later, against 65% and 59% at 1x, and the study did not find that difference statistically reliable. At 2.5x the drop was reliable. Difficult material may still need a slower pace."),
        ("Should I watch lectures at 1.5x or 2x?",
         "In the UCLA study the two scored about the same: 60% and 62% right after watching, 54% and 53% a week later. Start at 1.5x and go up while you can still follow; a fast speaker or a lecture in your second language may keep you closer to 1.5x."),
        ("Does watching at higher speed hurt long-term memory?",
         "In the UCLA study, scores dropped over a week at every speed (by 6 points at 1x and 9 at 2x), and the authors found no reliable difference in forgetting between speeds. A 2023 study from the same lab found that, across three experiments, younger adults generally kept up at 2x, while older adults (over 60) scored lower at faster speeds."),
        ("Can I watch faster than 2x if my player stops at 2x?",
         "Yes, with an extension that sets the video's speed directly. LectureSpeed is free and goes up to 16x. In the UCLA study, scores dropped more beyond 2x, so go higher mainly for material you already know."),
        ("Is LectureSpeed free?",
         "Yes. Going past 2x, the keyboard shortcuts and the time-saved counter are free, with no account. Pro ($4.99 a year, with a 7-day free trial) adds review tools such as bookmarks with notes and the A-B loop."),
    ],
    final_cta='Find your speed on your next lecture.',
    disclaimer='LectureSpeed is an independent project, not affiliated with the authors of the studies cited.',
)

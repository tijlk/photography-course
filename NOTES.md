# Teaching notes

## User preferences
- **No recalled figures.** The user doesn't trust figures recalled from memory. Take precise values (specs, prices, settings) from authoritative sources and cite them, or leave them blank.
- **Public repo.** Keep personal and family details out of every file (no names, ages, locations beyond the trip region, dates beyond the stated window).
- **No communities.** Don't propose forums, groups or classes.
- **Short sessions**, 1–2 per week. One tangible win per lesson.
- Scope weighting: mostly camera tech and editing; style trends lightly; exactly one lesson on phone vs camera roles; one short lesson on sending JPEGs to the phone. No video.

## Publishing
- Lessons must work on GitHub Pages: `index.html` at the root links every lesson and reference doc; use relative links only. `.nojekyll` is present so Pages serves files as-is.

## Working notes
- Shared components live in `assets/`: `course.css` (stylesheet) and `quiz.js` (multiple-choice quiz driven by a JSON block in the lesson). Reuse them.
- Quiz answers: equal word counts, similar lengths, correct position varied.
- Network: in cloud sessions WebFetch can't reach most sources; downloading with `curl` through the session proxy works for Wikipedia, global.canon and nikonusa.com. cambridgeincolour.com, canon-europe.com and usa.canon.com refuse automated downloads (HTTP 403), so their content is unverified here.
- Lesson 0001's result line (score + missed topics) decides how much basics review goes into lesson 0002.
- Lesson files only render properly when served with `assets/` beside them (GitHub Pages, or the private artifact at https://claude.ai/artifact/V9s5Jg57B3F5AhWaHUMmNH). Opening a single lesson file on its own, e.g. in the Claude app's file viewer, shows unstyled text and no quiz. To update the artifact, rebuild its entry page from the `<body>` of `index.html` (no doctype/head; add `<title>` and the stylesheet link), then republish it with `assets/`, `lessons/` and `reference/` as supporting files.
- **Spaced review queue** (from LR-0002): handheld speed × crop factor, metering bright scenes (+ compensation), white balance kelvin direction, sunny 16. Lesson 0002 covered all four (snow and cabin simulators, plus review questions on handheld speed, sunny 16 and white balance). Revisit them again in lesson 0003 or 0004.
- `GLOSSARY.md` at the root is the canonical vocabulary (it doubles as the repo's domain glossary). Use its terms in lessons.
- Phase 2 is split: 0002 = EVF/exposure simulation + IBIS; 0003 = subject-detection AF + high ISO. Then phase 3 (buying).
- `assets/evf-sim.js` is a reusable viewfinder simulator (`data-scene="snow"` exposure task, `"cabin"` white balance task). New scenes can be added in `makeScene`.
- **Review queue after LR-0003**: (1) metering bright scenes, needs a quiz retrieval, so far only practised in the simulator; (2) exposure simulation on/off behaviour (missed in 0002); (3) handheld speed × crop, sunny 16 and white balance direction, now recovered: one light check later (spacing), not every lesson.
- Phase 4 setup checklist must include: exposure simulation ON.
- Lesson 0003 (AF + high ISO) included review questions on metering and exposure simulation. Phase 2 is done after 0003; next is phase 3, choosing a camera (needs current models, prices and EF-S adapter compatibility from manufacturer sources, cited).
- **Review queue after LR-0004**: empty. Do one light spaced check of metering, exposure simulation and handheld speed × crop during phase 4 camera setup.
- Before phase 3, ask the user: budget, brand openness, how much keeping the EF-S 17-55 matters, and weight/size limits.
- The user asked for a big-picture "what changed since 2013" overview (lesson 0004) after the focused lessons. Lesson: give an overview *before* deep dives when the learner is re-entering a field. Lesson 0004's checklist is the basis for phase 3 shortlisting.
- `.change` cards in `course.css` (what changed / for you / check) are reusable for comparison-style lessons.
- After LR-0005: phase 2 done. Phase 3 is blocked on the four user answers (budget, brand openness, 17-55 importance, size/weight). Mention "no AF calibration needed" once during phase 4, when testing the adapted 17-55.

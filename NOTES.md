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

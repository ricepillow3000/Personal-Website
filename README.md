# John Nguyen — Interactive Resume

![tests](https://github.com/ricepillow3000/ricepillow3000.github.io/actions/workflows/ci.yml/badge.svg)

An original, game-style resume. Press start, and an ink-drawn John talks to you;
your replies are the navigation. Every recruiter shortcut still works: a one-page
**Quick View** and the **standard PDF** are always one click (or the `Q` key) away.

Live: https://ricepillow3000.github.io/ · One-pager: https://ricepillow3000.github.io/#/quick

## Edit the content
All text lives in three files — no other code needs to change:

| File | What it holds |
|---|---|
| `src/data/resume.js` | Name, links, education, projects ("missions"), skill ranks, side quests, fun facts, HUD bars |
| `src/data/script.js` | Every line John says, the hub choices, return lines |
| `src/data/companies.js` | `?company=` personalization (choice / skill / mission order per company) |

The PDF download is `public/assets/John_Nguyen_Resume.pdf` — replace that one file to update it.
Never put a phone number in the site files; a test fails the build if one appears.

## Personal links for applications
`https://ricepillow3000.github.io/?company=Google` greets the visitor by company name and
reorders the hub for that company. Unknown names still get the greeting. Combine with a
deep link: `/?company=Google#/missions`.

## Run it
```bash
npm install
npm run dev        # local dev server
npm test           # build + Playwright tests (desktop + phone)
```

## Controls
Mouse/touch · arrows or WASD · Enter · Esc back · `1–5` pick · `Q` Quick View · `F` flip the HUD bars ·
`M` sound · game controllers work too.

## Swapping in real assets later
- **Ink photos:** see `SHOOT_GUIDE.md`, run `python tools/ink.py tools/photos public/assets/portrait`,
  then set `assets.photoPortraits: true` in `resume.js`.
- **Drums:** see `RECORDING_GUIDE.md`, drop files in `public/assets/audio/`, then set
  `assets.drumSamples` / `assets.drumLoop` to `true`.
- **Analytics (optional, cookie-free):** create a GoatCounter site and put its code in `analytics.goatcounter`.

## How it's built
Vite + vanilla JavaScript modules + GSAP. The city, crowd and portrait are drawn in code
(canvas + SVG), so the title screen paints without downloading any images. Sound is a
synthesized drum kit (Web Audio) until real recordings are added. CI runs the Playwright
suite and Lighthouse budgets on every push; `deploy.yml` publishes `dist/` to GitHub Pages.

The visual style is inspired by bold anime-RPG menus, but every screen, drawing and sound
here is original.

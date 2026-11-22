# John Nguyen — Interactive Resume

![tests](https://github.com/ricepillow3000/ricepillow3000.github.io/actions/workflows/ci.yml/badge.svg)

An original, game-style portfolio with a street-art look. Press start and you land on a
**heist board**: two pinned case files (the projects), pinned skill tags, and red string
connecting every skill to the project that proves it. Hover (or tap) a skill to light its strings. Every recruiter shortcut still works: a one-page
**Quick View** and the **standard PDF** are always one click (or the `Q` key) away.

Live: https://jnguyen-ai-engineer.vercel.app/ · One-pager: https://jnguyen-ai-engineer.vercel.app/#/quick (also mirrored at https://ricepillow3000.github.io/)

## Design rules
All design rules, decisions and lessons live in [`DESIGN.md`](DESIGN.md). Read it before changing anything visual, motion, sound or on-screen copy ([`CLAUDE.md`](CLAUDE.md) makes this mandatory for Claude Code).

## Edit the content
All text lives in two files — no other code needs to change:

| File | What it holds |
|---|---|
| `src/data/resume.js` | Name, links, education, projects ("missions"), skill ranks + which project each skill links to (`uses`), side quests, fun facts, HUD bars |
| `src/data/companies.js` | `?company=` personalization (a pinned note + skill / project order per company) |

The PDF download is `public/assets/John_Nguyen_Resume.pdf` — replace that one file to update it.
Never put a phone number in the site files; a test fails the build if one appears.

## Personal links for applications
`https://jnguyen-ai-engineer.vercel.app/?company=Google` pins a note for that company on the board and
reorders skills and projects for it. Unknown names still get the greeting. Combine with a
deep link: `/?company=Google#/missions`.

## Run it
```bash
npm install
npm run dev        # local dev server
npm test           # build + Playwright tests (desktop + phone)
npm run site       # build and copy the site to the repo root (GitHub Pages serves main as-is)
```

## Controls
Mouse/touch · Tab or arrows/WASD · Enter · Esc back · `1–2` open a case file · `Q` Quick View · `F` flip the GPA star ·
`M` sound · game controllers work too.

## Optional
- **Analytics (optional, cookie-free):** create a GoatCounter site and put its code in `analytics.goatcounter`.

## How it's built
Vite + vanilla JavaScript modules + GSAP. The spray-painted wall, the red string and the
page rip are drawn in code (inline SVG + CSS), so the title screen paints without
downloading any images. Every sound effect and the jazzy background theme are
synthesized live with Web Audio (no audio files). CI runs the Playwright
suite and Lighthouse budgets on every push; `deploy.yml` publishes `dist/` to GitHub Pages.

The visual style blends pop art, street art and high-contrast anime UI, but every screen,
graphic and sound here is original.

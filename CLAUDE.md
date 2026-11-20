# CLAUDE.md

This repo is John Nguyen's interactive resume: an original, Persona-5-inspired comic "heist game" built with Vite + vanilla JS + GSAP + Web Audio.

## Design work: read DESIGN.md first (mandatory)

Before ANY design work (new screens, edits, polish, animation, sound, layout, on-screen copy, "make it better"), read `DESIGN.md` in full and follow its section 0 checklist. It holds every design rule, rejected idea and lesson from all sessions. Do not design anything until you have read it. If a new design rule is agreed in a session, add it to `DESIGN.md` in that same session.

The project skill `.claude/skills/design-bible/SKILL.md` enforces the same thing.

## Never

- Show the phone number (site, build, PDF).
- Use "HIRE ME", begging, the codename "PIRATE", or emojis.
- Copy Persona 5 assets, screens, fonts, music or text (approved exceptions, in our own design: the lines TAKE YOUR TIME and LET US START THE GAME, and the line map's station names Yongen-Jaya, Shibuya, Aoyama-Itchome, Shinjuku, Akihabara, Kichijoji; see DESIGN.md).
- Use ":" or ";" in casual sentences (colons only for lists and labels).

## Working style

- Do the work automatically; prove it works (see DESIGN.md section 12); commit; publish the preview with every asset and verify the published copy.
- Report with a short summary a 6th grader can follow, plus one simple visual.

## Commands

```bash
npm install
npm run dev    # source page is app.html
npm test
npm run site   # build + copy the site to the repo root; commit the result
```

## Publishing

GitHub Pages serves this repo's `main` branch as-is ("Deploy from a branch"), so the BUILT site lives at the repo root (`index.html`, `assets/`, `.nojekyll`). The source page is `app.html`. After any change run `npm run site` and commit the root files with it; CI fails if they don't match the code.

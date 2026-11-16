# New-visitor sweep: John Nguyen's interactive resume

Ran the full journey as a first-time visitor (desktop 1440x900 and Pixel 7), motion and sound on:
title → PRESS START (paper rip) → Heist Board → every skill string → open Meliona file → visit project and return (CLEARED stamp) → menu → Missions / Skills / Stats / Side Quests / System → Different / Contact → Quick View → achievements → GPA star flip → keyboard Tab tour → reload (returning visitor) → ?company=Anthropic → wait for the bee.

## Health (measured)
- Page errors: 0 (desktop), 0 (phone)
- Console errors/warnings: 0 / 0 (5 phone animation warnings found earlier were fixed)
- Failed requests: 0
- Sideways overflow at rest: 0 (fixed: GPA badge 16px, Contact rays 167px, S badge, seal)
- 33/33 automated tests pass
- Title ready in ~0.84s

## Words visible per screen (a measure of "bloat")
board 462 · side-quests 186 · skills 121 · stats 116 · different 109 · missions 91 · system 90 · contact 45 · quick view 396 (by design, it's the one-pager)

## What I like
1. First 5 seconds are memorable: cut-out JOHN, PRESS START, a lightning-bolt paper rip into the board. Nothing generic.
2. The red-string mechanic is the best idea on the site: hover a skill, it lights the project that proves it. Claims become checkable.
3. Case cards lead with big proof numbers (727/728 checks, 199/201 errors, -86% false alarms).
4. CLEARED loop + saved progress (CASE LOG x/8, CONTINUE) gives a reason to actually open the live apps, and rewards coming back.
5. Every page has its own visual system; sounds are distinct and off by default.
6. The calling card ("YOUR MOVE.") is short and confident; one clear LinkedIn action.
7. Busy-recruiter escape hatches exist: Quick View one-pager + PDF.

## What I don't like
1. The board is dense: ~462 words across ~12 blocks at once (header hook, how-to note, 9-skill roster, 2 case cards, 4-tile "different" card, person card, 3 side quests, calling card, case log). A first-timer doesn't know where to look first.
2. Repeats: GPA appears in the person card and Stats page; skills on the board roster and the Skills page; "What makes me different" on the board and its own page; side quests on the board and their own page. The menu leads to deeper versions of things already on the board, so there are two layers of the same content.
3. The point of the whole site isn't said anywhere a visitor will see: "resumes are boring, so I built my resume as a game by directing AI agents" — that story only lives in a hidden "Behind the scenes" card unlocked after ALL 7 achievements. The site *is* the AI demo, but nobody is told.
4. The "How to read this board" sticky note is instructions in text; the board could show it (e.g., one string lights up by itself on arrival).
5. Side Quests page is the wordiest page (bullet lists of job duties).
6. Top-left HUD (date, LATE NIGHT, status, school) is decorative noise competing with the header.

## Constraints for any fix (from John)
- Keep the Persona-5-inspired comic look (red/black/white, cut-out letters, jagged shapes) but stay original (no copied game assets/screens/music).
- No "HIRE ME" / begging. Only a small status line. Main action = LinkedIn.
- Never show the phone number. No codename "PIRATE".
- Fun, intriguing, simple to use, NOT bloated. Purpose: show how AI was used to solve "resumes are boring".

## Claude Council verdict (3 reviewers: recruiter, game-UX designer, story/brand) and what was applied
All three agreed: keep the title + paper rip, the red-string mechanic, the proof-number case cards, the CLEARED/progress loop and the one-button "YOUR MOVE." ending. All three flagged that the "boring resume → AI-built game" story was hidden, and that the board repeated content.

Applied automatically:
1. Title line now tells the story: "Resumes are boring. So I directed a crew of AI agents to turn mine into a game."
2. "How to read this board" note → "CASE 00 · THIS SITE" (the site is the first case file).
3. Show, don't tell: on a first visit one string lights by itself, plus a bobbing "TRY ONE ↓" label until the first try.
4. Removed the duplicate "What makes me different" card from the board (it lives in the menu now); side quests are one-liners on the board; one fewer fun fact.
5. AI Agents is now the first skill; skills header explains RK and IN.
6. LinkedIn button in the top bar; date/time removed inside the site; on phones the status moves into the header.
7. Calling card closes the story: "Boring resume: fixed. Got a problem like that? I'm easy to find."

## After
- Board words: 465 → 345 (desktop), 502 → 357 (phone)  (-26% / -29%)
- Page errors 0, console warnings 0, failed requests 0, sideways overflow 0 (desktop + phone)
- Tests 33/33 · Lighthouse mobile 94/100/100/100 · desktop 99/100/100/100

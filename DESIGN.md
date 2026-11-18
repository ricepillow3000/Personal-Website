---
version: 1
name: John Nguyen · Interactive Resume
description: An original, Persona-5-inspired comic "heist game" resume. Red, black, white and a yellow pop; cut-out ransom lettering; jagged slanted panels with hard offset shadows; punchy, sound-synced motion. Built to prove one point, that resumes don't have to be boring, by directing AI agents to build it.
tags: [design-system, persona-5-inspired, resume, rules]
aliases: [Design Bible, Design Rules]

colors:
  red: "#E5191C"        # brand crimson, the main surface
  red-dark: "#9E0F12"   # shadows, deep red accents
  black: "#0B0B0B"      # ink, panels, text boxes
  white: "#F5F5F0"      # paper white (never pure #FFF on large areas)
  paper: "#DDD8C8"      # aged paper, cut-out letters
  yellow: "#FFE11A"     # highlights ONLY: loot, key numbers, stars, focus rings
  teal: "#3FE6D0"       # level meters, skill highlight echo (sparingly)
  pink: "#FF4FD8"       # "IN projects" meters, one sticker (sparingly)
  grey: "#8A8A86"

typography:
  head:    { fontFamily: "Anton", use: "big slanted numbers, card titles, section words" }
  menu:    { fontFamily: "Bebas Neue", use: "labels, tags, HUD, buttons" }
  marker:  { fontFamily: "Permanent Marker", use: "handwritten accents (calling card)" }
  type:    { fontFamily: "Special Elite", use: "typewriter lines: hooks, file codes, captions" }
  body:    { fontFamily: "Barlow Semi Condensed", weight: "500-700", use: "all readable body text" }
  ui:      { fontFamily: "Barlow Condensed", style: "bold italic", use: "small labels, stack lines, places" }
  ransom:  { use: "big titles only: cut-out letters, 5 fonts, ±12° tilt, small hops, medium chaos" }

shape:
  skew: "-12deg"                 # slanted boxes; text inside stays level
  shadow: "hard offset, 3-14px, no blur (red, black, white or yellow)"
  corners: "sharp; jagged 5-8 point clip-path polygons, stars, torn paper"
  radius: "none, except speech bubbles"

motion:
  ease-pop: "cubic-bezier(.2, 1.5, .4, 1)"   # overshoot and settle (brand, keep)
  enter: "0.2-0.4s, steep ease-out with overshoot"
  stagger: "2-4 frames (0.03-0.08s)"
  never: "slow fades"

spacing:
  gutter: "clamp(16px, 3.5vw, 48px)"
---

# John Nguyen · Interactive Resume — Design Bible

> **This file is mandatory.** Every design session (new design, edit, "make it pop", polish, animation, sound, copy on screen, layout fix) starts by reading this whole file. Nothing gets designed until the checklist in section 0 is done. If a request conflicts with a rule here, say so and ask, unless the request explicitly overrides the rule. When a new rule is agreed, add it here in the same session.

Source of truth for tokens in code: `src/styles/tokens.css`. If a value changes there, update the frontmatter above too.

---

## 0. Before you design anything (checklist)

1. Read this file top to bottom, especially **2. Hard rules** and **13. Decision log** (so you don't bring back something John already rejected).
2. Name the screen(s) you will touch and re-read their section in **9. Components**.
3. Design inside the system: tokens, fonts, shapes, motion and sound rules below. Original work only, inspired by Persona 5, never a copy.
4. Keep it simple. Don't over-engineer, don't add libraries for what GSAP + CSS already do, don't bloat the page with text.
5. After the change, **prove it** (section 12): tests, click-everything, phone + desktop sweep, width scan, screenshots you actually look at, Lighthouse, Impeccable detector, Vercel guidelines pass.
6. Save (commit), publish the preview with **every** asset, verify the published copy.
7. Report back to John: do the work first, then a short summary a 6th grader can follow, plus one simple visual (table, before/after, or ASCII sketch).

---

## 1. Purpose, audience, voice

- **The problem:** plain white-and-black paper resumes are boring and "have no soul". John rejects that trend.
- **The solution:** his resume as a fun, intriguing, interactive game, built by **directing a crew of AI agents**. The site itself is the proof of the skill ("CASE 00 · THIS SITE").
- **Personal project.** Say so. Don't imply a client or employer.
- **Target:** AI Solutions Engineer internships and co-ops (tech/software tone: game first, professional underneath).
- **The #1 action:** connect on **LinkedIn**. PDF and email are the escape hatches.
- **Recruiter reality:** a 7 to 10 second skim. Proof numbers must be visible fast (727 of 728 checks, 199 of 201 errors, 5,022 → 710 false alarms, 2,000+ tests, 7,700+ lines).
- **Fast path always exists:** "Quick View (1-page resume)" on the title screen and a real PDF.
- **Voice:** confident, playful, never begging, never nerdy-dense. "Consider it stolen." energy, not "please hire me".

---

## 2. Hard rules (never break)

**Content and tone**
- No "HIRE ME", no begging. The only availability signal is the small line **"Status: open to opportunities"**.
- **Never show the phone number** anywhere: site, build, PDF, OG image. (The published PDF once leaked it; always scan the published PDF.)
- No codename **"PIRATE"** anywhere (John cringed). No pirate flavor in labels.
- **No emojis** in the site. Use drawn stars (`.ff-star`), SVG icons, or text.
- No game-console button symbols (no △ ○ ✕ □). Key hints use keyboard keys.
- Role wording: **"AI Solutions Engineer"** (calling card says "an AI solutions engineer"; elsewhere "AI Solutions Engineer in training").
- Fun facts, exact: "I play drums (200+ BPM on a good day).", **"I love Pierce The Veil."** (full band name, never "PTV"), "Genuinely scared of bees and wasps."
- **Colons and semicolons:** use ":" only to introduce a list or a label (e.g. "6 workflows: lint, security scan, 3 test suites", "Dean's List: Fall 2025, Spring 2026", "Status: open to opportunities"). Never ":" or ";" in casual sentences; use a comma.
- Skill levels are honest and on one scale: **LV out of 10** everywhere (Python is **LV 5**). No second "RK 90" style number that contradicts it.
- Side quests and every page stay **short**. Less wordy beats complete; details live in Quick View and the PDF.

**Originality**
- Inspired by Persona 5, **never a 1:1 copy**: no Atlus assets, screens, logos, fonts, music, text or character art. (Early asks for a "1:1 recreation of the P5 pause menu" were reshaped into an original system for this reason.)
- No AI-generated portrait of John (scrapped, see decision log). No fake "AI art designer" look.

**Visual no-gos (John removed these)**
- No oil/paint splatters, no white splatter lines, no squiggles, tally marks or X marks.
- No stray white lines or bands in the background (the cropped arrow on tall screens counted).
- No walking crowd or crosswalk on the title.
- Nothing that reads as wooden planks (menu background).
- No generic "Google Doc Arial" look for body text.
- No speedometer gauges (GPA is a clean comic card).
- No thick colored stripe down one side of a box (`border-left: 4px solid ...`), the classic AI-generated-UI tell. Use a hard offset shadow or a slab instead.
- No plain black boxes with text dumped inside (side quests).
- Nothing flat: cards need depth (layered sheets, hard shadows, pins, tape).
- Don't bloat or shove information at the visitor.

---

## 3. Design DNA: what makes it feel Persona-5-inspired

From John's research notes (kept verbatim in spirit):

1. **Thematic personality.** Rebellious, high-contrast red-and-black punk style with blocky typography. Pop art + street art + graffiti + high-contrast anime aesthetics.
2. **Snappy timing and overshoot.** Zero slow fades. Elements slam in within a few frames using steep ease-out, overshoot slightly and snap back ("paper cutouts slammed onto a table").
3. **Staggered orchestration.** Background, art and text enter 2 to 4 frames apart so the screen builds in rapid layers.
4. **Visual misdirection.** Fast lines, stars, slashes or ink pull the eye while the screen swaps underneath; the hard cut feels seamless.
5. **Layered depth.** Foreground, midground and background move at different speeds; static screens keep subtle idle motion so nothing feels frozen (but no endless marquees, see 7).
6. **Ransom-note typography.** Letters jitter, tilt and invert colors on hover.
7. **Frame-accurate sound.** Sharp, percussive foley (paper tears, crisp clicks, whips) on the exact frame an element lands.
8. **Hand-crafted uniqueness.** Every sub-page has its own visual system (Missions = wanted posters, Skills = party stat list, Stats = ID card, Side Quests = route map, Different = comic page, System = settings sheet). Don't recycle one template.
9. **Asymmetric, broken-glass frames.** Jagged, diagonal, skewed boxes; avoid parallel lines.
10. **Flat, hard-edged rendering.** Flat color blocks, hard value transitions, stark black ink. No soft gradients, blurs or soft drop shadows (the background's red vignette is the one soft exception).
11. **Halftone (Ben-Day dots) as accents only**, never behind body text.
12. **"No time pressure", but recruiter-friendly.** Bold and busy is allowed because the visitor explores at their own pace, yet every animation is skippable and the fast path is one click away.

---

## 4. Color

- Core triad: **red `#E5191C`, black `#0B0B0B`, white `#F5F5F0`**, plus **yellow `#FFE11A` for highlights only** (loot, key numbers, stars, focus, sticker pops).
- Teal and pink only for skill meters and a single sticker each; never as page colors.
- Two cards side by side must not be "the same red twice": same family, different interior shapes, patterns or fonts (Meliona vs ARCAS).
- Contrast: body text ≥ 4.5:1. Numbers on stars: **black on yellow** (red stars with outlined white numbers failed contrast).
- **Yellow text on red fails** (3.6:1). Put yellow text on a black slab, or use white/black on red.
- Dimmed states (other skills while one is lit) stay readable: dim to about 60%, not 45%.
- `color-scheme: dark`; theme-color red.

## 5. Typography

- **Big titles only** get ransom letters (cut-out boxes, mixed fonts, ±12° tilt, small hops, medium chaos, jitter on hover only).
- Everything readable uses **Barlow Semi Condensed** (body) and **Barlow Condensed bold italic** (labels). Simple, legible, on-theme.
- Section words and numbers: **Anton**, slanted; labels and buttons: **Bebas Neue**; typewriter lines: **Special Elite**; handwriting: **Permanent Marker** (calling card only).
- Dense text sits in a **slanted box with straight text** (box tilts, text stays level, ~70 characters max per line).
- `font-variant-numeric: tabular-nums` on all counters; `text-wrap: balance` on headings, `pretty` on paragraphs (no lonely last word).
- Screen readers get plain text for every cut-out title (`.sr-only` copy), and cut-out names carry `translate="no"`.

## 6. Shape and depth

- Jagged, layered shapes: 5 to 8 point `clip-path` polygons, stars and starbursts, torn paper. These are the brand; keep them even if a linter calls them "organic clip-paths".
- **Hard offset shadows** (no blur) in red, black, white or yellow; stacked paper sheets behind cards; red pins and translucent tape.
- No rounded corners except speech bubbles.
- Bullet lists never get cramped: use **tilted sticker strips** (one fact per strip, outlined star tab, alternating white/black, space between) or **slanted black number tags** (01, 02...) with hanging text.

## 7. Motion

- Engine: **GSAP** timelines + CSS. **Anime.js** is used for exactly one thing (slam-in on scroll), imported as two small pieces (`animejs/animation`, `animejs/utils`) and **lazy-loaded** so the first screen stays fast. Don't spread it further; GSAP stays the main engine.
- Enter: 0.2 to 0.4s, steep ease-out, overshoot and settle; stagger 2 to 4 frames.
- **Every big animation is skippable** with a click or Esc (`timeline.progress(1)`); Esc during a transition skips first.
- **Respect reduced motion** (OS setting and the SYSTEM toggle): swap motion for instant changes; stop idle loops.
- **Mix transitions up.** Each destination has its own move: slash, blinds, shatter, flip, stripes, ink, iris, paper. The menu unfolds diagonally from the top-left. Don't reuse one transition everywhere.
- **Film cuts (the site should feel like a short anime movie).** Studied from Lusion's scroll story (lusion.co: a pinned scene split into weighted "shots", the frame flies at the camera, a scene the camera travels through, a title riding the motion, a hard cut; and "keep scrolling" to roll the next page). Each cut is ~1 to 1.4s, skippable, instant with reduced motion, and has ONE memorable beat:
  - **THE DROP** (board -> any page): the board rushes at you and splits on a jagged seam, you are on a rooftop over the night city, you drop past a skyscraper's windows (motion-blur smear grows with speed, speed lines), the chapter name rides the fall in cut-out letters, white star-flash landing.
  - **THE RISE** (back to the board): the page falls away below, you rocket up the tower and burst over the roof into a semi bird's-eye view of the city, "THE BOARD" sign, star-flash.
  - **NEXT STOP** (NEXT EPISODE card): a subway car pulls in close to the camera, its sign reads the next chapter, the cut happens behind it, it pulls away.
  - **CALLING CARD** (into CONTACT): a calling card spins in from deep in the frame, smacks the lens, flips away.
  - Every film cut has **letterbox bars** (black, red edge) that close at the start and open on landing, and an impact jolt before the flash.
- **NEXT EPISODE**: every story page ends with an anime "next time" card. Keep scrolling (or swiping) past the bottom and a fuse fills; full fuse rolls the next chapter (pushes only count after you've rested at the bottom ~0.35s, so coasting scrolls don't trigger it). Order: Missions, Skills, Different, Stats, Side Quests, Contact, back to the board.
- Page watermarks pan with scroll (slower than the page) for depth.
- **Never make people wait on decoration.** Content builds in underneath the title slam (don't await it). The menu stays up until the next transition covers it (the old screen never flashes back). The full board cascade plays once; coming back is a quick ~0.4s slam.
- **PRESS START:** a **paper rip** that starts at the ATL poster tape and tears **from the right side toward the upper left, diagonally**, along a **non-linear lightning-bolt edge**, slow enough to see it tear, then the board slams in.
- **CLEARED stamp (signature moment):** only plays when the visitor actually clicked a project link, left, and **came back**. Full-screen: rays, CASE CLOSED bands, giant cut-out stamp slams with a **whip crack** (Queen/Makoto style), flash, ring, confetti, then the stamp zips onto the card with a motion trail and lands with a thunk and sparkle. No "WELCOME BACK" text; the stamp is the transition.
- Idle motion is welcome (stepped "boil" on selected buttons, slow star spin, parallax), but **no endless marquees**: watermark words slide in once and settle.
- Small kinetic touches (from Motion Primitives ideas, rebuilt natively): file codes and menu teasers **decode** (text scramble); PRESS START and LinkedIn buttons are **magnetic**; counters **roll in** like a slot machine; case cards and the calling card **tilt in 3D** toward the mouse (max 6deg, mouse only); a red heist-tape **scroll meter** fills across the top of long pages.
- **Slam-in on scroll** (Anime.js): page blocks that start below the fold punch up into place when you reach them. It only moves the separate `translate`/`rotate`/`scale` properties through one `--slam` variable, so it never clashes with GSAP or hover lifts, and nothing is ever hidden.
- **Pages build in while the wipe lifts** (the entrance starts at the swap, under the cover). Never show a finished page, blank it, then rebuild it.
- Board return (iris) opens right away; no long solid-red hold.
- Animate transform/opacity; never `transition: all`.

## 8. Sound

- **Off by default.** Speaker icon + a gentle "sound?" hint. Browsers block audio until a gesture; music resumes on the first click if it was on last visit.
- All sound is synthesized live (Web Audio), no audio files.
- **Music:** original "Neon Rain" style theme: ethereal, jazzy, Persona-5-ish (electric piano, walking bass, swung ride, airy flute, bells, reverb). Never a copy of game music.
- **SFX must not sound like the music's drums** (they used to clash with the beat). Hover/click voices are distinct from the track.
- Every section type has its **own hover voice**, arcade and cartoony (cases "bip-BOP", person "boing", quests "do-mi-sol", calling card paper flick, rows tiny tick).
- Page rip = **continuous paper tear**, never firecracker pops.
- CLEARED = **whip** + punchy, weighty stamp; achievements = **treasure / Zelda-Korok-style chime** (high, bright, short); FULL STORY = whip + short **level-clear jingle** (Mario-like, original).
- Sounds land on the exact frame of impact.

## 9. Components and screens

**Title**
- Opening shot: a cel-shaded night subway platform (Nano Banana) with a slow camera push; torn posters "GO!" and "ATL" and the stencil star as accents. On tall screens the wall anchors left so the poster and star fill the space; the swoosh arrow only shows on wide screens.
- Cut-out "JOHN", slab "NGUYEN", a yellow-on-black role line "AI SOLUTIONS ENGINEER IN TRAINING · 2 LIVE APPS · 2,000+ TESTS" (two lines on phones) so the first 10 seconds say who and what, one hook line: "Resumes are boring. So I directed a crew of AI agents to turn mine into a game.", pulsing PRESS START (CONTINUE when a save exists), "Quick View (1-page resume) ▸".
- Save line: "Save found · x/7 cleared · Start over". Start over offers **Undo** until the visitor presses start.

**HUD**
- Top-left date in big slanted numbers + weekday + time of day (from the visitor's clock) + status + "GSU · Class of 2029". It must never sit on top of text: it slides away on scroll; inside pages it shrinks/hides.
- Top-right: ★ achievements, sound, LinkedIn, MENU.
- When the page scrolls, a black strip with a red edge slides in behind the fixed buttons (it lives inside each screen's layer so buttons stay above it). The BOARD button joins that row on wide screens.
- Key hints are a solid black HUD tab (bottom right) and hide while scrolling; on phones they are hidden, and so are `kbd` labels like ESC on touch screens.
- Touch screens: every control has a tap area of at least 44px (invisible hit slop, the look doesn't change). Achievement pop-ups sit under the top bar on phones, are smaller, and dismiss on tap.

**Heist Board (the portfolio hub)**
- Columns: Skills roster (left) · Case Files (middle) · notes (right: CASE 00 · THIS SITE, The Person, Side Quests). On wide screens the **calling card closes the middle column** (no empty gap).
- **Red strings = wiring diagram**, not a bundle: one shared rail up the gap between columns, a short tick from each skill pin, one rail above the case cards, a drop into each case pin. Shared parts overlap exactly (solid color). Lines stop at pin edges. Lit route = thick white with sharp corners; others dim. Lines never cross a card's text. Stacked cards (tablet) are reached from the side. Redraw only when the layout really changes.
- First visit: one string lights itself + "TRY ONE ↓" until the first try. A skill that slides in under a resting mouse cursor is not a "try": hovers only count after the mouse really moves.
- Case cards: calling-card red style, **different interiors** per case, S grade badge that fits, proof stickers, one-line brief bubble, OPEN FILE + Live + Code. Kept compact (cards were made ~10% shorter); badges, pins and stamps must never be clipped.
- PROGRESS chip (was "CASE LOG", renamed as plain words) counts **8 things a visitor can actually reach** (visit both projects + open the 6 menu pages), with a plain-words caption. It is a real button: it opens a checklist (same comic header as the case file) that says what is done and how each item counts.
- The Person: GSU, degree, stickers (AI & Analytics, Dean's List ×2, Class of 2029), fun facts as sticker strips, GPA starburst that flips to "MAX · BEE FEAR".
- Side Quests: one-liners on the board, FULL STORY to the page.

**Calling card (the ending)** — cream paper, pinned and taped, red wax seal:
> To the one buried in boring resumes, / **TAKE NOTICE.** / Resumes have been boring for too long. So I, an AI solutions engineer, directed a crew of AI agents to build this one myself. A personal project with one target, your attention. / *Consider it stolen.* / — John Nguyen / [Connect on LinkedIn ↗] / Email · Resume PDF ↓

With `?company=X`: "To the team at X," and a board note "Wait, someone from X? I've been expecting you."

**Menu** — diagonal staircase list: MISSIONS, SKILLS, MY EDGE, STATS, SIDE QUESTS, CONTACT, SETTINGS. Star cursor, black slab snaps behind the selected item, one-line teaser bubble that says what's inside ("What makes me different · 4 facts"). CLEARED mini-stamps on visited items must **not block the labels**. Ctrl/⌘+K toggles it.
**Achievements panel** — same black comic header as the case file ("SECRETS · x/7 FOUND"), never a plain white box.

**Case file (dossier modal)** — black header band with the name in cut-out letters and a yellow decoding file code, **Try it live / Code on GitHub near the top**, then numbered OBJECTIVES and yellow LOOT stickers. Close with X, Esc, backdrop, Back gesture, or swipe down on phones. Focus is trapped inside; the page behind is inert.

**Pages** — each has its own system (see section 3, rule 8): Missions wanted posters, Skills party list (LV + level meter + IN projects + receipt bubble, one scale), Different comic panels, Stats ID card (clean GPA card, no speedometer), Side Quests route map with big number + REWARD line, System settings (sound, music volume, reduce motion, achievements, Quick View, PDF).

**Quick View** — plain, ATS-friendly one-pager with red accents; normal bullets on purpose; Back + Download PDF bar stays on one row on phones.

**Stamps** — CLEARED! stamp is a Persona-style torn burst with cut-out letters, never a generic rubber stamp, and it must fit inside its card.

## 10. Copy rules

- Short sentences, proof numbers first, active voice.
- Colons only for lists/labels (section 2). Commas otherwise.
- Calling card and status lines are fixed (sections 2 and 9). Don't rewrite them without John.
- "AI Solutions Engineer" capitalization in headers; "an AI solutions engineer" inside the calling card sentence.

## 11. Game systems (keep them working)

- **CLEARED** only after link → leave → return (blur/focus, visibility, back navigation). Saved progress in localStorage (`jn-resume-v1`), validated on load. Returning visitors see CONTINUE.
- **Achievements (7):** First Words, Case File, Full Recon (light every string), BEE!! (random fly-by after 30-90s, click/tap to catch), Off the Record (flip the GPA star), Inspector (`john.run()` in the console), Player 2 (gamepad). All 7 unlock the behind-the-scenes card.
- Controls: mouse/touch, Tab/arrows/WASD, Enter, Esc/Backspace, number keys 1-6 jump to menu pages (on the board 1-2 open the case files), Q Quick View, F flip, M mute, Ctrl/⌘+K menu, gamepad.
- `?company=` is sanitized and escaped (text only).

## 12. Quality bar ("prove it works")

Run after every design change; report results honestly.
- `npm test` (Playwright, desktop + phone, including a motion-on suite).
- Click-everything script (every button, link, key, hover sound) → 0 errors.
- New-visitor sweep on desktop and phone → 0 errors, 0 failed requests, 0 sideways overflow at rest.
- Width scan: 9 screens × 11 widths (320 to 1440) → 0 problems.
- Look at screenshots yourself (desktop 1440 and Pixel 7).
- Lighthouse: mobile ≥ 90 performance, 100 accessibility/best practices/SEO.
- `npx impeccable detect src/` and against the running page; fix real findings (side-stripe borders, low contrast, marquees). Star/jagged clip-paths are intentional.
- Vercel Web Interface Guidelines pass (focus states, touch-action, overscroll, aria labels, no `transition: all`).
- No phone number in the build or PDF.
- For big changes: independent reviewers ("Claude Council": recruiter, game-UX, story/brand; plus a code/security reviewer). Loop until nothing is left to evaluate.

## 13. Decision log (what was tried and rejected, so it doesn't come back)

- **1:1 recreation of the P5 pause menu** → reshaped into an original system (IP and originality).
- **Anime portrait of John** (ink-filtered photos, hands, bangs past the eyebrows, goatee, many redraws) → **scrapped**: John didn't want to look like an "AI art designer".
- **Atlanta skyline background** (landmark towers, parallax) → replaced by the **street-art gradient wall**.
- **Walking crowd + crosswalk title** → removed; replaced by the paper rip.
- **Talking-character conversation hub** (dialogue choices as navigation) → replaced by the **Heist Board**.
- **"HIRE ME" / All-Out-Attack finisher** → removed; calling card + LinkedIn instead.
- **Codename PIRATE** → removed everywhere.
- **HUD bars GPA/CHECKS with a DRUM BPM / BEE FEAR flip** → replaced by the GPA starburst flip ("MAX BEE FEAR"); "CHECKS" belonged to Meliona, not the HUD.
- **Speedometer GPA** → clean comic GPA card.
- **"WELCOME BACK" on return** → the CLEARED stamp is the transition.
- **Firecracker menu sound** → paper tear. **SFX that matched the music** → distinct voices.
- **Black boxes in side quests** → REWARD tags with highlighter text; page made less wordy.
- **Splatters, squiggles, tally/X marks, stray white lines, wood-plank menu background** → removed.
- **Cramped speech-bubble bullets** → sticker strips; plain dot bullets in files → numbered tags.
- **Bundled side-by-side strings** → one shared wiring-diagram rail.
- **"RK 90" next to "LV 9"** → one LV scale.
- **Recorded drum samples / drum loop plan** → dropped; everything synthesized.
- **Art direction (Nov 18, John's references):** cartoon, not realistic, and **not fully red**. Blend clean with comic: a cel-shaded game look with bold black toon outlines, flat grayscale tones (white, light gray, charcoal, black), a little inked grit, hatching and halftone, deep black shadows; **crimson only as an accent** (safety lines, train stripe, red screens, beacons, our red-disc white-star emblem). All art generated with **Nano Banana (gemini-2.5-flash-image)** through the OpenAI-compatible `images/generations` endpoint (the chat endpoint can't return images), on John's private Persona Resume key. Photoreal results and clean vector clip-art results were both rejected.
  - **Title:** an empty night subway platform (grayscale, red safety lines, red-striped train, star sign) as the opening shot, with a slow camera push. No people, no red figures. The red poster wall is retired (John: "don't make it fully red"); the GO!/ATL posters and star stay as accents.
  - **Board and pages:** the night city at a Dutch angle (-7deg), half opacity over black, moving least in the parallax; black tech cutouts (server racks, a circuit board) in front, moving most.
  - **Film cuts:** the same night city as THE DROP's opening shot; the Art Deco tower crown (its black sky melts in with an edge mask) and the window-wall facade (cropped so it tiles); the gray/white red-band subway car.
  - **Print texture:** a Nano Banana grit tile (halftone patches, ink specks, hatching) over the whole background (overlay) and the cream cards (multiply, 14%), big tile so it never visibly repeats.
  - **Speed rule:** background art and texture load after first paint (phones wait ~2.5s, then fade in); film-cut art loads on the first tap/key or ~6s in. Never let big images decode during the title's build-in (it cost 7 Lighthouse points).
- **Nov 18, later (John's P5 menu + subway title references): "the texture and feel don't feel like P5".** P5 = clean, smooth toon-shaded 3D scenes (dark, glossy floor, red lines, fluorescent strips; NO grit, hatching or paper grain) with bold flat graphics in front (black/white zigzag starburst, solid halftone dot blocks, white stars, red slashes). So: subway + city regenerated as clean toon 3D (Nano Banana); the grit texture was removed; a P5-style graphic layer (original nested zigzag starburst, halftone block, stars, red slash) sits at the edges on board and pages.
- **Next (in progress):** PRESS START = a train bursting out of the dark subway tunnel toward the camera (head-on train art saved at `public/assets/film/trainfront.webp`), replacing the paper rip.
- **Superseded (Nov 17):** the low-angle red-sky city, the tower crown and facade are drawn by `tools/draw-city.mjs` (real perspective: window lines converge to one vanishing point; white/gray/black faces, thin ink lines, big black shadow shapes clipped to each building, halftone edges, our own red-circle star emblem on billboards). The subway car is Gemini's, edited: ring-hoop hand straps, plain light strips. John wants the final art from an image model: **Nano Banana 2 (Gemini Flash image) once billing is on for his key** (best budget + quality); Midjourney uploads are the premium option. No bird's-eye views (John's call); low-angle and skyline views only.
- **City art** is generated by **Gemini** (John's call: "from now on, use Gemini for generation"). Gemini's image models are not on the free tier, so the art is drawn by Gemini's text model as **SVG** (gemini-3.8-flash via the OpenAI-compatible endpoint), cleaned with `tools/clean-film-svg.py` (no scripts, no external links, no text; red beacons blink) and kept in `public/assets/film/`. Keep asking Gemini for more detail until it looks right.
- City look (from John's references, as inspiration only, never copied): **night city**, black sky, layered dark-gray towers with solid black shadows and halftone, dense strips of white lit windows, **red aircraft beacons** on rooftops, sharp red equalizer-style bars as accents, skylines and **semi bird's-eye** views. **No people, no red figure, no crosswalk**, no people inside windows.
- The hand-painted canvas tower was replaced by Gemini's art (it read as blocky).
- **Libraries suggested later**: Motion Primitives (scramble, magnetic, sliding number, tilt, scroll progress) and Watermelon UI (tooltip, Sonner toast timer) were read from their GitHub source and rebuilt natively in the comic style; Anime.js is used lazily for slam-in only. No React. Coconut UI and Backlit UI sites are blocked by the session network and have no public repo. img2threejs skipped (no photos; 3D clashes with flat comic style).
- **Menu labels DIFFERENT and SYSTEM** read as unclear to a phone tester → renamed **MY EDGE** and **SETTINGS** (pages keep their full titles).

## 14. Lessons learned while building (technical design notes)

- Each `.screen` is `position: fixed`, which makes its own layer. Anything that must sit between page content and fixed buttons (the scroll strip) has to live **inside** the screen.
- Elements hidden by an entrance animation can't take focus; focus after they appear.
- A newer navigation must cancel an older one's leftovers (title slam, page intro, case-file cut-in).
- Pulsing buttons look "unstable" to test robots; that is a test quirk (use force clicks), not a bug.
- Don't let a CSS cleanup remove a class used inside `:not(...)`; it changes specificity. Verify with computed-style diffs.
- Background art is cropped differently on tall screens; check portrait phones and tablets for stray shapes.
- A ResizeObserver must ignore "same size" events or it will cancel draw-in animations.
- Publishing: upload every referenced asset, remove old hashed files, then download the published copy and compare byte-for-byte (including the PDF).
- Commit often; the cloud workspace can restart and stop servers.
- **Never let personal data into git history.** The first commit once held the original PDF with the phone number, and the tests held part of the number. History was rewritten before the first push; tests now look for any phone-number pattern instead of storing real digits.
- `position: relative` added for hit slop must never be applied to absolutely pinned controls (it once pushed every pop-up header down on phones).
- Entrance animations can knock focus back to `<body>` after it was placed; re-check focus once a page has settled.
- Loading Google Fonts without blocking was tested: first paint got 0.2s faster but the main content (LCP) did not, and cut-out letters flashed in fallback fonts. Fonts stay render-blocking on purpose.
- The big outlined watermark words used to scroll forever (a marquee). Endless motion competes for attention; they now slide in once.
- Pop-ups on phones must never block a control: phone toasts let taps pass straight through. Desktop toasts show a draining yellow **fuse** (Watermelon/Sonner pattern) that pauses on hover.
- HUD buttons use **comic tooltips** (black slab, red offset, spike) that show the name and shortcut (`SOUND · M`, `MENU · CTRL K`) on mouse hover or keyboard focus; never on touch. No native `title` tooltips (they doubled up).
- Count-ups must never show a wrong headline number for long: the GPA counts from 3.50, not 0.
- The PROGRESS list is two columns with outline stars for "not yet" so all 8 rows fit a 900px-tall laptop.

## 15. Tools that help (use before calling a design done)

- **Impeccable** (`github.com/pbakaus/impeccable`): `npx impeccable detect src/` and `npx impeccable detect http://localhost:4173/#/board`.
- **Vercel Web Interface Guidelines** (`github.com/vercel-labs/web-interface-guidelines`, `command.md`): review changed files against it.
- **awesome-design-md** format: this file follows it (tokens in frontmatter, sections below).
- **Lighthouse** (Chrome's engine; same data as the Chrome DevTools MCP): performance and accessibility.
- Project scripts: Playwright tests in `tests/e2e`, plus the click-everything, sweep and width-scan checks described in section 12.

## 16. Communication with John

- Do the work automatically; don't stop for manual steps he didn't ask for.
- Then give a simple summary a 6th grader can understand, with one easy visual.
- Always prove it works, and say plainly what was not done and why.

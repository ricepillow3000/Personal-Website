# Site audit, Nov 18 2026

Goal (John): Persona-5-inspired, cartoon comic, fun, simple, clean, easy to get around, and it should feel like a short movie. Art comes from Google's Nano Banana (gemini-2.5-flash-image).

Each line: the problem, why it matters, the fix. Status at the end.

## Boring

1. **The title screen is one flat red wall.** It is loud but static, and John said "don't make it fully red". The first 10 seconds should feel like the opening shot of a movie. **Fix:** a cel-shaded night subway platform (grayscale, red safety lines, a red-striped train, no people) as the title backdrop, with a slow camera push so it feels alive. JOHN, the role line, PRESS START and Quick View stay on top. *Done.*
2. **The background art looks too clean, like vector clip art, not a comic.** **Fix:** regenerate the city, the tower crown and the facade in a blended style: cel-shaded game look with bold toon outlines, a little inked grit and halftone, grayscale with red accents only. *Done.*
3. **The film cuts used a different, cleaner art style than the backgrounds.** **Fix:** the same blended art set is used in THE DROP, THE RISE and the board background, so it reads as one world. *Done.*

## Complicated

4. **Jargon on the board.** "CASE LOG", "LV level · IN projects" and "MISSION FILE · DIFFICULTY S" make people stop and decode. **Fix:** "PROGRESS" chip; legend "LV = skill level · IN = live projects that use it"; file code without the word DIFFICULTY. *Done.*

## Not user-friendly

5. **Phones got slower.** After the city art was added to the backdrop, mobile Lighthouse fell from 92 to 85 (main text appeared at 3.9s). **Fix:** load the background art after the first paint, use a phone-sized file, keep the title text first. *Done.*
6. **Back takes about a second every time.** THE RISE plays on every return to the board, and Back is the most-used control. **Fix:** a shorter RISE (~0.75s). *Done.*

## Already good (keep)

- Fast path: Quick View and the PDF are one click from the title.
- Proof numbers on the board in the first screen.
- Film cuts are skippable with any click; reduced motion turns them off.
- NEXT EPISODE chains every page into a story.

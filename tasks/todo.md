# Anki Cortex implementation

- [x] Approve phone-first Pocket design.
- [ ] Persist decks, cards, reading progress, review history, and generation runs in SQLite.
- [ ] Enforce source references, eligible dates, book checkpoints, duplicate prevention, and the 30-card daily limit.
- [ ] Build the real mobile PWA with review, five grades, undo, decks, search, books, and statistics.
- [ ] Add iPhone card movement and swipe-up reveal with accessible controls.
- [ ] Expose narrow MCP tools and a private ChatGPT tunnel.
- [ ] Set up 7:00 a.m. America/Bogota ChatGPT generation task with run records and failure alerting.
- [ ] Install the service for Tailscale phone access, preserving study data across updates.
- [ ] Test real Cortex passages, native phone @Anki, and an unattended scheduled run.
- [ ] Commit, push PR, and complete one official review pass.

## Rulings

- The approved Pocket dark layout is the production default. The light preview remains available for design comparison.
- Swiping up reveals an answer. Five explicit grade buttons remain the only grading input, avoiding accidental grades from ambiguous horizontal gestures.
- If source dates cannot be grounded in a syllabus or weekly schedule, the generator excludes the passage and records why.

## Review

Pending implementation and live verification.

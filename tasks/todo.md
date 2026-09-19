# Anki implementation

## Review speed and card precision · issue #2

- [x] Reproduce rejection of broad generated cards with a failing test.
- [x] Reject list-style answers and expose single-fact rules through MCP.
- [x] Update the live ChatGPT daily task prompt and repair the two broad saved cards.
- [x] Add iPhone status-bar spacing and a card-first review flow with directional ratings.
- [x] Verify phone-size rendering, gestures, all five ratings, undo, source visibility, and reduced motion.
- [ ] Run the full test/build gates, open a focused PR, and complete one official review pass.
- [ ] Install the reviewed build and verify live app health and preserved data.

The 393px and 320px review layouts fit without horizontal overflow. A left swipe
advanced a card, Undo restored it, and cloze text stayed hidden until reveal.
At 320px with 59px top and 34px bottom iPhone insets, controls cleared system
chrome. All five grades remain reachable by tap; four directional gestures have
unit coverage. Scrolling a long answer was found to rate EZ accidentally, then
fixed and retested without advancing the card.


- [x] Approve phone-first Pocket design.
- [x] Persist decks, cards, reading progress, review history, and generation runs in SQLite.
- [x] Enforce source references, eligible dates, book checkpoints, duplicate prevention, and the 30-card daily limit.
- [x] Build the real mobile PWA with review, five grades, undo, decks, search, books, and statistics.
- [x] Add iPhone card movement and swipe-up reveal with accessible controls.
- [x] Expose narrow MCP tools and a private ChatGPT tunnel.
- [x] Set up 7:00 a.m. America/Bogota ChatGPT generation task with run records and failure alerting.
- [x] Install the service for Tailscale phone access, preserving study data across updates.
- [ ] Verify a native ChatGPT phone-app @Anki call.
- [ ] Verify a 7:00 a.m. unattended scheduled run.
- [x] Push the final app commits and complete one official review pass.
- [x] Move the installed service and study data to the separate Anki repo, then verify Tailscale port 8444 and login startup.

## Rulings

- The approved Pocket dark layout is the production default. The light preview remains available for design comparison.
- Swiping up reveals an answer. Five explicit grade buttons remain the only grading input, avoiding accidental grades from ambiguous horizontal gestures.
- If source dates cannot be grounded in a syllabus or weekly schedule, the generator excludes the passage and records why.

## Review

The first `codex review --base origin/main` pass found seven issues. Passage rotation,
cloze round-tripping, abbreviated and twin source dates, persisted rejection details,
and first-install PWA caching were fixed. A separate review-history migration keeps
deleted cards from resetting the daily review count. The 41 server tests and production
build pass. A ChatGPT task “Run now” execution saved five cited Cortex cards on
2026-09-19; the unattended 7:00 a.m. run is still pending. The installed
`com.pablo.anki` service uses `RunAtLoad` and `KeepAlive` from
`/Users/pablo/Projects/anki`. The database migration retained five cards and one
generation run, and the local and tailnet health endpoints report `service: anki`.

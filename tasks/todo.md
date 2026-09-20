# Anki implementation

## Fixed directional review swipes · issue #14

- [x] Reproduce the free-moving answer card and short exit animation.
- [x] Keep the card anchored during a rating drag, with one visible direction target.
- [x] Animate each of the four ratings along its direction; keep Mid as a tap.
- [x] Verify the flip, long-answer scrolling, diagonal cancellation, all ratings, undo, reduced motion, and phone layouts.
- [x] Run tests and build, open a focused PR, and complete one review pass.
- [x] Back up study data, install, and verify local and Tailscale delivery.

The old review moved up to 125px with the finger and changed cards after 230ms.
The answer card now stays fixed, lights the selected rating, and exits along one
cardinal axis over 410ms. The next card enters from the opposite side. At
393px and 320px, isolated browser checks exercised all four swipes, a diagonal
cancellation, a scrolling long answer, Mid, Undo, and reduced motion. The final
45 server tests, 10 UI tests, and build pass. PR #15 has one official review
with no actionable findings. A verified SQLite backup preceded installation;
local and Tailscale HTTPS serve the built assets, and the live database retains
six cards, twelve reviews, and one generation run. Native iPhone touch motion
remains unverified; the phone-size browser and private route were checked.

## Remove dark flash from card turn · issue #12

- [x] Reproduce the brief dark answer face in consecutive phone-size flip frames.
- [x] Remove the dark face overlay while keeping the 3D turn and fixed card bounds.
- [x] Capture the same phone-size frames and confirm the answer stays lavender.
- [x] Run the server and UI tests and the production build.
- [x] Open the focused PR and complete one official review pass.
- [x] Back up study data, install, and verify local and Tailscale delivery.

The previous turn animated a `#291d31` overlay up to 22% opacity on both card
faces. At 393×852, a captured frame showed the answer dark purple before it
lightened. After removing that overlay, consecutive frames show the normal
lavender answer as the physical turn finishes. All five grades remain visible.
The final 45 server tests, 10 UI tests, and production build pass.
PR #13 is stacked on #11 and has one official review pass with no actionable
findings and one posted GitHub review. A verified SQLite backup preceded the
install. The login app, monitor and MCP tunnel point to this worktree, local
and tailnet HTTPS serve the exact built assets, and the live database retains
five cards, ten reviews and one generation run with `quick_check=ok`. The
installed app has no due card for a live flip tonight; the phone-size motion
check used an isolated card, so native iPhone rendering is still unverified.

## Phone Books side padding · issue #16

- [x] Reproduce the flush intro and empty-state edges at phone width.
- [x] Apply consistent Books gutters without crowding the illustration or controls.
- [x] Verify 393px and 320px, empty and populated Books states, and no horizontal overflow.
- [x] Run tests and build, open a focused PR, and complete one review pass.
- [x] Back up study data, install, and verify local and Tailscale delivery.

Before the change, the 393px Books heading started at x=4px and the empty hero
at x=-2px. The installed app now places both at x=20px (16px at 320px). Empty
and populated browser checks kept the illustration and controls readable with
no horizontal overflow. The final 45 server tests, 10 UI tests, and build pass.
PR #17 has one official review with no actionable findings. A verified SQLite
backup preceded installation; local and Tailscale HTTPS serve the combined
build, with six cards, twelve reviews, and one generation run preserved.

## Stable phone card turn · issue #10

- [x] Reproduce a visible geometry jump in an isolated phone review session.
- [x] Keep the card and controls the same height as the answer is revealed.
- [x] Verify before, during, and after geometry at 393px and 320px, with all five ratings visible.
- [x] Run the full tests and build, open the focused PR, and complete one official review pass.
- [x] Back up study data, install, and verify the local and Tailscale app.

At 393×852, revealing the answer grew the controls from 82px to 104.2px,
shrinking the card by 22.2px while it turned. The phone controls now reserve
108px in both states. Browser measurements after the change show identical
card bounds before, during, and after the turn at 393×852 and 320×700. The
320px rating buttons fit from x=17 to x=303 without horizontal overflow.
The one official review found that the wider 500–700px mobile breakpoint
let the rating row grow beyond the reserved height. Its width is now capped
at 360px; at 500px and 700px, the hint stays below the control block's top,
the card stays steady, and the row fits. PR #11 has focused commits and one
posted GitHub review. The final 45 server tests, 10 UI tests and
production build pass. A verified backup preceded installation; the live
database retains five cards, eleven reviews and one generation run with
`quick_check=ok`. Local and tailnet HTTPS health and served asset bytes match
the build; the login app, monitor and MCP tunnel point to this worktree.
The installed app has no due cards tonight, so the flip was checked with an
isolated card at phone sizes rather than mutating study data to force a live
review. Native iPhone visual inspection remains blocked by the Mac login
prompt in iPhone Mirroring.

## Phone header, card turn, and hero art · issue #8

- [x] Trace the extra phone header space, abbreviated card turn, and dragon asset.
- [x] Start a worktree from the installed revision; baseline tests and build pass.
- [x] Tighten the phone header without overlapping the iPhone status area.
- [x] Make a swipe preview the front face, then finish a slower full 3D turn before exposing ratings.
- [x] Replace the Today dragon with an illustration of Shiva the Shiba Inu and accessible copy.
- [x] Verify 320px/393px layouts, flip frames, keyboard/reduced motion, long answers, grades and undo.
- [x] Open a focused PR and complete one official review pass.
- [x] Back up data, install, and verify the local and Tailscale app and MCP connection.

The question side should remain recognizable while the finger moves. Once
released, it turns over a horizontal axis, the lavender answer back settles,
and only then do the grading controls appear. The phone header uses one safe
area inset plus a compact control row.

Shiva is Pablo's Shiba Inu. The illustration uses the breed description; no
photo was supplied to match individual markings. The isolated 393px and 320px
browser runs showed the header, Today art, a swipe-triggered 880ms turn, a
scrolling long answer, reduced-motion reveal, grading and undo.

PR #9 has eight commits on #7. Its one `codex review` pass found no actionable
regressions; one GitHub PullRequestReview was posted. The final 45 server tests,
10 UI tests and production build pass. The installed login app and Anki MCP
tunnel point to this worktree. Local and tailnet HTTPS health and served
asset hashes match the build; all 14 MCP tools load and `get_due_counts`
answers. A verified SQLite backup precedes the install. The live database
retains five cards, ten reviews and one generation run with `quick_check=ok`.
Native iPhone visual inspection remains blocked by the Mac login prompt in
iPhone Mirroring; the private phone route and browser-size UI were verified.

## Turn the review card over · issue #6

- [x] Reproduce the instant reveal and absent pre-reveal swipe in the installed app.
- [x] Start an isolated worktree from the live app revision; baseline tests pass.
- [x] Cover deliberate upward reveal and rating gesture separation with a failing test.
- [x] Build a front/back card with a finger-driven upward flip, tap/button/keyboard reveal, and a scrollable answer back.
- [x] Verify long answers, five ratings, undo, focus, reduced motion, and 320px/393px phone layouts against an isolated database.
- [x] Run the full test/build gates; open a focused PR and complete one official review pass.
- [x] Back up the study database, install the reviewed build, and verify local/Tailscale health and preserved data.

Keep the current warm paper and aubergine palette. The card turn is the one
expressive movement: the front carries the question, and the lavender back
gives the answer the card's full height. The outer card still moves in the
rating direction after a grade. Reading and grading must remain separate.

## Adopt selected study design · issue #4

- [x] Start from the reviewed review-flow branch in an isolated worktree; baseline tests pass.
- [x] Apply the shaped Today scene, dragon artwork, and curved five-destination phone navigation to real dashboard data.
- [x] Apply the warm paper review scene while preserving API grades, swipe safety, cloze, undo, and sources.
- [x] Restyle Books, Cards, and Stats without dropping their data and editing flows.
- [x] Verify 320px and 393px phones, safe areas, desktop, keyboard/reduced motion, and the full test/build gates.
- [x] Open one coherent PR referencing this issue and complete one official review pass.
- [x] Install the reviewed build; verify launch-on-login, local and Tailscale health, MCP path, and preserved study data.

Visual system: ivory page `#fffdf9`, dark plum text `#3b2d43`, quiet lavender
`#d7c7eb`, and muted copper `#dca57e`. The Today illustration is the focal
point; course data sits in open rows, Review keeps one tilted paper surface,
and the phone navigation has a curved upper edge. Keep the current five tabs.

## Review speed and card precision · issue #2

- [x] Reproduce rejection of broad generated cards with a failing test.
- [x] Reject list-style answers and expose single-fact rules through MCP.
- [x] Update the live ChatGPT daily task prompt and repair the two broad saved cards.
- [x] Add iPhone status-bar spacing and a card-first review flow with directional ratings.
- [x] Verify phone-size rendering, gestures, all five ratings, undo, source visibility, and reduced motion.
- [x] Run the full test/build gates, open a focused PR, and complete one official review pass.
- [x] Install the reviewed build and verify live app health and preserved data.

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

- The approved soft study layout is the production default. Older concept previews remain available for design comparison.
- Swipe up on the question, tap it, or press Enter to turn the card over. The answer back scrolls independently. Once revealed, deliberate directional swipes grade Again, Hard, Easy, and EZ; Mid remains a tap. Five explicit grade buttons and undo are always available.
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

PR #5 supersedes PR #3 and applies the approved soft study design to all five
live screens. Its single official review found four issues: broad English list
prompts, lost rejection details on failed runs, backlog cards shown as ready,
and keyboard focus after Show answer. All four were fixed. The final gate passes
45 server tests, 7 UI tests, and the production build. The login service and
Anki MCP tunnel now point at `codex/soft-study-live`; the served asset matches
this build over localhost and tailnet HTTPS. The SQLite backup and active file
both pass integrity checks, with five cards, five reviews, and one generation
run retained.

PR #7 is stacked on #5 and adds the answer-side flip. Its single official
review found two regressions: completed cloze text remained hidden and keyboard
focus was lost after grading. Both were fixed and retested in an isolated
browser, including Enter-to-reveal on the next card and focus after Undo.
The final gate passes 45 server tests, 10 UI tests, and the production build.
The installed service and MCP tunnel point to `codex/review-card-flip`; the
served assets match the build through localhost and Tailscale HTTPS. The
database backup and live file pass integrity checks, preserving five cards,
six reviews, and one generation run. A real local MCP call lists all 14 tools
and returns due counts.

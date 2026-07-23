# Doomscroll — pending work

Pending items for `/news` (Doomscroll). Completed items live in git history; this file tracks what's still on deck.

## Newspaper bet

Done — see `_layouts/news.html`:
- Single dominant hero (36px italic serif, drop cap in accent color) replaces the 3-up Top Today card. Dek omitted per v1 recommendation.
- 3-up secondary row (ranks 2–4) under the hero in a grid, stacks to 1 col under 768px.
- "THE WIRE" divider (mono small-caps, thin rules) separates the curated top from the firehose.
- Firehose flows in 2 newspaper columns with a column rule; `break-inside: avoid` on each card. Collapses to 1 col under 980px.
- Volume counter in the masthead — epoch 2025-11-01, displays as `Vol. I · No. N`.

## Other open items

- [x] **#13 — More tech sources.** Tier 1 added: Cloudflare, Stripe, Simon Willison, Julia Evans, Dan Luu, Fly.io, Anthropic, Hugging Face. HN cap dropped 30→25 to stay under the free-tier 50-subrequest ceiling. Tier 2 candidates parked for later: GitHub Blog, Shopify Eng, Mozilla Hacks, DoorDash Eng, OpenAI Blog. Skipped: ArXiv cs.LG/CL (volume), Pragmatic Engineer (paywall), Slack/Dropbox (dormant).
- [x] **Cross-section search** — `FeedColumn` now honors `searchQuery` (matches title + source). Placeholder updated.
- [x] **Hide-pinned / Hide-read on the GitHub rail** — `FeedColumn` now honors both toggles via props from `Section`.
- [ ] **HN discussion link beyond Tech.** `hnId` only appears on items fetched via the worker's aggregated endpoint (Hacker News items in the Tech feed). It does not show on cross-posted HN stories surfaced through other sources. Fine for v1.
- [x] **Icon rendering bug in GitHub columns** — feed icons now carry the full FA prefix (e.g. `"fas fa-brain"`, `"fab fa-python"`). `FeedColumn` renders `feed.icon` directly. Custom langs default to `"fas fa-code"`.
- [x] **Mobile pass.** News-first stacking. Masthead right-side wraps via `flex-wrap` so the volume counter drops below the date cleanly. Kebab popover capped at `min(360px, calc(100vw - 24px))` so it never overflows the viewport. Histogram bars get an 8px min-width + invisible vertical padding hit zone under 640px (or any touch-only device). Still worth a phone eyeball to confirm.

## Notes for the worker

- The Cloudflare worker (`cloudflare/rss-proxy/`) currently emits structured `points` / `comments` / `author` / `hnId` for HN and Dev.to. RSS feeds emit `author` only. The aggregated KV blob refreshes on stale serve only (no cron trigger is configured), at most every 15 minutes.
- Noise controls: Dev.to fetches `top=7` and admits only posts with ≥40 reactions (`DEVTO_MIN_REACTIONS`); each refresh also evicts older low-traction Dev.to items from the blob. Client-side, the wire rations each source to 5 slots per day (`capPerSourceDay`), skipped while searching or source-filtering.
- Sources added 2026-07-23: Marc Brooker, Armin Ronacher, Thorsten Ball, Interconnects, Antithesis, Oxide, OpenAI, Go Blog, Mitchell Hashimoto. HN per-cycle cap dropped 20→12 for the subrequest budget (1 + 12 + 5 devto + 29 RSS = 47). Tier 2 parked: Ahead of AI (Raschka), Xe Iaso, Hillel Wayne (Buttondown feed), DeepMind, Supabase, Dropbox Tech. No public feed exists for Figma/Linear/Notion/Shopify Eng; Uber and rachelbythebay block non-browser fetchers.
- `ALLOWED_ORIGINS` in `src/index.js` is locked to prod hosts (`arvindkumarc.github.io`, `arvindc.in`, `www.arvindc.in`). Re-add localhost entries when local dev is needed; revert before deploy.

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
- [ ] **Cross-section search.** The search input only filters the Tech (unified) column. GitHub `FeedColumn` instances ignore `searchQuery`. Either wire it through to FeedColumn or update the placeholder to be honest.
- [ ] **Hide-pinned / Hide-read on the GitHub rail.** Currently those view toggles only affect the unified feed.
- [ ] **HN discussion link beyond Tech.** `hnId` only appears on items fetched via the worker's aggregated endpoint (Hacker News items in the Tech feed). It does not show on cross-posted HN stories surfaced through other sources. Fine for v1.
- [ ] **Icon rendering bug in GitHub columns.** `FeedColumn` renders `"fab " + feed.icon`, but `fa-brain` / `fa-star` / `fa-code` are Solid (`fas`), not Brand (`fab`). AI/ML, All Languages, and user-added custom languages probably render as empty squares. Allow a per-feed icon prefix or switch to `fas` with a fallback.
- [ ] **Mobile pass.** The locked-viewport / column-scroll layout disables itself under 980px and falls back to natural page scroll, but nothing has been deliberately tuned for phones. Check the masthead wrap, the kebab popover position, the histogram bar tappability, and the rail-above-firehose stacking order.

## Notes for the worker

- The Cloudflare worker (`cloudflare/rss-proxy/`) currently emits structured `points` / `comments` / `author` / `hnId` for HN and Dev.to. RSS feeds emit `author` only. The aggregated KV blob refreshes on a 15-minute cron, plus background refresh on stale serve.
- `ALLOWED_ORIGINS` in `src/index.js` is currently locked to production hosts only (`arvindkumarc.github.io`, `arvindc.in`, `www.arvindc.in`). Re-add localhost entries as needed for local dev.

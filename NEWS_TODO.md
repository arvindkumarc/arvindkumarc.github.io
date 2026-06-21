# Doomscroll — pending work

Pending items for `/news` (Doomscroll). Completed items live in git history; this file tracks what's still on deck.

## Newspaper bet (in progress)

Goal: render the page as a designed object, not an RSS reader. Existing pieces (italic-serif masthead, uppercase mono date strip, ranked Top-Today card) get pushed further:

- [ ] **One hero story, not three.** Replace the current 3-up Top Today card with a single dominant headline (~32–40px italic serif) above the feed. Source: highest-scored item from `pickHeroes` (use `n=1`).
- [ ] **Optional dek / standfirst.** One-line summary under the hero headline. We only have titles — either omit or generate via a one-shot LLM call (cheap but lossy). Recommend: omit for v1.
- [ ] **Above-the-fold row.** 3 secondary stories under the hero in a 3-column grid (ranks 2–4). Smaller headlines, same meta strip.
- [ ] **"THE WIRE" divider.** Small-caps label + thin horizontal rule separating the curated top from the chronological firehose below.
- [ ] **Column rules / newspaper columns in the firehose.** CSS `column-count: 2` with `column-rule` on the unpinned feed — gives newsroom density. Watch for ArticleCard breaking across columns (`break-inside: avoid`).
- [ ] **Drop cap on hero.** Big initial letter on the hero title for masthead energy.
- [ ] **Volume counter.** Tongue-in-cheek `Vol. III · No. 142` ticker that increments daily. Compute from days-since-epoch.

## Other open items

- [ ] **#13 — More tech sources.** Add to the unified Tech feed. Candidates to evaluate: Cloudflare Blog, Stripe Engineering, GitHub Blog, Vercel, LWN.net, The Pragmatic Engineer, Pinterest Eng, LinkedIn Eng, Uber Eng, Airbnb Tech, Spotify Eng, Discord Eng, ArXiv cs.LG / cs.CL / cs.DC, Simon Willison's blog, Hillel Wayne, Julia Evans. **Two places to edit in sync:** `cloudflare/rss-proxy/src/index.js` (worker that builds the aggregated KV blob) and `_layouts/news.html` `SECTIONS.tech.feeds` (the source-filter list that the kebab menu pulls from).
- [ ] **Cross-section search.** The search input only filters the Tech (unified) column. GitHub `FeedColumn` instances ignore `searchQuery`. Either wire it through to FeedColumn or update the placeholder to be honest.
- [ ] **Hide-pinned / Hide-read on the GitHub rail.** Currently those view toggles only affect the unified feed.
- [ ] **HN discussion link beyond Tech.** `hnId` only appears on items fetched via the worker's aggregated endpoint (Hacker News items in the Tech feed). It does not show on cross-posted HN stories surfaced through other sources. Fine for v1.
- [ ] **Icon rendering bug in GitHub columns.** `FeedColumn` renders `"fab " + feed.icon`, but `fa-brain` / `fa-star` / `fa-code` are Solid (`fas`), not Brand (`fab`). AI/ML, All Languages, and user-added custom languages probably render as empty squares. Allow a per-feed icon prefix or switch to `fas` with a fallback.
- [ ] **Mobile pass.** The locked-viewport / column-scroll layout disables itself under 980px and falls back to natural page scroll, but nothing has been deliberately tuned for phones. Check the masthead wrap, the kebab popover position, the histogram bar tappability, and the rail-above-firehose stacking order.

## Notes for the worker

- The Cloudflare worker (`cloudflare/rss-proxy/`) currently emits structured `points` / `comments` / `author` / `hnId` for HN and Dev.to. RSS feeds emit `author` only. The aggregated KV blob refreshes on a 15-minute cron, plus background refresh on stale serve.
- `ALLOWED_ORIGINS` in `src/index.js` is currently locked to production hosts only (`arvindkumarc.github.io`, `arvindc.in`, `www.arvindc.in`). Re-add localhost entries as needed for local dev.

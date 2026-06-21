// Allowed origins that can call this proxy from a browser
const ALLOWED_ORIGINS = [
  'https://arvindkumarc.github.io',
  'https://arvindc.in',
  'https://www.arvindc.in',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/rss+xml, application/atom+xml, application/json, application/xml, text/xml, text/html, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};

// =========================================================================
// Aggregated feed: accumulating blob in KV, refreshed at most every 15 min
// =========================================================================

const KV_KEY = 'feeds-blob';
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_ITEMS = 10000;

const RSS_FEEDS = [
  { name: 'Lobsters', url: 'https://lobste.rs/rss' },
  { name: 'ArXiv AI', url: 'https://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&max_results=50' },
  { name: 'AWS Blog', url: 'https://aws.amazon.com/blogs/aws/feed/' },
  { name: 'Meta Eng', url: 'https://engineering.fb.com/feed/' },
  { name: 'Netflix Tech', url: 'https://medium.com/feed/netflix-techblog' },
  { name: 'Google AI', url: 'https://blog.research.google/feeds/posts/default' },
  { name: 'Cloudflare', url: 'https://blog.cloudflare.com/rss/' },
  { name: 'Stripe', url: 'https://stripe.com/blog/feed.rss' },
  { name: 'Simon Willison', url: 'https://simonwillison.net/atom/everything/' },
  { name: 'Julia Evans', url: 'https://jvns.ca/atom.xml' },
  { name: 'Dan Luu', url: 'https://danluu.com/atom.xml' },
  { name: 'Fly.io', url: 'https://fly.io/blog/feed.xml' },
  { name: 'Anthropic', url: 'https://www.anthropic.com/rss.xml' },
  { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml' },
];

const DEVTO_TAGS = ['ai', 'webdev', 'devops', 'python', 'machinelearning'];

// --- Tiny RSS/Atom parser (regex-based; runs without DOMParser) ---
function decodeEntities(s) {
  if (!s) return '';
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/<[^>]+>/g, '')
    .trim();
}

function pickTag(block, name) {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i');
  const m = block.match(re);
  return m ? decodeEntities(m[1]) : '';
}

function pickLink(block) {
  // Atom: <link href="..." rel="alternate"/> or just <link href="..."/>
  const atomAlt = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i);
  if (atomAlt) return atomAlt[1];
  const atomAny = block.match(/<link[^>]*href=["']([^"']+)["']/i);
  if (atomAny) return atomAny[1];
  // RSS: <link>url</link>
  const rss = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
  if (rss) return decodeEntities(rss[1]);
  return '';
}

function parseRSS(xml, sourceName, limit) {
  if (!xml) return [];
  const blockRe = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  const items = [];
  let m;
  while ((m = blockRe.exec(xml)) !== null && items.length < (limit || 50)) {
    const block = m[2];
    const title = pickTag(block, 'title');
    if (!title) continue;
    const url = pickLink(block);
    const date =
      pickTag(block, 'pubDate') ||
      pickTag(block, 'published') ||
      pickTag(block, 'updated') ||
      pickTag(block, 'dc:date') ||
      '';
    let author = pickTag(block, 'dc:creator') || pickTag(block, 'author') || '';
    // strip nested <name>/<email> markup that may have leaked
    author = author.replace(/\s+/g, ' ').slice(0, 80);
    items.push({
      title,
      url,
      source: sourceName,
      author: author || '',
      date: date || null,
    });
  }
  return items;
}

// --- Upstream fetchers ---
async function fetchHN() {
  try {
    const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', { cf: { cacheTtl: 60 } });
    if (!res.ok) {
      console.log(`[hn] topstories http ${res.status}`);
      return [];
    }
    // Cap at 25 to stay under the free-tier 50 subrequest/invocation limit
    // (25 item fetches + 1 list + 14 RSS feeds + 5 devto tags = 45, ≤5 headroom).
    const ids = (await res.json()).slice(0, 25);
    const items = await Promise.all(
      ids.map((id) =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { cf: { cacheTtl: 300 } })
          .then((r) => r.json())
          .catch((e) => { console.log(`[hn] item ${id} err ${e.message}`); return null; })
      )
    );
    const filtered = items.filter((i) => i && i.url);
    console.log(`[hn] ids=${ids.length} fetched=${items.filter(Boolean).length} withUrl=${filtered.length}`);
    return filtered.map((i) => ({
      title: i.title,
      url: i.url || `https://news.ycombinator.com/item?id=${i.id}`,
      source: 'Hacker News',
      points: i.score || 0,
      comments: i.descendants || 0,
      author: i.by || '',
      hnId: i.id,
      date: i.time ? new Date(i.time * 1000).toISOString() : null,
    }));
  } catch (e) {
    console.log(`[hn] err ${e.message}`);
    return [];
  }
}

async function fetchDevTo() {
  const all = [];
  await Promise.all(
    DEVTO_TAGS.map(async (tag) => {
      try {
        const res = await fetch(`https://dev.to/api/articles?tag=${tag}&per_page=30&top=1`, { headers: BROWSER_HEADERS, cf: { cacheTtl: 600 } });
        if (!res.ok) {
          console.log(`[devto] tag=${tag} http ${res.status}`);
          return;
        }
        const data = await res.json();
        console.log(`[devto] tag=${tag} got=${data.length}`);
        data.forEach((a) => {
          all.push({
            title: a.title,
            url: a.url,
            source: `Dev.to · #${(a.tag_list && a.tag_list[0]) || tag}`,
            points: a.positive_reactions_count || 0,
            comments: a.comments_count || 0,
            author: (a.user && a.user.name) || '',
            date: a.published_at,
          });
        });
      } catch (e) {
        console.log(`[devto] tag=${tag} err ${e.message}`);
      }
    })
  );
  return all;
}

async function fetchRSSFeed(feed) {
  try {
    const res = await fetch(feed.url, { headers: BROWSER_HEADERS, cf: { cacheTtl: 600 } });
    if (!res.ok) {
      console.log(`[rss] ${feed.name} http ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const items = parseRSS(xml, feed.name, 50);
    console.log(`[rss] ${feed.name} xml=${xml.length}B parsed=${items.length}`);
    return items;
  } catch (e) {
    console.log(`[rss] ${feed.name} err ${e.message}`);
    return [];
  }
}

// --- Refresh logic: merge into existing blob, dedupe, prune, sort, write ---
async function refreshBlob(env) {
  const existing = await env.FEEDS_KV.get(KV_KEY, 'json').catch(() => null);
  const oldItems = (existing && existing.items) || [];

  const groups = await Promise.all([
    fetchHN(),
    fetchDevTo(),
    ...RSS_FEEDS.map((f) => fetchRSSFeed(f)),
  ]);
  const fresh = groups.flat();

  const byUrl = new Map();
  // seed with existing items so first-seen metadata wins
  for (const item of oldItems) {
    if (item && item.url) byUrl.set(item.url, item);
  }
  for (const item of fresh) {
    if (!item || !item.url) continue;
    const prev = byUrl.get(item.url);
    if (prev) {
      // merge source label if a new feed picked it up
      if (prev.source && item.source && !prev.source.includes(item.source)) {
        prev.source = `${prev.source} · ${item.source}`;
      }
    } else {
      byUrl.set(item.url, item);
    }
  }

  const now = Date.now();
  let merged = Array.from(byUrl.values()).filter((it) => {
    if (!it.date) return false; // require a date so undated items don't fill the blob forever
    const t = new Date(it.date).getTime();
    if (isNaN(t)) return false;
    return now - t <= MAX_AGE_MS;
  });

  merged.sort((a, b) => new Date(b.date) - new Date(a.date));
  if (merged.length > MAX_ITEMS) merged = merged.slice(0, MAX_ITEMS);

  const blob = { items: merged, lastRefresh: new Date(now).toISOString() };
  await env.FEEDS_KV.put(KV_KEY, JSON.stringify(blob));
  return blob;
}

async function handleAggregated(request, env, ctx) {
  const headers = corsHeaders(request);
  if (!env || !env.FEEDS_KV) {
    return new Response(JSON.stringify({ error: 'FEEDS_KV binding missing' }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  const existing = await env.FEEDS_KV.get(KV_KEY, 'json').catch(() => null);
  const stale =
    !existing ||
    !existing.lastRefresh ||
    Date.now() - new Date(existing.lastRefresh).getTime() > REFRESH_INTERVAL_MS;

  if (stale) {
    if (!existing) {
      // Nothing cached yet → do an inline refresh so the first visitor sees something.
      const blob = await refreshBlob(env).catch(() => ({ items: [], lastRefresh: null }));
      return new Response(JSON.stringify(blob), {
        headers: { ...headers, 'Content-Type': 'application/json', 'X-Refresh': 'inline' },
      });
    }
    // Otherwise serve the stale blob and refresh in the background.
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(refreshBlob(env).catch(() => null));
    }
  }

  const body = existing || { items: [], lastRefresh: null };
  return new Response(JSON.stringify(body), {
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60',
      'X-Refresh': stale ? 'background' : 'fresh',
    },
  });
}

// =========================================================================
// Existing proxy endpoint (?url=...)
// =========================================================================

async function handleProxy(request) {
  const headers = corsHeaders(request);
  const url = new URL(request.url);
  const rssUrl = url.searchParams.get('url');

  if (!rssUrl || (!rssUrl.startsWith('http://') && !rssUrl.startsWith('https://'))) {
    return new Response(JSON.stringify({ error: 'Missing or invalid ?url= parameter' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  const parsed = new URL(rssUrl);
  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' ||
      parsed.hostname.startsWith('192.168.') || parsed.hostname.startsWith('10.') ||
      parsed.hostname.startsWith('172.16.')) {
    return new Response(JSON.stringify({ error: 'Internal URLs are not allowed' }), {
      status: 403,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  const cache = caches.default;
  const cacheKey = new Request(rssUrl, { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) {
    return new Response(cached.body, {
      headers: {
        ...headers,
        'Content-Type': cached.headers.get('Content-Type') || 'application/xml',
        'X-Cache': 'HIT',
      },
    });
  }

  try {
    const response = await fetch(rssUrl, {
      headers: BROWSER_HEADERS,
      cf: { cacheTtl: 300 },
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return new Response(JSON.stringify({
        error: `Upstream returned ${response.status}`,
        detail: errBody.slice(0, 200),
      }), {
        status: response.status,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const body = await response.text();
    const contentType = response.headers.get('Content-Type') || 'application/xml';

    const cacheRes = new Response(body, {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=300' },
    });
    await cache.put(cacheKey, cacheRes);

    return new Response(body, {
      headers: {
        ...headers,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300',
        'X-Cache': 'MISS',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(request) });
    }

    const url = new URL(request.url);
    if (url.pathname === '/aggregated') {
      return handleAggregated(request, env, ctx);
    }
    return handleProxy(request);
  },
};

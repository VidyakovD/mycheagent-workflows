const S = [
  {n:'Google AI',u:'https://blog.google/technology/ai/rss/'},
  {n:'Microsoft AI',u:'https://blogs.microsoft.com/ai/feed/'},
  {n:'HuggingFace',u:'https://huggingface.co/blog/feed.xml'},
  {n:'NVIDIA',u:'https://blogs.nvidia.com/feed/'},
  {n:'AWS ML',u:'https://aws.amazon.com/blogs/machine-learning/feed/'},
  {n:'Wired AI',u:'https://www.wired.com/feed/tag/ai/latest/rss'},
  {n:'Ars Technica',u:'https://feeds.arstechnica.com/arstechnica/technology-lab'},
  {n:'MIT Tech Review',u:'https://www.technologyreview.com/feed/'},
  {n:'Engadget',u:'https://www.engadget.com/rss.xml'},
  {n:'TechCrunch AI',u:'https://techcrunch.com/category/artificial-intelligence/feed/'},
  {n:'ArXiv AI',u:'http://arxiv.org/rss/cs.AI'},
  {n:'ArXiv ML',u:'http://arxiv.org/rss/cs.LG'},
  {n:'Habr ML',u:'https://habr.com/ru/rss/hub/machine_learning/articles/'},
  {n:'Habr AI',u:'https://habr.com/ru/rss/hub/artificial_intelligence/articles/'},
  {n:'Habr ChatGPT',u:'https://habr.com/ru/rss/hub/chatgpt/articles/'},
  {n:'Hacker News',u:'https://news.ycombinator.com/rss'},
  {n:'Reddit ML',u:'https://www.reddit.com/r/MachineLearning/.rss'},
  {n:'Reddit AI',u:'https://www.reddit.com/r/artificial/.rss'},
  {n:'BBC Tech',u:'http://feeds.bbci.co.uk/news/technology/rss.xml'},
  {n:'Guardian AI',u:'https://www.theguardian.com/technology/artificialintelligenceai/rss'},
  {n:'VentureBeat',u:'https://venturebeat.com/feed/'},
  {n:'The Verge',u:'https://www.theverge.com/rss/index.xml'},
  {n:'InfoQ AI',u:'https://www.infoq.com/ai-ml-data-eng/rss/'},
  {n:'MarkTechPost',u:'https://www.marktechpost.com/feed/'},
  {n:'Apple ML',u:'https://machinelearning.apple.com/rss'},
  {n:'Towards DS',u:'https://medium.com/feed/towards-data-science'},
  {n:'9to5Google',u:'https://9to5google.com/feed/'},
  {n:'Google Cloud AI',u:'https://cloud.google.com/blog/topics/ai-machine-learning/rss/'},
  {n:'Synced',u:'https://syncedreview.com/feed/'},
  {n:'Fast Company',u:'https://www.fastcompany.com/technology/rss'}
];

// --- HTML entity + CDATA + tag stripping -------------------------------------
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      try { return String.fromCodePoint(parseInt(h, 16)); } catch(e) { return ''; }
    })
    .replace(/&#(\d+);/g, (_, d) => {
      try { return String.fromCodePoint(parseInt(d, 10)); } catch(e) { return ''; }
    });
}

function t(s) {
  if (!s) return '';
  return decodeEntities(
    s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
     .replace(/<[^>]+>/g, ' ')
  ).replace(/\s+/g, ' ').trim();
}

function pd(s) {
  if (!s) return null;
  try { const d = new Date(s); return isNaN(d) ? null : d; } catch(e) { return null; }
}

// --- Generic tag extractor: handles attrs, namespaces, self-closing ---------
function firstTag(raw, names) {
  for (const name of names) {
    // Escape colons for namespace-prefixed tags, allow optional attributes
    const rx = new RegExp('<' + name.replace(/:/g, '\\:') + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name.replace(/:/g, '\\:') + '>', 'i');
    const m = rx.exec(raw);
    if (m && m[1] != null) return m[1];
  }
  return '';
}

// Atom link: prefer rel="alternate", fallback to any href
function atomLink(raw) {
  const alt = /<link[^>]+rel=["']alternate["'][^>]*href=["']([^"']+)["']/i.exec(raw)
           || /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']alternate["']/i.exec(raw);
  if (alt) return alt[1];
  const any = /<link[^>]+href=["']([^"']+)["']/i.exec(raw);
  return any ? any[1] : '';
}

function parse(xml, src) {
  const items = [];

  // RSS 2.0 (<item>…</item>)
  const rss = xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi);
  for (const m of rss) {
    const raw = m[1];
    const title = t(firstTag(raw, ['title']));
    const link  = t(firstTag(raw, ['link'])) || t(firstTag(raw, ['guid']));
    const date  = pd(t(firstTag(raw, ['pubDate', 'dc:date', 'published', 'updated'])));
    const desc  = t(firstTag(raw, ['description', 'content:encoded', 'summary', 'dc:description'])).slice(0, 150);
    if (title && title.length > 5) items.push({ src, title, link, date, desc });
  }

  // Atom (<entry>…</entry>) — run only if RSS path produced nothing
  if (!items.length) {
    const atom = xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi);
    for (const m of atom) {
      const raw = m[1];
      const title = t(firstTag(raw, ['title']));
      const link  = atomLink(raw) || t(firstTag(raw, ['id']));
      const date  = pd(t(firstTag(raw, ['published', 'updated', 'dc:date'])));
      const desc  = t(firstTag(raw, ['summary', 'content', 'description'])).slice(0, 150);
      if (title && title.length > 5) items.push({ src, title, link, date, desc });
    }
  }

  return items;
}

const errors = [];
const perSource = [];

const res = await Promise.allSettled(S.map(async s => {
  try {
    const xml = await this.helpers.httpRequest({
      method: 'GET',
      url: s.u,
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
      returnFullResponse: false
    });
    const text = typeof xml === 'string' ? xml : JSON.stringify(xml);
    let items = [];
    try { items = parse(text, s.n); }
    catch (parseErr) { errors.push({ src: s.n, err: 'parse: ' + String(parseErr.message || parseErr).slice(0, 100) }); }
    perSource.push({ src: s.n, count: items.length });
    return items;
  } catch (e) {
    errors.push({ src: s.n, err: String(e.message || e).slice(0, 120) });
    perSource.push({ src: s.n, count: 0 });
    return [];
  }
}));

const now = new Date();
const cutoff = new Date(now - 48 * 3600 * 1000);
const seen = new Set();
const dated = [];
const undated = [];

for (const r of res) {
  if (r.status !== 'fulfilled') continue;
  for (const a of r.value) {
    const k = a.title.toLowerCase().slice(0, 40);
    if (seen.has(k)) continue;
    seen.add(k);
    if (a.date) {
      if (a.date >= cutoff) dated.push(a);
    } else {
      undated.push(a);
    }
  }
}

dated.sort((a, b) => (b.date || new Date(0)) - (a.date || new Date(0)));

// Fallback: if too few dated articles, allow undated too (limit 10)
const final = dated.length >= 10 ? dated : [...dated, ...undated.slice(0, 10 - dated.length)];
const fetched = res.filter(r => r.status === 'fulfilled' && r.value.length > 0).length;

return [{ json: { articles: final.slice(0, 40), fetched, total: S.length, errors: errors.slice(0, 10), perSource } }];

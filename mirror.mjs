import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve("site");
const allowedHosts = new Set(["teseralab.com", "www.teseralab.com"]);
const queue = [
  "https://teseralab.com/",
  "https://teseralab.com/robots.txt",
  "https://teseralab.com/sitemap.xml",
  "https://teseralab.com/research",
  "https://teseralab.com/worlds",
  "https://teseralab.com/agents",
  "https://teseralab.com/safety",
  "https://teseralab.com/docs",
  "https://teseralab.com/researchers",
  "https://teseralab.com/organisations",
  "https://teseralab.com/publications",
  "https://teseralab.com/about",
  "https://teseralab.com/journal",
  "https://teseralab.com/press",
  "https://teseralab.com/careers",
  "https://teseralab.com/contact",
  "https://teseralab.com/keys",
  "https://teseralab.com/privacy",
  "https://teseralab.com/terms",
  "https://teseralab.com/stats.html",
  "https://teseralab.com/sign.html",
  "https://teseralab.com/perps.html",
  "https://teseralab.com/private.html",
];
const seen = new Set();
const results = [];

function cleanUrl(raw, base) {
  try {
    const url = new URL(raw, base);
    if (!allowedHosts.has(url.hostname)) return null;
    url.hostname = "teseralab.com";
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function outputPath(url, contentType) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  if (!path.extname(pathname) && contentType.includes("text/html")) pathname += "/index.html";
  if (!path.extname(pathname) && contentType.includes("application/json")) pathname += ".json";
  const safe = pathname.replace(/^\/+/, "").replaceAll("..", "_") || "index.html";
  return path.join(root, safe);
}

function discover(text, base, contentType) {
  const candidates = new Set();
  const patterns = [
    /(?:href|src|poster|data-src)\s*=\s*["']([^"']+)["']/gi,
    /srcset\s*=\s*["']([^"']+)["']/gi,
    /url\(\s*["']?([^)'"\s]+)["']?\s*\)/gi,
    /["'](\/?(?:img|images|assets|fonts|js|css|og|video|media)\/[^"']+)["']/gi,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const rawValues = pattern.source.startsWith("srcset")
        ? match[1].split(",").map((part) => part.trim().split(/\s+/)[0])
        : [match[1]];
      for (const raw of rawValues) {
        if (!raw || /^(?:data:|blob:|mailto:|tel:|javascript:|#)/i.test(raw)) continue;
        const url = cleanUrl(raw, base);
        if (url) candidates.add(url.href);
      }
    }
  }
  if (contentType.includes("xml")) {
    for (const match of text.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
      const url = cleanUrl(match[1], base);
      if (url) candidates.add(url.href);
    }
  }
  return candidates;
}

await fs.mkdir(root, { recursive: true });
while (queue.length) {
  const href = queue.shift();
  if (seen.has(href) || seen.size >= 1000) continue;
  seen.add(href);
  try {
    const response = await fetch(href, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; local-site-mirror/1.0)" },
      redirect: "follow",
    });
    if (!response.ok) {
      results.push({ url: href, status: response.status, saved: false });
      continue;
    }
    const finalUrl = cleanUrl(response.url, href);
    if (!finalUrl) continue;
    const type = (response.headers.get("content-type") || "application/octet-stream").toLowerCase();
    let bytes = Buffer.from(await response.arrayBuffer());
    if (/text|javascript|json|xml|svg/.test(type)) {
      let text = bytes.toString("utf8");
      for (const next of discover(text, finalUrl, type)) {
        if (!seen.has(next)) queue.push(next);
      }
      text = text
        .replaceAll("https://www.teseralab.com/", "/")
        .replaceAll("https://teseralab.com/", "/");
      bytes = Buffer.from(text, "utf8");
    }
    const file = outputPath(finalUrl, type);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, bytes);
    results.push({ url: finalUrl.href, status: response.status, saved: true, file: path.relative(root, file), bytes: bytes.length, type });
  } catch (error) {
    results.push({ url: href, status: 0, saved: false, error: String(error?.message || error) });
  }
}

const htmlAliases = [
  "research", "worlds", "agents", "safety", "docs", "researchers", "organisations", "publications",
  "about", "journal", "press", "careers", "contact", "keys", "privacy", "terms", "stats", "sign", "perps", "private",
];
for (const route of htmlAliases) {
  const source = path.join(root, route, "index.html");
  const alias = path.join(root, `${route}.html`);
  try { await fs.copyFile(source, alias); } catch {}
}

await fs.writeFile("mirror-report.json", JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
const saved = results.filter((item) => item.saved);
const failed = results.filter((item) => !item.saved);
console.log(JSON.stringify({ discovered: seen.size, saved: saved.length, failed: failed.length, bytes: saved.reduce((sum, item) => sum + item.bytes, 0) }));
if (failed.length) console.log(JSON.stringify(failed.slice(0, 30), null, 2));

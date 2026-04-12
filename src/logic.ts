import type { Hono } from "hono";
import { parse as parseHTML } from "node-html-parser";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PersonProfile {
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  company: string | null;
  domain: string;
  linkedin_url: string | null;
  github_url: string | null;
  twitter_handle: string | null;
  location: string | null;
  bio: string | null;
  avatar_url: string | null;
  website: string | null;
  confidence: number;
  sources: string[];
}

// ---------------------------------------------------------------------------
// Email validation
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

// ---------------------------------------------------------------------------
// Name extraction from email local part
// ---------------------------------------------------------------------------

function extractNameFromEmail(email: string): { first: string | null; last: string | null } {
  const local = email.split("@")[0].toLowerCase();

  // Try common patterns
  // first.last or first_last or first-last
  const separators = [".", "_", "-"];
  for (const sep of separators) {
    if (local.includes(sep)) {
      const parts = local.split(sep).filter(Boolean);
      if (parts.length >= 2) {
        return {
          first: capitalize(parts[0]),
          last: capitalize(parts[parts.length - 1]),
        };
      }
    }
  }

  // flast pattern (e.g. jdoe -> J Doe) — less reliable
  if (local.length >= 4 && /^[a-z][a-z]+$/.test(local)) {
    return {
      first: capitalize(local[0]),
      last: capitalize(local.slice(1)),
    };
  }

  // Single word — treat as first name
  if (/^[a-z]+$/.test(local)) {
    return { first: capitalize(local), last: null };
  }

  return { first: null, last: null };
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ---------------------------------------------------------------------------
// Gravatar avatar from email MD5
// ---------------------------------------------------------------------------

function getGravatarUrl(email: string): string {
  const hash = createHash("md5").update(email.trim().toLowerCase()).digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?s=200&d=404`;
}

async function checkGravatar(email: string): Promise<string | null> {
  const url = getGravatarUrl(email);
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000), redirect: "follow" });
    if (res.ok) return url.replace("&d=404", "&d=mp");
  } catch { /* ignore */ }
  return null;
}

// ---------------------------------------------------------------------------
// Fetch page helper
// ---------------------------------------------------------------------------

async function fetchPage(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PersonEnrichBot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) return null;
    return await res.text();
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// Company website scraping for person data
// ---------------------------------------------------------------------------

async function scrapeCompanyForPerson(
  domain: string,
  firstName: string | null,
  lastName: string | null
): Promise<Partial<PersonProfile>> {
  const result: Partial<PersonProfile> = {};
  const pages = [
    `https://${domain}/about`,
    `https://${domain}/team`,
    `https://${domain}/about-us`,
    `https://${domain}/our-team`,
    `https://${domain}/people`,
  ];

  const nameQuery = [firstName, lastName].filter(Boolean).join(" ").toLowerCase();
  if (!nameQuery) return result;

  for (const pageUrl of pages) {
    const html = await fetchPage(pageUrl, 6000);
    if (!html) continue;

    const root = parseHTML(html);
    const text = root.textContent.toLowerCase();

    if (text.includes(nameQuery)) {
      result.sources = result.sources || [];
      result.sources.push(pageUrl);

      // Try to extract job title near the name
      const bodyText = root.textContent;
      const nameIndex = bodyText.toLowerCase().indexOf(nameQuery);
      if (nameIndex !== -1) {
        // Look in a window around the name mention for title-like text
        const window = bodyText.slice(Math.max(0, nameIndex - 100), nameIndex + 200);
        const titleMatch = window.match(
          /(?:CEO|CTO|COO|CFO|VP|Director|Manager|Engineer|Developer|Designer|Founder|Co-Founder|Head of|Lead|Senior|Junior|Principal|Analyst|Consultant|Partner|President|Chief)[^\n,;]{0,60}/i
        );
        if (titleMatch) {
          result.job_title = titleMatch[0].trim();
        }
      }

      // Look for LinkedIn links on the page
      const links = root.querySelectorAll('a[href*="linkedin.com"]');
      for (const link of links) {
        const href = link.getAttribute("href") || "";
        const linkText = link.textContent.toLowerCase();
        if (linkText.includes(nameQuery) || href.toLowerCase().includes((firstName || "").toLowerCase())) {
          result.linkedin_url = href;
          break;
        }
      }

      // Look for Twitter links
      const twitterLinks = root.querySelectorAll('a[href*="twitter.com"], a[href*="x.com"]');
      for (const link of twitterLinks) {
        const href = link.getAttribute("href") || "";
        const linkText = link.textContent.toLowerCase();
        if (linkText.includes(nameQuery) || href.toLowerCase().includes((firstName || "").toLowerCase())) {
          const handle = href.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/)?.[1];
          if (handle) result.twitter_handle = `@${handle}`;
          break;
        }
      }

      break; // Found the person, stop searching pages
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Social profile URL construction and checking
// ---------------------------------------------------------------------------

async function checkUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PersonEnrichBot/1.0)" },
    });
    return res.ok;
  } catch { return false; }
}

async function findGitHub(firstName: string | null, lastName: string | null, emailLocal: string): Promise<string | null> {
  // Try common GitHub username patterns
  const candidates: string[] = [];
  const fLower = (firstName || "").toLowerCase();
  const lLower = (lastName || "").toLowerCase();

  if (fLower && lLower) {
    candidates.push(`${fLower}${lLower}`, `${fLower}-${lLower}`, `${fLower}.${lLower}`);
  }
  candidates.push(emailLocal.replace(/[^a-z0-9-]/gi, ""));

  for (const username of [...new Set(candidates)]) {
    if (!username || username.length < 2) continue;
    const url = `https://github.com/${username}`;
    if (await checkUrl(url)) return url;
  }
  return null;
}

async function findLinkedIn(firstName: string | null, lastName: string | null): Promise<string | null> {
  if (!firstName || !lastName) return null;
  const slug = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`;
  const url = `https://www.linkedin.com/in/${slug}`;
  // LinkedIn blocks HEAD requests, so we construct the URL but can't verify
  return url;
}

// ---------------------------------------------------------------------------
// Company info from domain
// ---------------------------------------------------------------------------

async function getCompanyFromDomain(domain: string): Promise<string | null> {
  // Try to get company name from the website title
  const html = await fetchPage(`https://${domain}`, 6000);
  if (!html) return null;

  const root = parseHTML(html);
  const title = root.querySelector("title")?.textContent?.trim();
  if (title) {
    // Strip common suffixes
    return title
      .replace(/\s*[-|–—:]\s*Home$/i, "")
      .replace(/\s*[-|–—:]\s*Official.*$/i, "")
      .replace(/\s*[-|–—:]\s*Welcome.*$/i, "")
      .trim()
      .slice(0, 100);
  }

  // Fallback: capitalize domain name
  const name = domain.split(".")[0];
  return capitalize(name);
}

// ---------------------------------------------------------------------------
// Main enrichment function
// ---------------------------------------------------------------------------

async function enrichPerson(email: string): Promise<PersonProfile> {
  const domain = email.split("@")[1];
  const localPart = email.split("@")[0];
  const { first, last } = extractNameFromEmail(email);

  const profile: PersonProfile = {
    email,
    full_name: first && last ? `${first} ${last}` : first || null,
    first_name: first,
    last_name: last,
    job_title: null,
    company: null,
    domain,
    linkedin_url: null,
    github_url: null,
    twitter_handle: null,
    location: null,
    bio: null,
    avatar_url: null,
    website: `https://${domain}`,
    confidence: 0,
    sources: [],
  };

  // Run enrichment tasks in parallel
  const [avatarUrl, company, companyData, githubUrl, linkedinUrl] = await Promise.all([
    checkGravatar(email),
    getCompanyFromDomain(domain),
    scrapeCompanyForPerson(domain, first, last),
    findGitHub(first, last, localPart),
    findLinkedIn(first, last),
  ]);

  // Merge results
  if (avatarUrl) {
    profile.avatar_url = avatarUrl;
    profile.sources.push("gravatar");
  }

  if (company) {
    profile.company = company;
    profile.sources.push(`https://${domain}`);
  }

  if (companyData.job_title) profile.job_title = companyData.job_title;
  if (companyData.linkedin_url) profile.linkedin_url = companyData.linkedin_url;
  if (companyData.twitter_handle) profile.twitter_handle = companyData.twitter_handle;
  if (companyData.sources) profile.sources.push(...companyData.sources);

  if (!profile.linkedin_url && linkedinUrl) {
    profile.linkedin_url = linkedinUrl;
  }

  if (githubUrl) {
    profile.github_url = githubUrl;
    profile.sources.push("github");
  }

  // Calculate confidence score
  let score = 0;
  if (profile.full_name) score += 20;
  if (profile.company) score += 15;
  if (profile.job_title) score += 20;
  if (profile.linkedin_url) score += 15;
  if (profile.github_url) score += 10;
  if (profile.twitter_handle) score += 10;
  if (profile.avatar_url) score += 10;
  profile.confidence = Math.min(score, 100);

  // Deduplicate sources
  profile.sources = [...new Set(profile.sources)];

  return profile;
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export function registerRoutes(app: Hono) {
  app.get("/api/enrich", async (c) => {
    const email = c.req.query("email");
    if (!email) return c.json({ error: "Missing required parameter: email" }, 400);
    if (!isValidEmail(email)) return c.json({ error: "Invalid email address format" }, 400);

    const startTime = Date.now();
    try {
      const result = await enrichPerson(email.trim().toLowerCase());
      return c.json({ ...result, lookup_time_ms: Date.now() - startTime });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Enrichment failed";
      return c.json({ error: msg, email, lookup_time_ms: Date.now() - startTime }, 500);
    }
  });
}

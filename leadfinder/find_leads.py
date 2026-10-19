"""Weekly lead finder: public BUSINESS listings from Google Places -> LEADS INBOX.

Keeps only businesses we can actually reach: a MOBILE number (WhatsApp works)
and/or an EMAIL address. Landline-only listings are dropped. Google Places
gives the listed phone and website; mobile numbers and emails are then read
from the business's OWN public website (home page and a few contact pages,
politely, honouring robots.txt). Nothing is scraped from social media.

Secrets needed (GitHub -> Settings -> Secrets -> Actions):
  GOOGLE_PLACES_API_KEY  - Google Cloud key with "Places API (New)" enabled
  PULSE_API_URL          - your Apps Script web app URL (ends with /exec)
  LEAD_FINDER_SECRET     - same text as the Script Property in Apps Script
Run locally with --dry-run to print results without sending anything.
"""
import argparse
import concurrent.futures
import json
import os
import re
import sys
import urllib.parse
import urllib.request
import urllib.robotparser

PLACES_URL = "https://places.googleapis.com/v1/places:searchText"
FIELDS = ("places.id,places.displayName,places.internationalPhoneNumber,"
          "places.nationalPhoneNumber,places.websiteUri,places.formattedAddress")
HERE = os.path.dirname(os.path.abspath(__file__))
USER_AGENT = "PULSE-LeadFinder/1.0 (reads public contact details for one-to-one outreach)"
CONTACT_PATHS = ["", "/contact", "/contact-us", "/about-us"]
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
MOBILE_RE = re.compile(r"(?:\+?60[\s\-]?|0)1\d[\s\-]?\d{3,4}[\s\-]?\d{4}")
WHATSAPP_RE = re.compile(r"(?:wa\.me/|whatsapp\.com/send\?phone=)(\+?\d{9,14})")
FREE_MAIL = ("gmail.com", "hotmail.com", "yahoo.com", "yahoo.com.my", "outlook.com", "icloud.com")
JUNK_LOCAL = {"you", "name", "user", "email", "example", "yourname", "your", "test"}
IMAGE_END = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".css", ".js")


# ---------------------------------------------------------------- numbers
def is_mobile(phone):
    """True for a Malaysian mobile (01x). Landlines (03...) and toll-free
    (1300/1800...) are not mobiles."""
    d = re.sub(r"\D", "", phone or "")
    if d.startswith("60"):
        rest = d[2:]
    elif d.startswith("0"):
        rest = d[1:]
    else:
        return False
    return rest.startswith("1") and len(rest) in (9, 10)


# ---------------------------------------------------------------- website
def extract_contacts(html, website=""):
    """Emails and mobile numbers found in one page of HTML."""
    host = (urllib.parse.urlparse(website).hostname or "").lower()
    host = host[4:] if host.startswith("www.") else host
    emails, mobiles = [], []
    text = html.replace("&#64;", "@").replace("[at]", "@").replace(" (at) ", "@")
    for m in EMAIL_RE.findall(text):
        e = m.strip(".").lower()
        local, _, domain = e.partition("@")
        if e.endswith(IMAGE_END) or local in JUNK_LOCAL or "." not in domain:
            continue
        if not (domain in FREE_MAIL or (host and (domain == host or domain.endswith("." + host) or host.endswith("." + domain)))):
            continue                      # e.g. support@wix.com from a site builder
        if e not in emails:
            emails.append(e)
    for m in WHATSAPP_RE.findall(text) + MOBILE_RE.findall(text):
        if is_mobile(m) and re.sub(r"\D", "", m) not in [re.sub(r"\D", "", x) for x in mobiles]:
            mobiles.append(m.strip())
    return {"emails": emails[:2], "mobiles": mobiles[:2]}


def _allowed_by_robots(base):
    try:
        rp = urllib.robotparser.RobotFileParser()
        rp.set_url(base + "/robots.txt")
        rp.read()
        return rp.can_fetch(USER_AGENT, base + "/")
    except Exception:
        return True


def _get(url, timeout=6, limit=200000):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        if "html" not in (resp.headers.get("Content-Type") or "").lower():
            return ""
        return resp.read(limit).decode("utf-8", errors="ignore")


def fetch_site(website):
    """Read a business's own site (home + a few contact pages) for contacts."""
    out = {"emails": [], "mobiles": []}
    try:
        parts = urllib.parse.urlparse(website)
        if parts.scheme not in ("http", "https") or not parts.hostname:
            return out
        base = "%s://%s" % (parts.scheme, parts.netloc)
        if not _allowed_by_robots(base):
            return out
        for path in CONTACT_PATHS:
            try:
                found = extract_contacts(_get(base + path), website)
            except Exception:
                continue
            for key in out:
                for v in found[key]:
                    if v not in out[key]:
                        out[key].append(v)
            if out["emails"] and out["mobiles"]:
                break
    except Exception:
        pass
    return out


# ----------------------------------------------------------------- places
def post_json(url, payload, headers=None):
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode("utf-8"), method="POST",
        headers={"Content-Type": "text/plain;charset=utf-8", **(headers or {})})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def search(query, api_key, max_results):
    out = post_json(
        PLACES_URL,
        {"textQuery": query, "pageSize": max_results, "regionCode": "MY"},
        {"Content-Type": "application/json", "X-Goog-Api-Key": api_key,
         "X-Goog-FieldMask": FIELDS})
    return out.get("places", [])


def split_query(item):
    """A query is either a plain string or {"q": ..., "angle": ...}."""
    if isinstance(item, dict):
        return item["q"], item.get("angle", "")
    return item, ""


def to_lead(place, query, angle="", site=None):
    """A lead needs a company name plus a mobile number and/or an email."""
    site = site or {}
    name = (place.get("displayName") or {}).get("text", "")
    listed = place.get("internationalPhoneNumber") or place.get("nationalPhoneNumber") or ""
    mobile = listed if is_mobile(listed) else (site.get("mobiles") or [""])[0]
    email = (site.get("emails") or [""])[0]
    if not name or not (mobile or email):
        return None
    landline = listed if listed and not is_mobile(listed) else ""
    notes = " | ".join(x for x in (
        place.get("formattedAddress", ""),
        place.get("websiteUri", ""),
        ("landline: " + landline) if landline else "",
        "search: " + query,
        ("angle: " + angle) if angle else "") if x)
    return {"name": "", "company": name, "phone": mobile, "email": email, "notes": notes}


def collect(queries, api_key, max_results, fetch=fetch_site, workers=8):
    """Search every query, read each business's site, keep reachable ones."""
    found = []                                   # (place, query, angle)
    seen_ids = set()
    for item in queries:
        query, angle = split_query(item)
        for place in search(query, api_key, max_results):
            pid = place.get("id")
            if pid in seen_ids:
                continue
            seen_ids.add(pid)
            found.append((place, query, angle))

    def read_site(entry):
        website = entry[0].get("websiteUri")
        return fetch(website) if website else {}

    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        sites = list(pool.map(read_site, found))

    leads = []
    for (place, query, angle), site in zip(found, sites):
        lead = to_lead(place, query, angle, site)
        if lead:
            leads.append(lead)
    return leads, len(found)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    with open(os.path.join(HERE, "queries.json"), encoding="utf-8") as f:
        cfg = json.load(f)
    api_key = os.environ.get("GOOGLE_PLACES_API_KEY", "")
    if not api_key:
        sys.exit("GOOGLE_PLACES_API_KEY is not set")

    leads, total = collect(cfg["queries"], api_key, int(cfg.get("max_per_query", 10)))
    with_mobile = sum(1 for l in leads if l["phone"])
    with_email = sum(1 for l in leads if l["email"])
    print("Searched %d businesses; kept %d reachable (%d mobile, %d email)"
          % (total, len(leads), with_mobile, with_email))

    if args.dry_run:
        print(json.dumps(leads, indent=2, ensure_ascii=False))
        return

    api_url = os.environ.get("PULSE_API_URL", "")
    secret = os.environ.get("LEAD_FINDER_SECRET", "")
    if not api_url or not secret:
        sys.exit("PULSE_API_URL and LEAD_FINDER_SECRET must be set")
    for i in range(0, len(leads), 100):
        res = post_json(api_url.split("?")[0] + "?action=addFinderLeads",
                        {"secret": secret, "leads": leads[i:i + 100]})
        if not res.get("success"):
            sys.exit("PULSE rejected the leads: %s" % res.get("error"))
        print("Added %s, skipped %s duplicates" % (res.get("added"), res.get("skipped")))


if __name__ == "__main__":
    main()

"""Weekly lead finder: public BUSINESS listings from Google Places -> LEADS INBOX.

Only company listings (business name, business phone, website, address).
Nothing is scraped from social media. Needs two secrets:
  GOOGLE_PLACES_API_KEY  - Google Cloud key with "Places API (New)" enabled
  PULSE_API_URL          - your Apps Script web app URL (ends with /exec)
  LEAD_FINDER_SECRET     - same text as the Script Property in Apps Script
Run locally with --dry-run to print results without sending anything.
"""
import argparse
import json
import os
import sys
import urllib.request

PLACES_URL = "https://places.googleapis.com/v1/places:searchText"
FIELDS = ("places.id,places.displayName,places.internationalPhoneNumber,"
          "places.nationalPhoneNumber,places.websiteUri,places.formattedAddress")
HERE = os.path.dirname(os.path.abspath(__file__))


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


def to_lead(place, query):
    phone = place.get("internationalPhoneNumber") or place.get("nationalPhoneNumber") or ""
    name = (place.get("displayName") or {}).get("text", "")
    if not name or not phone:
        return None
    notes = " | ".join(x for x in (place.get("formattedAddress", ""),
                                   place.get("websiteUri", ""),
                                   "search: " + query) if x)
    return {"name": "", "company": name, "phone": phone, "email": "", "notes": notes}


def collect(queries, api_key, max_results, seen_ids=None):
    leads, seen_ids = [], set(seen_ids or ())
    for query in queries:
        for place in search(query, api_key, max_results):
            pid = place.get("id")
            if pid in seen_ids:
                continue
            seen_ids.add(pid)
            lead = to_lead(place, query)
            if lead:
                leads.append(lead)
    return leads


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    with open(os.path.join(HERE, "queries.json"), encoding="utf-8") as f:
        cfg = json.load(f)
    api_key = os.environ.get("GOOGLE_PLACES_API_KEY", "")
    if not api_key:
        sys.exit("GOOGLE_PLACES_API_KEY is not set")

    leads = collect(cfg["queries"], api_key, int(cfg.get("max_per_query", 10)))
    print("Found %d listings with a phone number" % len(leads))

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

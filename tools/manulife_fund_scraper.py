"""
Scrapes Manulife Malaysia's live fund price/performance page using your
free local Ollama model. This page loads its data via JavaScript, so this
script uses a real (headless) browser to load it fully before reading it —
that's the part a simple "fetch the page" approach can't do.

Before running this:
  - Ollama must be running (open the Ollama app once if unsure)
  - You must have already run: ollama pull llama3.2:1b

How to run:
  python manulife_fund_scraper.py

Note: fund websites sometimes require you to click through a page (e.g.
accept a disclaimer, or select a fund category) before the price table
shows. If this script returns nothing useful, that's usually why — see the
note at the bottom of this file for what to try next.
"""

from scrapegraphai.graphs import SmartScraperGraph

graph_config = {
    "llm": {
        "model": "ollama/llama3.2:1b",
        "base_url": "http://localhost:11434",
    },
    "verbose": True,
    "headless": True,
}

smart_scraper_graph = SmartScraperGraph(
    prompt=(
        "List every fund name shown on this page, along with its performance "
        "figures (1-year, 3-year, 5-year returns if shown), and note whether "
        "each fund is Shariah-compliant or conventional."
    ),
    source="https://www.manulifeim.com.my/funds/fund-prices.html",
    config=graph_config,
)

result = smart_scraper_graph.run()

print("\n--- RESULT ---")
print(result)

# If this comes back empty or incomplete:
#   The page may need a disclaimer accepted first, or the price table may
#   sit behind a "load more" / category filter click. In that case, tell
#   Claude what you saw on screen and we'll adjust the script (e.g. point
#   it at a specific fund's factsheet PDF instead, which is usually more
#   reliable than scraping a live price table anyway).

# Skills & Tools Log

Tracking Claude skills and tools installed for BGL work.

## Skills

### emil-design-eng
- **Installed:** Sept 10, 2026
- **Source:** [github.com/emilkowalski/skills](https://github.com/emilkowalski/skills) (free, open-source, MIT license)
- **What it does:** Gives Claude a set of rules for UI/design polish — button feel, animation timing, easing curves, popover behavior, etc. Useful when reviewing or building anything design-related (e.g. the 3D Rendering App or client-facing tools).
- **Where it lives:** Claude's skill folder (on this computer, via Claude Code) — triggers automatically when doing UI/animation/design review work.
- **How to use it:** Nothing special needed — just work on UI/design tasks in Claude Code on this computer (not this Cowork chat) and it applies itself automatically. To force it, say "review this using the emil design skill."

### taste-skill
- **Installed:** Sept 10, 2026
- **Source:** [github.com/leonxlnx/taste-skill](https://github.com/leonxlnx/taste-skill) (free, open-source)
- **What it does:** Gives Claude better design "taste" — steers it away from generic/boring layouts and output.
- **Where it lives:** Claude's skill folder (on this computer, via Claude Code) — same auto-trigger behavior as emil-design-eng, for UI/design work only.

## Tools

### scrapegraphai
- **Installed:** Sept 10, 2026
- **Source:** [github.com/ScrapeGraphAI/Scrapegraph-ai](https://github.com/ScrapeGraphAI/Scrapegraph-ai) (free, open-source)
- **What it does:** Python library for AI-powered web scraping — pulls structured data out of web pages using an AI model.
- **Paired with:** Ollama (local, free AI model) instead of a paid API, to avoid extra cost.
- **How to use it:** Ask Claude to write a scraping script — it is not auto-triggered like the skills above.

### Playwright
- **Installed:** Sept 10, 2026
- **What it does:** Browser automation engine — used by scrapegraphai (and other tools) to actually load and read web pages.

### Ollama (llama3.2:1b model)
- **Installed:** Sept 10, 2026
- **What it does:** Runs a small AI model locally and for free, used by scrapegraphai instead of a paid API. Chosen as the lighter model to avoid laptop lag.


# Social Content Generator – Plan (built 10 Oct 2026)

Goal: posts for **Facebook, Instagram and LinkedIn** (WhatsApp Status as a bonus) with little effort each week. Keep it **free**, keep **Claude credits low**, and keep it in Su's own voice.

Su's style (from the artifact "FB Caption Template – Personal Story Style"):
- Personal and warm, **never salesy**. Written for relatives and friends.
- Flow: story hook → "It hit close to home for me…" → short lesson line → simple explanation → local (Malaysia) angle → very soft "message me" call to action.
- No pricing, no product pitch, no "limited time".

---

## How it works (the mechanism)

```
1. IDEAS BANK   → a Google Sheet tab "CONTENT" (free)
                  Su adds: topic / news link / personal story / which pillar
2. GENERATE     → once a month, ONE Claude chat makes the whole month
                  (one long answer = far fewer credits than 30 small chats)
3. 3 VERSIONS   → each idea comes back as FB + IG + LinkedIn (+ WhatsApp Status)
4. CHECK        → Su reads, edits, ticks "Approved" (compliance check)
5. SCHEDULE     → free: Meta Business Suite (FB + IG), LinkedIn's own scheduler
6. TRACK        → "Posted" date + likes/comments → next month repeats what worked
```

### Content pillars (rotate so the feed isn't one-note)
| Pillar | Example | Link to A-N-T |
|---|---|---|
| Real-life stories / news | Anita Mui trust story | Death / legacy |
| L.I.F.E education | "Why hospital card comes first" | Hospitalization → Investment |
| Money habits | Budgeting, EPF, LHDN tax relief (RM 3,000) | Investment / Education |
| Behind the scenes | A day as an agent, training, team | Trust |
| Client wins (with permission, no names) | "A claim that helped a family" | Proof |
| Festive / seasonal | CNY, Raya, Deepavali, year-end tax | Reach |

Suggested rhythm: **3 posts a week** = about 12–13 a month.

### What each platform gets
| | Facebook | Instagram | LinkedIn |
|---|---|---|---|
| Length | Medium story (Su's style) | Short caption + 5–10 hashtags | Professional, lesson-first, 3–5 short paragraphs |
| Tone | Personal, warm | Light, visual | Calm expert, still personal |
| Picture | Optional | **Required** – square image or carousel text | Optional |
| CTA | "message me ❤️" | "DM me" | "Happy to share – drop me a message" |

---

## Options for the "GENERATE" step

| Option | How | Cost | Good | Not so good |
|---|---|---|---|---|
| **A. Monthly batch in Claude chat** ✅ | A saved Claude **skill / project** with Su's style rules. Paste the month's ideas → get all posts in one table | Uses normal Claude plan, **one chat a month** | Best writing, true to Su's voice, no setup | Copy-paste into the sheet |
| B. Template bank (no AI) | 30–50 fill-in-the-blank templates in a **Content** tab in the PULSE app, with a copy button and per-platform versions | **Free, zero credits** | Instant, offline, any agent can use | Less fresh; Su writes the story part |
| C. Auto-generate in Google Sheet | Apps Script + free Gemini API key fills the sheet weekly | Free tier | Fully automatic | Free tier may use the data for training; weaker in Su's voice; more setup |
| D. Paid tools (Canva Magic Write, Buffer AI, etc.) | – | Monthly fee | All-in-one | **Not free** – skip |

**Recommendation: A + B together.**
- **A** for the main monthly batch: quality, and Su's voice.
- **B** inside PULSE for quick daily posts (festive greetings, tips) without spending credits.

Pictures: **Canva free** with an A-N-T brand template (navy `#0B2545` + gold `#F3AF3D`, Oswald font). One template per pillar, so each post only needs a text change.

Scheduling (free):
- **Meta Business Suite** schedules FB + IG together.
- **LinkedIn** has its own scheduler (clock icon when posting).
- Buffer's free plan (3 channels, 10 queued posts each) is a backup.

---

## Compliance (important for insurance agents)
- No promised returns or guaranteed figures. Use "around / historically", and never quote a fund return as a promise.
- No product names with prices; no comparing with other insurers.
- Client stories only **with permission**, and no names or photos unless agreed in writing.
- Follow the company's / LIAM social media rules. If the agency needs pre-approval, the "Approved" tick in step 4 is that check.
- Add the company's standard disclaimer line if required.

---

## What would be built (if Su says go)
1. **Claude skill "Su social posts"** (Claude Toolkit vault): style rules, the 3 platform formats, pillars, compliance rules, and the output as a table (Date · Pillar · FB · IG · LinkedIn · Hashtags · Image idea).
2. **CONTENT tab** in the PULSE Google Sheet: Idea · Pillar · Story/link · FB · IG · LinkedIn · Image idea · Approved · Scheduled · Posted · Likes.
3. **(Option B)** **Content** screen in the PULSE app: pick a pillar → template → fill blanks → copy for FB / IG / LinkedIn, with a button to open each app.
4. Canva template set (Su makes these in Canva free; Claude gives sizes and layout).

## Decisions (10 Oct 2026)
- Platforms: **FB, IG, LinkedIn (English) + 小红书 XHS (Simplified Chinese)**
- **1 post a week** to start (may go to 3)
- Build **A + B**

## Focus change (10 Oct 2026)
- Posts lead with **awareness & education** ("Did you know…?": what it is → who is eligible → the benefit → good to know → soft CTA → disclaimer), about 3 out of 4 posts. Stories, festive and behind-the-scenes posts fill the rest.
- App: new first topic **Did you know?** with a template and a ready-made **PRS tax relief** example (LOAD PRS EXAMPLE).
- PRS facts used (checked 10 Oct 2026; re-check before posting): relief up to RM3,000/yr until YA 2030, shared with deferred annuity, separate from EPF/life insurance relief; anyone 18+ can open; full withdrawal from 55; early withdrawal only from Sub-account B with 8% tax penalty; returns not guaranteed; example 11% rate → about RM330 less tax.
- Reminder: PRS advice needs a PRS consultant licence, so keep PRS posts purely educational unless Su is licensed.

## Platform research (10 Oct 2026) – what performs best
- **Facebook:** the biggest platform in Malaysia. Relatable, news-led, "share with family" posts. Topical Malaysian money news (Budget 2026, medical card premium hikes of about 40–70%, tax deadline) gets attention.
- **Instagram:** carousels (now up to 20 slides) lead on **saves and DM shares**, and sends are the strongest signal for reaching non-followers. Reels give the most cold reach. Keyword captions now matter more than hashtags (5–10 is enough).
- **LinkedIn:** document / PDF carousel posts have the highest engagement (about 6–7%, 8–12 slides). Text of 1,300–2,500 characters. No external links. Polls are weak.
- **小红书:** 3:4 image notes, big-title cover with a number, 干货 lists / 避坑 / real experience, asking readers to 收藏.
- Finance video (TikTok / YouTube) reaches young Malaysians most. Optional later: carousel → short Reel.
- First month built from this: `Social Posts - Nov 2026` (PRS relief, children's life-insurance relief under Budget 2026, medical card premium hikes, year-end tax checklist).
- Not used: Agent Reach (reads XHS / X etc. with Su's logged-in accounts). It would need to run on Su's laptop with her logins, and it bypasses the platforms' official APIs (Terms of Service risk), so it is not run from the cloud.

## Publishing & media (10 Oct 2026)
- Su: **Facebook Page**, Instagram **Professional** → both can be scheduled automatically (Buffer free: 3 channels, 10 queued posts each, enough for 1 post/week; or Meta Business Suite). LinkedIn: Buffer or LinkedIn's own scheduler. 小红书: no official auto-posting – use 创作服务平台 定时发布 (don't use unofficial tools).
- **MAKE SLIDES** (Social Posts → open a post → MAKE SLIDES): builds branded carousel pictures from the post text – Instagram/FB 4:5 PNG, 小红书 3:4 PNG (中文), LinkedIn PDF. Editable text per slide, name on slides, SAVE or SHARE TO APP (phone share sheet). Free, on the phone (html2canvas + jsPDF already in the app).

## Built
- **A – Claude skill `su-social-posts`**: `PULSE/Social Posts Skill/SKILL.md` (upload as a zip in Claude → Settings → Capabilities → Skills). Su's voice, 4 platform formats, pillars, compliance, and a fixed output format the app can read.
- **B – PULSE app → A-N-T tab → Social Posts** (`ant/posts.html`):
  - **Templates** (free): 9 templates over 6 pillars, fill in the blanks (Chinese boxes for XHS fall back to English), live FB / IG / LinkedIn / XHS versions with character counts, Copy and Open app.
  - **From Claude**: paste the monthly answer → split into posts. "Copy monthly prompt" button.
  - **My Posts**: saved posts with a **Posted** tick per platform (kept on the phone).
- Not built (later if needed): CONTENT tab in Google Sheet, likes tracking, Canva templates (Su makes these in Canva free).

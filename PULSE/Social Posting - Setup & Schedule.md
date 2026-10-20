# Social Posting – Setup & Schedule (10 Oct 2026)

Link: [[Social Content Generator - Plan]]

## Which tool (all free)
| Platform | Tool | Why |
|---|---|---|
| Facebook Page | **Buffer free** | 1 place for 3 platforms |
| Instagram Professional | **Buffer free** | carousel pictures OK |
| LinkedIn (personal profile) | **Buffer free** (PDF post: LinkedIn app if Buffer won't take the PDF) | |
| 小红书 | 创作服务平台 → **定时发布** | no tool can post to XHS safely |

Buffer free = 3 channels, 10 queued posts per channel (1 post/week = only 4–5 queued, enough).
Backup if Buffer gives trouble: Meta Business Suite (FB + IG, free) + LinkedIn's own clock icon.

## One-time setup (about 20 min, on laptop)
1. Instagram app → Settings → **Accounts Centre** → link the IG account to the **Facebook Page** (needed by most schedulers).
2. Go to **buffer.com** → Get started free → sign up (use the same email as PULSE).
3. **Connect channel → Facebook** → log in → choose the **Page** (not personal profile) → allow all.
4. **Connect channel → Instagram** → pick **Business / Professional** → log in → allow.
   - If Buffer asks: choose **"Automatic publishing"** (posts by itself, not a phone reminder).
5. **Connect channel → LinkedIn** → choose your **profile** → allow.
6. Settings → **Timezone = Kuala Lumpur**.
7. Posting schedule (Wednesday, Malaysia time): **LinkedIn 5:00 PM · Facebook 8:00 PM · Instagram 9:00 PM** (see Best times below).
8. Install the **Buffer app** on the phone and log in (to add pictures from the phone).

## Each week / or all of November at once
1. PULSE → A-N-T → Social Posts → MY POSTS → open the post.
2. **MAKE SLIDES** → IG/FB → SAVE PICTURES (phone gallery). Also LinkedIn → SAVE PDF.
3. Buffer app → **New post** → tick FB + IG + LinkedIn.
4. Click **"Customize for each network"** → paste the FB text / IG text / LinkedIn text from PULSE (COPY buttons).
5. Add the slide pictures (IG + FB). LinkedIn: add the PDF if offered, else post it later in LinkedIn app.
6. **Schedule** → pick the date below → time per platform (LinkedIn 5 PM, FB 8 PM, IG 9 PM) → Schedule. (Different times = schedule each channel separately, or use "Add to Queue" once the posting schedule is set.)
7. 小红书: open 创作服务平台 (laptop) → 发布笔记 → upload 3:4 中文 slides + title + text → **定时发布** → same date.
8. After it goes out → PULSE → tick **Posted**.

## November plan (Wednesdays – LinkedIn 5 PM, FB 8 PM, IG 9 PM)
| Date | Post |
|---|---|
| Wed 4 Nov | PRS tax relief RM3,000 |
| Wed 11 Nov | Life insurance relief now covers children |
| Wed 18 Nov | Medical card premium went up – what to do |
| Wed 25 Nov | Year-end tax relief checklist |

Before scheduling each one: read the [NOTE] and re-check the facts (LHDN / PPA / BNM).

## If something goes wrong
- IG won't connect → IG must be Professional **and** linked to the FB Page (step 1).
- Post failed → Buffer emails you; open it and press "Share now".
- Buffer free shows "upgrade" for a feature → skip it, not needed.

## Zernio vs Buffer (checked 12 Oct 2026)
- Zernio = new name of "Late" (getlate.dev). Mainly a **posting API for apps/developers** (15 platforms, IG carousel, LinkedIn PDF).
- Price (their pricing page, as found in search): first **2 accounts free**, then about **US$6/month per extra account** → FB + IG + LinkedIn = ~US$6/month. (Older listings say free = 10 posts/month – check before signing up.)
- 小红书: **not listed** – still manual 定时发布.
- Decision: **stay on Buffer free** for now. Zernio only makes sense later if we want a "Post now" button inside PULSE (PULSE → Apps Script → Zernio API).

## Best times to post (checked 13 Oct 2026)
| Platform | Our time (Wed, MYT) | Why |
|---|---|---|
| LinkedIn | **5:00 PM** | Malaysia estimate 5–7 PM (peak 5 PM); Buffer global data: weekday afternoons, Wed 4 PM |
| Facebook | **8:00 PM** | Malaysia estimate 6–8 PM (peak 7 PM); Wednesday is the best day for engagement (Buffer) |
| Instagram | **9:00 PM** | Malaysia estimate 8–10 PM (peak 9 PM) |
- Weekends are weakest on most platforms (Sprout, Buffer).
- Malaysia figures come from timetopost.co (an estimate, not real Malaysian data). Global studies (Buffer, Sprout) point to daytime – our followers are working people, so evenings are the safer start.
- **Check after 4 weeks:** Buffer → Insights and Meta Business Suite → Insights show when *your* followers are online. Move the times if they say otherwise.

## Auto-post through Google (Apps Script) instead of Buffer? (20 Oct 2026)
| | Facebook Page | Instagram Professional | LinkedIn (personal) | 小红书 |
|---|---|---|---|---|
| Possible from Google Apps Script? | Yes (Meta Graph API) | Yes, but pictures must sit at a **public web link** (JPEG); carousels up to 10 | Yes (Share on LinkedIn API); PDF posts much harder | No |
| Setup | Meta developer app + Page token | same Meta app | LinkedIn developer app | – |
| Upkeep | token can be made long-lasting | same | **log in again every 60 days** | – |
- Cost: free, but ~half a day of setup (developer accounts, tokens) and things break when Meta/LinkedIn change rules.
- 20 Oct 2026: Su chose to **start with Facebook through Google** → [[Facebook Auto-Post - Setup Guide]]. Instagram/LinkedIn stay on Buffer for now.
- Earlier recommendation: **stay with Buffer free** (already connected, does the same). Revisit Google auto-post only if Buffer stops being free or we want "Post" buttons inside PULSE.

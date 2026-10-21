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
- 20 Oct 2026: tried **Facebook through Google** → blocked by Meta at the token step; Su kept going with a **System User token** (Plan B in [[Facebook Auto-Post - Setup Guide]]) → **Facebook auto-post works**. Instagram auto-post connected 21 Oct 2026. LinkedIn auto-post added 21 Oct 2026 (re-login every 60 days). Buffer no longer needed once LinkedIn works; 小红书 stays manual.
- Earlier recommendation: **stay with Buffer free** (already connected, does the same). Revisit Google auto-post only if Buffer stops being free or we want "Post" buttons inside PULSE.


## Social tab + schedule picker (21 Oct 2026)
- Social Posts now has its own bottom tab **Social** in PULSE (no longer inside A-N-T).
- **How often do you post?** 1× (Wed) · 2× (Tue, Thu) · 3× (Mon, Wed, Fri) a week + **usual time**. Saved on the phone. It sets the suggested dates in the scheduler and Claude's monthly prompt (COPY MONTHLY PROMPT).
- **SCHEDULE POST** now opens a picker: tap Facebook / Instagram / LinkedIn, pick a date on the calendar (or tap one of the next plan days), pick a time from the list (every 30 min), then **SCHEDULE**.
- **Each platform has its own suggested time** (from the best-times check of 13 Oct 2026): **LinkedIn 17:00 · Facebook 20:00 · Instagram 21:00**. Change them in the Social tab ("Best time for each platform") or per post in the picker. Needs the latest **Social.gs** in the Sheet (older code puts all platforms at one time).

- **3 posts a week (21 Oct 2026):** Social Posts skill + PULSE default are now **Mon, Wed, Fri**. Mon = Did you know?, Wed = L.I.F.E / money habits, Fri = lighter post. Re-upload `PULSE/Social Posts Skill/SKILL.md` to Claude (Settings → Capabilities → Skills) so Claude uses it.
- **SCHEDULE WHOLE MONTH (21 Oct 2026):** PULSE → Social → My Posts → **SCHEDULE WHOLE MONTH**. Makes the slides and schedules every post that has a date (today or later) and is not scheduled yet – each on its own date, at each platform's time. Keep the page open until it says **Done** (about 20 s per post). Scheduled posts show **Scheduled ✓**. Monthly routine: COPY MONTHLY PROMPT → Claude → paste in FROM CLAUDE → READ POSTS → SCHEDULE WHOLE MONTH (about 5 min). LinkedIn: if its login runs out before the last post, PULSE warns – reconnect first.
- **小红书 reminder (21 Oct 2026):** a red **小红书 to post** card shows on the PULSE **Today** tab on a post's day (and up to 14 days after if missed) until **Posted** is ticked for 小红书. Tap it → the post opens → COPY TITLE / COPY → post in 小红书 → tick Posted.
- **No repeated topics (21 Oct 2026):** COPY MONTHLY PROMPT now adds the list of posts in My Posts from the last 6 months + planned ones, and the skill avoids them. Keep old posts in My Posts (don't delete them) – they are the history. Skill re-uploaded as `su-social-posts.zip`.
- **小红书 buttons on Today (21 Oct 2026):** each 小红书 reminder has **📋 Copy & open 小红书** (copies title + text, opens the app), **🖼 Slides** (opens the post → MAKE SLIDES → 中文 + 小红书 3:4 → SAVE PICTURES) and **✓ Posted**.

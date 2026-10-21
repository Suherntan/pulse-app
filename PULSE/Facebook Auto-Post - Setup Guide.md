# Facebook Auto-Post through Google – Setup Guide (20 Oct 2026)

> **Status 20 Oct 2026: ✅ Facebook auto-post WORKS (System User token, Plan B). Instagram connected 21 Oct 2026. LinkedIn added – see the LinkedIn section.** First try (Explorer token) was blocked:
> - App 1 "PULSE Poster" (Business type, use case *Manage everything on your Page*, App ID 1116027154533655): Page permissions OK, but Graph API Explorer says *"No configuration available"*; "Facebook Login for Business" can't be added; the manual login link returns `blank.html#_=_` (no token).
> - App 2 "PULSE Poster 2" (*Facebook Login* use case): Page permissions are not offered at all.
> - Online guides (Oct 2026) recommend a **System User token** from a Meta *business portfolio*: made in Business Settings, never expires, no Explorer needed. Social.gs "Connect Facebook Page" now accepts it (leave the 2nd box empty).


Free. PULSE app → **SCHEDULE ON FACEBOOK** → row in the **SOCIAL QUEUE** tab of your PULSE Sheet → a Google timer (every 15 min) posts it to your **Facebook Page** with all slide pictures in one post.
Links: [[Social Posting - Setup & Schedule]] · code: `Social.gs`, privacy page: `privacy.html`

## Part 1 – Put the new code in your PULSE Sheet (5 min, laptop)
1. PULSE Sheet → **Extensions → Apps Script**.
2. Replace **Code.gs** with the latest Code.gs (GitHub → copy button → Ctrl+A, Ctrl+V → Save).
3. **+ → Script** → name `Social` → paste **Social.gs** → Save.
4. With **Social.gs** open, choose function **socialStatus** → **▶ Run** → Review permissions → Advanced → Go to … (unsafe) → **Allow** (names ending in _ are hidden from this list).
5. **Deploy → Manage deployments → ✏️ → New version → Deploy**.
6. Refresh the Sheet → new menu **Social Posts** appears. ✅ Done 20 Oct 2026.

## Part 2 – Make a free Meta "app" (15 min, laptop, one time)
> An "app" here just means a key that lets Google post to your Page. Log in with the Facebook account that **manages your Page**.
1. Go to **developers.facebook.com** → **Get Started / Log in** → register as a developer if asked (phone/email check).
2. **My Apps → Create App**.
   - Use case: **"Manage everything on your Page"** (or *Other* → type **Business**).
   - App name: **PULSE Poster** → Create.
3. If asked to add permissions/use case, make sure these are added: **pages_manage_posts, pages_read_engagement, pages_show_list**.
4. **App settings → Basic**:
   - Copy **App ID** and **App secret** (click Show) into Notepad.
   - **Privacy Policy URL**: your PULSE link + `/privacy.html` (e.g. `https://<your-pulse-link>/privacy.html`) → **Save changes**.
5. **Tools → Graph API Explorer**:
   - Meta App: **PULSE Poster**; User or Page: **User Token**.
   - Permissions: add **pages_manage_posts, pages_read_engagement, pages_show_list**.
   - **Generate Access Token** → in the pop-up choose **your Page** → Continue/Allow.
   - Copy the long token into Notepad.

## Part 3 – Connect (2 min)
1. PULSE Sheet → **Social Posts → Connect Facebook Page (one-time)**.
2. Paste **App ID** → OK, **App secret** → OK, **token** → OK.
3. "Connected ✓ Facebook Page: …". (The secret is used once and **not** saved; the Page key it gets does not expire.)
4. **Social Posts → Test Facebook Connection** → should show your Page name.
5. **Social Posts → Turn On Auto-Post (every 15 min)**.
6. Delete the Notepad file.

## Part 4 – Test post
1. PULSE app → Social Posts → open a post → **MAKE SLIDES** → **SCHEDULE ON FACEBOOK**.
2. Date: today. Time: **20 minutes from now** (24-hour, e.g. 15:40).
3. Check the **SOCIAL QUEUE** tab: Status *Queued* → after the time it becomes **Posted** with a link.
4. Open the link from **another phone / logged-out browser**. If others can't see the post: developers.facebook.com → your app → switch **App Mode** to **Live** (needs the Privacy Policy URL from Part 2.4).
5. Delete the test post from your Page if you don't want it.

## Every week
PULSE → post → MAKE SLIDES → **SCHEDULE ON FACEBOOK** → date + time (Wed 20:00). Done. Check SOCIAL QUEUE for *Posted* / *Failed* (the Error column says why).

## If something goes wrong
| Status / message | Fix |
|---|---|
| Error mentions **token / session / code 190** | Facebook key expired or password changed → Social Posts → Connect Facebook Page again (Part 2.5 + Part 3) |
| **code 200 / permission** | The 3 permissions weren't ticked or the Page wasn't chosen in Part 2.5 → redo 2.5 + Part 3 |
| Stays *Queued* after the time | Auto-Post is off → Social Posts → Turn On Auto-Post; or Social Posts → Post Due Items Now |
| "Unknown action: socialQueuePost" | Part 1 step 2 or 4 not done |

## Notes
- Instagram / LinkedIn: still Buffer (or later the same way). 小红书: manual 定时发布.
- Advisors on the PULSE Library get this after the Library is updated with Social.gs and they move to the new version + new connector.
- Not yet tested with a real Facebook Page – Part 4 is the real test.


## Plan B – System User token (recommended, never expires)
Free. Uses a Meta **business portfolio** (business.facebook.com). Laptop, ~15 min.
1. **business.facebook.com** → log in. If you have no business portfolio yet: **Create a business portfolio** (name e.g. *Tan Su Hern Advisory*, your name + email). Free.
2. ⚙️ **Settings** (Business settings) → **Accounts → Pages** → make sure **your Facebook Page** is in the portfolio (**Add → Add a Page you own**).
3. **Accounts → Apps** → **Add → Connect an app ID** → paste **1116027154533655** (PULSE Poster). (If asked: you are the app admin, approve it.)
4. **Users → System users** → **Add** → name `PULSE Bot` → role **Admin** → Create.
5. With PULSE Bot selected → **Assign assets** → **Pages** → your Page → turn on **full control / Manage Page** (at least *Create content*) → Save. Also **Apps** → PULSE Poster → **Full control** → Save.
6. **Generate token** → App: **PULSE Poster** → Token expiry: **Never** → permissions: `pages_manage_posts`, `pages_read_engagement`, `pages_show_list` → **Generate** → copy the token to Notepad (shown once).
7. PULSE Sheet → **Social Posts → Connect Facebook Page** → box 1: paste the token → box 2: **leave empty** → OK → "Connected ✓ (Page name)".
8. **Test Facebook Connection** → **Turn On Auto-Post** → do Part 4 (test post). Delete the Notepad file.
- If the Page isn't found: step 5 (assign the Page to PULSE Bot) wasn't saved.
- If posts are only visible to you: developers.facebook.com → PULSE Poster → App Mode → **Live** (privacy URL already set).


## Instagram auto-post (added 20 Oct 2026)
Same Google timer, same SOCIAL QUEUE. Posts the slides as a **carousel** (2–10 pictures) or a single picture to the **Instagram Professional account linked to your Facebook Page**. Instagram needs a public picture link, so each slide is shared "anyone with the link" only while it is being posted, then set back to private.
1. **Link Instagram to the Page:** Facebook Page → Settings → **Linked accounts → Instagram** → connect (or Instagram app → Accounts Centre). Instagram must be **Professional** (Business or Creator).
2. **Meta app PULSE Poster** (developers.facebook.com): Use cases → **Customize** → add `instagram_basic` and `instagram_content_publish`. If they are not offered there: **Add use cases → Manage messaging & content on Instagram** → choose the **Facebook Login** option → add those 2 permissions.
3. **Business Settings:** Accounts → **Instagram accounts** → add your account. Users → System users → **PULSE Bot** → Assign assets → **Instagram account** → full control.
4. **Generate a new token** for PULSE Bot: App PULSE Poster, Never, permissions `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`, `instagram_basic`, `instagram_content_publish`.
5. Paste the latest **Social.gs** → Save → Deploy → New version. Sheet → **Social Posts → Connect Facebook Page** → new token, box 2 empty → the message should show **Instagram: @yourname ✓**.
6. Test: PULSE app → post → MAKE SLIDES → **SCHEDULE POST (FB / IG)** → **2 = Instagram** → 20 min from now → SOCIAL QUEUE row "Instagram" → Posted + link.
- Instagram caption = the post's **IG** text (hashtags included). Max 10 slides.
- Error "Media download has failed" / "could not use the picture": tell Claude – the picture link style may need changing.


## LinkedIn auto-post (added 21 Oct 2026)
Same timer and SOCIAL QUEUE. Posts to your **personal LinkedIn profile** with the slides as a multi-picture post. ⚠ LinkedIn logins last **60 days** – PULSE warns when <10 days are left; then run **Social Posts → Connect LinkedIn** again (2 min, Client ID/secret are remembered).
1. **LinkedIn Page needed (free):** LinkedIn apps must belong to a Company Page. If you have none: linkedin.com → **For Business → Create a Company Page** (e.g. *Tan Su Hern Advisory*).
   - **No converting needed.** Your personal LinkedIn stays as it is. The Company Page is a separate free page you create *from* your personal account (you become its admin). Posts from PULSE still go to your **personal** profile.
   - ✅ **Page created 21 Oct 2026.** Earlier draft details: Name *7 Financial Blind Spots with Su Hern* · URL `7fbs-suhern` · Tagline *Spot the money gaps before they cost you. Simple talks on protection, savings & retirement.* · Industry Financial Services · Size 0–1 · Type Self-employed. Do not use the insurer's name.
2. **linkedin.com/developers/apps → Create app**: name `PULSE Poster`, LinkedIn Page = your Page, privacy policy `https://pulse-app-seven-wine.vercel.app/privacy.html`, upload a logo (any square image, e.g. the ANT logo) → Create. If asked, **Verify** the app for the Page (you are the Page admin).
3. **Products** tab → request **Share on LinkedIn** and **Sign In with LinkedIn using OpenID Connect** (both approved straight away).
4. **Auth** tab → **Authorized redirect URLs** → add `https://pulse-app-seven-wine.vercel.app/linkedin.html` → Update. Copy **Client ID** and **Primary Client Secret** to Notepad.
5. Paste the latest **Social.gs** → Save → Deploy → New version → refresh the Sheet.
6. **Social Posts → Connect LinkedIn** → Client ID → Client Secret → one box opens with the link **and** a code field: click **Open LinkedIn to allow PULSE** → Allow → PULSE page → COPY CODE → back to the Sheet box → paste → **Connect** → "LinkedIn connected ✓". (Fixed 21 Oct 2026: before, the code prompt hid the link box.)
7. Test: PULSE → post → MAKE SLIDES → **SCHEDULE POST** → type **L** → 20 min from now → SOCIAL QUEUE "LinkedIn" → Posted + link.
- Uses the post's **LinkedIn** text. Pictures 4:5, up to 20. (PDF carousel = later, if wanted.)
- Every ~2 months: Social Posts → Connect LinkedIn (leave ID/secret empty to keep them) → Allow → paste code.

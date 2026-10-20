# Facebook Auto-Post through Google – Setup Guide (20 Oct 2026)

Free. PULSE app → **SCHEDULE ON FACEBOOK** → row in the **SOCIAL QUEUE** tab of your PULSE Sheet → a Google timer (every 15 min) posts it to your **Facebook Page** with all slide pictures in one post.
Links: [[Social Posting - Setup & Schedule]] · code: `Social.gs`, privacy page: `privacy.html`

## Part 1 – Put the new code in your PULSE Sheet (5 min, laptop)
1. PULSE Sheet → **Extensions → Apps Script**.
2. Replace **Code.gs** with the latest Code.gs (GitHub → copy button → Ctrl+A, Ctrl+V → Save).
3. **+ → Script** → name `Social` → paste **Social.gs** → Save.
4. **Deploy → Manage deployments → ✏️ → New version → Deploy**.
5. Refresh the Sheet → new menu **Social Posts** appears.

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

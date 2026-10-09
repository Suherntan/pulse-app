# ANT Client Policy Registration Form — fix + deploy guide

_Last updated: 2026-09-07 — **deployed**: backend redeployed (new version), form live on Pages, both fixes verified in `main`._

Form that clients fill in online → a Google Apps Script Web App turns each
submission into a Google Doc, exports it to PDF, and drops it in a Drive folder.

---

## 1. How it's wired

| Piece | Where it lives |
|---|---|
| **The form** | `index.html`, self-contained, in repo **`Suherntan/ant-wealth-registration-form`** (branch `main`, repo root), served by **GitHub Pages** at `https://suherntan.github.io/ant-wealth-registration-form/`. Published by uploading the file on github.com. Pages settings: <https://github.com/Suherntan/ant-wealth-registration-form/settings/pages> |
| **The backend** | A **standalone Google Apps Script** project (`doPost`), account = su. Open it at [script.google.com](https://script.google.com) → recent projects. Not a file on the PC. |
| **Web App URL** | `https://script.google.com/macros/s/AKfycbwugi5-aLgVQwiN7hnKb1kaPYOjhpyTI6oya2gWpmfDF1hK8ukLtXeksOjxKba7s0KM/exec` (hard-coded in the form as `SCRIPT_URL`) |
| **Output PDFs** | Drive folder **"Client Registration Submissions"** |
| **Submission log** | Drive sheet **"Client Registration Log"** (auto-created on first submission after the fix) |

### Copies of the source
- **In this vault (`ANT-client-form/`):**
  - `AppsScript_Code.gs` — the backend code (paste into Apps Script)
  - `index.html` — the live form, pulled from `main` on 2026-09-07 (both fixes verified present)
- **Live / canonical:** the `index.html` in repo `Suherntan/ant-wealth-registration-form` (`main`, root) is the source of truth. Re-download any time from
  `https://raw.githubusercontent.com/Suherntan/ant-wealth-registration-form/main/index.html`
- `C:\Users\User\OneDrive\Desktop\ANT\AppsScript_Code.gs.txt` — same backend code on the Desktop
- `C:\Users\User\OneDrive\Desktop\ANT\ClientRegistrationForm*.html` — 3 **superseded** older variants, safe to delete
- `C:\Users\User\OneDrive\Desktop\ANT\GitHub\` — was deleted after the Pages upload; not needed
- `C:\Users\User\OneDrive\Desktop\ANT\.git` — empty stub, not a real repo

### Payload contract (form → `doPost`)
- POST body: `application/x-www-form-urlencoded`, single field `payload` = JSON string
- Shape: `{ fields: [{label, value}...], signatures: [{label, dataUrl}...] }`
- `signatures` carries **both** the 3 drawn signatures (PNG) **and** the IC photos (JPEG), keyed by label
- The request must be a "simple" CORS request (body = `URLSearchParams`, no custom headers) so there's no preflight `OPTIONS` — Apps Script can't answer OPTIONS.

---

## 2. The bug — why submissions didn't "push through"

Symptom: fill the form, hit Submit, see a green "Submitted" message, but **nothing
appears in Drive** — at least whenever IC photos were attached.

**Root cause:** the IC front/back images were embedded as **full-resolution,
lossless PNG** data URLs (no downscaling). A phone photo re-encoded as PNG is
5–20 MB each; 4 of them, base64 + percent-encoded into one `payload` parameter,
is tens of MB. That's past what Apps Script will accept as `e.parameter.payload`
— the request fails or arrives truncated, `JSON.parse` / `appendImage` throws
inside the swallowed `try/catch`, and `doPost` returns `{ok:false}`.

**Why it looked like success:** the form used `fetch(url, { mode:'no-cors' })`.
A `no-cors` response is *opaque* — it resolves for **any** server outcome (200,
302 login redirect, 413, 500). The only thing that rejects it is a total network
failure. So the client printed "Submitted — thank you." no matter what.

An earlier WebP→PNG conversion (added because Google Docs `appendImage` rejects
WebP) made it worse: PNG is lossless, so it inflated every IC image ~10×.

Submissions with **only the 3 signature scribbles** (a few KB) always worked —
that was the tell.

---

## 3. The fix — 4 changes across 2 files

### `index.html` (form)
1. **`toPngDataUrl`** now downscales each IC image to a 1600 px long edge and
   exports **`image/jpeg` at 0.82** (with a white matte, since JPEG has no
   alpha). ~200–400 KB instead of ~8 MB. Signatures stay full-res PNG (tiny).
2. **`submit`** dropped `mode:'no-cors'`. It now reads the JSON response, throws
   unless `data.ok`, and shows the real error:
   - success → `Submitted — saved to Drive.` (only when the server confirmed)
   - failure → `Not submitted: <reason>. Screenshot this and send it to your advisor.`

### `AppsScript_Code.gs.txt` (backend)
3. Blob **MIME is derived from the `data:` prefix** instead of assuming
   `image/png`, so JPEG IC images embed correctly (`.jpg` extension too). IC
   images are scaled **proportionally** to ≤400 pt wide; signatures keep the
   fixed 300×85.
4. New **`logRow()`** helper appends a row to the **"Client Registration Log"**
   sheet on every success *and* every caught error (timestamp, status, client
   name, `payloadKB`, field/image counts, error message). Wrapped so a logging
   failure can never break a submission. Also: explicit guard + clear error when
   the `payload` parameter is missing entirely.

---

## 4. Deploy / update — step by step

> Do the parts in order. **Don't clean anything up until Part C passes.**

### Part A — update the Apps Script backend
1. [script.google.com](https://script.google.com) → open the project for this form
   (deployment URL ends `…KM/exec`; standalone project, may be named "Untitled project").
2. Open `Code.gs` → `Ctrl+A`, delete, paste the **entire** contents of
   `AppsScript_Code.gs.txt`.
3. `Ctrl+S` to save.
4. **Deploy → Manage deployments** → click the active deployment → **pencil (Edit)**.
5. **Version → New version** → **Deploy**. Confirm **Execute as: Me** and
   **Who has access: Anyone**.
   - Editing the existing deployment keeps the same `/exec` URL — the form needs
     no change. Do **not** use "New deployment" (that mints a new URL).
6. Re-authorize when asked (the code now touches Sheets): pick account →
   **Advanced** → **Go to \<project\> (unsafe)** → **Allow**.

### Part B — update the form on GitHub Pages
1. Open <https://github.com/Suherntan/ant-wealth-registration-form> → `main` branch → repo root (where `index.html` is).
2. **Add file → Upload files** → drag in the new `index.html` (same filename replaces it).
3. **Commit changes** to `main`.
4. Wait 1–2 min, open <https://suherntan.github.io/ant-wealth-registration-form/>, hard-refresh (`Ctrl+Shift+R`).

### Part C — test one real submission
1. Fill **Full Name**, draw all 3 signatures, drop **2–4 IC images**, Submit.
2. Expect **"Submitted — saved to Drive."** (a failure now names its reason).
3. Drive → **Client Registration Submissions** → open the new PDF; IC images
   embedded, not squashed.
4. Drive root → **Client Registration Log** → a new `OK` row with `payloadKB=…`.

### Part D — clean up (only after Part C is green)
- **Drive:** delete old test PDFs in "Client Registration Submissions". Keep the
  folder. **Never** delete the Apps Script project.
- **Desktop `ANT\`:** delete the 3 `ClientRegistrationForm*.html` variants.
  **Keep** `AppsScript_Code.gs.txt` — it's the only copy of the backend; ideally
  commit it into the Pages repo next to `index.html`.

---

## 5. If it still fails after this

- The form now shows the real reason on screen — read it.
- Check the **Client Registration Log** sheet for `ERROR` rows and their message
  + `payloadKB`.
- In the Apps Script editor: **Executions** tab shows every `doPost` run and its
  stack trace.
- `mode:'no-cors'` is gone — if you ever re-add custom headers to that `fetch`
  it will trigger a preflight `OPTIONS` that Apps Script can't answer, and every
  submission will fail.

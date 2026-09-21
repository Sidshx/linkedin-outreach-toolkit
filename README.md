# LinkedIn Outreach & Job Tracker

An AI job-search assistant that lives inside a Google Sheet. It reads your LinkedIn job-alert emails, scores each job against your resume, tells you exactly what to fix, finds real people at the company, and drafts outreach messages for them.

**Free to run.** One free API key gets you everything core. No paid subscription is required at any point.

Works for any field — hardware, software, data, design, marketing, finance, healthcare, anything. The defaults ship with hardware verification/validation examples because that's what the author job-searched for; every one of those is clearly marked `EXAMPLE` and meant to be replaced with your own words.

---

## Setup (about 10 minutes)

### 1 · Create the sheet
Make a blank Google Sheet. Name it whatever you like.

### 2 · Add the code
`Extensions → Apps Script`. Create one file per item below and paste in the contents:

| File | Type |
|---|---|
| `Config.gs` | Script |
| `Main.gs` | Script |
| `LinkedInReachout.gs` | Script |
| `Sidebar.html` | HTML |

Then open `appsscript.json` (enable *Show "appsscript.json" manifest file* in Project Settings) and paste in this repo's version. Save.

### 3 · Get your free API key
Open <https://aistudio.google.com/apikey> → **Create API key** → copy it.

In the Apps Script editor: `⚙ Project Settings → Script Properties → Add script property`

| Property | Value |
|---|---|
| `GEMINI_API_KEY` | the key you just copied |

Click **Save script properties**. Keys live here, never in the code, so you can share your config freely.

### 4 · Fill in Section 1 of `Config.gs`
Everything you need to edit is in **Section 1** at the top of the file. Four short blocks:

- **1.1 About you** — your name, experience, skills
- **1.2 Which jobs to capture** — words that appear in your target job titles
- **1.3 Your resume(s)** — leave as-is if you have one resume
- **1.4 Which features to turn on** — sensible free defaults already set

Everything below Section 1 has working defaults. You can stop reading there.

### 5 · Run one-click setup
Reload the spreadsheet, then: **🤖 Assistant → ⚡ First-Time Setup**

This creates every tab, installs the interactive dropdowns, schedules the daily automation, and then tells you in plain English if anything is still missing. Safe to re-run any time.

### 6 · Paste your resume
Go to the **Settings** tab. Column A holds a label, column B holds the resume text. Paste your full resume into column B of the `General` row. Done.

### 7 · Authorize
Run **📧 Fetch LinkedIn Jobs (Manual)** once. Google will ask for permissions — approve them.

> ⚠️ **Authorize with the Google account that receives your LinkedIn job alerts.** If you approve with a different account, the script will search the wrong mailbox and silently find nothing.

---

## Daily flow

1. LinkedIn job alerts arrive in Gmail
2. The automation pulls matching jobs into the **Inbox** tab
3. You paste the job description into column D
4. AI scores the job and lists your gaps → row moves to **Job Tracker**
5. You apply, then pick **Applied ✅** from the Status dropdown
6. **📥 Archive Applied Jobs** moves it to **Archive**
7. Set **Reachout?** to `Yes` on any archived row → the assistant finds people and drafts messages into **AI Reachout**

---

## The Status column is a dropdown

No typing. Click any cell in the **Status** column of the Job Tracker and pick from the list:

`Ready to Apply` · `Applied ✅` · `Interviewing` · `Offer` · `Rejected` · `Not a fit`

Rows turn green when applied, red when rejected. The archive step looks for the applied value automatically. Change the available options in `CONFIG.STATUS_OPTIONS` and run **🔄 Refresh Dropdown Columns**.

The **Reachout?** column on the Archive tab is a `No / Yes / Done` dropdown the same way.

---

## API keys — what's actually required

| Key | Cost | Needed for | Required? |
|---|---|---|---|
| `GEMINI_API_KEY` | **Free**, no card | Resume analysis, message drafting | Yes, for AI features |
| `APIFY_TOKEN` | **Free tier**, no card to start | Finding people at companies | Only if `FIND_PEOPLE_TO_CONTACT` is on |
| `PERPLEXITY_API_KEY` | Paid | Extra research on each person | **No.** Off by default |

The paid key is genuinely optional. `AI_FALLBACK_PROVIDER` ships as `''` specifically so the toolkit never reaches for a paid service on its own.

### Finding your Apify token (the confusing one)

The token is on exactly one page and nowhere else. Don't hunt through Actors or Store.

1. Sign up free: <https://console.apify.com/sign-up>
2. Go **directly** to <https://console.apify.com/settings/integrations>
3. Find the **Personal API tokens** box at the top
4. Click the 👁 eye icon to reveal it, then the copy icon
5. It starts with `apify_api_` — paste the **whole** string as `APIFY_TOKEN`

Inside the sheet, **🤖 Assistant → 🔑 Where do I get API keys?** shows these steps with clickable links any time.

---

## Enabling AI outreach on free keys only

Yes, this works with no paid API. In `Config.gs` Section 1.4:

```javascript
FEATURES: {
  FIND_PEOPLE_TO_CONTACT: true,   // needs the free APIFY_TOKEN
  DRAFT_OUTREACH_MESSAGES: true,  // uses your free GEMINI_API_KEY
  RESEARCH_EACH_PERSON: false     // leave false — this is the only paid part
}
```

That gives you the top 5 people per company with names, roles, profile links, and a drafted message for each.

**Only want the names and links, no AI messages?** Set `DRAFT_OUTREACH_MESSAGES: false`. Then Apify alone is enough — you'll get the contact list and write your own messages.

**Who it looks for:** by default, people holding the same job title as the posting. To target recruiters or hiring managers instead, set `CONTACT_TITLES` in Section 2:

```javascript
CONTACT_TITLES: ['recruiter', 'talent acquisition'],
```

---

## Multiple resumes (or just one)

**One resume?** Leave `CONFIG.RESUMES` exactly as shipped. Paste your resume into the `General` row of the Settings tab. Nothing else to do.

**Several resumes?** Add one entry per resume. Each job automatically gets matched to the right one based on its title:

```javascript
RESUMES: [
  { NAME: 'General',      WHEN_ROLE_CONTAINS: [] },                        // catch-all, keep first
  { NAME: 'Verification',  WHEN_ROLE_CONTAINS: ['verification', 'uvm'] },
  { NAME: 'Validation',    WHEN_ROLE_CONTAINS: ['validation', 'silicon'] }
]
```

Then add a matching row in the Settings tab for each: label in column A, resume text in column B. The first entry whose keywords appear in the job title wins; if none match, the first entry is used as the default. Which resume was chosen is recorded in the **Resume Used** column so you know which file to send.

Scales to as many resumes as you want — add a config entry and a sheet row per resume.

---

## Menu reference

| Item | What it does |
|---|---|
| ⚡ First-Time Setup | Creates tabs, dropdowns, and automation; reports what's missing |
| ✅ Check My Setup | Plain-English checklist of what's working and what isn't |
| 🔑 Where do I get API keys? | Step-by-step key instructions with links |
| 👁️ View Full Screen Analysis | Readable dashboard for the selected job |
| 📥 Archive Applied Jobs | Moves applied rows to Archive |
| 📧 Fetch LinkedIn Jobs | Pulls new jobs from Gmail |
| ▶️ / ⏭️ Run AI | Analyze one row or all pending rows |
| 🔗 Find People + Draft | Contact discovery and message drafting |
| 🧹 Clean Up Imported Rows | Strips stray HTML and deletes rows that aren't real jobs |
| 🔄 Refresh Dropdown Columns | Re-applies dropdowns after config changes |
| ⏰ Set Up Daily Automation | Schedules the twice-daily run |

---

## Troubleshooting

**Run 🤖 Assistant → ✅ Check My Setup first.** It names the specific problem and the fix.

| Symptom | Fix |
|---|---|
| `GEMINI_API_KEY is not set` | Add it under Project Settings → Script Properties, then **Save script properties**. The name must match exactly, no spaces. |
| Key added but still failing | You're likely in the wrong Apps Script project, or you didn't click Save. Re-check, then run **✅ Check My Setup**. |
| `model ... is no longer available` | Google retired the model. Update `GEMINI_MODEL` in Section 3 — current list at <https://ai.google.dev/gemini-api/docs/models> |
| No jobs found | Your `JOB_INCLUDE_KEYWORDS` don't match your alert titles, or the script is authorized under the wrong Google account. |
| Company and Role columns swapped | Fixed in the current version. Run **🧹 Clean Up Imported Rows**, then re-fetch. |
| Raw HTML like `<strong class=...>` in a cell | Same fix — run **🧹 Clean Up Imported Rows**. |
| Wrong Google account authorized | Copy the sheet into the correct account, re-paste the Script Properties, re-run ⚡ First-Time Setup. |
| No contacts found | Check the company spelling; try `CONTACT_TITLES: ['recruiter']`; run `debugFullPipeline()` from the editor. |
| Apify HTTP 401/403 | Re-copy the full token from the integrations page — it must start with `apify_api_`. |

Set `DRY_RUN: true` in Section 2 to log everything without writing to the sheet or sending email. Good for a first test run.

---

## Design choices kept deliberately as-is

These look like things to tidy up but shouldn't be:

- **`Utilities.sleep()` between API calls** — prevents rate-limiting and provider bans. Removing them causes failed batches.
- **Triple deduplication** across Inbox, Job Tracker, and Archive — a job you already archived won't reappear weeks later.
- **Signal-based contact ranking** rather than taking the first N search results — measurably better contact quality.
- **Log trimmed to 20 rows** — keeps the sheet responsive.
- **Alert-heading rejection in the email parser** — LinkedIn's own headline ("Software Security Engineer jobs in Huntsville") looks exactly like a job title. Matching it shifts every column by one. The `jobs? in ` pattern in `GMAIL_NOISE_PATTERNS` is load-bearing.
- **Model name as a single config value** — when a provider retires a model, it's a one-line fix.

---

## License

MIT. Use it, fork it, share it.

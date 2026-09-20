# LinkedIn Job Tracker & Outreach Toolkit

A free, no-server job-search assistant that lives entirely inside a Google
Sheet. It:

- Reads LinkedIn job-alert emails already in your Gmail and drops new
  postings into an **Inbox** tab (no API key, no third-party service).
- Runs an AI resume-vs-job-description match analysis and writes a score,
  gap analysis, and surgical resume edit suggestions to a **Job Tracker**
  tab.
- Optionally (toggle, off by default) finds relevant people at a company
  via live LinkedIn search and drafts personalized outreach messages in an
  **AI Reachout** tab.
- Runs on a daily schedule automatically, with an optional morning summary
  email.

Everything is a **Google Sheet + bound Apps Script** — there's nothing to
host, deploy, or run from a terminal. Setup is copy/paste + one config
edit.

## Quick start (5 minutes)

1. **Create the spreadsheet.**
   - Easiest: make a blank Google Sheet, open **Extensions → Apps Script**,
     paste in `setup/create_template_sheet.gs`, run
     `createLinkedInOutreachTemplate()` once, then open the sheet it logs
     a URL for. Delete the throwaway sheet you started with.
   - Or build the tabs by hand — the exact headers each tab needs are
     listed in that same setup script.
2. **Add the toolkit code.** In your new sheet, open
   **Extensions → Apps Script** and create these files, pasting in the
   matching content from this repo:
   - `Config.gs`
   - `Main.gs`
   - `LinkedInReachout.gs`
   - `Sidebar.html` (use the HTML file type)
   - Replace the auto-generated `appsscript.json` with this repo's version
     (**Project Settings → Show "appsscript.json"** to expose it in the
     editor).
3. **Edit `Config.gs`.** This is the only file you should need to touch.
   At minimum, fill in `CONFIG.ANALYSIS.CANDIDATE_*` fields with your own
   background — everything else has sensible defaults.
4. **Add your resume text.** In the **Settings** tab, paste your resume
   into cell `B1` (and, optionally, a second variant into `B2`).
5. **Set your API key(s).** In the Apps Script editor:
   **Project Settings → Script Properties → Add script property.**
   - `GEMINI_API_KEY` — required if `CONFIG.AI_PROVIDER` is `"gemini"`
     (the default). Get a free key at
     [Google AI Studio](https://aistudio.google.com/apikey).
   - `PERPLEXITY_API_KEY` — only needed if you set `AI_PROVIDER`,
     `AI_FALLBACK_PROVIDER`, or `SCRAPING_PROVIDER` to `"perplexity"`.
     Get one at [Perplexity's API settings](https://www.perplexity.ai/settings/api).
   - `APIFY_TOKEN` — only needed if you turn on
     `ENABLE_LIVE_PROFILE_SCRAPING` with `SCRAPING_PROVIDER: 'apify'`. Get
     one at [Apify Console](https://console.apify.com/).
6. **Authorize and run.** Reload the sheet — a new **🤖 Assistant** menu
   appears. Run **📧 Fetch LinkedIn Jobs (Manual)** once to test, approve
   the OAuth prompts (this is your own Google account's Gmail/Sheets
   access — no external server ever sees your email).
7. **(Optional) Turn on daily automation.** Menu → **⏰ Set Up Daily
   Triggers**. Runs the fetch + AI analysis automatically every morning
   and evening.

That's it — no `npm install`, no server, no deployment step.

## What needs an API key, and can it be free?

| Component | Needs a key? | Free tier? |
|---|---|---|
| Reading Gmail job-alert emails | No — built-in `GmailApp`, your own OAuth | Always free |
| Writing to the spreadsheet | No — built-in `SpreadsheetApp` | Always free |
| AI resume/JD match analysis | Yes — one LLM key | Yes, via Gemini's free tier (default) |
| Live LinkedIn contact discovery (optional) | Yes, only if you enable it | No ongoing free tier — see below |

**Default mode (recommended to start): 100% free.** With
`ENABLE_LIVE_PROFILE_SCRAPING: false` and `AI_PROVIDER: 'gemini'`, the
whole tool runs on Gmail/Sheets OAuth (free, unlimited for personal use)
plus Gemini's free API tier (no credit card required). No live outreach
contact discovery happens in this mode — you get job tracking and resume
matching only.

**Enabling live outreach contact discovery** requires either an Apify
token (pay-as-you-go, cheap at personal volume) or a funded Perplexity API
key (no permanent free tier, but Pro subscribers get monthly credit).
Config validation enforces this: if you flip
`ENABLE_LIVE_PROFILE_SCRAPING` to `true` without setting the matching key,
the script stops with a clear error before doing any work, rather than
failing partway through a batch.

You can hold as many keys as you want in Script Properties — there's no
hard limit, and adding a new provider later is a config change, not a
code change.

## Every parameter lives in `Config.gs`

Nothing else in the codebase should contain a literal value you'd need to
hunt for and edit. If you want to change:

- which Gmail search finds job alerts, or which keywords count as a match
  → `CONFIG.GMAIL`
- your background used in AI prompts and outreach messages
  → `CONFIG.ANALYSIS.CANDIDATE_*`
- how many contacts to surface per job, message tone/length, or company
  name → LinkedIn slug mapping → `CONFIG.OUTREACH`
- which AI provider drafts things, and the fallback order
  → `CONFIG.AI_PROVIDER` / `CONFIG.AI_FALLBACK_PROVIDER`
- whether live contact discovery is on, and which provider
  → `CONFIG.ENABLE_LIVE_PROFILE_SCRAPING` / `CONFIG.SCRAPING_PROVIDER`
- daily automation times, or a dry-run mode to test safely
  → `CONFIG.TRIGGERS` / `CONFIG.DRY_RUN`

...it's a value in `Config.gs`, not a change to `Main.gs` or
`LinkedInReachout.gs`.

## Design choices kept intentionally as-is

A few things are deliberately **not** simplified further, because doing so
would measurably reduce reliability or match quality:

- **Rate-limit delays** between batch API calls (`Utilities.sleep(...)`)
  — removing these risks provider throttling or bans. They're exposed as
  config numbers, not eliminated.
- **The contact-ranking/scoring logic** (`scoreAndSlice`) — weights are
  configurable, but the underlying signal-based approach is kept rather
  than "just take the first N results," which would lower match quality.
- **Triple deduplication** across Inbox/Job Tracker/Archive when fetching
  jobs — prevents duplicate entries as jobs move through the pipeline.
- **Config validation before every pipeline run** — a bad or incomplete
  setup fails fast with one clear message instead of partway through a
  batch or as a silent no-op.

## File overview

| File | Purpose |
|---|---|
| `Config.gs` | Every tunable parameter and API-key getter. Edit this one. |
| `Main.gs` | Menu, Gmail job discovery, AI resume/JD analysis, triggers, logging. |
| `LinkedInReachout.gs` | Optional live contact discovery + AI outreach message drafting. |
| `Sidebar.html` | In-sheet dashboard for reviewing AI analysis and copying resume edits. |
| `appsscript.json` | Apps Script manifest (timezone, OAuth scopes). |
| `setup/create_template_sheet.gs` | One-time helper that scaffolds a correctly-structured sheet. |

## License

MIT — see `LICENSE`. Free to use, fork, and share.

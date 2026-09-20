/**
 * ============================================================
 * CONFIG.GS — THE ONLY FILE YOU SHOULD NEED TO EDIT
 * ============================================================
 * Every tunable value for the whole toolkit lives here: job filters,
 * your background (used to draft outreach messages), the outreach
 * message rules, scoring weights, and feature toggles.
 *
 * API keys are NOT stored here — they go in Script Properties
 * (Project Settings -> Script Properties in the Apps Script editor)
 * so they never end up in source control. See README for the 2-minute
 * setup. This file only reads them via the getters at the bottom.
 * ============================================================
 */

const CONFIG = {

  // ── SHEET STRUCTURE ────────────────────────────────────────
  // Tab names. Change these only if you rename tabs in your own copy
  // of the spreadsheet template.
  SHEETS: {
    INBOX: 'Inbox',
    JOB_TRACKER: 'Job Tracker',
    ARCHIVE: 'Archive',
    REACHOUT: 'AI Reachout',
    LOG: 'Log',
    SETTINGS: 'Settings'
  },

  START_ROW: 2,          // first data row (row 1 = headers)
  LOG_MAX_ROWS: 20,       // trims the Log tab so it never grows unbounded

  // ── GMAIL JOB DISCOVERY ─────────────────────────────────────
  GMAIL: {
    // Gmail search used to find LinkedIn job-alert emails.
    // Keep the linkedin.com sender filter; edit the keyword list freely.
    SENDER_FILTER: 'from:linkedin.com',
    LOOKBACK_WINDOW: 'newer_than:2d',

    // A job title line must contain at least one of these to be captured.
    INCLUDE_KEYWORDS: ['verification', 'validation'],

    // Lines containing these are treated as noise (LinkedIn's own alert
    // boilerplate), not real job titles, and are skipped.
    NOISE_PHRASES: [
      'your job alert',
      'match your preferences',
      'new jobs match',
      'intended for'
    ],

    // Seniority/role words to exclude from capture — edit freely to
    // widen or narrow what counts as a relevant opening.
    EXCLUDE_SENIORITY: ['staff', 'principal', 'lead', 'intern', 'manager']
  },

  // ── AI RESUME/JD MATCH ANALYSIS ─────────────────────────────
  ANALYSIS: {
    // Free-text description of the roles you're targeting, used inside
    // the AI prompt so it knows what to weigh heavily. Rewrite this for
    // your own field — it does not have to be hardware/silicon.
    RECRUITER_PERSONA: 'You are an expert technical recruiter and hiring manager screen.',
    PRIORITY_SIGNALS: [
      'Core technical stack relevant to the target role',
      'Domain-specific tools, platforms, or methodologies named in the JD',
      'Adjacent/transferable skills that strengthen the match even if the JD is silent on them'
    ],
    // Two resume variants are supported out of the box (see the Settings
    // tab, cells B1/B2). CATEGORY_B_KEYWORDS decides which JDs route to
    // the second resume. Leave empty to always use the primary resume.
    RESUME_A_LABEL: 'Primary',
    RESUME_B_LABEL: 'Secondary',
    CATEGORY_B_KEYWORDS: ['validation'],

    // Candidate identity injected into every AI prompt. Fill this in with
    // your own background — used for both resume-gap analysis and for
    // drafting outreach messages below.
    CANDIDATE_NAME: 'Your Name',
    CANDIDATE_SIGNOFF: 'Your Name',
    CANDIDATE_PRIMARY_EXPERIENCE: 'Primary role/skills you want emphasized (e.g. "Backend Engineering at Company X — Go, distributed systems, Kafka")',
    CANDIDATE_SECONDARY_EXPERIENCE: 'Secondary role/skills, used as a fallback framing (e.g. "Data Engineering internship — Python, Airflow, dbt")',
    CANDIDATE_EDUCATION: 'Degree, School, expected graduation, GPA (optional)',
    CANDIDATE_SKILLS: 'Comma-separated list of key skills/tools to mention'
  },

  // ── LINKEDIN OUTREACH ────────────────────────────────────────
  OUTREACH: {
    // Column letter in the Archive tab used as the "send outreach?" flag.
    // The pipeline only processes rows where this column = TRIGGER_VALUE
    // AND the Status column already contains STATUS_MUST_INCLUDE.
    TRIGGER_COLUMN_LETTER: 'L',
    TRIGGER_VALUE: 'Yes',
    STATUS_COLUMN_LETTER: 'I',
    STATUS_MUST_INCLUDE: 'Applied',

    TOP_N_CONTACTS: 5,          // how many people to surface per job
    DELAY_BETWEEN_JOBS_MS: 3000, // pause between jobs in "reach out to all" mode — do not remove; avoids rate limits

    MAX_MESSAGE_WORDS: 120,
    MESSAGE_GOAL: 'ask for advice, guidance, or a referral for full-time roles',

    // Maps a company name (lowercase, as it appears in your sheet) to its
    // LinkedIn company-page slug, used to build more precise search
    // queries. Add your own target companies; unmapped companies fall
    // back to a best-guess slug (lowercased, spaces -> hyphens).
    COMPANY_SLUG_MAP: {
      // 'example company': 'example-company-slug'
    },

    // Scoring weights used when a provider returns multiple candidate
    // profiles and the tool needs to rank/trim to TOP_N_CONTACTS.
    // Tweak weights, but keep the underlying signals — loosening this to
    // "just take the first N results" measurably lowers match quality.
    SCORING_WEIGHTS: {
      HAS_RECENT_POSTS: 3,
      FOLLOWER_THRESHOLD: 500,
      FOLLOWER_SCORE: 2,
      CONNECTION_THRESHOLD: 200,
      CONNECTION_SCORE: 1,
      HAS_SUMMARY: 1,
      RECENT_ACTIVITY_UNDER_30D: 4,
      RECENT_ACTIVITY_UNDER_90D: 2,
      RECENT_ACTIVITY_UNDER_180D: 1
    }
  },

  // ── LIVE PROFILE SCRAPING TOGGLE ─────────────────────────────
  // Default OFF: the tool only reads job data already in your Gmail —
  // zero external key required, zero cost, fully functional.
  //
  // Turn ON to enrich/discover LinkedIn contacts via a live search
  // provider. If you enable this, a matching API key below becomes
  // COMPULSORY — the script hard-stops with a clear error rather than
  // silently skipping people or failing partway through a batch.
  ENABLE_LIVE_PROFILE_SCRAPING: false,

  // Which provider to use when the toggle above is true.
  // Supported: 'apify' | 'perplexity'
  SCRAPING_PROVIDER: 'apify',

  // ── AI PROVIDER ───────────────────────────────────────────────
  // Which provider drafts resume analysis + outreach messages.
  // Supported: 'gemini' | 'perplexity'
  // Gemini has a free tier; Perplexity requires a funded API key but
  // can also power live people-search (see SCRAPING_PROVIDER above).
  AI_PROVIDER: 'gemini',
  AI_FALLBACK_PROVIDER: 'perplexity', // used only if the primary provider errors; set to '' to disable fallback

  GEMINI_MODEL: 'gemini-3.6-flash',
  PERPLEXITY_MODEL: 'sonar',

  // ── DAILY AUTOMATION ─────────────────────────────────────────
  TRIGGERS: {
    MORNING_HOUR: 6,
    EVENING_HOUR: 17,
    SEND_MORNING_EMAIL: true
  },

  // Set true to log every action without writing/sending anything —
  // useful for a first run so you can confirm setup before it touches
  // your sheet or sends email.
  DRY_RUN: false
};

// ============================================================
// API KEYS — read from Script Properties, never hardcoded here.
// Set them via: Apps Script editor -> Project Settings -> Script Properties.
// ============================================================
function getGeminiKey()     { return PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'); }
function getPerplexityKey() { return PropertiesService.getScriptProperties().getProperty('PERPLEXITY_API_KEY'); }
function getApifyToken()    { return PropertiesService.getScriptProperties().getProperty('APIFY_TOKEN'); }

/**
 * Validates the config before any pipeline runs. Called at the start of
 * every entry point so a bad setup fails fast with one clear message
 * instead of partway through a batch or as a silent no-op.
 */
function validateConfig() {
  const errors = [];

  if (CONFIG.AI_PROVIDER === 'gemini' && !getGeminiKey()) {
    errors.push('AI_PROVIDER is "gemini" but GEMINI_API_KEY is not set in Script Properties.');
  }
  if (CONFIG.AI_PROVIDER === 'perplexity' && !getPerplexityKey()) {
    errors.push('AI_PROVIDER is "perplexity" but PERPLEXITY_API_KEY is not set in Script Properties.');
  }
  if (CONFIG.AI_FALLBACK_PROVIDER === 'gemini' && !getGeminiKey()) {
    errors.push('AI_FALLBACK_PROVIDER is "gemini" but GEMINI_API_KEY is not set.');
  }
  if (CONFIG.AI_FALLBACK_PROVIDER === 'perplexity' && !getPerplexityKey()) {
    errors.push('AI_FALLBACK_PROVIDER is "perplexity" but PERPLEXITY_API_KEY is not set.');
  }

  if (CONFIG.ENABLE_LIVE_PROFILE_SCRAPING) {
    if (CONFIG.SCRAPING_PROVIDER === 'apify' && !getApifyToken()) {
      errors.push('ENABLE_LIVE_PROFILE_SCRAPING is true and SCRAPING_PROVIDER is "apify", but APIFY_TOKEN is not set. Either add the token or set ENABLE_LIVE_PROFILE_SCRAPING to false.');
    }
    if (CONFIG.SCRAPING_PROVIDER === 'perplexity' && !getPerplexityKey()) {
      errors.push('ENABLE_LIVE_PROFILE_SCRAPING is true and SCRAPING_PROVIDER is "perplexity", but PERPLEXITY_API_KEY is not set. Either add the key or set ENABLE_LIVE_PROFILE_SCRAPING to false.');
    }
  }

  if (errors.length > 0) {
    throw new Error('Config error(s):\n- ' + errors.join('\n- '));
  }
}

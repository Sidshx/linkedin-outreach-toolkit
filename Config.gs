/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  CONFIG.GS — THE ONLY FILE YOU NEED TO EDIT                      ║
 * ║                                                                  ║
 * ║  SECTION 1 is everything a first-time user must fill in.         ║
 * ║  Stop reading after Section 1 — Sections 2 and 3 have working    ║
 * ║  defaults and most people never touch them.                      ║
 * ║                                                                  ║
 * ║  100% FREE TO RUN. No paid API is ever required.                 ║
 * ║  You need exactly ONE free key (Gemini) to get started.         ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const CONFIG = {

// ╔══════════════════════════════════════════════════════════════════╗
// ║                                                                  ║
// ║   SECTION 1 · START HERE                                         ║
// ║   Fill in these 4 blocks and you're done. Nothing else required. ║
// ║                                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝

  // ┌────────────────────────────────────────────────────────────────┐
  // │ 1.1 · ABOUT YOU                                                │
  // │ Used to tailor resume feedback and outreach messages.          │
  // │ Write it however you'd describe yourself to a recruiter.        │
  // │ Works for ANY field — software, hardware, data, design,        │
  // │ marketing, finance, nursing, teaching, anything.               │
  // └────────────────────────────────────────────────────────────────┘
  ME: {
    NAME: 'Your Name',

    // One line: what you are and what you're looking for.
    HEADLINE: 'Engineer seeking full-time roles',

    // Your strongest, most relevant experience. Be specific — this is
    // what the AI uses to find gaps and to sound credible in messages.
    // EXAMPLE (hardware): 'RISC-V CPU design verification — UVM, SystemVerilog, coverage-driven regression'
    // EXAMPLE (software): 'Backend engineering — Go, Kubernetes, distributed systems at scale'
    // EXAMPLE (data):     'Analytics engineering — dbt, Snowflake, Airflow, experiment design'
    EXPERIENCE: 'Your main experience — tools, domains, and what you actually built',

    // Second-strongest experience, used when a job leans a different way.
    // Leave as an empty string '' if you only have one thing to say.
    EXPERIENCE_ALT: '',

    // Optional. Leave '' to omit from messages entirely.
    EDUCATION: '',

    // Comma-separated. The concrete tools/skills you want surfaced.
    SKILLS: 'List, your, key, tools, and, skills',

    // What you're asking people for at the end of an outreach message.
    ASK: 'advice, guidance, or a referral for full-time roles'
  },

  // ┌────────────────────────────────────────────────────────────────┐
  // │ 1.2 · WHICH JOBS TO CAPTURE                                    │
  // │ A LinkedIn alert email's job title must contain at least one    │
  // │ INCLUDE word to be captured, and none of the EXCLUDE words.     │
  // │                                                                │
  // │ ⚠️ The values below are EXAMPLES from a hardware job search.    │
  // │    REPLACE them with words that appear in YOUR target job       │
  // │    titles. Lowercase. Matching is case-insensitive.             │
  // │                                                                │
  // │ EXAMPLE (hardware):  ['verification', 'validation', 'uvm']      │
  // │ EXAMPLE (software):  ['backend', 'software engineer', 'golang']  │
  // │ EXAMPLE (data):      ['data engineer', 'analytics', 'ml']        │
  // │ EXAMPLE (design):    ['product designer', 'ux', 'ui']            │
  // │ EXAMPLE (marketing): ['marketing', 'growth', 'content']          │
  // └────────────────────────────────────────────────────────────────┘
  JOB_INCLUDE_KEYWORDS: ['verification', 'validation'],

  // Skip titles containing any of these. Usually seniority levels you're
  // not targeting. Set to [] to capture everything that matched above.
  // EXAMPLE for a new grad: ['staff', 'principal', 'lead', 'manager', 'director']
  // EXAMPLE for a senior:   ['intern', 'junior', 'entry level']
  JOB_EXCLUDE_KEYWORDS: ['staff', 'principal', 'lead', 'intern', 'manager'],

  // ┌────────────────────────────────────────────────────────────────┐
  // │ 1.3 · YOUR RESUME(S)                                           │
  // │                                                                │
  // │ HAVE ONE RESUME? Leave this exactly as it is. Paste your resume │
  // │ into the Settings tab and you're done.                          │
  // │                                                                │
  // │ HAVE SEVERAL? Add one entry per resume. For each job, the tool   │
  // │ picks the FIRST resume whose WHEN_ROLE_CONTAINS words appear in  │
  // │ the job title. If none match, the FIRST entry in this list is    │
  // │ used as the default — so order matters, general-purpose first.   │
  // │                                                                │
  // │ The NAME must match a row label in your Settings tab, where the  │
  // │ actual resume text lives (Settings tab: column A = name,         │
  // │ column B = full resume text).                                    │
  // └────────────────────────────────────────────────────────────────┘
  RESUMES: [
    // The default/general resume — always keep one entry with empty
    // WHEN_ROLE_CONTAINS as the catch-all.
    { NAME: 'General', WHEN_ROLE_CONTAINS: [] }

    // ── Add more only if you actually have more resumes. Examples: ──
    // { NAME: 'Verification', WHEN_ROLE_CONTAINS: ['verification', 'uvm', 'dv'] },
    // { NAME: 'Validation',   WHEN_ROLE_CONTAINS: ['validation', 'silicon', 'post-silicon'] },
    // { NAME: 'Frontend',     WHEN_ROLE_CONTAINS: ['frontend', 'react', 'ui'] },
    // { NAME: 'Backend',      WHEN_ROLE_CONTAINS: ['backend', 'api', 'platform'] }
  ],

  // ┌────────────────────────────────────────────────────────────────┐
  // │ 1.4 · WHICH FEATURES TO TURN ON                                │
  // │ Start with the defaults below (free, no paid API).              │
  // │ Turn extras on later once the basics work.                      │
  // └────────────────────────────────────────────────────────────────┘
  FEATURES: {

    // Reads LinkedIn job-alert emails from Gmail into the Inbox tab.
    // FREE · no API key at all.
    FETCH_JOBS_FROM_GMAIL: true,

    // AI scores each job against your resume and lists gaps + fixes.
    // FREE · needs the free GEMINI_API_KEY (see Section 1.5).
    AI_RESUME_ANALYSIS: true,

    // Finds real people at the company so you can reach out.
    // FREE TIER · needs APIFY_TOKEN (Apify gives free monthly credit).
    // Turn this on only after the two features above are working.
    FIND_PEOPLE_TO_CONTACT: false,

    // Writes a ready-to-send outreach message for each person found.
    // FREE · uses the same GEMINI_API_KEY as the analysis above.
    // Set false to just get the list of people + their profile links
    // and write your own messages.
    DRAFT_OUTREACH_MESSAGES: true,

    // Extra web research on each person (recent posts, projects) to
    // personalize messages further.
    // ⚠️ PAID · this is the ONLY feature that needs a paid API key
    //    (Perplexity). Leave false unless you have one. Everything
    //    else works perfectly without it.
    RESEARCH_EACH_PERSON: false,

    // Runs the fetch + analysis automatically twice a day.
    DAILY_AUTOMATION: true,

    // Emails you a morning summary of your pipeline.
    // FREE · uses your own Gmail, no key.
    MORNING_SUMMARY_EMAIL: true
  },

  // ┌────────────────────────────────────────────────────────────────┐
  // │ 1.5 · YOUR API KEY(S) — where to get them, 2 minutes           │
  // │                                                                │
  // │ Keys are NOT typed into this file. They go into Script          │
  // │ Properties so they never leak into shared code:                 │
  // │   Apps Script editor → ⚙ Project Settings → Script Properties   │
  // │   → "Add script property" → paste → Save script properties      │
  // │                                                                │
  // │ ① GEMINI_API_KEY   ← required if AI_RESUME_ANALYSIS is on       │
  // │    FREE, no credit card.                                        │
  // │    Get it: https://aistudio.google.com/apikey                   │
  // │    Click "Create API key", copy the long string.                │
  // │                                                                │
  // │ ② APIFY_TOKEN      ← only if FIND_PEOPLE_TO_CONTACT is on       │
  // │    FREE monthly credit, no credit card to start.                │
  // │    Get it, exactly:                                             │
  // │      1. Sign up at https://console.apify.com/sign-up            │
  // │      2. Go straight to                                          │
  // │         https://console.apify.com/settings/integrations         │
  // │      3. Under "Personal API tokens" click the 👁 / Copy icon     │
  // │         next to your token (it starts with  apify_api_ )        │
  // │      4. Paste that whole string as APIFY_TOKEN                  │
  // │    (Menu → 🤖 Assistant → 🔑 Where do I get API keys? reopens    │
  // │     these instructions inside the sheet any time.)              │
  // │                                                                │
  // │ ③ PERPLEXITY_API_KEY ← PAID, and ONLY if RESEARCH_EACH_PERSON   │
  // │    is true. Skip this entirely otherwise.                       │
  // │    https://www.perplexity.ai/settings/api                       │
  // └────────────────────────────────────────────────────────────────┘


// ╔══════════════════════════════════════════════════════════════════╗
// ║   ✅ SETUP COMPLETE — everything below has working defaults.      ║
// ║   Reload the sheet, then run:                                    ║
// ║   🤖 Assistant → ⚡ First-Time Setup (checks everything for you)   ║
// ╚══════════════════════════════════════════════════════════════════╝


// ══════════════════════════════════════════════════════════════════
//   SECTION 2 · COMMON TWEAKS (safe to change, all optional)
// ══════════════════════════════════════════════════════════════════

  // How far back to scan Gmail for job alerts on each run.
  GMAIL_LOOKBACK: 'newer_than:2d',

  // How many people to surface per job when FIND_PEOPLE_TO_CONTACT is on.
  CONTACTS_PER_JOB: 5,

  // Who to look for at each company.
  // [] (empty)  = search for people holding the same job title as the posting.
  //               This is the smart default and works for any field.
  // Or list titles to target instead, e.g.:
  //   ['recruiter', 'talent acquisition']        ← reach recruiters
  //   ['hiring manager', 'engineering manager']  ← reach decision makers
  CONTACT_TITLES: [],

  // Words stripped from a job title before searching for people, so
  // 'Senior Verification Engineer II (Remote)' becomes 'verification engineer'.
  TITLE_NOISE_WORDS: ['senior', 'sr', 'junior', 'jr', 'staff', 'principal', 'lead',
                      'i', 'ii', 'iii', 'iv', 'entry', 'level', 'remote', 'hybrid',
                      'onsite', 'contract', 'intern', 'new', 'grad', 'graduate'],

  // Max length of a drafted outreach message, in words.
  MESSAGE_MAX_WORDS: 120,

  // What times the daily automation runs (24h clock, your sheet's timezone).
  AUTOMATION_MORNING_HOUR: 6,
  AUTOMATION_EVENING_HOUR: 17,

  // The dropdown choices on the Status column of the Job Tracker tab.
  // The first value is what new rows get; APPLIED_VALUE is what the
  // "Mark Applied" button and the Archive step look for.
  STATUS_OPTIONS: ['Ready to Apply', 'Applied ✅', 'Interviewing', 'Offer', 'Rejected', 'Not a fit'],
  STATUS_APPLIED_VALUE: 'Applied ✅',

  // Dropdown choices for the "Reachout?" column on the Archive tab.
  REACHOUT_OPTIONS: ['No', 'Yes', 'Done'],

  // Test mode: logs everything it WOULD do without writing to the
  // sheet or sending email. Great for a first run.
  DRY_RUN: false,


// ══════════════════════════════════════════════════════════════════
//   SECTION 3 · ADVANCED (you probably never need to touch these)
// ══════════════════════════════════════════════════════════════════

  // Tab names. Only change if you renamed tabs in your copy.
  SHEETS: {
    INBOX: 'Inbox',
    JOB_TRACKER: 'Job Tracker',
    ARCHIVE: 'Archive',
    REACHOUT: 'AI Reachout',
    LOG: 'Log',
    SETTINGS: 'Settings'
  },

  START_ROW: 2,        // first data row (row 1 = headers)
  LOG_MAX_ROWS: 20,     // Log tab is trimmed to this many entries
  CONTROL_ROWS: 1000,   // how many rows get the interactive dropdowns

  // Which AI writes the analysis and messages.
  // 'gemini' is free. 'perplexity' is paid — only switch if you have a key.
  AI_PROVIDER: 'gemini',

  // If the main provider errors, try this one. Empty '' = no fallback,
  // which keeps the toolkit 100% free and means no paid key is ever
  // required. Only set this to 'perplexity' if you have a paid key.
  AI_FALLBACK_PROVIDER: '',

  // Model IDs. Update if a provider retires a model.
  GEMINI_MODEL: 'gemini-3.6-flash',
  PERPLEXITY_MODEL: 'sonar',

  // Which service finds people. 'apify' has a free tier.
  // 'perplexity' is paid and only worth it if you already have a key.
  PEOPLE_SEARCH_PROVIDER: 'apify',

  // Gmail sender filter for LinkedIn alerts. Don't loosen this or you'll
  // start parsing unrelated mail.
  GMAIL_SENDER: 'from:linkedin.com',

  // LinkedIn's own alert boilerplate — these lines are never job titles.
  // Written as regular expressions (case-insensitive) because LinkedIn
  // rewords its headings often. The critical one is 'jobs in <place>',
  // which is the alert's own headline, e.g.
  //   "Software Security Engineer jobs in Huntsville"
  // That line looks exactly like a job title but is NOT one — matching it
  // shifts every column by one and puts the heading in the Role field.
  GMAIL_NOISE_PATTERNS: [
    'jobs? in ',                 // alert headline — most important rule
    'job alert',
    '\\d+\\+? new jobs?',
    'new jobs? match',
    'jobs? for you',
    'match(es)? your',
    'based on your profile',
    'recommended for you',
    'similar jobs?',
    'see all( jobs?)?',
    'view job',
    'apply now',
    'easy apply',
    'actively recruiting',
    'people clicked apply',
    'promoted by',
    'responses managed',
    'be an early applicant',
    'your preferences',
    'intended for',
    'unsubscribe',
    'you.re receiving',
    'this email was sent',
    'help ?center',
    '^linkedin$',
    '^\\d+$'
  ],

  // A line matching any of these is a location, not a company name.
  GMAIL_LOCATION_PATTERNS: [
    '^[A-Za-z .\'\\-]+,\\s*[A-Z]{2}\\b',      // Huntsville, AL
    '^[A-Za-z .\'\\-]+,\\s*[A-Za-z ]+$',      // Austin, Texas
    '\\((on-?site|remote|hybrid)\\)',
    '^(remote|on-?site|hybrid|united states|india|canada)$'
  ],

  // Longest a line can be and still plausibly be a job title.
  MAX_JOB_TITLE_LENGTH: 100,

  // Pauses between API calls, in milliseconds. Do not remove these —
  // they prevent rate-limiting and provider bans.
  DELAY_BETWEEN_AI_CALLS_MS: 3500,
  DELAY_BETWEEN_JOBS_MS: 3000,

  // Optional: map a company name (as it appears in your sheet, lowercase)
  // to its LinkedIn company-page slug for more precise people search.
  // Unmapped companies fall back to lowercase-with-hyphens.
  COMPANY_SLUG_MAP: {
    // 'advanced micro devices': 'advanced-micro-devices'
  },

  // How candidate profiles are ranked when a search returns more people
  // than CONTACTS_PER_JOB. Tune the numbers if you like, but keeping the
  // signal-based approach matters — taking the first N results instead
  // measurably lowers contact quality.
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
  },

  // Column numbers on the Job Tracker / Archive tabs. Only change these
  // if you reorder columns in your own copy of the sheet.
  COLUMNS: {
    COMPANY: 1,
    ROLE: 2,
    URL: 3,
    TARGET_RESUME: 4,
    MATCH_SCORE: 5,
    MATCHER: 6,
    GAPS: 7,
    TWEAKS: 8,
    STATUS: 9,
    FILENAME: 10,
    APPLIED_DATE: 11,
    REACHOUT: 12       // Archive tab only
  }
};


// ══════════════════════════════════════════════════════════════════
//   API KEY READERS — keys live in Script Properties, never in code.
// ══════════════════════════════════════════════════════════════════
function getGeminiKey()     { return PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'); }
function getPerplexityKey() { return PropertiesService.getScriptProperties().getProperty('PERPLEXITY_API_KEY'); }
function getApifyToken()    { return PropertiesService.getScriptProperties().getProperty('APIFY_TOKEN'); }


// ══════════════════════════════════════════════════════════════════
//   SETUP CHECKER — plain-English report of what's ready and what
//   still needs attention. Never throws; safe to run any time.
// ══════════════════════════════════════════════════════════════════
function checkSetup() {
  const F        = CONFIG.FEATURES;
  const ready    = [];
  const problems = [];
  const notes    = [];

  // --- Keys required by the features that are switched on ---
  const needsGemini = F.AI_RESUME_ANALYSIS ||
                      (F.FIND_PEOPLE_TO_CONTACT && F.DRAFT_OUTREACH_MESSAGES) ||
                      CONFIG.AI_PROVIDER === 'gemini';

  if (needsGemini && CONFIG.AI_PROVIDER === 'gemini') {
    if (getGeminiKey()) ready.push('GEMINI_API_KEY is set (free tier)');
    else problems.push('GEMINI_API_KEY is missing. Get a free key at https://aistudio.google.com/apikey then add it in Project Settings → Script Properties.');
  }

  if (F.FIND_PEOPLE_TO_CONTACT) {
    if (CONFIG.PEOPLE_SEARCH_PROVIDER === 'apify') {
      if (getApifyToken()) ready.push('APIFY_TOKEN is set (free tier)');
      else problems.push('FIND_PEOPLE_TO_CONTACT is on but APIFY_TOKEN is missing. Copy your token from https://console.apify.com/settings/integrations (starts with apify_api_) into Script Properties.');
    }
    if (CONFIG.PEOPLE_SEARCH_PROVIDER === 'perplexity' && !getPerplexityKey()) {
      problems.push('PEOPLE_SEARCH_PROVIDER is "perplexity" (paid) but PERPLEXITY_API_KEY is missing. Switch PEOPLE_SEARCH_PROVIDER to "apify" for the free option, or add the key.');
    }
  }

  if (F.RESEARCH_EACH_PERSON) {
    if (getPerplexityKey()) ready.push('PERPLEXITY_API_KEY is set (paid, person research)');
    else problems.push('RESEARCH_EACH_PERSON is on but PERPLEXITY_API_KEY is missing. This is the only paid feature — set RESEARCH_EACH_PERSON to false to skip it entirely.');
  }

  if (CONFIG.AI_PROVIDER === 'perplexity' && !getPerplexityKey()) {
    problems.push('AI_PROVIDER is "perplexity" (paid) but PERPLEXITY_API_KEY is missing. Set AI_PROVIDER back to "gemini" for the free option.');
  }
  if (CONFIG.AI_FALLBACK_PROVIDER === 'perplexity' && !getPerplexityKey()) {
    problems.push('AI_FALLBACK_PROVIDER is "perplexity" (paid) but no key is set. Set AI_FALLBACK_PROVIDER to \'\' to stay fully free.');
  }

  // --- Personal details filled in? ---
  if (CONFIG.ME.NAME === 'Your Name' || !CONFIG.ME.NAME) {
    problems.push('CONFIG.ME.NAME is still the placeholder "Your Name" — edit Section 1.1 of Config.gs.');
  } else {
    ready.push('Your details are filled in (' + CONFIG.ME.NAME + ')');
  }
  if (!CONFIG.ME.EXPERIENCE || CONFIG.ME.EXPERIENCE.indexOf('Your main experience') === 0) {
    problems.push('CONFIG.ME.EXPERIENCE is still placeholder text — describe your actual experience in Section 1.1.');
  }

  // --- Job keywords ---
  if (!CONFIG.JOB_INCLUDE_KEYWORDS || CONFIG.JOB_INCLUDE_KEYWORDS.length === 0) {
    problems.push('JOB_INCLUDE_KEYWORDS is empty — add at least one word that appears in your target job titles (Section 1.2).');
  } else {
    ready.push('Job keywords: ' + CONFIG.JOB_INCLUDE_KEYWORDS.join(', '));
    if (CONFIG.JOB_INCLUDE_KEYWORDS.join(',') === 'verification,validation') {
      notes.push('JOB_INCLUDE_KEYWORDS is still the hardware EXAMPLE (verification, validation). Replace it with words from YOUR target job titles unless you are genuinely job-hunting in hardware DV.');
    }
  }

  // --- Tabs present? ---
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(CONFIG.SHEETS).forEach(k => {
    if (!ss.getSheetByName(CONFIG.SHEETS[k])) {
      problems.push('Missing tab "' + CONFIG.SHEETS[k] + '". Run 🤖 Assistant → ⚡ First-Time Setup to create it.');
    }
  });

  // --- Resumes present in the Settings tab? ---
  const settings = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  if (settings) {
    const resumeMap = getResumeMap();
    const names     = Object.keys(resumeMap);
    if (names.length === 0) {
      problems.push('No resume text found. On the Settings tab put a label in column A (e.g. "General") and paste your full resume into column B of the same row.');
    } else {
      ready.push('Resume(s) found in Settings tab: ' + names.join(', '));
    }
    CONFIG.RESUMES.forEach(r => {
      if (!resumeMap[r.NAME]) {
        problems.push('Config lists a resume named "' + r.NAME + '" but no row in the Settings tab has that label in column A.');
      }
    });
  }

  return { ready: ready, problems: problems, notes: notes };
}

/**
 * Called at the start of each pipeline. Throws only when the specific
 * thing about to run is genuinely unusable, with a plain-English fix.
 */
function requireReady(feature) {
  if (feature === 'ai' && CONFIG.AI_PROVIDER === 'gemini' && !getGeminiKey()) {
    throw new Error('No Gemini API key yet.\n\nGet a FREE key at https://aistudio.google.com/apikey\nThen: Project Settings → Script Properties → add GEMINI_API_KEY.\n\nRun 🤖 Assistant → ✅ Check My Setup for a full checklist.');
  }
  if (feature === 'ai' && CONFIG.AI_PROVIDER === 'perplexity' && !getPerplexityKey()) {
    throw new Error('AI_PROVIDER is set to "perplexity" but no PERPLEXITY_API_KEY is set.\nSet AI_PROVIDER back to \'gemini\' in Config.gs to use the free option.');
  }
  if (feature === 'people') {
    if (!CONFIG.FEATURES.FIND_PEOPLE_TO_CONTACT) {
      throw new Error('Finding contacts is turned off.\n\nIn Config.gs set FEATURES.FIND_PEOPLE_TO_CONTACT to true, and add an APIFY_TOKEN (free) from https://console.apify.com/settings/integrations');
    }
    if (CONFIG.PEOPLE_SEARCH_PROVIDER === 'apify' && !getApifyToken()) {
      throw new Error('No Apify token yet — needed to find people.\n\n1. Sign up free: https://console.apify.com/sign-up\n2. Open https://console.apify.com/settings/integrations\n3. Copy your Personal API token (starts with apify_api_)\n4. Project Settings → Script Properties → add APIFY_TOKEN');
    }
    if (CONFIG.PEOPLE_SEARCH_PROVIDER === 'perplexity' && !getPerplexityKey()) {
      throw new Error('PEOPLE_SEARCH_PROVIDER is "perplexity" (paid) but no key is set.\nSet it to "apify" in Config.gs to use the free option.');
    }
  }
}

// ══════════════════════════════════════════════════════════════════
//   RESUME HELPERS
// ══════════════════════════════════════════════════════════════════

/**
 * Reads every resume from the Settings tab.
 * Settings layout: column A = label, column B = full resume text.
 * Returns { label: text, ... } — add as many rows as you have resumes.
 */
function getResumeMap() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SETTINGS);
  const map   = {};
  if (!sheet || sheet.getLastRow() < 1) return map;

  const rows = sheet.getRange(1, 1, sheet.getLastRow(), 2).getValues();
  rows.forEach(r => {
    const label = (r[0] || '').toString().trim();
    const text  = (r[1] || '').toString().trim();
    // Skip header rows and empty/placeholder rows
    if (!label || !text) return;
    if (label.toLowerCase() === 'resume name' || label.toLowerCase() === 'label') return;
    if (text.toLowerCase().indexOf('paste your') === 0) return;
    map[label] = text;
  });
  return map;
}

/**
 * Picks which resume to use for a given job title.
 * First match on WHEN_ROLE_CONTAINS wins; otherwise the first entry in
 * CONFIG.RESUMES is the default. Returns { name, text }.
 */
function pickResumeFor(roleTitle) {
  const map   = getResumeMap();
  const role  = (roleTitle || '').toString().toLowerCase();
  const names = Object.keys(map);

  for (let i = 0; i < CONFIG.RESUMES.length; i++) {
    const r  = CONFIG.RESUMES[i];
    const kw = r.WHEN_ROLE_CONTAINS || [];
    if (kw.length > 0 && kw.some(k => role.indexOf(k.toLowerCase()) !== -1) && map[r.NAME]) {
      return { name: r.NAME, text: map[r.NAME] };
    }
  }

  // Default: first configured resume that actually has text, else first row present.
  for (let i = 0; i < CONFIG.RESUMES.length; i++) {
    const n = CONFIG.RESUMES[i].NAME;
    if (map[n]) return { name: n, text: map[n] };
  }
  if (names.length > 0) return { name: names[0], text: map[names[0]] };
  return { name: '', text: '' };
}

// Converts a column letter like 'L' to its number (12).
function columnLetterToIndex(letter) {
  let col = 0;
  const s = letter.toString().toUpperCase();
  for (let i = 0; i < s.length; i++) col = col * 26 + (s.charCodeAt(i) - 64);
  return col;
}

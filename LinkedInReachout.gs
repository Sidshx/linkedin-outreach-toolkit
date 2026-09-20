/**
 * ============================================================
 * LINKEDINREACHOUT.GS — finds real people at a company and (optionally)
 * drafts a personalized outreach message for each one.
 *
 * WHAT YOU NEED — both free:
 *   • APIFY_TOKEN      → finds the people        (free monthly credit)
 *   • GEMINI_API_KEY   → writes the messages     (free)
 *
 * You do NOT need any paid API for this. If you only have an Apify
 * token and no interest in AI-written messages, set
 * FEATURES.DRAFT_OUTREACH_MESSAGES to false and you'll still get the
 * names, roles, and profile links for the top contacts at each company.
 *
 * Nothing here needs editing — every setting lives in Config.gs.
 * ============================================================
 */

const REACHOUT_COL = CONFIG.COLUMNS.REACHOUT;
const STATUS_COL   = CONFIG.COLUMNS.STATUS;

function getCompanySlug(company) {
  const key = company.toString().toLowerCase().trim();
  return CONFIG.COMPANY_SLUG_MAP[key] || key.replace(/ /g, '-');
}

/**
 * Turns a messy job title into a clean search term.
 * 'Senior Verification Engineer II (Remote)' → 'verification engineer'
 * Field-agnostic: works the same for 'Staff Product Designer' or
 * 'Junior Marketing Analyst III'.
 */
function cleanRoleTitle(role) {
  const noise = CONFIG.TITLE_NOISE_WORDS.map(w => w.toLowerCase());
  return (role || '').toString()
    .replace(/\(.*?\)/g, ' ')          // drop parentheticals
    .replace(/[^a-zA-Z ]/g, ' ')        // drop numbers and punctuation
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w && noise.indexOf(w) === -1)
    .slice(0, 4)                        // keep it a tight phrase
    .join(' ')
    .trim();
}

/** The list of search terms used to find people for a given job. */
function getContactSearchTerms(role) {
  if (CONFIG.CONTACT_TITLES && CONFIG.CONTACT_TITLES.length > 0) return CONFIG.CONTACT_TITLES;
  const cleaned = cleanRoleTitle(role);
  return cleaned ? [cleaned] : [];
}

// ── ENTRY POINTS ─────────────────────────────────────────────
function reachoutAllJobs() {
  const ui = SpreadsheetApp.getUi();
  try { requireReady('people'); } catch (e) { ui.alert('Not ready yet', e.message, ui.ButtonSet.OK); return; }

  const archiveSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.ARCHIVE);
  if (!archiveSheet) { ui.alert('Missing the "' + CONFIG.SHEETS.ARCHIVE + '" tab. Run ⚡ First-Time Setup.'); return; }

  const data = archiveSheet.getDataRange().getValues();
  let count = 0;
  for (let i = 1; i < data.length; i++) {
    if ((data[i][REACHOUT_COL - 1] || '').toString().trim() === 'Yes') {
      processReachoutRow(i + 1);
      count++;
      Utilities.sleep(CONFIG.DELAY_BETWEEN_JOBS_MS); // rate-limit guard — do not remove
    }
  }

  if (count === 0) {
    ui.alert('Nothing to do',
      'No rows on the "' + CONFIG.SHEETS.ARCHIVE + '" tab have "Reachout?" set to Yes.\n\n' +
      'Open that tab, pick Yes from the dropdown in the "Reachout?" column on any job, then run this again.',
      ui.ButtonSet.OK);
  } else {
    ui.alert('✅ Processed ' + count + ' job(s). Check the "' + CONFIG.SHEETS.REACHOUT + '" tab.');
  }
}

function reachoutSingleJob() {
  const ui = SpreadsheetApp.getUi();
  try { requireReady('people'); } catch (e) { ui.alert('Not ready yet', e.message, ui.ButtonSet.OK); return; }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.ARCHIVE);
  if (!sheet) { ui.alert('Missing the "' + CONFIG.SHEETS.ARCHIVE + '" tab. Run ⚡ First-Time Setup.'); return; }

  const activeRow = sheet.getActiveCell().getRow();
  if (activeRow < CONFIG.START_ROW) { ui.alert('Click a job row on the ' + CONFIG.SHEETS.ARCHIVE + ' tab first (row 2 or below).'); return; }

  const found = processReachoutRow(activeRow, true);
  if (found === 0) {
    ui.alert('No contacts found',
      'The search came back empty for that company. Things to try:\n\n' +
      '• Check the company name spelling in column A\n' +
      '• Set CONFIG.CONTACT_TITLES to ["recruiter"] for a broader search\n' +
      '• Run Extensions → Apps Script → debugFullPipeline() to see the raw response',
      ui.ButtonSet.OK);
  } else {
    ui.alert('✅ Added ' + found + ' contact(s). Check the "' + CONFIG.SHEETS.REACHOUT + '" tab.');
  }
}

// ── CORE LOGIC ───────────────────────────────────────────────
function processReachoutRow(rowNumber, ignoreFlag) {
  const archiveSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.ARCHIVE);
  const row      = archiveSheet.getRange(rowNumber, 1, 1, REACHOUT_COL).getValues()[0];
  const company  = row[CONFIG.COLUMNS.COMPANY - 1];
  const role     = row[CONFIG.COLUMNS.ROLE - 1];
  const reachout = (row[REACHOUT_COL - 1] || '').toString().trim();

  Logger.log('Row ' + rowNumber + ': ' + company + ' | ' + role + ' | Reachout: ' + reachout);

  if (!company) { Logger.log('❌ Skipped — no company name in this row'); return 0; }
  if (!ignoreFlag && reachout !== 'Yes') { Logger.log('❌ Skipped — "Reachout?" is not set to Yes'); return 0; }

  ensureReachoutHeaders();

  const contacts = findAndDraftContacts(company, role);
  Logger.log('Contacts returned: ' + contacts.length);
  if (contacts.length === 0) return 0;

  contacts.forEach((contact, i) => {
    Logger.log('Writing contact ' + (i + 1) + ': ' + contact.name);
    if (!CONFIG.DRY_RUN) appendToReachout(company, role, contact);
  });

  if (!CONFIG.DRY_RUN) archiveSheet.getRange(rowNumber, REACHOUT_COL).setValue('Done');
  writeToLog('Outreach', 'Found ' + contacts.length + ' contact(s) at ' + company + '.', 'Success');
  return contacts.length;
}

/**
 * Finds people, then drafts a message for each — unless
 * FEATURES.DRAFT_OUTREACH_MESSAGES is false, in which case you just get
 * the names and profile links (still genuinely useful, and needs no
 * Gemini key at all).
 */
function findAndDraftContacts(company, role) {
  const profiles = findProfiles(company, role);
  if (!profiles || profiles.length === 0) return [];

  if (!CONFIG.FEATURES.DRAFT_OUTREACH_MESSAGES) {
    Logger.log('DRAFT_OUTREACH_MESSAGES is off — returning contacts without messages.');
    return profiles.map(p => ({
      name: p.name, profileUrl: p.profileUrl, currentRole: p.snippet,
      resumeUsed: '', message: '(message drafting is turned off — write your own)'
    }));
  }

  return profiles.map(profile => {
    // Optional PAID enrichment. Skipped entirely unless you opted in.
    const personContext = CONFIG.FEATURES.RESEARCH_EACH_PERSON ? fetchPersonContext(profile, company) : '';
    if (personContext) Logger.log(profile.name + ' context: ' + personContext);
    Utilities.sleep(CONFIG.DELAY_BETWEEN_AI_CALLS_MS); // rate-limit guard — do not remove
    return draftOutreachMessage(profile, company, role, personContext);
  });
}

/** Routes to whichever people-search provider Config.gs selects. */
function findProfiles(company, role) {
  if (CONFIG.PEOPLE_SEARCH_PROVIDER === 'apify')      return findProfilesViaApify(company, role);
  if (CONFIG.PEOPLE_SEARCH_PROVIDER === 'perplexity') return findProfilesViaPerplexity(company, role);
  throw new Error('Unknown PEOPLE_SEARCH_PROVIDER "' + CONFIG.PEOPLE_SEARCH_PROVIDER + '". Use "apify" (free tier) in Config.gs.');
}

// ── APIFY PROVIDER (free tier) ───────────────────────────────
// Uses Apify's Google-search actor to find public LinkedIn profiles.
// The search term comes from the job title itself, so this works for
// any profession without editing code.
function findProfilesViaApify(company, role) {
  const token = getApifyToken();
  const terms = getContactSearchTerms(role);
  if (terms.length === 0) {
    Logger.log('❌ Could not build a search term from the role title "' + role + '". Set CONFIG.CONTACT_TITLES in Config.gs.');
    return [];
  }

  const query  = 'site:linkedin.com/in "' + company + '" "' + terms[0] + '"';
  Logger.log('People search query: ' + query);

  const runUrl = 'https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=' + token + '&timeout=60';
  const options = {
    method: 'POST', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({
      queries: query,
      maxPagesPerQuery: 1,
      resultsPerPage: 10,
      languageCode: 'en',
      countryCode: 'us'
    })
  };

  try {
    const res  = UrlFetchApp.fetch(runUrl, options);
    const code = res.getResponseCode();
    const body = res.getContentText();

    if (code === 401 || code === 403) {
      throw new Error('Apify rejected the token (HTTP ' + code + ').\n\nRe-copy it from https://console.apify.com/settings/integrations — it must start with apify_api_ and be the full string.');
    }
    if (code === 402) {
      throw new Error('Apify says you are out of free credit for this month (HTTP 402). Contact discovery will work again next cycle, or set FEATURES.FIND_PEOPLE_TO_CONTACT to false for now.');
    }

    const results = JSON.parse(body);
    Logger.log('Apify raw (first 400 chars): ' + body.substring(0, 400));

    if (!Array.isArray(results) || results.length === 0) { Logger.log('❌ Search returned nothing'); return []; }

    const hits = (results[0] && results[0].organicResults) ? results[0].organicResults : [];
    Logger.log('Search hits: ' + hits.length);

    const profiles = [];
    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      const url = hit.url || '';
      if (url.indexOf('linkedin.com/in/') === -1) continue;

      const rawTitle = hit.title || '';
      const snippet  = hit.description || '';
      const namePart = rawTitle.split(' - ')[0].split(' | ')[0].trim();

      if (!namePart) continue;
      if (namePart.toLowerCase().indexOf('linkedin') !== -1) continue;
      if (namePart.toLowerCase().indexOf('job') !== -1) continue;

      profiles.push({ name: namePart, profileUrl: url.split('?')[0], snippet: snippet.substring(0, 200) });
      if (profiles.length >= CONFIG.CONTACTS_PER_JOB) break;
    }

    Logger.log('Parsed ' + profiles.length + ' profiles: ' + profiles.map(p => p.name).join(', '));
    return profiles;

  } catch (e) {
    Logger.log('Apify people-search error: ' + e.message);
    writeToLog('Outreach', 'People search failed: ' + e.message, 'Error');
    return [];
  }
}

// ── PERPLEXITY PROVIDER (PAID — optional alternative) ────────
function findProfilesViaPerplexity(company, role) {
  const key   = getPerplexityKey();
  const terms = getContactSearchTerms(role);
  const query = 'Find up to ' + CONFIG.CONTACTS_PER_JOB + ' people currently working as "' +
                (terms[0] || role) + '" at "' + company + '" on LinkedIn. For each, return their name, ' +
                'LinkedIn profile URL, and current headline. Return ONLY raw JSON: ' +
                '{"people":[{"name":"","profileUrl":"","headline":""}]}';

  try {
    const res = UrlFetchApp.fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST', muteHttpExceptions: true,
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      payload: JSON.stringify({ model: CONFIG.PERPLEXITY_MODEL, messages: [{ role: 'user', content: query }] })
    });
    const text   = JSON.parse(res.getContentText()).choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(text);
    const people = (parsed.people || []).slice(0, CONFIG.CONTACTS_PER_JOB);
    return people.map(p => ({ name: p.name, profileUrl: p.profileUrl, snippet: p.headline || '' }));
  } catch (e) {
    Logger.log('Perplexity people-search error: ' + e.message);
    return [];
  }
}

// ── RANKING ──────────────────────────────────────────────────
// Used by providers that return richer profile data than we need.
// Keeping the signal-based ranking matters: taking the first N results
// instead measurably lowers contact quality.
function scoreAndSlice(results) {
  const w = CONFIG.SCORING_WEIGHTS;
  const scored = results.map(p => {
    let score = 0;
    if (p.postCount       && p.postCount > 0)                            score += w.HAS_RECENT_POSTS;
    if (p.followerCount   && p.followerCount > w.FOLLOWER_THRESHOLD)      score += w.FOLLOWER_SCORE;
    if (p.connectionCount && p.connectionCount > w.CONNECTION_THRESHOLD)  score += w.CONNECTION_SCORE;
    if (p.summary || p.about)                                            score += w.HAS_SUMMARY;
    if (p.recentActivityDate) {
      const days = (Date.now() - new Date(p.recentActivityDate)) / 86400000;
      if (days < 30)       score += w.RECENT_ACTIVITY_UNDER_30D;
      else if (days < 90)  score += w.RECENT_ACTIVITY_UNDER_90D;
      else if (days < 180) score += w.RECENT_ACTIVITY_UNDER_180D;
    }
    p._score = score;
    return p;
  });

  return scored.sort((a, b) => b._score - a._score)
    .slice(0, CONFIG.CONTACTS_PER_JOB)
    .map(p => ({
      name:       ((p.firstName || '') + ' ' + (p.lastName || '')).trim(),
      profileUrl: p.linkedinUrl || '',
      snippet:    p.headline    || ''
    }));
}

// ── PERSON RESEARCH (PAID, off by default) ───────────────────
function fetchPersonContext(profile, company) {
  const key = getPerplexityKey();
  if (!key) return '';   // silently skip — never blocks the free path

  try {
    const res = UrlFetchApp.fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST', muteHttpExceptions: true,
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      payload: JSON.stringify({
        model: CONFIG.PERPLEXITY_MODEL,
        messages: [{ role: 'user', content:
          'Search LinkedIn and the web for "' + profile.name + '" at ' + company +
          '. Find (return only if genuinely found, no fabrication): a recent post, specific project or achievement, ' +
          'paper, or talk. Return 1 sentence if found, or exactly: "NOTHING_FOUND"'
        }]
      })
    });
    const context = JSON.parse(res.getContentText()).choices[0].message.content.trim();
    return context === 'NOTHING_FOUND' ? '' : context;
  } catch (e) {
    Logger.log('Person research error (skipping): ' + e.message);
    return '';
  }
}

// ── OUTREACH MESSAGE DRAFTER (free, uses Gemini) ─────────────
function draftOutreachMessage(profile, company, role, personContext) {
  const me     = CONFIG.ME;
  const picked = pickResumeFor(role);

  // Only include the fields the user actually filled in, so messages
  // never contain placeholder text or empty sections.
  const facts = [];
  if (me.EXPERIENCE)     facts.push('- Main experience: ' + me.EXPERIENCE);
  if (me.EXPERIENCE_ALT) facts.push('- Also has experience in: ' + me.EXPERIENCE_ALT);
  if (me.EDUCATION)      facts.push('- Education: ' + me.EDUCATION);
  if (me.SKILLS)         facts.push('- Skills: ' + me.SKILLS);

  const prompt =
'Draft a warm, genuine, human LinkedIn connection message from ' + me.NAME + ' to ' + profile.name + '.\n' +
'Their headline: "' + profile.snippet + '"\n' +
'The role being targeted: ' + role + ' at ' + company + '\n' +
(personContext ? 'Specific thing found about ' + profile.name + ': ' + personContext + ' — reference it naturally if relevant.\n' : '') +
'\n' + me.NAME + "'s TRUE facts — do not invent anything beyond these:\n" +
facts.join('\n') + '\n' +
(me.HEADLINE ? '- Currently: ' + me.HEADLINE + '\n' : '') +
'\nRules:\n' +
'- Reference their specific role or domain naturally\n' +
'- Warm, human tone — not robotic, no corporate filler\n' +
'- End by asking for ' + me.ASK + '\n' +
'- Under ' + CONFIG.MESSAGE_MAX_WORDS + ' words. Sign off with just the first name of ' + me.NAME + '.\n' +
'\nReturn ONLY raw JSON:\n' +
'{"name":"' + profile.name + '","profileUrl":"' + profile.profileUrl + '","currentRole":"' + profile.snippet + '","message":"full message text"}';

  try {
    const result = callAI(prompt, 0.4);
    result.resumeUsed = picked.name;
    return result;
  } catch (err) {
    Logger.log('Message drafting failed for ' + profile.name + ': ' + err.message);
    return {
      name: profile.name, profileUrl: profile.profileUrl, currentRole: profile.snippet,
      resumeUsed: picked.name,
      message: 'AI drafting failed (' + err.message + ') — write this one manually.'
    };
  }
}

// ── SHEET HELPERS ────────────────────────────────────────────
function ensureReachoutHeaders() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEETS.REACHOUT);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.REACHOUT);
    sheet.appendRow(['Company', 'Role', 'Contact Name', 'Their Role', 'LinkedIn Profile URL', 'Resume Used', 'Date', 'Message', 'Status']);
    sheet.setFrozenRows(1);
  }
}

function appendToReachout(company, role, profile) {
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.REACHOUT).appendRow([
    company, role,
    profile.name        || '',
    profile.currentRole || '',
    profile.profileUrl  || '',
    profile.resumeUsed  || '',
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/dd/yyyy'),
    profile.message     || '',
    'Ready'
  ]);
}

// ── DEBUG / SELF-TEST ────────────────────────────────────────
// Run this from the Apps Script editor (not the menu) when something
// isn't working. It prints exactly which step failed.
function debugFullPipeline() {
  Logger.log('=== FEATURE TOGGLES ===');
  Object.keys(CONFIG.FEATURES).forEach(k => Logger.log(k + ': ' + CONFIG.FEATURES[k]));

  Logger.log('=== KEYS PRESENT? ===');
  Logger.log('GEMINI_API_KEY set?     ' + !!getGeminiKey()     + '  (free — needed for analysis + messages)');
  Logger.log('APIFY_TOKEN set?        ' + !!getApifyToken()    + '  (free tier — needed to find people)');
  Logger.log('PERPLEXITY_API_KEY set? ' + !!getPerplexityKey() + '  (paid — optional, not required)');

  Logger.log('=== SETUP CHECK ===');
  const report = checkSetup();
  report.ready.forEach(r => Logger.log('OK: ' + r));
  report.problems.forEach(p => Logger.log('TODO: ' + p));
  report.notes.forEach(n => Logger.log('NOTE: ' + n));

  const archiveSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.ARCHIVE);
  if (!archiveSheet) { Logger.log('❌ No Archive tab — run firstTimeSetup() first.'); return; }

  const activeRow = archiveSheet.getActiveCell().getRow();
  if (activeRow < CONFIG.START_ROW) { Logger.log('⚠️ Select a job row on the Archive tab first.'); return; }

  const row      = archiveSheet.getRange(activeRow, 1, 1, REACHOUT_COL).getValues()[0];
  const company  = row[CONFIG.COLUMNS.COMPANY - 1];
  const role     = row[CONFIG.COLUMNS.ROLE - 1];

  Logger.log('=== ROW DATA ===');
  Logger.log('Company: "' + company + '"');
  Logger.log('Role:    "' + role + '"');
  Logger.log('Cleaned search term: "' + cleanRoleTitle(role) + '"');
  Logger.log('Resume that would be used: "' + pickResumeFor(role).name + '"');

  if (!CONFIG.FEATURES.FIND_PEOPLE_TO_CONTACT) {
    Logger.log('⚠️ FEATURES.FIND_PEOPLE_TO_CONTACT is false — set it to true in Config.gs to test people search.');
    return;
  }

  Logger.log('=== PEOPLE SEARCH TEST ===');
  const profiles = findProfiles(company, role);
  Logger.log('Profiles returned: ' + profiles.length);
  if (profiles.length > 0) Logger.log('First profile: ' + JSON.stringify(profiles[0]));

  Logger.log('=== SHEET WRITE TEST ===');
  ensureReachoutHeaders();
  appendToReachout(company, role, {
    name: 'TEST PERSON', profileUrl: 'https://linkedin.com/in/test',
    currentRole: 'Test Role', resumeUsed: 'Test',
    message: 'Test row — delete me. Confirms sheet writing works.'
  });
  Logger.log('✅ Wrote a test row to the ' + CONFIG.SHEETS.REACHOUT + ' tab. Delete it when you see it.');
}

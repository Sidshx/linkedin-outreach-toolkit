/**
 * ============================================================
 * LINKEDINREACHOUT.GS — finds contacts for a job and drafts
 * personalized LinkedIn outreach messages.
 *
 * Live profile discovery (via Apify or Perplexity) is OFF by
 * default — see CONFIG.ENABLE_LIVE_PROFILE_SCRAPING in Config.gs.
 * With it off, this file's entry points simply won't find any
 * profiles to draft messages for; nothing here costs money or
 * requires a key unless you turn that toggle on.
 * ============================================================
 */

const REACHOUT_COL = columnLetterToIndex(CONFIG.OUTREACH.TRIGGER_COLUMN_LETTER);
const STATUS_COL   = columnLetterToIndex(CONFIG.OUTREACH.STATUS_COLUMN_LETTER);

function columnLetterToIndex(letter) {
  let col = 0;
  for (let i = 0; i < letter.length; i++) col = col * 26 + (letter.charCodeAt(i) - 64);
  return col;
}

function getCompanySlug(company) {
  const key = company.toLowerCase().trim();
  return CONFIG.OUTREACH.COMPANY_SLUG_MAP[key] || key.replace(/ /g, '-');
}

// ── ENTRY POINTS ─────────────────────────────
function reachoutAllJobs() {
  validateConfig();
  const archiveSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.ARCHIVE);
  const data = archiveSheet.getDataRange().getValues();
  let count = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i][REACHOUT_COL - 1] === CONFIG.OUTREACH.TRIGGER_VALUE) {
      processReachoutRow(i + 1);
      count++;
      Utilities.sleep(CONFIG.OUTREACH.DELAY_BETWEEN_JOBS_MS); // rate-limit guard — do not remove
    }
  }
  SpreadsheetApp.getUi().alert(`✅ Done! Processed ${count} jobs. Check ${CONFIG.SHEETS.REACHOUT} sheet.`);
}

function reachoutSingleJob() {
  validateConfig();
  const sheet     = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.ARCHIVE);
  const activeRow = sheet.getActiveCell().getRow();
  if (activeRow < CONFIG.START_ROW) { SpreadsheetApp.getUi().alert('Select a valid Archive row (Row 2+).'); return; }
  processReachoutRow(activeRow);
  SpreadsheetApp.getUi().alert(`✅ Done! Check ${CONFIG.SHEETS.REACHOUT} sheet.`);
}

// ── CORE LOGIC ────────────────────────────────
function processReachoutRow(rowNumber) {
  const archiveSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.ARCHIVE);
  const row      = archiveSheet.getRange(rowNumber, 1, 1, REACHOUT_COL).getValues()[0];
  const company  = row[0];
  const role     = row[1];
  const status   = row[STATUS_COL - 1];
  const reachout = row[REACHOUT_COL - 1];

  Logger.log(`Row ${rowNumber}: ${company} | ${role} | Status: ${status} | Reachout: ${reachout}`);

  if (reachout !== CONFIG.OUTREACH.TRIGGER_VALUE)                              { Logger.log('❌ Skipped - trigger flag not set'); return; }
  if (!status || !status.toString().includes(CONFIG.OUTREACH.STATUS_MUST_INCLUDE)) { Logger.log('❌ Skipped - status precondition not met'); return; }

  if (!CONFIG.ENABLE_LIVE_PROFILE_SCRAPING) {
    Logger.log('⚠️ ENABLE_LIVE_PROFILE_SCRAPING is false — nothing to look up. Enable it in Config.gs to find live contacts.');
    return;
  }

  ensureReachoutHeaders();

  const profiles = scrapeAndDraftProfiles(company, role);
  Logger.log(`Profiles returned: ${profiles.length}`);
  if (!profiles || profiles.length === 0) { Logger.log('❌ No profiles found'); return; }

  profiles.forEach((profile, i) => {
    Logger.log(`Writing profile ${i + 1}: ${profile.name}`);
    if (!CONFIG.DRY_RUN) appendToReachout(company, role, profile);
  });

  if (!CONFIG.DRY_RUN) archiveSheet.getRange(rowNumber, REACHOUT_COL).setValue('Done');
  Logger.log('✅ Marked as Done');
}

// ── SCRAPE + AI DRAFT ──────────────────────────
function scrapeAndDraftProfiles(company, role) {
  const profiles = findProfiles(company, role);
  if (!profiles || profiles.length === 0) return [];

  return profiles.map(profile => {
    const personContext = fetchPersonContext(profile, company);
    Logger.log(`${profile.name} context: ${personContext || 'none'}`);
    return draftOutreachMessage(profile, company, role, personContext);
  });
}

/**
 * Routes to whichever live-scraping provider Config.gs selects.
 * Only called when ENABLE_LIVE_PROFILE_SCRAPING is true (validateConfig
 * already guaranteed the matching key exists).
 */
function findProfiles(company, role) {
  if (CONFIG.SCRAPING_PROVIDER === 'apify')      return scrapeLinkedInViaApify(company, role);
  if (CONFIG.SCRAPING_PROVIDER === 'perplexity') return findProfilesViaPerplexity(company, role);
  throw new Error(`Unknown SCRAPING_PROVIDER: ${CONFIG.SCRAPING_PROVIDER}`);
}

// ── APIFY PROVIDER (Google-search-based LinkedIn discovery) ──
function scrapeLinkedInViaApify(company, role) {
  const token  = getApifyToken();
  const isVal  = role.toLowerCase().includes('validation') || role.toLowerCase().includes('silicon');
  const domain = isVal ? 'validation engineer' : 'verification engineer';

  const query  = `site:linkedin.com/in "${company}" "${domain}"`;
  const runUrl = `https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${token}&timeout=60`;

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
    const res     = UrlFetchApp.fetch(runUrl, options);
    const results = JSON.parse(res.getContentText());
    Logger.log('Google scraper raw (first 500): ' + JSON.stringify(results).substring(0, 500));

    if (!Array.isArray(results) || results.length === 0) {
      Logger.log('❌ Google scraper returned nothing');
      return [];
    }

    const hits = results[0]?.organicResults || [];
    Logger.log(`Google hits: ${hits.length}`);

    const profiles = [];
    for (const hit of hits) {
      const url = hit.url || '';
      if (!url.includes('linkedin.com/in/')) continue;

      const rawTitle  = hit.title  || '';
      const snippet   = hit.description || '';
      const namePart  = rawTitle.split(' - ')[0].split(' | ')[0].trim();

      if (!namePart || namePart.toLowerCase().includes('linkedin') || namePart.toLowerCase().includes('job')) continue;

      profiles.push({
        name:       namePart,
        profileUrl: url.split('?')[0],
        snippet:    snippet.substring(0, 200)
      });

      if (profiles.length >= CONFIG.OUTREACH.TOP_N_CONTACTS) break;
    }

    Logger.log(`Parsed ${profiles.length} valid profiles: ` + profiles.map(p => p.name).join(', '));
    return profiles;

  } catch (e) {
    Logger.log('Apify/Google scraper error: ' + e.message);
    return [];
  }
}

// ── PERPLEXITY PROVIDER (People Search) ───────
function findProfilesViaPerplexity(company, role) {
  const key = getPerplexityKey();
  const query = `Find up to ${CONFIG.OUTREACH.TOP_N_CONTACTS} people currently working as "${role}" at "${company}" on LinkedIn. For each, return their name, LinkedIn profile URL, and current headline/role. Return ONLY raw JSON: {"people":[{"name":"","profileUrl":"","headline":""}]}`;

  try {
    const res = UrlFetchApp.fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST', muteHttpExceptions: true,
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      payload: JSON.stringify({ model: CONFIG.PERPLEXITY_MODEL, messages: [{ role: 'user', content: query }] })
    });
    const text   = JSON.parse(res.getContentText()).choices[0].message.content.replace(/```json/g,'').replace(/```/g,'').trim();
    const parsed = JSON.parse(text);
    const people = (parsed.people || []).slice(0, CONFIG.OUTREACH.TOP_N_CONTACTS);
    return people.map(p => ({ name: p.name, profileUrl: p.profileUrl, snippet: p.headline || '' }));
  } catch (e) {
    Logger.log('Perplexity people-search error: ' + e.message);
    return [];
  }
}

// ── RANKING (used by providers that return more results than needed) ──
function scoreAndSlice(results) {
  const w = CONFIG.OUTREACH.SCORING_WEIGHTS;
  const scored = results.map(p => {
    let score = 0;
    if (p.postCount       && p.postCount > 0)                       score += w.HAS_RECENT_POSTS;
    if (p.followerCount   && p.followerCount > w.FOLLOWER_THRESHOLD)   score += w.FOLLOWER_SCORE;
    if (p.connectionCount && p.connectionCount > w.CONNECTION_THRESHOLD) score += w.CONNECTION_SCORE;
    if (p.summary || p.about)                                        score += w.HAS_SUMMARY;
    if (p.recentActivityDate) {
      const days = (Date.now() - new Date(p.recentActivityDate)) / 86400000;
      if (days < 30)       score += w.RECENT_ACTIVITY_UNDER_30D;
      else if (days < 90)  score += w.RECENT_ACTIVITY_UNDER_90D;
      else if (days < 180) score += w.RECENT_ACTIVITY_UNDER_180D;
    }
    return { ...p, _score: score };
  });

  return scored.sort((a, b) => b._score - a._score).slice(0, CONFIG.OUTREACH.TOP_N_CONTACTS).map(p => ({
    name:       `${p.firstName || ''} ${p.lastName || ''}`.trim(),
    profileUrl: p.linkedinUrl || '',
    snippet:    p.headline    || ''
  }));
}

// ── PERSON CONTEXT (optional enrichment, Perplexity only) ─────
function fetchPersonContext(profile, company) {
  const key = getPerplexityKey();
  if (!key) return '';

  try {
    const res = UrlFetchApp.fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST', muteHttpExceptions: true,
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      payload: JSON.stringify({
        model: CONFIG.PERPLEXITY_MODEL,
        messages: [{ role: 'user', content:
          `Search LinkedIn and the web for "${profile.name}" at ${company}. Find (return only if genuinely found, no fabrication): a recent post, specific project/achievement, paper/talk, or notable work. Return 1 sentence if found, or exactly: "NOTHING_FOUND"`
        }]
      })
    });
    const context = JSON.parse(res.getContentText()).choices[0].message.content.trim();
    return context === 'NOTHING_FOUND' ? '' : context;
  } catch (e) {
    Logger.log('Perplexity context error: ' + e.message);
    return '';
  }
}

// ── OUTREACH MESSAGE DRAFTER ───────────────────
function draftOutreachMessage(profile, company, role, personContext) {
  const a = CONFIG.ANALYSIS;
  const o = CONFIG.OUTREACH;
  const theirHeadline = (profile.snippet || '').toLowerCase();

  const prompt = `
Draft a warm, genuine, human LinkedIn connection message from ${a.CANDIDATE_NAME} to ${profile.name}.
Their headline: "${profile.snippet}"
Their role: ${role} at ${company}
${personContext ? `Specific thing found about ${profile.name}: ${personContext} — reference naturally if relevant.` : ''}

${a.CANDIDATE_NAME}'s TRUE facts only:
- Primary: ${a.CANDIDATE_PRIMARY_EXPERIENCE}
- Secondary: ${a.CANDIDATE_SECONDARY_EXPERIENCE}
- Education: ${a.CANDIDATE_EDUCATION}
- Skills: ${a.CANDIDATE_SKILLS}

Rules:
- Reference their specific role/domain naturally
- Warm, human tone — not robotic
- End by asking to ${o.MESSAGE_GOAL}
- Under ${o.MAX_MESSAGE_WORDS} words. Sign off: "Warmly, ${a.CANDIDATE_SIGNOFF}"

Return ONLY raw JSON:
{"name":"${profile.name}","profileUrl":"${profile.profileUrl}","currentRole":"${profile.snippet}","templateUsed":"Template A","message":"full message text"}`;

  try {
    return callAI(prompt, 0.4);
  } catch (err) {
    Logger.log(`Message drafting failed for ${profile.name}: ${err.message}`);
    return { name: profile.name, profileUrl: profile.profileUrl, currentRole: profile.snippet, templateUsed: 'Error', message: 'AI drafting failed — write manually.' };
  }
}

// ── SHEET HELPERS ─────────────────────────────
function ensureReachoutHeaders() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName(CONFIG.SHEETS.REACHOUT);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.REACHOUT);
    sheet.appendRow(['Company','Role','Contact Name','Their Role','LinkedIn Profile URL','Template Used','Date of Outreach','Message','Status']);
    sheet.setFrozenRows(1);
  }
}

function appendToReachout(company, role, profile) {
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.REACHOUT).appendRow([
    company, role,
    profile.name         || '',
    profile.currentRole  || '',
    profile.profileUrl   || '',
    profile.templateUsed || '',
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/dd/yyyy'),
    profile.message      || '',
    'Ready'
  ]);
}

// ── DEBUG / SELF-TEST ─────────────────────────
function debugFullPipeline() {
  const archiveSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.ARCHIVE);
  if (!archiveSheet) { Logger.log('❌ No Archive sheet'); return; }

  const activeRow = archiveSheet.getActiveCell().getRow();
  const row = archiveSheet.getRange(activeRow, 1, 1, REACHOUT_COL).getValues()[0];
  const company  = row[0];
  const role     = row[1];
  const status   = row[STATUS_COL - 1];
  const reachout = row[REACHOUT_COL - 1];

  Logger.log('=== ROW DATA ===');
  Logger.log(`Company: "${company}"`);
  Logger.log(`Role: "${role}"`);
  Logger.log(`Status: "${status}"`);
  Logger.log(`Reachout flag: "${reachout}"`);
  Logger.log(`Status includes "${CONFIG.OUTREACH.STATUS_MUST_INCLUDE}"? ${status ? status.toString().includes(CONFIG.OUTREACH.STATUS_MUST_INCLUDE) : 'STATUS IS EMPTY'}`);
  Logger.log(`Reachout === "${CONFIG.OUTREACH.TRIGGER_VALUE}"? ${reachout === CONFIG.OUTREACH.TRIGGER_VALUE}`);

  Logger.log('=== CONFIG / KEYS ===');
  Logger.log(`Live scraping enabled? ${CONFIG.ENABLE_LIVE_PROFILE_SCRAPING} (provider: ${CONFIG.SCRAPING_PROVIDER})`);
  Logger.log(`Gemini key set? ${!!getGeminiKey()}`);
  Logger.log(`Apify token set? ${!!getApifyToken()}`);
  Logger.log(`Perplexity key set? ${!!getPerplexityKey()}`);

  if (!CONFIG.ENABLE_LIVE_PROFILE_SCRAPING) {
    Logger.log('⚠️ Live scraping is off — skipping provider test. Nothing else to check.');
    return;
  }

  Logger.log('=== PROVIDER TEST ===');
  const profiles = findProfiles(company, role);
  Logger.log(`Profiles returned: ${profiles.length}`);
  if (profiles.length > 0) Logger.log('First profile: ' + JSON.stringify(profiles[0]));

  Logger.log('=== SHEET WRITE TEST ===');
  ensureReachoutHeaders();
  const testProfile = {
    name: 'TEST PERSON',
    profileUrl: 'https://linkedin.com/test',
    currentRole: 'Test Role',
    templateUsed: 'Test',
    message: 'This is a test message to verify sheet writing works.'
  };
  appendToReachout(company, role, testProfile);
  Logger.log(`✅ Sheet write test complete — check ${CONFIG.SHEETS.REACHOUT} tab`);
}

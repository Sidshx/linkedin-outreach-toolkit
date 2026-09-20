/**
 * ============================================================
 * MAIN.GS — Menu, one-click setup, Gmail job discovery,
 * AI analysis, triggers, and logging.
 *
 * Nothing in this file needs editing. Every setting lives in
 * Config.gs, Section 1.
 * ============================================================
 */

// ============================================================
// MENU
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🤖 Assistant')
    .addItem('⚡ First-Time Setup',                'firstTimeSetup')
    .addItem('✅ Check My Setup',                  'showSetupReport')
    .addItem('🔑 Where do I get API keys?',        'showApiKeyHelp')
    .addSeparator()
    .addItem('👁️ View Full Screen Analysis',      'openReaderModal')
    .addItem('📥 Archive Applied Jobs',            'archiveAppliedJobs')
    .addSeparator()
    .addItem('📧 Fetch LinkedIn Jobs (Manual)',    'fetchLinkedInJobs')
    .addItem('▶️ Run AI for Selected Row Only',    'processSelectedRow')
    .addItem('⏭️ Run Batch AI (All Pending)',       'processJobs')
    .addSeparator()
    .addItem('🔗 Find People + Draft (Selected)',  'reachoutSingleJob')
    .addItem('🔗 Find People + Draft (All Yes)',   'reachoutAllJobs')
    .addSeparator()
    .addItem('🔄 Refresh Dropdown Columns',        'installSheetControls')
    .addItem('⏰ Set Up Daily Automation',         'setupTriggers')
    .addToUi();
}

// ============================================================
// ⚡ FIRST-TIME SETUP — one click does everything
//
// Creates any missing tabs, installs the interactive dropdown
// columns, sets up the daily automation (if enabled), and then
// reports exactly what — if anything — still needs your attention.
// Safe to run again at any time; it never overwrites your data.
// ============================================================
function firstTimeSetup() {
  const ui   = SpreadsheetApp.getUi();
  const done = [];

  try {
    const created = ensureAllTabs();
    if (created.length) done.push('Created missing tabs: ' + created.join(', '));
    else                done.push('All tabs present');

    installSheetControls(true);
    done.push('Interactive dropdowns installed on the Status column');

    if (CONFIG.FEATURES.DAILY_AUTOMATION) {
      setupTriggers(true);
      done.push('Daily automation scheduled for ' + CONFIG.AUTOMATION_MORNING_HOUR + ':00 and ' + CONFIG.AUTOMATION_EVENING_HOUR + ':00');
    } else {
      removeTriggers();
      done.push('Daily automation is off (FEATURES.DAILY_AUTOMATION = false)');
    }

    const report = checkSetup();
    let msg = '⚡ SETUP RUN COMPLETE\n\n';
    msg += done.map(d => '✔ ' + d).join('\n');

    if (report.ready.length) {
      msg += '\n\n── READY ──\n' + report.ready.map(r => '✔ ' + r).join('\n');
    }
    if (report.problems.length) {
      msg += '\n\n── STILL TO DO (' + report.problems.length + ') ──\n' +
             report.problems.map((p, i) => (i + 1) + '. ' + p).join('\n\n');
    } else {
      msg += '\n\n🎉 Nothing left to do. Try: 🤖 Assistant → 📧 Fetch LinkedIn Jobs (Manual)';
    }
    if (report.notes.length) {
      msg += '\n\n── HEADS UP ──\n' + report.notes.map(n => '• ' + n).join('\n');
    }

    writeToLog('First-Time Setup', done.length + ' steps done, ' + report.problems.length + ' items outstanding.', 'Success');
    ui.alert('First-Time Setup', msg, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Setup hit an error', e.message, ui.ButtonSet.OK);
  }
}

/** Creates any tab this toolkit needs that doesn't exist yet, with headers. */
function ensureAllTabs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const S  = CONFIG.SHEETS;
  const created = [];

  const HEADERS = {};
  HEADERS[S.INBOX]       = ['Company', 'Role', 'URL', 'Job Description', 'Type', 'Status'];
  HEADERS[S.JOB_TRACKER] = ['Company Name', 'Role Title', 'Job URL', 'Resume Used', 'Match Score (%)', 'Requirement Matcher', 'Gap Analysis', 'Priority Resume Tweaks', 'Status', 'Suggested Filename', 'Applied Date'];
  HEADERS[S.ARCHIVE]     = HEADERS[S.JOB_TRACKER].concat(['Reachout?']);
  HEADERS[S.REACHOUT]    = ['Company', 'Role', 'Contact Name', 'Their Role', 'LinkedIn Profile URL', 'Resume Used', 'Date', 'Message', 'Status'];
  HEADERS[S.LOG]         = ['Timestamp', 'Action', 'Details', 'Status'];
  HEADERS[S.SETTINGS]    = ['Resume Name', 'Resume Text (paste your full resume here)'];

  Object.keys(HEADERS).forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(HEADERS[name]);
      sheet.setFrozenRows(1);
      created.push(name);

      if (name === S.SETTINGS) {
        // Pre-seed one row per configured resume so it's obvious where to paste.
        CONFIG.RESUMES.forEach(r => {
          sheet.appendRow([r.NAME, 'Paste your ' + r.NAME + ' resume text here (plain text is fine).']);
        });
        sheet.setColumnWidth(1, 160);
        sheet.setColumnWidth(2, 700);
      }
    }
  });

  return created;
}

// ============================================================
// 🔄 INTERACTIVE COLUMNS
//
// Turns the Status column into a real dropdown so you can flip a
// job to "Applied ✅" with two clicks instead of typing text.
// Also adds the Yes/No/Done dropdown to the Archive tab.
// Re-run any time (e.g. after changing CONFIG.STATUS_OPTIONS).
// ============================================================
function installSheetControls(silent) {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const C   = CONFIG.COLUMNS;
  const n   = CONFIG.CONTROL_ROWS;

  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.STATUS_OPTIONS, true)   // true = show dropdown arrow
    .setAllowInvalid(false)
    .setHelpText('Pick a status. Choose "' + CONFIG.STATUS_APPLIED_VALUE + '" once you have applied.')
    .build();

  [CONFIG.SHEETS.JOB_TRACKER, CONFIG.SHEETS.ARCHIVE].forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;
    if (sheet.getMaxRows() < n + 1) sheet.insertRowsAfter(sheet.getMaxRows(), n + 1 - sheet.getMaxRows());
    sheet.getRange(CONFIG.START_ROW, C.STATUS, n, 1).setDataValidation(statusRule);
  });

  // Archive "Reachout?" column — Yes/No/Done dropdown.
  const archive = ss.getSheetByName(CONFIG.SHEETS.ARCHIVE);
  if (archive) {
    const reachoutRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(CONFIG.REACHOUT_OPTIONS, true)
      .setAllowInvalid(false)
      .setHelpText('Set to "Yes" to have the assistant find people and draft outreach for this job.')
      .build();
    archive.getRange(CONFIG.START_ROW, C.REACHOUT, n, 1).setDataValidation(reachoutRule);
  }

  // Colour-code applied rows so progress is visible at a glance.
  const tracker = ss.getSheetByName(CONFIG.SHEETS.JOB_TRACKER);
  if (tracker) {
    const statusRange = tracker.getRange(CONFIG.START_ROW, C.STATUS, n, 1);
    const rules = tracker.getConditionalFormatRules().filter(r => {
      const ranges = r.getRanges().map(x => x.getA1Notation());
      return ranges.indexOf(statusRange.getA1Notation()) === -1;
    });
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(CONFIG.STATUS_APPLIED_VALUE)
      .setBackground('#d9ead3')
      .setRanges([statusRange]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Rejected')
      .setBackground('#f4cccc')
      .setRanges([statusRange]).build());
    tracker.setConditionalFormatRules(rules);
  }

  if (!silent) {
    SpreadsheetApp.getUi().alert('✅ Dropdowns refreshed',
      'The Status column on "' + CONFIG.SHEETS.JOB_TRACKER + '" is now a dropdown.\n\n' +
      'Click any Status cell and pick "' + CONFIG.STATUS_APPLIED_VALUE + '" when you apply — ' +
      'the row turns green and gets picked up by 📥 Archive Applied Jobs.',
      SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// ============================================================
// ✅ / 🔑 HELP DIALOGS
// ============================================================
function showSetupReport() {
  const r  = checkSetup();
  const ui = SpreadsheetApp.getUi();
  let msg  = '';

  if (r.ready.length)    msg += '── WORKING ──\n' + r.ready.map(x => '✔ ' + x).join('\n') + '\n\n';
  if (r.problems.length) msg += '── NEEDS ATTENTION (' + r.problems.length + ') ──\n' + r.problems.map((p, i) => (i + 1) + '. ' + p).join('\n\n') + '\n\n';
  else                   msg += '🎉 Everything checks out — you are ready to run.\n\n';
  if (r.notes.length)    msg += '── HEADS UP ──\n' + r.notes.map(n => '• ' + n).join('\n');

  ui.alert('Setup Check', msg, ui.ButtonSet.OK);
}

function showApiKeyHelp() {
  const ui = SpreadsheetApp.getUi();
  const html = HtmlService.createHtmlOutput(
    '<div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.6;padding:6px">' +
    '<p style="margin-top:0"><b>Keys go here:</b> Extensions → Apps Script → ⚙ Project Settings → ' +
    'Script Properties → <i>Add script property</i> → Save.</p>' +

    '<h3 style="margin-bottom:4px">1 · GEMINI_API_KEY &nbsp;<span style="color:#137333">FREE</span></h3>' +
    '<p style="margin:0 0 4px">Needed for resume analysis and message drafting. No credit card.</p>' +
    '<ol style="margin:0 0 12px 18px;padding:0">' +
    '<li>Open <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a></li>' +
    '<li>Click <b>Create API key</b></li>' +
    '<li>Copy the long string and save it as <code>GEMINI_API_KEY</code></li></ol>' +

    '<h3 style="margin-bottom:4px">2 · APIFY_TOKEN &nbsp;<span style="color:#137333">FREE TIER</span></h3>' +
    '<p style="margin:0 0 4px">Only needed if <code>FEATURES.FIND_PEOPLE_TO_CONTACT</code> is <code>true</code>. ' +
    'This is the one people struggle to find, so here is the exact path:</p>' +
    '<ol style="margin:0 0 12px 18px;padding:0">' +
    '<li>Sign up free: <a href="https://console.apify.com/sign-up" target="_blank">console.apify.com/sign-up</a></li>' +
    '<li>Go <b>directly</b> to <a href="https://console.apify.com/settings/integrations" target="_blank">console.apify.com/settings/integrations</a><br>' +
    '<span style="color:#666">(Do not hunt through the Actors or Store pages — the token is only on this page.)</span></li>' +
    '<li>Find the <b>Personal API tokens</b> box at the top</li>' +
    '<li>Click the 👁 eye icon to reveal, then the copy icon</li>' +
    '<li>The token starts with <code>apify_api_</code> — paste the <b>whole</b> string as <code>APIFY_TOKEN</code></li></ol>' +

    '<h3 style="margin-bottom:4px">3 · PERPLEXITY_API_KEY &nbsp;<span style="color:#b06000">PAID — OPTIONAL</span></h3>' +
    '<p style="margin:0 0 4px">You almost certainly do <b>not</b> need this. It is used only by ' +
    '<code>FEATURES.RESEARCH_EACH_PERSON</code>, which is off by default. Everything else in this ' +
    'toolkit runs on the two free keys above.</p>' +
    '<p style="margin:0 0 12px">If you do have one: ' +
    '<a href="https://www.perplexity.ai/settings/api" target="_blank">perplexity.ai/settings/api</a></p>' +

    '<p style="background:#f1f3f4;padding:8px;border-radius:4px;margin:0">' +
    'After adding keys, run <b>🤖 Assistant → ✅ Check My Setup</b> to confirm they were read correctly.</p>' +
    '</div>'
  ).setWidth(560).setHeight(600);

  ui.showModalDialog(html, 'Where to get your API keys');
}

// ============================================================
// PROMPT BUILDER — resume vs. job-description analysis
// Field-agnostic: works for any profession, driven by CONFIG.ME.
// ============================================================
function getAnalysisPrompt(company, role, jd, resumeText, currentMonth) {
  const me = CONFIG.ME;
  const namePart = (me.NAME || 'Candidate').replace(/\s+/g, '_');

  return `
You are an experienced hiring manager and resume reviewer for this role.
Analyze the job description below against the candidate's resume.
GOAL: output ONLY concrete, actionable directives (Add, Remove, Replace, Modify).

Job: ${company} - ${role}

Candidate focus areas (weight these when judging relevance):
${me.SKILLS}

Job Description:
${jd}

Candidate Resume:
${resumeText}

Return ONLY a raw JSON object. CRITICAL FORMATTING RULES:
1. Use literal "\\n• " for line breaks and bullets. No unescaped newlines.
2. Keep it EXTREMELY crisp (one short sentence max per bullet). Zero fluff.
3. For priority_tweaks give direct copy-paste replacements of roughly the same
   length as the text they replace, so the resume layout does not break.
4. Focus strictly on genuine deficiencies against this job description.
   Do not list positives.

{
  "match_score": "0-100%",
  "requirement_matcher": "• [Job requirement] -> [Resume evidence]\\n• ...",
  "gap_analysis": "• Missing: [Concrete job requirement]\\n• Missing: ...",
  "priority_tweaks": "• Replace '[Old Phrase]' with '[New Phrase]'\\n• ...",
  "filename": "${namePart}_Resume_[Role]_[Key_Skill]_[Company]_${currentMonth}"
}
  `;
}

// ============================================================
// AI CALL — routes to the provider chosen in Config.gs.
// Falls back only if AI_FALLBACK_PROVIDER is set (empty by
// default, which keeps the toolkit 100% free).
// ============================================================
function callAI(prompt, temperature) {
  temperature = (temperature === undefined) ? 0.2 : temperature;
  try {
    return callProvider(CONFIG.AI_PROVIDER, prompt, temperature);
  } catch (primaryErr) {
    if (!CONFIG.AI_FALLBACK_PROVIDER) throw primaryErr;
    Logger.log(CONFIG.AI_PROVIDER + ' failed: ' + primaryErr.message + ' — trying ' + CONFIG.AI_FALLBACK_PROVIDER);
    return callProvider(CONFIG.AI_FALLBACK_PROVIDER, prompt, temperature);
  }
}

function callProvider(provider, prompt, temperature) {
  if (provider === 'gemini')     return callGemini(prompt, temperature);
  if (provider === 'perplexity') return callPerplexity(prompt);
  throw new Error('Unknown AI provider "' + provider + '". Set AI_PROVIDER to "gemini" (free) in Config.gs.');
}

function callGemini(prompt, temperature) {
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey then add it under Project Settings → Script Properties.');

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: temperature, responseMimeType: 'application/json' }
    }),
    muteHttpExceptions: true
  };

  const raw = JSON.parse(
    UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + CONFIG.GEMINI_MODEL + ':generateContent?key=' + apiKey,
      options
    ).getContentText()
  );

  if (!raw.candidates || raw.candidates.length === 0) {
    if (raw.error) {
      // Model retired or restricted: point at the single line to change.
      if (/not found|not supported|no longer available|deprecat/i.test(raw.error.message)) {
        throw new Error('Gemini rejected the model "' + CONFIG.GEMINI_MODEL + '".\n\n' +
          'Fix: open Config.gs, Section 3, and set GEMINI_MODEL to a current model name. ' +
          'The current list is at https://ai.google.dev/gemini-api/docs/models\n\n' +
          'Original error: ' + raw.error.message);
      }
      throw new Error('Gemini API Error: ' + raw.error.message);
    }
    if (raw.promptFeedback && raw.promptFeedback.blockReason) throw new Error('Safety Block: ' + raw.promptFeedback.blockReason);
    throw new Error('Gemini returned an empty response. Check your API key and free-tier quota.');
  }

  return JSON.parse(raw.candidates[0].content.parts[0].text);
}

function callPerplexity(prompt) {
  const apiKey = getPerplexityKey();
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY is not set. This is a paid key — set AI_PROVIDER to "gemini" in Config.gs to stay free.');

  const res = UrlFetchApp.fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    muteHttpExceptions: true,
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    payload: JSON.stringify({
      model: CONFIG.PERPLEXITY_MODEL,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const raw = JSON.parse(res.getContentText());
  if (!raw.choices || raw.choices.length === 0) {
    if (raw.error) throw new Error('Perplexity API Error: ' + raw.error.message);
    throw new Error('Perplexity returned an empty response. Check your API key and credit balance.');
  }

  const text = raw.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(text);
}

// ============================================================
// PROCESS SELECTED ROW
// ============================================================
function processSelectedRow() {
  const ui = SpreadsheetApp.getUi();
  try { requireReady('ai'); } catch (e) { ui.alert('Not ready yet', e.message, ui.ButtonSet.OK); return; }

  const S     = CONFIG.SHEETS;
  const C     = CONFIG.COLUMNS;
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(S.JOB_TRACKER);

  if (!sheet) { ui.alert('Missing the "' + S.JOB_TRACKER + '" tab. Run 🤖 Assistant → ⚡ First-Time Setup.'); return; }

  const activeRow = sheet.getActiveCell().getRow();
  if (activeRow < CONFIG.START_ROW) { ui.alert('Click a job row first (row 2 or below), then run this again.'); return; }

  const rowData = sheet.getRange(activeRow, 1, 1, 11).getValues()[0];
  const company = rowData[C.COMPANY - 1];
  const role    = rowData[C.ROLE - 1];

  // Column D holds the job description while a row is still being analyzed.
  const jdText = sheet.getRange(activeRow, 4).getValue();
  if (!jdText || jdText.toString().length < 50) {
    ui.alert('No job description on this row',
      'Paste the job description into column D of the ' + S.INBOX + ' tab, then run\n' +
      '🤖 Assistant → ⏭️ Run Batch AI (All Pending).', ui.ButtonSet.OK);
    return;
  }

  const picked       = pickResumeFor(role);
  if (!picked.text) { ui.alert('No resume text found. Paste your resume into column B of the ' + S.SETTINGS + ' tab.'); return; }
  const currentMonth = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMMyy');

  if (CONFIG.DRY_RUN) { ui.alert('[DRY RUN] Would analyze ' + company + ' — ' + role + ' using the "' + picked.name + '" resume.'); return; }

  sheet.getRange(activeRow, C.STATUS).setValue('Processing...');
  SpreadsheetApp.flush();

  try {
    const aiData = callAI(getAnalysisPrompt(company, role, jdText, picked.text, currentMonth), 0.2);
    sheet.getRange(activeRow, C.TARGET_RESUME).setValue(picked.name);
    sheet.getRange(activeRow, C.MATCH_SCORE).setValue(aiData.match_score);
    sheet.getRange(activeRow, C.MATCHER).setValue(aiData.requirement_matcher);
    sheet.getRange(activeRow, C.GAPS).setValue(aiData.gap_analysis);
    sheet.getRange(activeRow, C.TWEAKS).setValue(aiData.priority_tweaks);
    sheet.getRange(activeRow, C.STATUS).setValue(CONFIG.STATUS_OPTIONS[0]);
    sheet.getRange(activeRow, C.FILENAME).setValue(aiData.filename);
    ui.alert('✅ Analysis complete for ' + company + ' (resume used: ' + picked.name + ')');
  } catch (e) {
    sheet.getRange(activeRow, C.STATUS).setValue(CONFIG.STATUS_OPTIONS[0]);
    ui.alert('❌ ' + e.message);
  }
}

// ============================================================
// PROCESS BATCH (Inbox → Job Tracker)
// ============================================================
function processJobs() {
  if (!CONFIG.FEATURES.AI_RESUME_ANALYSIS) {
    writeToLog('AI Batch', 'Skipped: FEATURES.AI_RESUME_ANALYSIS is false.', 'Skipped');
    return 0;
  }
  requireReady('ai');

  const S            = CONFIG.SHEETS;
  const C            = CONFIG.COLUMNS;
  const ss           = SpreadsheetApp.getActiveSpreadsheet();
  const inboxSheet   = ss.getSheetByName(S.INBOX);
  const trackerSheet = ss.getSheetByName(S.JOB_TRACKER);

  if (!inboxSheet || !trackerSheet) {
    writeToLog('AI Batch', 'Failed: missing ' + S.INBOX + ' or ' + S.JOB_TRACKER + ' tab. Run First-Time Setup.', 'Error');
    return 0;
  }

  const lastRow = inboxSheet.getLastRow();
  if (lastRow < CONFIG.START_ROW) return 0;

  const data         = inboxSheet.getRange(1, 1, lastRow, 6).getValues();
  let processedCount = 0;
  const currentMonth = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMMyy');

  for (let i = data.length - 1; i >= CONFIG.START_ROW - 1; i--) {
    const row     = data[i];
    const company = row[0];
    const role    = row[1];
    const url     = row[2];
    const jd      = row[3];

    if (!jd || jd.toString().trim() === '') continue;

    // Which resume fits this job title? (See CONFIG.RESUMES.)
    const picked = pickResumeFor(role);
    if (!picked.text) {
      inboxSheet.getRange(i + 1, 6).setValue('Error: no resume text in the ' + S.SETTINGS + ' tab');
      continue;
    }

    if (CONFIG.DRY_RUN) { Logger.log('[DRY RUN] Would process ' + company + ' — ' + role + ' with resume "' + picked.name + '"'); continue; }

    inboxSheet.getRange(i + 1, 6).setValue('Processing...');
    SpreadsheetApp.flush();

    try {
      const aiData = callAI(getAnalysisPrompt(company, role, jd, picked.text, currentMonth), 0.2);
      trackerSheet.appendRow([
        company, role, url, picked.name,
        aiData.match_score, aiData.requirement_matcher,
        aiData.gap_analysis, aiData.priority_tweaks,
        CONFIG.STATUS_OPTIONS[0], aiData.filename, ''
      ]);
      inboxSheet.deleteRow(i + 1);
      processedCount++;
    } catch (e) {
      inboxSheet.getRange(i + 1, 6).setValue('Error: ' + e.message);
    }

    Utilities.sleep(CONFIG.DELAY_BETWEEN_AI_CALLS_MS); // rate-limit guard — do not remove
  }

  // Make sure newly appended rows have working dropdowns.
  if (processedCount > 0) { try { installSheetControls(true); } catch (e) {} }

  writeToLog('AI Resume Analysis', 'Processed ' + processedCount + ' job descriptions.', 'Success');
  return processedCount;
}

// ============================================================
// MODAL — open dashboard
// ============================================================
function openReaderModal() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar').setWidth(850).setHeight(650);
  SpreadsheetApp.getUi().showModalDialog(html, 'Resume Analysis Dashboard');
}

function getActiveRowData() {
  try {
    const C     = CONFIG.COLUMNS;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.JOB_TRACKER);
    if (!sheet) return { error: '❌ Tab named "' + CONFIG.SHEETS.JOB_TRACKER + '" not found. Run ⚡ First-Time Setup.' };

    const row = sheet.getActiveCell().getRow();
    if (row < CONFIG.START_ROW) return { error: '⚠️ Click a job row in the ' + CONFIG.SHEETS.JOB_TRACKER + ' tab first, then hit Refresh.' };

    const data = sheet.getRange(row, 1, 1, 11).getValues()[0];
    if (!data[0]) return { error: '⚠️ That row is empty. Select a filled job row.' };

    return {
      company:  data[C.COMPANY - 1],
      role:     data[C.ROLE - 1],
      url:      data[C.URL - 1],
      score:    data[C.MATCH_SCORE - 1],
      arch:     data[C.MATCHER - 1],
      gaps:     data[C.GAPS - 1],
      tweaks:   data[C.TWEAKS - 1],
      filename: data[C.FILENAME - 1]
    };
  } catch (e) {
    return { error: '❌ ' + e.message };
  }
}

// ============================================================
// CALLED BY DASHBOARD — marks the selected row applied
// (the Status dropdown in the sheet does the same thing)
// ============================================================
function markAsAppliedInSheet() {
  try {
    const C     = CONFIG.COLUMNS;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.JOB_TRACKER);
    if (!sheet) return 'Error: Job Tracker tab not found.';

    const row = sheet.getActiveCell().getRow();
    if (row < CONFIG.START_ROW) return 'Error: select a valid job row.';

    sheet.getRange(row, C.STATUS).setValue(CONFIG.STATUS_APPLIED_VALUE);
    sheet.getRange(row, C.APPLIED_DATE).setValue(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/dd/yyyy'));
    return 'Success';
  } catch (e) {
    return 'Error: ' + e.message;
  }
}

// ============================================================
// FETCH LINKEDIN JOBS FROM GMAIL  (free, no API key)
// ============================================================
function fetchLinkedInJobs() {
  if (!CONFIG.FEATURES.FETCH_JOBS_FROM_GMAIL) {
    writeToLog('LinkedIn Fetch', 'Skipped: FEATURES.FETCH_JOBS_FROM_GMAIL is false.', 'Skipped');
    return;
  }

  const S            = CONFIG.SHEETS;
  const ss           = SpreadsheetApp.getActiveSpreadsheet();
  const inboxSheet   = ss.getSheetByName(S.INBOX);
  const trackerSheet = ss.getSheetByName(S.JOB_TRACKER);
  const archiveSheet = ss.getSheetByName(S.ARCHIVE);

  if (!inboxSheet || !trackerSheet) {
    writeToLog('LinkedIn Fetch', 'Failed: missing ' + S.INBOX + ' or ' + S.JOB_TRACKER + ' tab. Run First-Time Setup.', 'Error');
    return;
  }
  if (!CONFIG.JOB_INCLUDE_KEYWORDS || CONFIG.JOB_INCLUDE_KEYWORDS.length === 0) {
    writeToLog('LinkedIn Fetch', 'Failed: JOB_INCLUDE_KEYWORDS is empty in Config.gs Section 1.2.', 'Error');
    return;
  }

  // Triple deduplication — checks Inbox, Job Tracker, and Archive so the
  // same job never gets added twice regardless of pipeline stage.
  const urlCol = CONFIG.COLUMNS.URL;
  let existingUrls = [];
  [inboxSheet, trackerSheet, archiveSheet].forEach(sh => {
    if (sh && sh.getLastRow() > 1) {
      existingUrls = existingUrls.concat(
        sh.getRange(2, urlCol, sh.getLastRow() - 1, 1).getValues().flat()
          .map(u => u ? u.toString().split('?')[0].trim() : '')
      );
    }
  });

  const keywordClause = CONFIG.JOB_INCLUDE_KEYWORDS.map(k => '"' + k + '"').join(' OR ');
  const query   = CONFIG.GMAIL_SENDER + ' (' + keywordClause + ') ' + CONFIG.GMAIL_LOOKBACK;
  const threads = GmailApp.search(query);
  let newJobsCount = 0;

  threads.forEach(thread => {
    thread.getMessages().forEach(message => {
      const lines = message.getPlainBody().split('\n').map(l => l.trim()).filter(l => l.length > 0);
      for (let i = 0; i < lines.length; i++) {
        const line      = lines[i];
        const lowerLine = line.toLowerCase();

        if (!CONFIG.JOB_INCLUDE_KEYWORDS.some(k => lowerLine.indexOf(k.toLowerCase()) !== -1)) continue;
        if (CONFIG.GMAIL_NOISE_PHRASES.some(p => lowerLine.indexOf(p.toLowerCase()) !== -1)) continue;
        if (CONFIG.JOB_EXCLUDE_KEYWORDS.some(s => lowerLine.indexOf(s.toLowerCase()) !== -1)) continue;

        const title   = line;
        const company = (i + 1 < lines.length) ? lines[i + 1] : 'Unknown';
        let jobUrl    = '';

        for (let k = i; k < Math.min(i + 15, lines.length); k++) {
          if (lines[k].indexOf('jobs/view/') !== -1) {
            const urlMatch = lines[k].match(/(https:\/\/[^\s]+jobs\/view\/[0-9]+)/);
            if (urlMatch) { jobUrl = urlMatch[1].split('?')[0].trim(); break; }
          }
        }

        if (jobUrl && existingUrls.indexOf(jobUrl) === -1) {
          const category = CONFIG.JOB_INCLUDE_KEYWORDS.find(k => lowerLine.indexOf(k.toLowerCase()) !== -1) || 'General';
          if (CONFIG.DRY_RUN) {
            Logger.log('[DRY RUN] Would add: ' + company + ' — ' + title + ' (' + jobUrl + ')');
          } else {
            inboxSheet.appendRow([company, title, jobUrl, '', category, 'Need JD']);
          }
          existingUrls.push(jobUrl);
          newJobsCount++;
          i++;
        }
      }
    });
  });

  writeToLog('LinkedIn Fetch', 'Scanned ' + CONFIG.GMAIL_LOOKBACK + '. Found ' + newJobsCount + ' new jobs.', 'Success');
}

// ============================================================
// SCHEDULED AUTOMATION
// ============================================================
function setupTriggers(silent) {
  removeTriggers();

  if (!CONFIG.FEATURES.DAILY_AUTOMATION) {
    if (!silent) SpreadsheetApp.getUi().alert('Daily automation is turned off.\n\nSet FEATURES.DAILY_AUTOMATION to true in Config.gs, then run this again.');
    return;
  }

  ScriptApp.newTrigger('runMorningBatch').timeBased().everyDays(1).atHour(CONFIG.AUTOMATION_MORNING_HOUR).create();
  ScriptApp.newTrigger('runEveningBatch').timeBased().everyDays(1).atHour(CONFIG.AUTOMATION_EVENING_HOUR).create();

  writeToLog('System', 'Automation set for ' + CONFIG.AUTOMATION_MORNING_HOUR + ':00 and ' + CONFIG.AUTOMATION_EVENING_HOUR + ':00.', 'Success');
  if (!silent) {
    SpreadsheetApp.getUi().alert('✅ Daily automation is on.\n\nFetch + AI analysis will run at ' +
      CONFIG.AUTOMATION_MORNING_HOUR + ':00 and ' + CONFIG.AUTOMATION_EVENING_HOUR +
      ':00 every day.\n\nChange the hours in Config.gs, Section 2.');
  }
}

function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
}

function runMorningBatch() {
  fetchLinkedInJobs();
  processJobs();
  if (CONFIG.FEATURES.MORNING_SUMMARY_EMAIL) sendMorningReminder();
}

function runEveningBatch() {
  fetchLinkedInJobs();
  processJobs();
}

// ============================================================
// MORNING SUMMARY EMAIL (free, uses your own Gmail)
// ============================================================
function sendMorningReminder() {
  if (!CONFIG.FEATURES.MORNING_SUMMARY_EMAIL) return;

  const S            = CONFIG.SHEETS;
  const C            = CONFIG.COLUMNS;
  const ss           = SpreadsheetApp.getActiveSpreadsheet();
  const inboxSheet   = ss.getSheetByName(S.INBOX);
  const trackerSheet = ss.getSheetByName(S.JOB_TRACKER);

  let pendingJDs = 0, pendingAI = 0, readyToApply = 0;

  if (inboxSheet && inboxSheet.getLastRow() > 1) {
    inboxSheet.getRange(2, 4, inboxSheet.getLastRow() - 1, 1).getValues().forEach(row => {
      (!row[0] || row[0].toString().trim() === '') ? pendingJDs++ : pendingAI++;
    });
  }
  if (trackerSheet && trackerSheet.getLastRow() > 1) {
    trackerSheet.getRange(2, C.STATUS, trackerSheet.getLastRow() - 1, 1).getValues().forEach(row => {
      if (!row[0] || row[0].toString().indexOf('Applied') === -1) readyToApply++;
    });
  }

  const totalPending = pendingAI + readyToApply;
  const totalActive  = pendingJDs + pendingAI + readyToApply;
  const emailAddress = Session.getActiveUser().getEmail();
  const sheetUrl     = ss.getUrl();
  const name         = CONFIG.ME.NAME || 'there';

  if (CONFIG.DRY_RUN) { Logger.log('[DRY RUN] Would send the morning summary email.'); return; }

  MailApp.sendEmail(
    emailAddress,
    '☀️ Job Pipeline: ' + totalPending + ' ready to apply',
    '☀️ Good morning, ' + name + '\n\n' +
    '🔍 Jobs still needing a description: ' + pendingJDs + '\n' +
    '🚀 Ready to apply: ' + totalPending + ' (' + pendingAI + ' awaiting AI + ' + readyToApply + ' analyzed)\n' +
    '📈 Total active: ' + totalActive + '\n\n' + sheetUrl
  );
  writeToLog('Morning Summary', 'Email sent. Pipeline: ' + totalActive + '.', 'Success');
}

// ============================================================
// ARCHIVE — moves every row whose Status dropdown says Applied
// ============================================================
function archiveAppliedJobs() {
  const S            = CONFIG.SHEETS;
  const C            = CONFIG.COLUMNS;
  const ui           = SpreadsheetApp.getUi();
  const ss           = SpreadsheetApp.getActiveSpreadsheet();
  const trackerSheet = ss.getSheetByName(S.JOB_TRACKER);
  const archiveSheet = ss.getSheetByName(S.ARCHIVE);

  if (!trackerSheet || !archiveSheet) { ui.alert('Missing the "' + S.JOB_TRACKER + '" or "' + S.ARCHIVE + '" tab. Run ⚡ First-Time Setup.'); return; }

  const data        = trackerSheet.getDataRange().getValues();
  let archivedCount = 0;

  for (let i = data.length - 1; i > 0; i--) {
    const status = data[i][C.STATUS - 1];
    if (status && status.toString().indexOf('Applied') !== -1) {
      archiveSheet.appendRow(data[i]);
      trackerSheet.deleteRow(i + 1);
      archivedCount++;
    }
  }

  if (archivedCount > 0) { try { installSheetControls(true); } catch (e) {} }

  writeToLog('Archive Cleanup', 'Moved ' + archivedCount + ' jobs to Archive.', 'Success');
  ui.alert('✅ Moved ' + archivedCount + ' applied job(s) to Archive.\n\n' +
           'Set the "Reachout?" column there to "Yes" on any row you want outreach drafted for.');
}

// ============================================================
// LOG (trimmed to CONFIG.LOG_MAX_ROWS entries)
// ============================================================
function writeToLog(action, details, status) {
  const logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.LOG);
  if (!logSheet) return;
  logSheet.appendRow([Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/dd/yyyy HH:mm:ss'), action, details, status]);
  const lastRow = logSheet.getLastRow();
  const maxRows = CONFIG.LOG_MAX_ROWS + 1; // +1 for the header row
  if (lastRow > maxRows) logSheet.deleteRows(2, lastRow - maxRows);
}

// ============================================================
// HTML ENTITY DECODER
// ============================================================
function decodeHtmlEntities(text) {
  if (!text) return '';
  return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ');
}

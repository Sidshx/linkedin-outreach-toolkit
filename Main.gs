/**
 * ============================================================
 * MAIN.GS — Menu, orchestration, Gmail job discovery, AI analysis,
 * triggers, and logging.
 *
 * All tunable values live in Config.gs — nothing here should need
 * editing for normal use.
 * ============================================================
 */

// ============================================================
// MENU
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🤖 Assistant')
    .addItem('👁️ View Full Screen Analysis',     'openReaderModal')
    .addItem('📥 Archive Applied Jobs',           'archiveAppliedJobs')
    .addSeparator()
    .addItem('📧 Fetch LinkedIn Jobs (Manual)',   'fetchLinkedInJobs')
    .addItem('▶️ Run AI for Selected Row Only',   'processSelectedRow')
    .addItem('⏭️ Run Batch AI (All Pending)',      'processJobs')
    .addSeparator()
    .addItem('🔗 LinkedIn Outreach (Selected Row)','reachoutSingleJob')
    .addItem('🔗 LinkedIn Outreach (All Yes)',     'reachoutAllJobs')
    .addSeparator()
    .addItem('⏰ Set Up Daily Triggers',           'setupTriggers')
    .addToUi();
}

// ============================================================
// PROMPT BUILDER — resume/JD match analysis
// ============================================================
function getSurgicalPrompt(company, role, jd, selectedResume, currentMonth) {
  const a = CONFIG.ANALYSIS;
  const signals = a.PRIORITY_SIGNALS.map((s, i) => `${i + 1}) ${s}`).join('\n    ');

  return `
    ${a.RECRUITER_PERSONA}
    Analyze this job description against the provided candidate resume.
    GOAL: Output ONLY actionable directives (Add, Remove, Replace, Modify).

    Job: ${company} - ${role}

    Very heavily weight (in this order):
    ${signals}

    Job Description:
    ${jd}

    Candidate Resume:
    ${selectedResume}

    Return ONLY a raw JSON object. CRITICAL FORMATTING RULES:
    1. Use literal "\\n• " for line breaks and bullets. No unescaped newlines.
    2. Keep it EXTREMELY crisp (1 short sentence max per bullet). Zero fluff.
    3. SPACE-CONSTRAINED for priority_tweaks: direct copy-paste replacements, same length as old text.
    4. Focus strictly on technical deficiencies. No positives.

    {
      "match_score": "0-100%",
      "architecture_matcher": "• [JD Req] -> [Resume Evidence]\\n• ...",
      "gap_analysis": "• Missing: [Concrete JD req]\\n• Missing: ...",
      "priority_tweaks": "• Replace '[Old Phrase]' with '[New Phrase]'\\n• ...",
      "filename": "${a.CANDIDATE_NAME.replace(/\\s+/g, '_')}_Resume_[Role]_[Core_Methodology]_[Keywords]_[Company]_${currentMonth}26"
    }
  `;
}

// ============================================================
// AI CALL — routes to whichever provider Config.gs selects,
// with automatic fallback if configured.
// ============================================================
function callAI(prompt, temperature) {
  temperature = (temperature === undefined) ? 0.2 : temperature;
  try {
    return callProvider(CONFIG.AI_PROVIDER, prompt, temperature);
  } catch (primaryErr) {
    if (!CONFIG.AI_FALLBACK_PROVIDER) throw primaryErr;
    Logger.log(`${CONFIG.AI_PROVIDER} failed: ${primaryErr.message} — trying ${CONFIG.AI_FALLBACK_PROVIDER}`);
    return callProvider(CONFIG.AI_FALLBACK_PROVIDER, prompt, temperature);
  }
}

function callProvider(provider, prompt, temperature) {
  if (provider === 'gemini')     return callGemini(prompt, temperature);
  if (provider === 'perplexity') return callPerplexity(prompt);
  throw new Error(`Unknown AI provider: ${provider}`);
}

function callGemini(prompt, temperature) {
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in Script Properties.');

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
      `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${apiKey}`,
      options
    ).getContentText()
  );

  if (!raw.candidates || raw.candidates.length === 0) {
    if (raw.error)                                           throw new Error('Gemini API Error: ' + raw.error.message);
    if (raw.promptFeedback && raw.promptFeedback.blockReason) throw new Error('Safety Block: ' + raw.promptFeedback.blockReason);
    throw new Error('Gemini returned empty response. Check API key/quota.');
  }

  return JSON.parse(raw.candidates[0].content.parts[0].text);
}

function callPerplexity(prompt) {
  const apiKey = getPerplexityKey();
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY not set in Script Properties.');

  const res = UrlFetchApp.fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    muteHttpExceptions: true,
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    payload: JSON.stringify({
      model: CONFIG.PERPLEXITY_MODEL,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const raw = JSON.parse(res.getContentText());
  if (!raw.choices || raw.choices.length === 0) {
    if (raw.error) throw new Error('Perplexity API Error: ' + raw.error.message);
    throw new Error('Perplexity returned empty response. Check API key/quota.');
  }

  const text = raw.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(text);
}

// ============================================================
// PROCESS SELECTED ROW
// ============================================================
function processSelectedRow() {
  validateConfig();
  const S            = CONFIG.SHEETS;
  const ss           = SpreadsheetApp.getActiveSpreadsheet();
  const sheet        = ss.getSheetByName(S.JOB_TRACKER);
  const settingsSheet = ss.getSheetByName(S.SETTINGS);

  if (!sheet || !settingsSheet) { SpreadsheetApp.getUi().alert(`Error: Missing "${S.JOB_TRACKER}" or "${S.SETTINGS}" tab.`); return; }

  const activeRow = sheet.getActiveCell().getRow();
  if (activeRow < CONFIG.START_ROW) { SpreadsheetApp.getUi().alert('Select a valid job row (Row 2+).'); return; }

  const rowData          = sheet.getRange(activeRow, 1, 1, 10).getValues()[0];
  const company          = rowData[0];
  const role             = rowData[1];
  const jd               = rowData[3];
  const targetResumeType = rowData[4];

  if (!jd) { SpreadsheetApp.getUi().alert('Column D (Job Description) is empty.'); return; }

  const resumeA  = settingsSheet.getRange('B1').getValue();
  const resumeB  = settingsSheet.getRange('B2').getValue();
  const selectedResume = (targetResumeType === CONFIG.ANALYSIS.RESUME_B_LABEL) ? resumeB : resumeA;
  const currentMonth   = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMM');

  if (CONFIG.DRY_RUN) { SpreadsheetApp.getUi().alert('[DRY RUN] Would analyze ' + company + ' — ' + role); return; }

  sheet.getRange(activeRow, 10).setValue('Processing...');
  SpreadsheetApp.flush();

  try {
    const aiData = callAI(getSurgicalPrompt(company, role, jd, selectedResume, currentMonth), 0.2);
    sheet.getRange(activeRow, 6).setValue(aiData.match_score);
    sheet.getRange(activeRow, 7).setValue(aiData.architecture_matcher);
    sheet.getRange(activeRow, 8).setValue(aiData.gap_analysis);
    sheet.getRange(activeRow, 9).setValue(aiData.priority_tweaks);
    sheet.getRange(activeRow, 10).setValue('Ready to Apply');
    sheet.getRange(activeRow, 11).setValue(aiData.filename);
    SpreadsheetApp.getUi().alert('✅ Analysis complete for ' + company);
  } catch (e) {
    sheet.getRange(activeRow, 10).setValue('Error: ' + e.message);
    SpreadsheetApp.getUi().alert('❌ ' + e.message);
  }
}

// ============================================================
// PROCESS BATCH (Inbox → Job Tracker)
// ============================================================
function processJobs() {
  validateConfig();
  const S             = CONFIG.SHEETS;
  const ss            = SpreadsheetApp.getActiveSpreadsheet();
  const inboxSheet    = ss.getSheetByName(S.INBOX);
  const trackerSheet  = ss.getSheetByName(S.JOB_TRACKER);
  const settingsSheet = ss.getSheetByName(S.SETTINGS);

  if (!inboxSheet || !trackerSheet || !settingsSheet) {
    writeToLog('AI Batch', `Failed: Missing ${S.INBOX}, ${S.JOB_TRACKER}, or ${S.SETTINGS} tabs.`, 'Error');
    return 0;
  }

  const resumeA  = settingsSheet.getRange('B1').getValue();
  const resumeB  = settingsSheet.getRange('B2').getValue();
  const lastRow   = inboxSheet.getLastRow();
  if (lastRow < CONFIG.START_ROW) return 0;

  const data         = inboxSheet.getRange(1, 1, lastRow, 6).getValues();
  let processedCount = 0;
  const currentMonth = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMM');

  for (let i = data.length - 1; i >= CONFIG.START_ROW - 1; i--) {
    const row              = data[i];
    const company          = row[0];
    const role             = row[1];
    const url              = row[2];
    const jd               = row[3];
    const targetResumeType = row[4];

    if (!jd || jd.toString().trim() === '') continue;

    const selectedResume = (targetResumeType === CONFIG.ANALYSIS.RESUME_B_LABEL) ? resumeB : resumeA;
    if (!selectedResume) { inboxSheet.getRange(i + 1, 6).setValue('Error: Resume missing in Settings'); continue; }

    if (CONFIG.DRY_RUN) { Logger.log(`[DRY RUN] Would process ${company} — ${role}`); continue; }

    inboxSheet.getRange(i + 1, 6).setValue('Processing...');
    SpreadsheetApp.flush();

    try {
      const aiData = callAI(getSurgicalPrompt(company, role, jd, selectedResume, currentMonth), 0.2);
      trackerSheet.appendRow([
        company, role, url, targetResumeType,
        aiData.match_score, aiData.architecture_matcher,
        aiData.gap_analysis, aiData.priority_tweaks,
        'Ready to Apply', aiData.filename
      ]);
      inboxSheet.deleteRow(i + 1);
      processedCount++;
    } catch (e) {
      inboxSheet.getRange(i + 1, 6).setValue('Error: ' + e.message);
    }

    Utilities.sleep(3500); // rate-limit guard — do not remove
  }

  writeToLog('AI Resume Analysis', `Processed ${processedCount} JDs.`, 'Success');
  return processedCount;
}

// ============================================================
// MODAL — open sidebar
// ============================================================
function openReaderModal() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setWidth(850)
    .setHeight(650);
  SpreadsheetApp.getUi().showModalDialog(html, 'Resume Analysis Dashboard');
}

function getActiveRowData() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.JOB_TRACKER);
    if (!sheet) return { error: `❌ Tab named "${CONFIG.SHEETS.JOB_TRACKER}" not found.` };

    const row = sheet.getActiveCell().getRow();
    if (row < CONFIG.START_ROW)  return { error: '⚠️ Click a job row in the Job Tracker tab first, then hit Refresh.' };

    const data = sheet.getRange(row, 1, 1, 11).getValues()[0];
    if (!data[0]) return { error: '⚠️ Row is empty. Select a filled job row.' };

    return {
      company:  data[0],
      role:     data[1],
      url:      data[2],
      score:    data[4],
      arch:     data[5],
      gaps:     data[6],
      tweaks:   data[7],
      filename: data[9]
    };
  } catch(e) {
    return { error: '❌ ' + e.message };
  }
}

// ============================================================
// CALLED BY SIDEBAR — marks row applied
// ============================================================
function markAsAppliedInSheet() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.JOB_TRACKER);
    if (!sheet) return 'Error: Job Tracker tab not found.';

    const row = sheet.getActiveCell().getRow();
    if (row < CONFIG.START_ROW) return 'Error: Select a valid job row.';

    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/dd/yyyy');
    sheet.getRange(row, 9).setValue('Applied ✅');
    sheet.getRange(row, 11).setValue(today);
    return 'Success';
  } catch (e) {
    return 'Error: ' + e.message;
  }
}

// ============================================================
// FETCH LINKEDIN JOBS FROM GMAIL
// ============================================================
function fetchLinkedInJobs() {
  const S            = CONFIG.SHEETS;
  const G            = CONFIG.GMAIL;
  const ss           = SpreadsheetApp.getActiveSpreadsheet();
  const inboxSheet   = ss.getSheetByName(S.INBOX);
  const trackerSheet = ss.getSheetByName(S.JOB_TRACKER);
  const archiveSheet = ss.getSheetByName(S.ARCHIVE);

  if (!inboxSheet || !trackerSheet) {
    writeToLog('LinkedIn Fetch', `Failed: Missing ${S.INBOX} or ${S.JOB_TRACKER} tabs.`, 'Error');
    return;
  }

  // Triple deduplication — checks Inbox, Job Tracker, and Archive so the
  // same job never gets added twice regardless of pipeline stage.
  let existingUrls = [];
  if (inboxSheet.getLastRow()   > 1) existingUrls = existingUrls.concat(inboxSheet.getRange(2, 3, inboxSheet.getLastRow() - 1, 1).getValues().flat().map(u => u ? u.toString().split('?')[0].trim() : ''));
  if (trackerSheet.getLastRow() > 1) existingUrls = existingUrls.concat(trackerSheet.getRange(2, 3, trackerSheet.getLastRow() - 1, 1).getValues().flat().map(u => u ? u.toString().split('?')[0].trim() : ''));
  if (archiveSheet && archiveSheet.getLastRow() > 1) existingUrls = existingUrls.concat(archiveSheet.getRange(2, 3, archiveSheet.getLastRow() - 1, 1).getValues().flat().map(u => u ? u.toString().split('?')[0].trim() : ''));

  const keywordClause = G.INCLUDE_KEYWORDS.map(k => `"${k}"`).join(' OR ');
  const query   = `${G.SENDER_FILTER} (${keywordClause}) ${G.LOOKBACK_WINDOW}`;
  const threads = GmailApp.search(query);
  let newJobsCount = 0;

  threads.forEach(thread => {
    thread.getMessages().forEach(message => {
      const lines = message.getPlainBody().split('\n').map(l => l.trim()).filter(l => l.length > 0);
      for (let i = 0; i < lines.length; i++) {
        const line      = lines[i];
        const lowerLine = line.toLowerCase();

        const matchesInclude = G.INCLUDE_KEYWORDS.some(k => lowerLine.includes(k.toLowerCase()));
        if (!matchesInclude) continue;
        if (G.NOISE_PHRASES.some(p => lowerLine.includes(p.toLowerCase()))) continue;
        if (G.EXCLUDE_SENIORITY.some(s => lowerLine.includes(s.toLowerCase()))) continue;

        const title   = line;
        const company = (i + 1 < lines.length) ? lines[i + 1] : 'Unknown';
        let jobUrl    = '';

        for (let k = i; k < Math.min(i + 15, lines.length); k++) {
          if (lines[k].includes('jobs/view/')) {
            const urlMatch = lines[k].match(/(https:\/\/[^\s]+jobs\/view\/[0-9]+)/);
            if (urlMatch) { jobUrl = urlMatch[1].split('?')[0].trim(); break; }
          }
        }

        if (jobUrl && !existingUrls.includes(jobUrl)) {
          const category = G.INCLUDE_KEYWORDS.find(k => lowerLine.includes(k.toLowerCase())) || 'General';
          if (CONFIG.DRY_RUN) {
            Logger.log(`[DRY RUN] Would add: ${company} — ${title} (${jobUrl})`);
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

  writeToLog('LinkedIn Fetch', `Scanned window. Found ${newJobsCount} new jobs.`, 'Success');
}

// ============================================================
// SCHEDULED TRIGGERS
// ============================================================
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('runMorningBatch').timeBased().everyDays(1).atHour(CONFIG.TRIGGERS.MORNING_HOUR).create();
  ScriptApp.newTrigger('runEveningBatch').timeBased().everyDays(1).atHour(CONFIG.TRIGGERS.EVENING_HOUR).create();
  writeToLog('System', `Triggers set: ${CONFIG.TRIGGERS.MORNING_HOUR}:00 and ${CONFIG.TRIGGERS.EVENING_HOUR}:00.`, 'Success');
  SpreadsheetApp.getUi().alert(`✅ Triggers set!\n\nFetch & AI will run at ${CONFIG.TRIGGERS.MORNING_HOUR}:00 and ${CONFIG.TRIGGERS.EVENING_HOUR}:00 daily.`);
}

function runMorningBatch() {
  fetchLinkedInJobs();
  processJobs();
  if (CONFIG.TRIGGERS.SEND_MORNING_EMAIL) sendMorningReminder();
}

function runEveningBatch() {
  fetchLinkedInJobs();
  processJobs();
}

// ============================================================
// MORNING EMAIL
// ============================================================
function sendMorningReminder() {
  const S            = CONFIG.SHEETS;
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
    trackerSheet.getRange(2, 9, trackerSheet.getLastRow() - 1, 1).getValues().forEach(row => {
      if (!row[0] || !row[0].toString().includes('Applied')) readyToApply++;
    });
  }

  const totalPending = pendingAI + readyToApply;
  const totalActive  = pendingJDs + pendingAI + readyToApply;
  const emailAddress = Session.getActiveUser().getEmail();
  const sheetUrl      = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  const candidateName = CONFIG.ANALYSIS.CANDIDATE_NAME;

  if (CONFIG.DRY_RUN) { Logger.log('[DRY RUN] Would send morning reminder email.'); return; }

  MailApp.sendEmail(
    emailAddress,
    `☀️ Job Pipeline: ${totalPending} Ready to Apply!`,
    `☀️ Good Morning, ${candidateName}!\n\n🔍 Missing JDs: ${pendingJDs}\n🚀 Ready to Apply: ${totalPending} (${pendingAI} pending AI + ${readyToApply} analyzed)\n📈 Total Active: ${totalActive}\n\n${sheetUrl}`
  );
  writeToLog('Morning Reminder', `Email sent. Pipeline: ${totalActive}.`, 'Success');
}

// ============================================================
// ARCHIVE
// ============================================================
function archiveAppliedJobs() {
  const S             = CONFIG.SHEETS;
  const ss           = SpreadsheetApp.getActiveSpreadsheet();
  const trackerSheet = ss.getSheetByName(S.JOB_TRACKER);
  const archiveSheet = ss.getSheetByName(S.ARCHIVE);

  if (!trackerSheet || !archiveSheet) { SpreadsheetApp.getUi().alert(`Error: Ensure "${S.JOB_TRACKER}" and "${S.ARCHIVE}" tabs exist.`); return; }

  const data        = trackerSheet.getDataRange().getValues();
  let archivedCount = 0;

  for (let i = data.length - 1; i > 0; i--) {
    if (data[i][8] && data[i][8].toString().includes('Applied')) {
      archiveSheet.appendRow(data[i]);
      trackerSheet.deleteRow(i + 1);
      archivedCount++;
    }
  }

  writeToLog('Archive Cleanup', `Moved ${archivedCount} jobs to Archive.`, 'Success');
  SpreadsheetApp.getUi().alert(`✅ Moved ${archivedCount} applied jobs to Archive.`);
}

// ============================================================
// LOG (trimmed to CONFIG.LOG_MAX_ROWS entries)
// ============================================================
function writeToLog(action, details, status) {
  const logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.LOG);
  if (!logSheet) return;
  logSheet.appendRow([Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/dd/yyyy HH:mm:ss'), action, details, status]);
  const lastRow = logSheet.getLastRow();
  const maxRows = CONFIG.LOG_MAX_ROWS + 1; // +1 for header
  if (lastRow > maxRows) logSheet.deleteRows(2, lastRow - maxRows);
}

// ============================================================
// HTML ENTITY DECODER
// ============================================================
function decodeHtmlEntities(text) {
  if (!text) return '';
  return text.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ');
}

/**
 * ============================================================
 * ONE-TIME SETUP SCRIPT — creates a brand-new, correctly-structured
 * spreadsheet with every tab, header row, and the Settings labels
 * this toolkit expects. Run once, then bind Config.gs/Main.gs/etc.
 * to the sheet it creates (or paste this function into any sheet's
 * Apps Script editor temporarily and run it from there).
 *
 * This file is NOT required at runtime — it's a scaffolding helper.
 * Delete it after your sheet is created if you like a clean project.
 * ============================================================
 */
function createLinkedInOutreachTemplate() {
  const ss = SpreadsheetApp.create('LinkedIn Outreach & Job Tracker');

  // Inbox
  const inbox = ss.getSheets()[0];
  inbox.setName('Inbox');
  inbox.appendRow(['Company', 'Role', 'URL', 'Job Description', 'Type', 'Status']);
  inbox.setFrozenRows(1);

  // Job Tracker
  const tracker = ss.insertSheet('Job Tracker');
  tracker.appendRow(['Company Name', 'Role Title', 'Job URL', 'Target Resume', 'Match Score (%)', 'Architecture & Protocol Matcher', 'Gap Analysis Matrix', 'Priority Resume Tweaks', 'Status', 'Filename', 'Applied Date']);
  tracker.setFrozenRows(1);

  // Archive (Job Tracker columns + a trigger column for outreach)
  const archive = ss.insertSheet('Archive');
  archive.appendRow(['Company Name', 'Role Title', 'Job URL', 'Target Resume', 'Match Score (%)', 'Architecture & Protocol Matcher', 'Gap Analysis Matrix', 'Priority Resume Tweaks', 'Status', 'Filename', 'Applied Date', 'Reachout?']);
  archive.setFrozenRows(1);

  // AI Reachout (populated automatically by the script)
  const reachout = ss.insertSheet('AI Reachout');
  reachout.appendRow(['Company', 'Role', 'Contact Name', 'Their Role', 'LinkedIn Profile URL', 'Template Used', 'Date of Outreach', 'Message', 'Status']);
  reachout.setFrozenRows(1);

  // Log (populated automatically by the script)
  const log = ss.insertSheet('Log');
  log.appendRow(['Timestamp', 'Action', 'Details', 'Status']);
  log.setFrozenRows(1);

  // Settings — paste your resume text into B1/B2
  const settings = ss.insertSheet('Settings');
  settings.getRange('A1').setValue('Primary Resume');
  settings.getRange('A2').setValue('Secondary Resume');
  settings.getRange('B1').setValue('Paste your primary resume text here (used for most JDs).');
  settings.getRange('B2').setValue('Paste your secondary resume variant here (used when Target Resume matches CONFIG.ANALYSIS.CATEGORY_B_KEYWORDS).');

  Logger.log('✅ Created template spreadsheet: ' + ss.getUrl());
  return ss.getUrl();
}

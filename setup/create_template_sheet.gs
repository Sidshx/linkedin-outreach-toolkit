/**
 * ============================================================
 * OPTIONAL SCAFFOLDING SCRIPT
 *
 * You probably don't need this file.
 *
 * The normal path is: create a blank Google Sheet, paste in the four
 * project files, reload, then run 🤖 Assistant → ⚡ First-Time Setup —
 * which creates every tab, header, and dropdown for you inside that sheet.
 *
 * Use this file only if you'd rather generate a brand-new, fully
 * structured spreadsheet from scratch before binding the script.
 * Paste it into any Apps Script editor and run
 * createLinkedInOutreachTemplate() once.
 * ============================================================
 */
function createLinkedInOutreachTemplate() {
  const ss = SpreadsheetApp.create('LinkedIn Outreach & Job Tracker');

  const TRACKER_HEADERS = ['Company Name', 'Role Title', 'Job URL', 'Resume Used',
                           'Match Score (%)', 'Requirement Matcher', 'Gap Analysis',
                           'Priority Resume Tweaks', 'Status', 'Suggested Filename', 'Applied Date'];

  // Inbox — new jobs land here; you paste the job description into column D
  const inbox = ss.getSheets()[0];
  inbox.setName('Inbox');
  inbox.appendRow(['Company', 'Role', 'URL', 'Job Description', 'Type', 'Status']);
  inbox.setFrozenRows(1);

  // Job Tracker — analyzed jobs, with the interactive Status dropdown
  const tracker = ss.insertSheet('Job Tracker');
  tracker.appendRow(TRACKER_HEADERS);
  tracker.setFrozenRows(1);

  // Archive — applied jobs, plus the Reachout? trigger column
  const archive = ss.insertSheet('Archive');
  archive.appendRow(TRACKER_HEADERS.concat(['Reachout?']));
  archive.setFrozenRows(1);

  // AI Reachout — filled in automatically
  const reachout = ss.insertSheet('AI Reachout');
  reachout.appendRow(['Company', 'Role', 'Contact Name', 'Their Role',
                      'LinkedIn Profile URL', 'Resume Used', 'Date', 'Message', 'Status']);
  reachout.setFrozenRows(1);

  // Log — filled in automatically
  const log = ss.insertSheet('Log');
  log.appendRow(['Timestamp', 'Action', 'Details', 'Status']);
  log.setFrozenRows(1);

  // Settings — one row per resume: name in column A, full text in column B.
  // Add as many rows as you have resumes; one row is perfectly fine.
  const settings = ss.insertSheet('Settings');
  settings.appendRow(['Resume Name', 'Resume Text (paste your full resume here)']);
  settings.appendRow(['General', 'Paste your resume text here. Plain text is fine.']);
  settings.setFrozenRows(1);
  settings.setColumnWidth(1, 160);
  settings.setColumnWidth(2, 700);

  // Interactive dropdowns on the Status columns
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Ready to Apply', 'Applied ✅', 'Interviewing', 'Offer', 'Rejected', 'Not a fit'], true)
    .setAllowInvalid(false).build();
  [tracker, archive].forEach(sh => sh.getRange(2, 9, 1000, 1).setDataValidation(statusRule));

  const reachoutRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['No', 'Yes', 'Done'], true)
    .setAllowInvalid(false).build();
  archive.getRange(2, 12, 1000, 1).setDataValidation(reachoutRule);

  Logger.log('✅ Created template spreadsheet: ' + ss.getUrl());
  return ss.getUrl();
}

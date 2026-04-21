// db/seed.js
// Career Assistant — Database Seed
// Imports all roles from JobSearchState.md (v2.1.0.2, last updated 2026-04-16)
// Run once after init.js. Not safe to re-run without clearing the DB first.

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'jobsearch.sqlite'));

const insertRole = db.prepare(`
  INSERT INTO roles (company, title, url, source, role_status, candidacy, applied_date, salary_min, salary_max, notes)
  VALUES (@company, @title, @url, @source, @role_status, @candidacy, @applied_date, @salary_min, @salary_max, @notes)
`);

const insertSkipReason = db.prepare(`
  INSERT INTO skip_reasons (role_id, reason, note)
  VALUES (@role_id, @reason, @note)
`);

const insertTerminationReason = db.prepare(`
  INSERT INTO termination_reasons (role_id, reason, note)
  VALUES (@role_id, @reason, @note)
`);

const seed = db.transaction(() => {

  // ─── APPLIED — ACTIVE: OUTCOME UNKNOWN ───────────────────────────────────

  let r;

  r = insertRole.run({ company: 'Circle.so', title: 'Senior Quality Engineer', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-03-15', salary_min: 120000, salary_max: 130000, notes: null });

  r = insertRole.run({ company: 'GovWorx', title: 'QA Engineer', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-04-15', salary_min: null, salary_max: null, notes: '911/public safety AI; FBI background check; law enforcement adjacency acknowledged' });

  r = insertRole.run({ company: 'Termius', title: 'QA Engineer', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-04-15', salary_min: null, salary_max: null, notes: 'Cross-platform SSH client; comp TBD' });

  r = insertRole.run({ company: 'Symetra', title: 'Test Automation Engineer Lead', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-02-15', salary_min: null, salary_max: null, notes: null });

  r = insertRole.run({ company: 'Harris School Solutions', title: 'QA Manager', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-03-22', salary_min: null, salary_max: null, notes: null });

  r = insertRole.run({ company: 'Murmuration', title: 'Senior QA Engineer', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-03-22', salary_min: null, salary_max: null, notes: null });

  r = insertRole.run({ company: 'Equip', title: 'Senior SDET', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-03-22', salary_min: null, salary_max: null, notes: null });

  r = insertRole.run({ company: 'ClassWallet', title: 'QA Automation Engineer', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-03-29', salary_min: null, salary_max: null, notes: null });

  r = insertRole.run({ company: 'TherapyNotes', title: 'Senior QA Automation Engineer', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-03-29', salary_min: null, salary_max: null, notes: null });

  r = insertRole.run({ company: 'Sogeti', title: 'Senior Quality Assurance Engineer', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-03-30', salary_min: null, salary_max: null, notes: null });

  r = insertRole.run({ company: 'STERIS', title: 'Senior Manager, Test and Validation Engineering', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-04-10', salary_min: 150000, salary_max: 178000, notes: 'Base + bonus + LTI; hard CS degree noted' });

  r = insertRole.run({ company: 'Cleerly', title: 'Senior Quality Engineer', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-04-10', salary_min: 137000, salary_max: 160000, notes: '15% bonus (TTC $157K-$184K); manual-heavy scope' });

  // ─── APPLIED — ACTIVE: PRESUMED FILTERED ─────────────────────────────────

  r = insertRole.run({ company: 'Proof', title: 'Senior Software QA Engineer', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-03-15', salary_min: null, salary_max: null, notes: 'Presumed filtered' });

  r = insertRole.run({ company: 'Expansion', title: 'Construction Tech (unnamed client)', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-02-15', salary_min: null, salary_max: null, notes: 'Presumed filtered' });

  r = insertRole.run({ company: 'Groundtruth / UP.Labs', title: 'Sr. AI Quality Engineer', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-02-15', salary_min: null, salary_max: null, notes: 'Presumed filtered' });

  r = insertRole.run({ company: 'Deepgram', title: 'QA Engineering Manager', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-01-15', salary_min: null, salary_max: null, notes: 'First application; presumed filtered' });

  r = insertRole.run({ company: 'Deepgram', title: 'QA Engineering Manager', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-03-15', salary_min: null, salary_max: null, notes: 'Second application; presumed filtered' });

  r = insertRole.run({ company: 'Gradient AI', title: 'Senior QA Engineer', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-02-15', salary_min: null, salary_max: null, notes: 'Presumed filtered' });

  r = insertRole.run({ company: 'Natera', title: 'Sr. Software Quality Engineer', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-02-15', salary_min: null, salary_max: null, notes: 'Presumed filtered' });

  r = insertRole.run({ company: 'Caterpillar', title: 'Software QA Specialist, Cat Digital', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-02-15', salary_min: null, salary_max: null, notes: 'Presumed filtered' });

  r = insertRole.run({ company: 'MDCalc', title: 'QA Engineer', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-02-15', salary_min: null, salary_max: null, notes: 'Presumed filtered' });

  r = insertRole.run({ company: 'Resilience', title: 'QA Engineer', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-02-15', salary_min: null, salary_max: null, notes: 'Presumed filtered' });

  r = insertRole.run({ company: 'DroneDeploy', title: 'Lead QA Engineer', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-02-15', salary_min: null, salary_max: null, notes: 'Presumed filtered' });

  r = insertRole.run({ company: 'Jobgether', title: 'Senior Quality Engineer', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-02-15', salary_min: null, salary_max: null, notes: 'Presumed filtered' });

  r = insertRole.run({ company: 'Jobgether', title: 'Manager, Quality Engineering Enablement', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-02-15', salary_min: null, salary_max: null, notes: 'Presumed filtered' });

  r = insertRole.run({ company: 'Clearpath', title: 'QA Lead', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-02-15', salary_min: null, salary_max: null, notes: 'Presumed filtered' });

  r = insertRole.run({ company: 'RadarFirst', title: 'Lead SDET', url: null, source: null, role_status: 'Applied', candidacy: null, applied_date: '2026-03-15', salary_min: null, salary_max: null, notes: 'Presumed filtered' });

  // ─── APPLIED — RESOLVED: DECLINED ────────────────────────────────────────

  r = insertRole.run({ company: 'Elsevier', title: 'Senior QA Test Engineer II', url: null, source: null, role_status: 'Closed', candidacy: null, applied_date: '2026-01-15', salary_min: null, salary_max: null, notes: null });
  insertTerminationReason.run({ role_id: r.lastInsertRowid, reason: 'Screened Out', note: null });

  r = insertRole.run({ company: 'ServiceUp', title: 'QA Engineer', url: null, source: null, role_status: 'Closed', candidacy: null, applied_date: '2026-01-15', salary_min: null, salary_max: null, notes: null });
  insertTerminationReason.run({ role_id: r.lastInsertRowid, reason: 'Screened Out', note: null });

  r = insertRole.run({ company: 'Walker & Dunlop / WDTech', title: 'Senior QA Engineer', url: null, source: null, role_status: 'Closed', candidacy: null, applied_date: '2026-01-15', salary_min: null, salary_max: null, notes: null });
  insertTerminationReason.run({ role_id: r.lastInsertRowid, reason: 'Screened Out', note: null });

  r = insertRole.run({ company: 'The Nature Conservancy', title: 'Sr. Quality Management Analyst', url: null, source: null, role_status: 'Closed', candidacy: null, applied_date: '2026-01-15', salary_min: null, salary_max: null, notes: null });
  insertTerminationReason.run({ role_id: r.lastInsertRowid, reason: 'Screened Out', note: null });

  r = insertRole.run({ company: 'Group 1001 / Onyx', title: 'Senior QA Automation Engineer', url: null, source: null, role_status: 'Closed', candidacy: null, applied_date: '2026-02-15', salary_min: null, salary_max: null, notes: null });
  insertTerminationReason.run({ role_id: r.lastInsertRowid, reason: 'Screened Out', note: null });

  r = insertRole.run({ company: 'RegScale', title: 'Senior Software Quality Engineer', url: null, source: null, role_status: 'Closed', candidacy: null, applied_date: '2026-03-15', salary_min: null, salary_max: null, notes: 'DoD adjacency acknowledged' });
  insertTerminationReason.run({ role_id: r.lastInsertRowid, reason: 'Screened Out', note: null });

  r = insertRole.run({ company: 'PwC', title: 'Quality Engineer, Senior Manager', url: null, source: null, role_status: 'Closed', candidacy: null, applied_date: '2026-03-15', salary_min: null, salary_max: null, notes: null });
  insertTerminationReason.run({ role_id: r.lastInsertRowid, reason: 'Screened Out', note: null });

  r = insertRole.run({ company: 'Machinify', title: 'Staff Automation Engineer', url: null, source: null, role_status: 'Closed', candidacy: null, applied_date: '2026-03-15', salary_min: null, salary_max: null, notes: null });
  insertTerminationReason.run({ role_id: r.lastInsertRowid, reason: 'Screened Out', note: null });

  r = insertRole.run({ company: 'Virtuous', title: 'Sr. Software Engineer in Test', url: null, source: null, role_status: 'Closed', candidacy: null, applied_date: '2026-03-15', salary_min: null, salary_max: null, notes: null });
  insertTerminationReason.run({ role_id: r.lastInsertRowid, reason: 'Screened Out', note: null });

  r = insertRole.run({ company: 'Crowe', title: 'Senior Quality Analyst', url: null, source: null, role_status: 'Closed', candidacy: null, applied_date: '2026-04-15', salary_min: null, salary_max: null, notes: null });
  insertTerminationReason.run({ role_id: r.lastInsertRowid, reason: 'Screened Out', note: null });

  r = insertRole.run({ company: 'Teali', title: 'Unknown', url: null, source: null, role_status: 'Closed', candidacy: null, applied_date: '2026-04-15', salary_min: null, salary_max: null, notes: null });
  insertTerminationReason.run({ role_id: r.lastInsertRowid, reason: 'Screened Out', note: null });

  // ─── APPLIED — RESOLVED: FILLED OR CANCELLED ─────────────────────────────

  r = insertRole.run({ company: 'Imagine Pediatrics', title: 'QA Engineer', url: null, source: null, role_status: 'Closed', candidacy: null, applied_date: '2026-01-15', salary_min: null, salary_max: null, notes: null });
  insertTerminationReason.run({ role_id: r.lastInsertRowid, reason: 'Filled', note: null });

  r = insertRole.run({ company: 'Reality Defender', title: 'QA Lead', url: null, source: null, role_status: 'Closed', candidacy: null, applied_date: '2026-02-15', salary_min: null, salary_max: null, notes: null });
  insertTerminationReason.run({ role_id: r.lastInsertRowid, reason: 'Filled', note: null });

  r = insertRole.run({ company: 'Calendly', title: 'QA Engineer III', url: null, source: null, role_status: 'Closed', candidacy: null, applied_date: '2026-03-20', salary_min: 127000, salary_max: 154000, notes: null });
  insertTerminationReason.run({ role_id: r.lastInsertRowid, reason: 'Filled', note: null });

  r = insertRole.run({ company: 'Gravie', title: 'AI Test Automation Engineer', url: null, source: null, role_status: 'Closed', candidacy: null, applied_date: '2026-03-15', salary_min: null, salary_max: null, notes: null });
  insertTerminationReason.run({ role_id: r.lastInsertRowid, reason: 'Cancelled', note: 'Unfilled' });

  // ─── APPLIED — RESOLVED: OTHER ────────────────────────────────────────────

  r = insertRole.run({ company: 'FIS/Amount', title: 'QA Engineer (Core Integrations - Banks)', url: null, source: null, role_status: 'Closed', candidacy: null, applied_date: '2026-01-15', salary_min: null, salary_max: null, notes: 'Role too junior' });
  insertTerminationReason.run({ role_id: r.lastInsertRowid, reason: 'Withdrew - Other', note: 'Role too junior' });

  r = insertRole.run({ company: 'Speechify', title: 'Manual QA Engineer, Web Core Product', url: null, source: null, role_status: 'Closed', candidacy: null, applied_date: '2026-03-15', salary_min: null, salary_max: null, notes: 'Not proceeding but unfilled; homework + reading list; reapply ~May 2026' });
  insertTerminationReason.run({ role_id: r.lastInsertRowid, reason: 'Withdrew - Other', note: 'Not proceeding but unfilled; reapply ~May 2026' });

  // ─── ON HOLD ──────────────────────────────────────────────────────────────

  r = insertRole.run({ company: 'Unanet', title: 'Lead QA Automation Engineer', url: null, source: null, role_status: 'On Hold', candidacy: null, applied_date: '2025-12-15', salary_min: null, salary_max: null, notes: 'GovCon ERP flag acknowledged. Completed most rounds; positive feedback. Role filled internally. Follow-up requested for Q2 2026. Monitor.' });

  // ─── RESUME NEEDED (formerly Bookmarked) ─────────────────────────────────

  r = insertRole.run({ company: 'CSG Systems', title: 'Scrum Master / Lead Test Engineer', url: 'https://csgi.wd5.myworkdayjobs.com/CSGCareers/job/United-States-Remote/Scrum-Master--Lead-Test-Engineer_31770', source: null, role_status: 'Applied', candidacy: 'Competitive', applied_date: '2026-04-14', salary_min: 90000, salary_max: 144000, notes: 'Tool-agnostic JD; AI tool leverage called out explicitly — LLM/prompt testing experience is differentiator; dual Scrum Master + Lead QA scope covered honestly; anchor high on comp' });

  // ─── SKIPPED ──────────────────────────────────────────────────────────────

  const skipped = [
    { company: 'Ethos', title: 'Manager, CX Quality', reasons: [{ reason: 'Unknown', note: null }], notes: null },
    { company: 'ECP', title: 'Unknown', reasons: [{ reason: 'Unknown', note: null }], notes: null },
    { company: 'Cint', title: 'Unknown', reasons: [{ reason: 'Unknown', note: null }], notes: null },
    { company: 'Scopely', title: 'Unknown', reasons: [{ reason: 'Unknown', note: null }], notes: null },
    { company: 'Hirobe', title: 'Unknown', reasons: [{ reason: 'Unknown', note: null }], notes: null },
    { company: 'Qualitest', title: 'Unknown', reasons: [{ reason: 'Unknown', note: null }], notes: null },
    { company: 'Blockskye', title: 'Unknown', reasons: [{ reason: 'Ethics - Other', note: 'Blockchain/DeFi' }], notes: null },
    { company: 'Anaconda', title: 'Unknown', reasons: [{ reason: 'Unknown', note: null }], notes: null },
    { company: 'Grow Therapy', title: 'Unknown', reasons: [{ reason: 'Unknown', note: null }], notes: null },
    { company: 'Mattermost', title: 'Unknown', reasons: [{ reason: 'Unknown', note: null }], notes: null },
    { company: 'Ocient', title: 'Unknown', reasons: [{ reason: 'Unknown', note: null }], notes: null },
    { company: 'Digitas', title: 'Unknown', reasons: [{ reason: 'Unknown', note: null }], notes: null },
    { company: 'Solace', title: 'Unknown', reasons: [{ reason: 'Unknown', note: null }], notes: null },
    { company: 'Signify Technology', title: 'Unknown', reasons: [{ reason: 'Unknown', note: null }], notes: null },
    { company: 'BRG / Second Sight Solutions', title: 'Unknown', reasons: [{ reason: 'Other', note: 'Terminated without applying' }], notes: null },
    { company: 'UBC', title: 'Unknown', reasons: [{ reason: 'Wrong Industry', note: 'Call center QA' }], notes: null },
    { company: 'Dover / traceability platform', title: 'Unknown', reasons: [{ reason: 'Ethics - Other', note: 'Anti-AI culture' }, { reason: 'Compensation', note: 'Comp risk' }], notes: null },
    { company: 'Wrapbook', title: 'Unknown', reasons: [{ reason: 'Wrong Industry', note: 'Entertainment payroll domain' }], notes: null },
    { company: 'Loftware', title: 'Unknown', reasons: [{ reason: 'Wrong Industry', note: 'QMS/compliance' }], notes: null },
    { company: 'Wing Assistant', title: 'Unknown', reasons: [{ reason: 'Culture', note: 'Glassdoor flag' }, { reason: 'Skills Gap', note: 'Selenium' }], notes: null },
    { company: 'Assured', title: 'Unknown', reasons: [{ reason: 'Culture', note: null }], notes: null },
    { company: 'GE Healthcare', title: 'Network Software Dev QA Specialist', reasons: [{ reason: 'Wrong Industry', note: 'Networking domain' }, { reason: 'Skills Gap', note: 'Python/PowerShell' }], notes: null },
    { company: 'Bestow', title: 'Quality Engineering Manager', reasons: [{ reason: 'Wrong Industry', note: 'SDET production coding scope' }], notes: null },
    { company: 'Veritone', title: 'Staff QA Automation Engineer', reasons: [{ reason: 'Ethics - Surveillance', note: 'Facial recognition — DoD/intelligence; mass surveillance' }], notes: null },
    { company: 'EagleView', title: 'Unknown', reasons: [{ reason: 'Wrong Industry', note: 'Geospatial/GIS' }, { reason: 'Compensation', note: '$72K-$89.5K' }], notes: null, salary_min: 72000, salary_max: 89500 },
    { company: 'Thrive Global', title: 'Unknown', reasons: [{ reason: 'Culture', note: 'Toxic CEO' }], notes: null },
    { company: 'One Call Care Management', title: 'Unknown', reasons: [{ reason: 'Wrong Industry', note: 'Ops-adjacent discipline' }], notes: null },
    { company: 'FINVI', title: 'Unknown', reasons: [{ reason: 'Compensation', note: 'Below floor' }], notes: null },
    { company: 'tvScientific', title: 'Unknown', reasons: [{ reason: 'Culture', note: 'Toxic leadership' }], notes: null },
    { company: 'Doximity', title: 'Unknown', reasons: [{ reason: 'Wrong Industry', note: 'Native mobile' }], notes: null },
    { company: 'Skylight', title: 'Unknown', reasons: [{ reason: 'Wrong Industry', note: 'Native iOS/Android' }], notes: null },
    { company: 'Grocery TV', title: 'Unknown', reasons: [{ reason: 'Location', note: 'Austin in-office' }], notes: null },
    { company: 'JetBrains No Pressure team', title: 'Unknown', reasons: [{ reason: 'Location', note: 'EU-only' }], notes: null },
    { company: 'Filevine', title: 'Unknown', reasons: [{ reason: 'Culture', note: '2.8/5; 42% recommend; toxic leadership' }], notes: null },
    { company: 'CareDx', title: 'Unknown', reasons: [{ reason: 'Culture', note: 'Regime-change pattern' }, { reason: 'Compensation', note: 'Ceiling $128K' }], notes: null, salary_max: 128000 },
    { company: 'Delos Data', title: 'SDET-AI', reasons: [{ reason: 'Skills Gap', note: 'Python/Docker/K8s' }, { reason: 'Wrong Industry', note: 'Systems infra' }, { reason: 'Other', note: 'Hard CS degree' }], notes: null },
    { company: 'Bellese Technologies', title: 'Engineer II QA', reasons: [{ reason: 'Skills Gap', note: 'Salesforce/Copado' }, { reason: 'Compensation', note: 'Ceiling $125K' }], notes: null, salary_max: 125000 },
    { company: 'Pano AI', title: 'Staff Quality Engineer, Design', reasons: [{ reason: 'Wrong Industry', note: 'Embedded/hardware' }], notes: null },
    { company: 'SitusAMC', title: 'Sr Quality Assurance', reasons: [{ reason: 'Skills Gap', note: 'Selenium/Java; DB 3yr req' }, { reason: 'Culture', note: 'Surveillance/layoff pattern' }], notes: null },
    { company: 'Flex', title: 'Senior SDET', reasons: [{ reason: 'Wrong Industry', note: 'SDET polyglot scope' }, { reason: 'Ethics - Exploitative Industry/Product', note: 'Predatory finance' }], notes: null },
    { company: 'Verinext', title: 'Senior QA Analyst', reasons: [{ reason: 'Skills Gap', note: 'Selenium primary; DB 3yr req' }], notes: null },
    { company: 'Raval West', title: 'Senior SQA Engineer', reasons: [{ reason: 'Location', note: 'Sacramento/AZ' }, { reason: 'Skills Gap', note: 'Selenium 3yr hard req' }], notes: null },
    { company: 'Akamai', title: 'Senior SDET — DDoS Security', reasons: [{ reason: 'Ethics - Defense/Military', note: 'Defense/gov' }, { reason: 'Skills Gap', note: 'Python/K8s/Docker' }], notes: null },
    { company: 'Akamai', title: 'Senior SDET II — Zero Trust', reasons: [{ reason: 'Ethics - Defense/Military', note: 'Defense/gov; Secret clearance' }, { reason: 'Skills Gap', note: 'Python/K8s/Docker' }], notes: null },
    { company: 'GE Vernova', title: 'Senior Test Engineer', reasons: [{ reason: 'Wrong Industry', note: 'Nuclear equipment qualification' }], notes: null },
    { company: 'Hyatt', title: 'Senior QA Analyst Mobile', reasons: [{ reason: 'Wrong Industry', note: 'Native iOS/Android' }], notes: null },
    { company: 'Mercor', title: 'SWE Expert', reasons: [{ reason: 'Other', note: 'Pure contract' }, { reason: 'Skills Gap', note: 'Python primary' }], notes: null },
    { company: 'Draper', title: 'Senior Special Test Lead', reasons: [{ reason: 'Ethics - Defense/Military', note: 'Defense contractor; Secret clearance' }, { reason: 'Wrong Industry', note: 'Physical test engineering' }], notes: null },
    { company: 'Faith Technologies', title: 'Advanced Test Engineer', reasons: [{ reason: 'Wrong Industry', note: 'Hardware/electrical' }, { reason: 'Other', note: 'Hard STEM degree' }], notes: null },
    { company: 'Trilogy Federal', title: 'Momentum Technical Analyst', reasons: [{ reason: 'Ethics - Defense/Military', note: 'GovCon federal' }, { reason: 'Skills Gap', note: 'Momentum ERP; Groovy/Java/PL-SQL' }], notes: null },
    { company: 'Mindex', title: 'Test Engineer', reasons: [{ reason: 'Skills Gap', note: 'Selenium/C#/.NET' }, { reason: 'Wrong Industry', note: 'SDET scope' }, { reason: 'Compensation', note: 'Below floor' }], notes: null },
    { company: 'WeShare', title: 'QA Engineer', reasons: [{ reason: 'Ethics - Exploitative Industry/Product', note: 'Predatory finance — health sharing ministry; systematic claim denials' }], notes: null },
    { company: 'Motorola Solutions', title: 'Senior Quality Manager', reasons: [{ reason: 'Wrong Industry', note: 'Hardware/manufacturing QA' }, { reason: 'Ethics - Defense/Military', note: 'Defense/law enforcement adjacency' }], notes: null },
    { company: 'Tiger Analytics', title: 'Sales Leader Quality Engineering', reasons: [{ reason: 'Wrong Industry', note: 'Sales/BD role' }], notes: null },
    { company: 'SMA America', title: 'Quality Analysis Engineer', reasons: [{ reason: 'Wrong Industry', note: 'Hardware/electrical failure analysis' }], notes: null },
    { company: 'Parexel', title: 'GCP Quality Governance Operations Lead', reasons: [{ reason: 'Wrong Industry', note: 'Clinical/pharma QA' }, { reason: 'Location', note: 'Argentina-based' }], notes: null },
    { company: 'Circana', title: 'VP Quality Systems Management', reasons: [{ reason: 'Wrong Industry', note: 'QMS/operational excellence' }], notes: null },
    { company: 'Smile Digital Health', title: 'QA Automation Tester', reasons: [{ reason: 'Skills Gap', note: 'Java/Selenium/RestAssured' }], notes: null },
    { company: 'SmartLight Analytics', title: 'Quality Assurance Analyst II', reasons: [{ reason: 'Skills Gap', note: 'Python/Selenium' }], notes: null },
    { company: 'mPulse', title: 'Automated Test Engineer II', reasons: [{ reason: 'Skills Gap', note: 'Java/Selenium/TestNG/RestAssured' }], notes: null },
    { company: 'HHAeXchange', title: 'Sr. QA Engineer', reasons: [{ reason: 'Skills Gap', note: 'Java/Selenium/Appium/JMeter' }, { reason: 'Culture', note: '2.4/5; mass layoffs Feb 2024' }], notes: null },
    { company: 'Gradient AI', title: 'Senior QA Engineer', reasons: [{ reason: 'Other', note: 'Already applied' }, { reason: 'Skills Gap', note: 'Selenium/WebdriverIO' }], notes: null },
    { company: 'Deepgram', title: 'Model Evaluation QA Lead', reasons: [{ reason: 'Wrong Industry', note: 'Python/ML eval infra' }, { reason: 'Other', note: 'Same company as active application' }], notes: null },
    { company: 'Faith Technologies', title: 'Software QA and Support Analyst', reasons: [{ reason: 'Wrong Industry', note: 'Junior; support hybrid; internal IT' }], notes: null },
    { company: 'Veracyte', title: 'Principal Software QA Engineer', reasons: [{ reason: 'Wrong Industry', note: 'LIMS/Salesforce/genomics' }], notes: null },
    { company: 'WireWheel.io', title: 'QA Lead', reasons: [{ reason: 'Wrong Industry', note: 'Python/Node.js API dev — SDET scope' }], notes: null },
    { company: 'Seamless.AI', title: 'Senior QA Engineer', reasons: [{ reason: 'Skills Gap', note: 'Java/Selenium' }], notes: null },
    { company: 'G2i', title: 'QA Engineer', reasons: [{ reason: 'Other', note: 'Pure contract' }, { reason: 'Wrong Industry', note: 'SDET scope' }], notes: null },
    { company: 'HealthEdge', title: 'Senior QA Lead', reasons: [{ reason: 'Wrong Industry', note: 'Claims adjudication hard req' }, { reason: 'Compensation', note: '$100K-$120K' }], notes: null, salary_max: 120000 },
    { company: 'Bluebeam', title: 'Automation Engineer', reasons: [{ reason: 'Other', note: 'Applied — abandoned; no retry' }], notes: null },
    { company: 'LINE Pay Taiwan', title: 'QA Engineer', reasons: [{ reason: 'Other', note: 'Applied — abandoned; no retry' }], notes: null },
    { company: 'LINE Pay EPI Taiwan', title: 'QA Engineer', reasons: [{ reason: 'Other', note: 'Applied — abandoned; no retry' }], notes: null },
    { company: 'PwC', title: 'Quality Engineer Senior Manager', reasons: [{ reason: 'Other', note: 'Applied — declined; see Applied' }], notes: null },
    { company: 'Deepgram', title: 'QA Engineering Manager (skip record)', reasons: [{ reason: 'Other', note: 'Applied — presumed filtered; see Applied' }], notes: null },
    { company: 'Celara', title: 'QA Automation Engineer', reasons: [{ reason: 'Other', note: 'Pure contract' }, { reason: 'Wrong Industry', note: 'Geospatial/vessel-tracking' }], notes: null },
    { company: 'Nagarro', title: 'Principal Engineer QA Manual', reasons: [{ reason: 'Other', note: 'No retrievable JD; likely India region; consulting firm' }], notes: null },
    { company: 'Circle.so', title: 'Senior Quality Platform Engineer', reasons: [{ reason: 'Wrong Industry', note: 'Platform/infra eng' }, { reason: 'Skills Gap', note: 'Ruby/Docker/K8s' }], notes: 'Distinct from SQE role applied' },
    { company: 'Obie', title: 'Senior QA Engineer', reasons: [{ reason: 'Compensation', note: 'Ceiling $130K' }, { reason: 'Skills Gap', note: 'Java/Python/Salesforce/accessibility gaps' }], notes: null, salary_max: 130000 },
    { company: 'Envision Pharma Group', title: 'Lead Software Test Automation Engineer', reasons: [{ reason: 'Skills Gap', note: 'Selenium hard co-req; Java/Groovy/Python gaps' }, { reason: 'Compensation', note: 'Ceiling $120K' }], notes: null, salary_max: 120000 },
    { company: 'LMI', title: 'Software Testing Lead', reasons: [{ reason: 'Ethics - Defense/Military', note: 'Defense contractor' }, { reason: 'Skills Gap', note: 'Python/Java/C# required' }, { reason: 'Compensation', note: 'Ceiling $125K' }], notes: null, salary_max: 125000 },
    { company: 'ECS', title: 'NIH NIAID QA Manager', reasons: [{ reason: 'Location', note: 'DC Metro required' }, { reason: 'Wrong Industry', note: 'Clinical/regulatory QMS' }], notes: null },
    { company: 'Consensus Cloud Solutions', title: 'Staff Quality Engineer', reasons: [{ reason: 'Skills Gap', note: 'Java/TestNG 8yr explicit; JMeter 4yr explicit; mobile 6yr explicit' }], notes: null },
    { company: 'Bunzl', title: 'Principal QA Engineer – AI Testing', reasons: [{ reason: 'Location', note: '3-4 days in-office (Morton Grove)' }, { reason: 'Skills Gap', note: 'JMeter/Python gaps' }], notes: null },
    { company: 'Qorali', title: 'Director of Quality Engineering', reasons: [{ reason: 'Other', note: 'Staffing agency post; unnamed fintech/financial services client; pursuing via Qorali recruiter process' }], notes: null },
    { company: 'PDQ', title: 'Software Engineer in Test', reasons: [{ reason: 'Location', note: 'Romania only' }], notes: null },
    { company: 'NetBrain Technologies', title: 'QA Engineer', reasons: [{ reason: 'Location', note: 'Toronto hybrid required' }, { reason: 'Skills Gap', note: 'Python/Java/Go primary' }], notes: null },
    { company: 'ZOLL Medical', title: 'Sr. Product QA Engineer', reasons: [{ reason: 'Wrong Industry', note: 'Medical device product quality/compliance' }], notes: null },
    { company: 'Senseonics', title: 'Sr. Principal Quality Engineer', reasons: [{ reason: 'Wrong Industry', note: 'MDR/complaint handling; regulatory QA' }], notes: null },
    { company: 'Lynx Software Technologies', title: 'SQA Engineer DO-178', reasons: [{ reason: 'Wrong Industry', note: 'DO-178 avionics certification QA; safety-critical embedded systems' }], notes: null },
    { company: 'Uncountable Inc', title: 'Quality Engineer', reasons: [{ reason: 'Wrong Industry', note: 'QMS/CSV compliance; 21 CFR Part 11' }], notes: null },
    { company: 'StackAI', title: 'Lead QA Engineer', reasons: [{ reason: 'Skills Gap', note: 'Python proficiency hard requirement on application form' }], notes: null },
    { company: 'Delos Data', title: 'Verification Engineer', reasons: [{ reason: 'Wrong Industry', note: 'RTL/ASIC hardware verification; SystemVerilog/UVM' }], notes: null },
    { company: 'Radformation', title: 'Adaptive QA Manager', reasons: [{ reason: 'Wrong Industry', note: 'Radiation treatment QA; not software test engineering' }], notes: null },
    { company: 'WireWheel.io', title: 'Software QA Engineer', reasons: [{ reason: 'Culture', note: '2.7/5 Glassdoor; specific leadership dysfunction; strategic drift; stale 2021 funding; 34% positive business outlook; comp risk' }], notes: null },
    { company: 'Impiricus', title: 'QA Automation Engineer', reasons: [{ reason: 'Skills Gap', note: 'Python proficiency scored knockout on application form' }, { reason: 'Other', note: 'IC scope below target seniority' }], notes: null },
  ];

  for (const role of skipped) {
    r = insertRole.run({
      company: role.company,
      title: role.title ?? null,
      url: null,
      source: null,
      role_status: 'Skipped',
      candidacy: null,
      applied_date: null,
      salary_min: role.salary_min ?? null,
      salary_max: role.salary_max ?? null,
      notes: role.notes ?? null,
    });
    for (const sr of role.reasons) {
      insertSkipReason.run({ role_id: r.lastInsertRowid, reason: sr.reason, note: sr.note });
    }
  }

});

seed();
console.log('Seed complete.');
db.close();

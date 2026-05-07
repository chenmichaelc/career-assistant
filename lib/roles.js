// lib/roles.js
// Career Assistant — Role operations
// All DB write logic lives here. Callers are responsible for opening and closing the DB connection.

// ─── Validation ───────────────────────────────────────────────────────────────

const REQUIRED_FIELDS = ['company', 'title', 'url', 'role_status', 'jd'];

const CONTEXTUAL_RULES = [
  {
    condition: (fields) => fields.role_status === 'Applied' && !fields.applied_date,  // 
    message:   'applied_date is required when role_status is Applied.'
  },
  {
    condition: (fields) => fields.role_status === 'Skipped' && (!fields.skip_reasons || fields.skip_reasons.length === 0),
    message:   'skip_reasons is required when role_status is Skipped.'
  },
  {
    condition: (fields) => fields.role_status === 'Closed' && (!fields.termination_reasons || fields.termination_reasons.length === 0),
    message:   'termination_reasons is required when role_status is Closed.'
  }
];

function validate(fields) {
  const errors = [];

  for (const field of REQUIRED_FIELDS) {
    const value = fields[field];
    const isMissing = value === null || value === undefined || String(value).trim() === '';
    if (isMissing) {
      errors.push(`${field} is required.`);
    }
  }

  for (const rule of CONTEXTUAL_RULES) {
    if (rule.condition(fields)) {
      errors.push(rule.message);
    }
  }

  return errors;
}

// ─── addRole ──────────────────────────────────────────────────────────────────

function addRole(db, fields) {
  const errors = validate(fields);

  if (errors.length > 0) {
    const errorList = errors.map(e => `  - ${e}`).join('\n');
    throw new Error(`Validation failed:\n${errorList}`);
  }

  let roleId;

  const insertRole = db.prepare(`
    INSERT INTO roles (company, title, url, role_status, candidacy, applied_date, salary_min, salary_max, notes)
    VALUES (@company, @title, @url, @role_status, @candidacy, @applied_date, @salary_min, @salary_max, @notes)
  `);

  const insertJd = db.prepare(`
    INSERT INTO job_descriptions (role_id, content)
    VALUES (@role_id, @content)
  `);

  const insertSkipReason = db.prepare(`
    INSERT INTO skip_reasons (role_id, reason, note)
    VALUES (@role_id, @reason, @note)
  `);

  const insertTerminationReason = db.prepare(`
    INSERT INTO termination_reasons (role_id, reason, note)
    VALUES (@role_id, @reason, @note)
  `);

  const run = db.transaction(() => {
    const roleData = {
      company:      fields.company,
      title:        fields.title,
      url:          fields.url,
      role_status:  fields.role_status,
      candidacy:    fields.candidacy    ?? null,
      applied_date: fields.applied_date ?? null,
      salary_min:   fields.salary_min   ?? null,
      salary_max:   fields.salary_max   ?? null,
      notes:        fields.notes        ?? null,
    };

    const result = insertRole.run(roleData);
    roleId = result.lastInsertRowid;

    insertJd.run({
      role_id: roleId,
      content: fields.jd,
    });

    if (fields.skip_reasons) {
      for (const sr of fields.skip_reasons) {
        insertSkipReason.run({
          role_id: roleId,
          reason:  sr.reason,
          note:    sr.note ?? null,
        });
      }
    }

    if (fields.termination_reasons) {
      for (const tr of fields.termination_reasons) {
        insertTerminationReason.run({
          role_id: roleId,
          reason:  tr.reason,
          note:    tr.note ?? null,
        });
      }
    }
  });

  run();
  return roleId;
}

module.exports = { addRole };

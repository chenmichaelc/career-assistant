// lib/roles.js
// Career Assistant — Role operations
// All DB write logic lives here. Callers are responsible for opening and closing the DB connection.

// ─── Validation ───────────────────────────────────────────────────────────────

const CONTEXTUAL_RULES = [
  {
    condition: (fields) => fields.role_status === 'Applied' && !fields.applied_date,
    message: 'applied_date is required when role_status is Applied.'
  },
  {
    condition: (fields) => fields.role_status === 'Skipped' && (!fields.skip_reasons || fields.skip_reasons.length === 0),
    message: 'skip_reasons is required when role_status is Skipped.'
  },
  {
    condition: (fields) => fields.role_status === 'Closed' && (!fields.termination_reasons || fields.termination_reasons.length === 0),
    message: 'termination_reasons is required when role_status is Closed.'
  }
];

const REQUIRED_FIELDS = ['company', 'title', 'url', 'role_status', 'jd'];

function validate(fields) {
  const errors = [];

  for (const field of REQUIRED_FIELDS) {
    if (!fields[field] || String(fields[field]).trim() === '') {
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

// ─── addRole ─────────────────────────────────────────────────────────────────

function addRole(db, fields) {
  const errors = validate(fields);
  if (errors.length > 0) {
    throw new Error(`Validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
  }

  let roleId;

  const insert = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO roles (company, title, url, role_status, candidacy, applied_date, salary_min, salary_max, notes)
      VALUES (@company, @title, @url, @role_status, @candidacy, @applied_date, @salary_min, @salary_max, @notes)
    `).run({
      company:      fields.company,
      title:        fields.title,
      url:          fields.url,
      role_status:  fields.role_status,
      candidacy:    fields.candidacy    ?? null,
      applied_date: fields.applied_date ?? null,
      salary_min:   fields.salary_min   ?? null,
      salary_max:   fields.salary_max   ?? null,
      notes:        fields.notes        ?? null,
    });

    roleId = result.lastInsertRowid;

    db.prepare(`
      INSERT INTO job_descriptions (role_id, content)
      VALUES (?, ?)
    `).run(roleId, fields.jd);

    if (fields.skip_reasons) {
      for (const sr of fields.skip_reasons) {
        db.prepare(`
          INSERT INTO skip_reasons (role_id, reason, note)
          VALUES (?, ?, ?)
        `).run(roleId, sr.reason, sr.note ?? null);
      }
    }

    if (fields.termination_reasons) {
      for (const tr of fields.termination_reasons) {
        db.prepare(`
          INSERT INTO termination_reasons (role_id, reason, note)
          VALUES (?, ?, ?)
        `).run(roleId, tr.reason, tr.note ?? null);
      }
    }
  });

  insert();
  return roleId;
}

module.exports = { addRole };

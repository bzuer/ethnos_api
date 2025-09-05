const { pool } = require('../config/database');
const cache = require('./cache.service');

class SubjectsService {
  
  async getSubjects(filters = {}) {
    const cacheKey = `subjects:list:${JSON.stringify(filters)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const {
      vocabulary,
      parent_id,
      search,
      has_children,
      limit = 50,
      offset = 0
    } = filters;

    let query = `
      SELECT 
        s.id,
        s.term,
        s.vocabulary,
        s.parent_id,
        s.created_at,
        COUNT(DISTINCT ws.work_id) as works_count,
        COUNT(DISTINCT cb.course_id) as courses_count,
        COUNT(DISTINCT children.id) as children_count,
        parent.term as parent_term
      FROM subjects s
      LEFT JOIN work_subjects ws ON s.id = ws.subject_id
      LEFT JOIN course_bibliography cb ON ws.work_id = cb.work_id
      LEFT JOIN subjects children ON s.id = children.parent_id
      LEFT JOIN subjects parent ON s.parent_id = parent.id
      WHERE 1=1
    `;

    const params = [];

    if (vocabulary) {
      query += ' AND s.vocabulary = ?';
      params.push(vocabulary);
    }

    if (parent_id !== undefined) {
      if (parent_id === null || parent_id === 'null') {
        query += ' AND s.parent_id IS NULL';
      } else {
        query += ' AND s.parent_id = ?';
        params.push(parent_id);
      }
    }

    if (search) {
      query += ' AND s.term LIKE ?';
      params.push(`%${search}%`);
    }

    query += `
      GROUP BY s.id, s.term, s.vocabulary, s.parent_id, s.created_at, parent.term
    `;

    if (has_children === 'true') {
      query += ' HAVING children_count > 0';
    } else if (has_children === 'false') {
      query += ' HAVING children_count = 0';
    }

    query += ' ORDER BY works_count DESC, courses_count DESC, s.term LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [subjects] = await pool.execute(query, params);

    const countQuery = `
      SELECT COUNT(DISTINCT s.id) as total
      FROM subjects s
      LEFT JOIN subjects children ON s.id = children.parent_id
      WHERE 1=1
      ${vocabulary ? 'AND s.vocabulary = ?' : ''}
      ${parent_id !== undefined ? (parent_id === null || parent_id === 'null' ? 'AND s.parent_id IS NULL' : 'AND s.parent_id = ?') : ''}
      ${search ? 'AND s.term LIKE ?' : ''}
      ${has_children === 'true' ? 'GROUP BY s.id HAVING COUNT(children.id) > 0' : ''}
      ${has_children === 'false' ? 'GROUP BY s.id HAVING COUNT(children.id) = 0' : ''}
    `;

    const countParams = [];
    if (vocabulary) countParams.push(vocabulary);
    if (parent_id !== undefined && parent_id !== null && parent_id !== 'null') countParams.push(parent_id);
    if (search) countParams.push(`%${search}%`);

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    const result = {
      subjects,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_next: (parseInt(offset) + parseInt(limit)) < total
      }
    };

    await cache.set(cacheKey, result, 1800);
    return result;
  }

  async getSubjectById(id) {
    const cacheKey = `subject:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const query = `
      SELECT 
        s.id,
        s.term,
        s.vocabulary,
        s.parent_id,
        s.created_at,
        COUNT(DISTINCT ws.work_id) as works_count,
        COUNT(DISTINCT cb.course_id) as courses_count,
        COUNT(DISTINCT children.id) as children_count,
        parent.term as parent_term,
        parent.vocabulary as parent_vocabulary,
        AVG(ws.relevance_score) as avg_relevance_score
      FROM subjects s
      LEFT JOIN work_subjects ws ON s.id = ws.subject_id
      LEFT JOIN course_bibliography cb ON ws.work_id = cb.work_id
      LEFT JOIN subjects children ON s.id = children.parent_id
      LEFT JOIN subjects parent ON s.parent_id = parent.id
      WHERE s.id = ?
      GROUP BY s.id, s.term, s.vocabulary, s.parent_id, s.created_at, parent.term, parent.vocabulary
    `;

    const [subjects] = await pool.execute(query, [id]);
    if (!subjects.length) return null;

    const subject = subjects[0];
    await cache.set(cacheKey, subject, 3600);
    return subject;
  }

  async getSubjectChildren(id, filters = {}) {
    const cacheKey = `subject:${id}:children:${JSON.stringify(filters)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const { limit = 50, offset = 0 } = filters;

    const query = `
      SELECT 
        s.id,
        s.term,
        s.vocabulary,
        s.parent_id,
        s.created_at,
        COUNT(DISTINCT ws.work_id) as works_count,
        COUNT(DISTINCT cb.course_id) as courses_count,
        COUNT(DISTINCT children.id) as children_count
      FROM subjects s
      LEFT JOIN work_subjects ws ON s.id = ws.subject_id
      LEFT JOIN course_bibliography cb ON ws.work_id = cb.work_id
      LEFT JOIN subjects children ON s.id = children.parent_id
      WHERE s.parent_id = ?
      GROUP BY s.id, s.term, s.vocabulary, s.parent_id, s.created_at
      ORDER BY works_count DESC, s.term
      LIMIT ? OFFSET ?
    `;

    const [children] = await pool.execute(query, [id, parseInt(limit), parseInt(offset)]);

    await cache.set(cacheKey, children, 1800);
    return children;
  }

  async getSubjectHierarchy(id) {
    const cacheKey = `subject:${id}:hierarchy`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const hierarchy = [];
    let currentId = id;

    while (currentId) {
      const query = `
        SELECT 
          s.id,
          s.term,
          s.vocabulary,
          s.parent_id,
          COUNT(DISTINCT ws.work_id) as works_count
        FROM subjects s
        LEFT JOIN work_subjects ws ON s.id = ws.subject_id
        WHERE s.id = ?
        GROUP BY s.id, s.term, s.vocabulary, s.parent_id
      `;

      const [subjects] = await pool.execute(query, [currentId]);
      if (!subjects.length) break;

      const subject = subjects[0];
      hierarchy.unshift(subject);
      currentId = subject.parent_id;
    }

    await cache.set(cacheKey, hierarchy, 3600);
    return hierarchy;
  }

  async getSubjectWorks(id, filters = {}) {
    const cacheKey = `subject:${id}:works:${JSON.stringify(filters)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const { 
      min_relevance,
      year_from,
      year_to,
      document_type,
      language,
      limit = 20, 
      offset = 0 
    } = filters;

    let query = `
      SELECT 
        w.id,
        w.title,
        w.year,
        w.language,
        w.document_type,
        ws.relevance_score,
        ws.assigned_by,
        was.author_count,
        was.first_author_name,
        COUNT(DISTINCT cb.course_id) as used_in_courses
      FROM works w
      JOIN work_subjects ws ON w.id = ws.work_id
      LEFT JOIN work_author_summary was ON w.id = was.work_id
      LEFT JOIN course_bibliography cb ON w.id = cb.work_id
      WHERE ws.subject_id = ?
    `;

    const params = [id];

    if (min_relevance) {
      query += ' AND ws.relevance_score >= ?';
      params.push(parseFloat(min_relevance));
    }

    if (year_from) {
      query += ' AND w.year >= ?';
      params.push(year_from);
    }

    if (year_to) {
      query += ' AND w.year <= ?';
      params.push(year_to);
    }

    if (document_type) {
      query += ' AND w.document_type = ?';
      params.push(document_type);
    }

    if (language) {
      query += ' AND w.language = ?';
      params.push(language);
    }

    query += `
      GROUP BY w.id, w.title, w.year, w.language, w.document_type, ws.relevance_score, ws.assigned_by, was.author_count, was.first_author_name
      ORDER BY ws.relevance_score DESC, used_in_courses DESC, w.year DESC
      LIMIT ? OFFSET ?
    `;
    params.push(parseInt(limit), parseInt(offset));

    const [works] = await pool.execute(query, params);

    for (const work of works) {
      if (work.first_author_name) {
        const authors = work.first_author_name.split(';').map(name => name.trim());
        work.authors = authors;
      }
    }

    await cache.set(cacheKey, works, 1800);
    return works;
  }

  async getSubjectCourses(id, filters = {}) {
    const cacheKey = `subject:${id}:courses:${JSON.stringify(filters)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const { 
      year_from,
      year_to,
      program_id,
      reading_type,
      limit = 20, 
      offset = 0 
    } = filters;

    let query = `
      SELECT DISTINCT
        c.id,
        c.program_id,
        c.code,
        c.name,
        c.credits,
        c.semester,
        c.year,
        cb.reading_type,
        COUNT(DISTINCT cb.work_id) as works_with_subject,
        COUNT(DISTINCT ci.canonical_person_id) as instructor_count
      FROM courses c
      JOIN course_bibliography cb ON c.id = cb.course_id
      JOIN work_subjects ws ON cb.work_id = ws.work_id
      LEFT JOIN course_instructors ci ON c.id = ci.course_id
      WHERE ws.subject_id = ?
    `;

    const params = [id];

    if (year_from) {
      query += ' AND c.year >= ?';
      params.push(year_from);
    }

    if (year_to) {
      query += ' AND c.year <= ?';
      params.push(year_to);
    }

    if (program_id) {
      query += ' AND c.program_id = ?';
      params.push(program_id);
    }

    if (reading_type) {
      query += ' AND cb.reading_type = ?';
      params.push(reading_type);
    }

    query += `
      GROUP BY c.id, c.program_id, c.code, c.name, c.credits, c.semester, c.year, cb.reading_type
      ORDER BY works_with_subject DESC, c.year DESC
      LIMIT ? OFFSET ?
    `;
    params.push(parseInt(limit), parseInt(offset));

    const [courses] = await pool.execute(query, params);

    await cache.set(cacheKey, courses, 1800);
    return courses;
  }

  async getSubjectsStatistics() {
    const cacheKey = 'subjects:statistics';
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const query = `
      SELECT 
        COUNT(*) as total_subjects,
        COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as root_subjects,
        COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as child_subjects,
        COUNT(DISTINCT vocabulary) as vocabularies_count,
        COUNT(DISTINCT CASE WHEN ws.work_id IS NOT NULL THEN s.id END) as subjects_with_works,
        COUNT(DISTINCT ws.work_id) as total_work_subject_relations
      FROM subjects s
      LEFT JOIN work_subjects ws ON s.id = ws.subject_id
    `;

    const [stats] = await pool.execute(query);

    const vocabularyDistQuery = `
      SELECT 
        vocabulary,
        COUNT(*) as subject_count,
        COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as root_count,
        COUNT(DISTINCT ws.work_id) as works_count
      FROM subjects s
      LEFT JOIN work_subjects ws ON s.id = ws.subject_id
      GROUP BY vocabulary
      ORDER BY subject_count DESC
    `;

    const [vocabularyDist] = await pool.execute(vocabularyDistQuery);

    const topSubjectsQuery = `
      SELECT 
        s.term,
        s.vocabulary,
        COUNT(DISTINCT ws.work_id) as works_count,
        COUNT(DISTINCT cb.course_id) as courses_count,
        AVG(ws.relevance_score) as avg_relevance
      FROM subjects s
      LEFT JOIN work_subjects ws ON s.id = ws.subject_id
      LEFT JOIN course_bibliography cb ON ws.work_id = cb.work_id
      GROUP BY s.id, s.term, s.vocabulary
      HAVING works_count > 0
      ORDER BY works_count DESC, courses_count DESC
      LIMIT 20
    `;

    const [topSubjects] = await pool.execute(topSubjectsQuery);

    const result = {
      ...stats[0],
      vocabulary_distribution: vocabularyDist,
      top_subjects: topSubjects
    };

    await cache.set(cacheKey, result, 3600);
    return result;
  }
}

module.exports = new SubjectsService();
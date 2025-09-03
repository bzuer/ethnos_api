const { pool } = require('../config/database');
const cache = require('./cache.service');

class BibliographyService {
  
  async getBibliography(filters = {}) {
    const cacheKey = `bibliography:list:${JSON.stringify(filters)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const {
      course_id,
      work_id,
      instructor_id,
      reading_type,
      week_number,
      year_from,
      year_to,
      program_id,
      search,
      limit = 20,
      offset = 0
    } = filters;

    let query = `
      SELECT 
        cb.course_id,
        cb.work_id,
        cb.reading_type,
        cb.week_number,
        cb.notes,
        c.code as course_code,
        c.name as course_name,
        c.year as course_year,
        c.semester,
        c.program_id,
        w.title,
        pub.year as publication_year,
        w.language,
        w.work_type as document_type,
        0 as author_count,
        '' as first_author_name,
        GROUP_CONCAT(DISTINCT p.preferred_name ORDER BY p.preferred_name SEPARATOR '; ') as instructors
      FROM course_bibliography cb
      JOIN courses c ON cb.course_id = c.id
      JOIN works w ON cb.work_id = w.id
      LEFT JOIN publications pub ON w.id = pub.work_id
      LEFT JOIN work_author_summary was ON w.id = was.work_id
      LEFT JOIN course_instructors ci ON c.id = ci.course_id
      LEFT JOIN persons p ON ci.canonical_person_id = p.id
      WHERE 1=1
    `;

    const params = [];

    if (course_id) {
      query += ' AND cb.course_id = ?';
      params.push(course_id);
    }

    if (work_id) {
      query += ' AND cb.work_id = ?';
      params.push(work_id);
    }

    if (instructor_id) {
      query += ' AND ci.canonical_person_id = ?';
      params.push(instructor_id);
    }

    if (reading_type) {
      query += ' AND cb.reading_type = ?';
      params.push(reading_type);
    }

    if (week_number) {
      query += ' AND cb.week_number = ?';
      params.push(week_number);
    }

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

    if (search) {
      query += ' AND (w.title LIKE ? OR c.name LIKE ? OR c.code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += `
      GROUP BY cb.course_id, cb.work_id, cb.reading_type, cb.week_number, cb.notes,
               c.code, c.name, c.year, c.semester, c.program_id,
               w.title, pub.year, w.language, w.work_type
      ORDER BY c.year DESC, c.semester, cb.week_number, cb.reading_type, w.title
      LIMIT ? OFFSET ?
    `;
    params.push(parseInt(limit), parseInt(offset));

    const [bibliography] = await pool.execute(query, params);

    for (const item of bibliography) {
      if (item.first_author_name) {
        const authors = item.first_author_name.split(';').map(name => name.trim());
        item.authors = authors;
      }
    }

    const countQuery = `
      SELECT COUNT(DISTINCT CONCAT(cb.course_id, '-', cb.work_id)) as total
      FROM course_bibliography cb
      JOIN courses c ON cb.course_id = c.id
      JOIN works w ON cb.work_id = w.id
      LEFT JOIN publications pub ON w.id = pub.work_id
      LEFT JOIN course_instructors ci ON c.id = ci.course_id
      WHERE 1=1
      ${course_id ? 'AND cb.course_id = ?' : ''}
      ${work_id ? 'AND cb.work_id = ?' : ''}
      ${instructor_id ? 'AND ci.canonical_person_id = ?' : ''}
      ${reading_type ? 'AND cb.reading_type = ?' : ''}
      ${week_number ? 'AND cb.week_number = ?' : ''}
      ${year_from ? 'AND c.year >= ?' : ''}
      ${year_to ? 'AND c.year <= ?' : ''}
      ${program_id ? 'AND c.program_id = ?' : ''}
      ${search ? 'AND (w.title LIKE ? OR c.name LIKE ? OR c.code LIKE ?)' : ''}
    `;

    const countParams = [];
    if (course_id) countParams.push(course_id);
    if (work_id) countParams.push(work_id);
    if (instructor_id) countParams.push(instructor_id);
    if (reading_type) countParams.push(reading_type);
    if (week_number) countParams.push(week_number);
    if (year_from) countParams.push(year_from);
    if (year_to) countParams.push(year_to);
    if (program_id) countParams.push(program_id);
    if (search) countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    const result = {
      bibliography,
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

  async getWorkBibliography(workId, filters = {}) {
    const cacheKey = `work:${workId}:bibliography:${JSON.stringify(filters)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const { year_from, year_to, reading_type, limit = 20, offset = 0 } = filters;

    let query = `
      SELECT 
        cb.course_id,
        cb.reading_type,
        cb.week_number,
        cb.notes,
        c.code as course_code,
        c.name as course_name,
        c.year as course_year,
        c.semester,
        c.program_id,
        COUNT(DISTINCT ci.canonical_person_id) as instructor_count,
        GROUP_CONCAT(DISTINCT p.preferred_name ORDER BY p.preferred_name SEPARATOR '; ') as instructors
      FROM course_bibliography cb
      JOIN courses c ON cb.course_id = c.id
      LEFT JOIN course_instructors ci ON c.id = ci.course_id
      LEFT JOIN persons p ON ci.canonical_person_id = p.id
      WHERE cb.work_id = ?
    `;

    const params = [workId];

    if (year_from) {
      query += ' AND c.year >= ?';
      params.push(year_from);
    }

    if (year_to) {
      query += ' AND c.year <= ?';
      params.push(year_to);
    }

    if (reading_type) {
      query += ' AND cb.reading_type = ?';
      params.push(reading_type);
    }

    query += `
      GROUP BY cb.course_id, cb.reading_type, cb.week_number, cb.notes,
               c.code, c.name, c.year, c.semester, c.program_id
      ORDER BY c.year DESC, c.semester, cb.week_number
      LIMIT ? OFFSET ?
    `;
    params.push(parseInt(limit), parseInt(offset));

    const [courses] = await pool.execute(query, params);

    await cache.set(cacheKey, courses, 1800);
    return courses;
  }

  async getBibliographyAnalysis(filters = {}) {
    const cacheKey = `bibliography:analysis:${JSON.stringify(filters)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const { year_from, year_to, program_id, reading_type, limit = 20 } = filters;

    let baseWhere = 'WHERE 1=1';
    const params = [];

    if (year_from) {
      baseWhere += ' AND c.year >= ?';
      params.push(year_from);
    }

    if (year_to) {
      baseWhere += ' AND c.year <= ?';
      params.push(year_to);
    }

    if (program_id) {
      baseWhere += ' AND c.program_id = ?';
      params.push(program_id);
    }

    if (reading_type) {
      baseWhere += ' AND cb.reading_type = ?';
      params.push(reading_type);
    }

    const mostUsedWorksQuery = `
      SELECT 
        w.id,
        w.title,
        pub.year as publication_year,
        w.work_type as document_type,
        0 as author_count,
        '' as first_author_name,
        COUNT(DISTINCT cb.course_id) as used_in_courses,
        COUNT(DISTINCT c.program_id) as used_in_programs,
        GROUP_CONCAT(DISTINCT cb.reading_type ORDER BY cb.reading_type) as reading_types
      FROM works w
      JOIN course_bibliography cb ON w.id = cb.work_id
      JOIN courses c ON cb.course_id = c.id
      LEFT JOIN publications pub ON w.id = pub.work_id
      LEFT JOIN work_author_summary was ON w.id = was.work_id
      ${baseWhere}
      GROUP BY w.id, w.title, pub.year, w.work_type, was.author_string
      ORDER BY used_in_courses DESC, used_in_programs DESC
      LIMIT ?
    `;

    const [mostUsedWorks] = await pool.execute(mostUsedWorksQuery, [...params, parseInt(limit)]);

    for (const work of mostUsedWorks) {
      if (work.first_author_name) {
        const authors = work.first_author_name.split(';').map(name => name.trim());
        work.authors = authors;
      }
      if (work.reading_types) {
        work.reading_types = work.reading_types.split(',');
      }
    }

    const trendsQuery = `
      SELECT 
        c.year,
        COUNT(DISTINCT cb.work_id) as works_count,
        COUNT(DISTINCT cb.course_id) as courses_count,
        COUNT(DISTINCT c.program_id) as programs_count,
        AVG(pub.year) as avg_publication_year
      FROM course_bibliography cb
      JOIN courses c ON cb.course_id = c.id
      JOIN works w ON cb.work_id = w.id
      LEFT JOIN publications pub ON w.id = pub.work_id
      ${baseWhere}
      GROUP BY c.year
      ORDER BY c.year DESC
      LIMIT 10
    `;

    const [trends] = await pool.execute(trendsQuery, params);

    const readingTypeDistQuery = `
      SELECT 
        cb.reading_type,
        COUNT(*) as count,
        COUNT(DISTINCT cb.work_id) as unique_works,
        COUNT(DISTINCT cb.course_id) as courses
      FROM course_bibliography cb
      JOIN courses c ON cb.course_id = c.id
      ${baseWhere}
      GROUP BY cb.reading_type
      ORDER BY count DESC
    `;

    const [readingTypeDist] = await pool.execute(readingTypeDistQuery, params);

    const documentTypeDistQuery = `
      SELECT 
        w.work_type as document_type,
        COUNT(*) as usage_count,
        COUNT(DISTINCT w.id) as unique_works,
        COUNT(DISTINCT cb.course_id) as courses_count
      FROM works w
      JOIN course_bibliography cb ON w.id = cb.work_id
      JOIN courses c ON cb.course_id = c.id
      ${baseWhere}
      GROUP BY w.work_type
      ORDER BY usage_count DESC
      LIMIT 10
    `;

    const [documentTypeDist] = await pool.execute(documentTypeDistQuery, params);

    const result = {
      most_used_works: mostUsedWorks,
      trends_by_year: trends,
      reading_type_distribution: readingTypeDist,
      document_type_distribution: documentTypeDist
    };

    await cache.set(cacheKey, result, 3600);
    return result;
  }

  async getBibliographyStatistics() {
    const cacheKey = 'bibliography:statistics';
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const query = `
      SELECT 
        COUNT(*) as total_bibliography_entries,
        COUNT(DISTINCT cb.work_id) as unique_works,
        COUNT(DISTINCT cb.course_id) as courses_with_bibliography,
        COUNT(DISTINCT c.program_id) as programs_with_bibliography,
        AVG(works_per_course.work_count) as avg_works_per_course,
        MAX(works_per_course.work_count) as max_works_per_course
      FROM course_bibliography cb
      JOIN courses c ON cb.course_id = c.id
      JOIN (
        SELECT course_id, COUNT(*) as work_count
        FROM course_bibliography
        GROUP BY course_id
      ) works_per_course ON cb.course_id = works_per_course.course_id
    `;

    const [stats] = await pool.execute(query);

    const readingTypeQuery = `
      SELECT 
        reading_type,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM course_bibliography), 2) as percentage
      FROM course_bibliography
      GROUP BY reading_type
      ORDER BY count DESC
    `;

    const [readingTypes] = await pool.execute(readingTypeQuery);

    const yearRangeQuery = `
      SELECT 
        MIN(c.year) as earliest_course_year,
        MAX(c.year) as latest_course_year,
        MIN(pub.year) as earliest_publication_year,
        MAX(pub.year) as latest_publication_year,
        AVG(pub.year) as avg_publication_year
      FROM course_bibliography cb
      JOIN courses c ON cb.course_id = c.id
      JOIN works w ON cb.work_id = w.id
      LEFT JOIN publications pub ON w.id = pub.work_id
      WHERE c.year IS NOT NULL AND pub.year IS NOT NULL
    `;

    const [yearRange] = await pool.execute(yearRangeQuery);

    const result = {
      ...stats[0],
      reading_type_distribution: readingTypes,
      year_range: yearRange[0]
    };

    await cache.set(cacheKey, result, 3600);
    return result;
  }
}

module.exports = new BibliographyService();
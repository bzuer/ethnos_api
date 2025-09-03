const request = require('supertest');
const app = require('../src/app');

describe('Bibliography Endpoints', () => {

  describe('GET /bibliography', () => {
    it('should return bibliography entries with pagination', async () => {
      const response = await request(app)
        .get('/bibliography?limit=10')
        .expect(200);

      expect(response.body).toHaveProperty('bibliography');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.bibliography)).toBe(true);
      expect(response.body.bibliography.length).toBeLessThanOrEqual(10);
      
      if (response.body.bibliography.length > 0) {
        const entry = response.body.bibliography[0];
        expect(entry).toHaveProperty('course_id');
        expect(entry).toHaveProperty('work_id');
        expect(entry).toHaveProperty('reading_type');
        expect(entry).toHaveProperty('course_name');
        expect(entry).toHaveProperty('title');
        expect(entry).toHaveProperty('publication_year');
      }
    });

    it('should filter bibliography by course_id', async () => {
      const response = await request(app)
        .get('/bibliography?course_id=25&limit=5')
        .expect(200);

      expect(response.body).toHaveProperty('bibliography');
      if (response.body.bibliography.length > 0) {
        response.body.bibliography.forEach(entry => {
          expect(entry.course_id).toBe(25);
        });
      }
    });

    it('should filter bibliography by reading_type', async () => {
      const response = await request(app)
        .get('/bibliography?reading_type=RECOMMENDED&limit=5')
        .expect(200);

      expect(response.body).toHaveProperty('bibliography');
      if (response.body.bibliography.length > 0) {
        response.body.bibliography.forEach(entry => {
          expect(entry.reading_type).toBe('RECOMMENDED');
        });
      }
    });

    it('should filter bibliography by year range', async () => {
      const response = await request(app)
        .get('/bibliography?year_from=1968&year_to=1970&limit=5')
        .expect(200);

      expect(response.body).toHaveProperty('bibliography');
      if (response.body.bibliography.length > 0) {
        response.body.bibliography.forEach(entry => {
          expect(entry.course_year).toBeGreaterThanOrEqual(1968);
          expect(entry.course_year).toBeLessThanOrEqual(1970);
        });
      }
    });

    it('should filter bibliography by program_id', async () => {
      const response = await request(app)
        .get('/bibliography?program_id=2&limit=5')
        .expect(200);

      expect(response.body).toHaveProperty('bibliography');
      if (response.body.bibliography.length > 0) {
        response.body.bibliography.forEach(entry => {
          expect(entry.program_id).toBe(2);
        });
      }
    });

    it('should search bibliography by title or course', async () => {
      const response = await request(app)
        .get('/bibliography?search=comparative&limit=5')
        .expect(200);

      expect(response.body).toHaveProperty('bibliography');
      if (response.body.bibliography.length > 0) {
        const entry = response.body.bibliography[0];
        const searchTerm = 'comparative';
        const matchesSearch = 
          entry.title.toLowerCase().includes(searchTerm) ||
          entry.course_name.toLowerCase().includes(searchTerm) ||
          (entry.course_code && entry.course_code.toLowerCase().includes(searchTerm));
        expect(matchesSearch).toBe(true);
      }
    });
  });

  describe('GET /works/:id/bibliography', () => {
    it('should return work bibliography usage', async () => {
      // First get a bibliography entry to find a work_id
      const bibResponse = await request(app)
        .get('/bibliography?limit=1')
        .expect(200);

      if (bibResponse.body.bibliography.length > 0) {
        const workId = bibResponse.body.bibliography[0].work_id;
        
        const response = await request(app)
          .get(`/works/${workId}/bibliography?limit=5`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        if (response.body.length > 0) {
          const usage = response.body[0];
          expect(usage).toHaveProperty('course_id');
          expect(usage).toHaveProperty('reading_type');
          expect(usage).toHaveProperty('course_name');
          expect(usage).toHaveProperty('course_code');
          expect(usage).toHaveProperty('course_year');
          expect(usage).toHaveProperty('instructors');
        }
      }
    });

    it('should filter work bibliography by year range', async () => {
      const bibResponse = await request(app)
        .get('/bibliography?limit=1')
        .expect(200);

      if (bibResponse.body.bibliography.length > 0) {
        const workId = bibResponse.body.bibliography[0].work_id;
        
        const response = await request(app)
          .get(`/works/${workId}/bibliography?year_from=1968&year_to=1970`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        response.body.forEach(usage => {
          expect(usage.course_year).toBeGreaterThanOrEqual(1968);
          expect(usage.course_year).toBeLessThanOrEqual(1970);
        });
      }
    });

    it('should filter work bibliography by reading type', async () => {
      const bibResponse = await request(app)
        .get('/bibliography?limit=1')
        .expect(200);

      if (bibResponse.body.bibliography.length > 0) {
        const workId = bibResponse.body.bibliography[0].work_id;
        
        const response = await request(app)
          .get(`/works/${workId}/bibliography?reading_type=RECOMMENDED`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        response.body.forEach(usage => {
          expect(usage.reading_type).toBe('RECOMMENDED');
        });
      }
    });
  });

  describe('GET /bibliography/analysis', () => {
    it('should return bibliography analysis', async () => {
      const response = await request(app)
        .get('/bibliography/analysis?limit=10')
        .expect(200);

      expect(response.body).toHaveProperty('most_used_works');
      expect(response.body).toHaveProperty('trends_by_year');
      expect(response.body).toHaveProperty('reading_type_distribution');
      expect(response.body).toHaveProperty('document_type_distribution');
      
      expect(Array.isArray(response.body.most_used_works)).toBe(true);
      expect(Array.isArray(response.body.trends_by_year)).toBe(true);
      expect(Array.isArray(response.body.reading_type_distribution)).toBe(true);
      expect(Array.isArray(response.body.document_type_distribution)).toBe(true);
      
      if (response.body.most_used_works.length > 0) {
        const work = response.body.most_used_works[0];
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('title');
        expect(work).toHaveProperty('used_in_courses');
        expect(work).toHaveProperty('used_in_programs');
        expect(work).toHaveProperty('reading_types');
        expect(Array.isArray(work.reading_types)).toBe(true);
      }
    });

    it('should filter analysis by year range', async () => {
      const response = await request(app)
        .get('/bibliography/analysis?year_from=1968&year_to=1970&limit=5')
        .expect(200);

      expect(response.body).toHaveProperty('trends_by_year');
      if (response.body.trends_by_year.length > 0) {
        response.body.trends_by_year.forEach(trend => {
          expect(trend.year).toBeGreaterThanOrEqual(1968);
          expect(trend.year).toBeLessThanOrEqual(1970);
        });
      }
    });

    it('should filter analysis by program_id', async () => {
      const response = await request(app)
        .get('/bibliography/analysis?program_id=2&limit=5')
        .expect(200);

      expect(response.body).toHaveProperty('most_used_works');
      expect(response.body).toHaveProperty('trends_by_year');
      // The filtering should work without errors
    });

    it('should filter analysis by reading type', async () => {
      const response = await request(app)
        .get('/bibliography/analysis?reading_type=RECOMMENDED&limit=5')
        .expect(200);

      expect(response.body).toHaveProperty('reading_type_distribution');
      if (response.body.reading_type_distribution.length > 0) {
        // Should only return RECOMMENDED entries when filtered
        const recommendedEntry = response.body.reading_type_distribution.find(
          entry => entry.reading_type === 'RECOMMENDED'
        );
        expect(recommendedEntry).toBeDefined();
      }
    });
  });

  describe('GET /bibliography/statistics', () => {
    it('should return bibliography statistics', async () => {
      const response = await request(app)
        .get('/bibliography/statistics')
        .expect(200);

      expect(response.body).toHaveProperty('total_bibliography_entries');
      expect(response.body).toHaveProperty('unique_works');
      expect(response.body).toHaveProperty('courses_with_bibliography');
      expect(response.body).toHaveProperty('programs_with_bibliography');
      expect(response.body).toHaveProperty('avg_works_per_course');
      expect(response.body).toHaveProperty('max_works_per_course');
      expect(response.body).toHaveProperty('reading_type_distribution');
      expect(response.body).toHaveProperty('year_range');
      
      expect(Array.isArray(response.body.reading_type_distribution)).toBe(true);
      expect(typeof response.body.year_range).toBe('object');
      
      if (response.body.reading_type_distribution.length > 0) {
        const readingType = response.body.reading_type_distribution[0];
        expect(readingType).toHaveProperty('reading_type');
        expect(readingType).toHaveProperty('count');
        expect(readingType).toHaveProperty('percentage');
      }

      if (response.body.year_range) {
        expect(response.body.year_range).toHaveProperty('earliest_course_year');
        expect(response.body.year_range).toHaveProperty('latest_course_year');
        expect(response.body.year_range).toHaveProperty('earliest_publication_year');
        expect(response.body.year_range).toHaveProperty('latest_publication_year');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid work_id in bibliography endpoint', async () => {
      await request(app)
        .get('/works/999999/bibliography')
        .expect(200); // Should return empty array for non-existent work
    });

    it('should handle invalid course_id filter', async () => {
      await request(app)
        .get('/bibliography?course_id=999999&limit=5')
        .expect(200); // Should return empty results
    });

    it('should handle invalid limit parameter', async () => {
      await request(app)
        .get('/bibliography?limit=abc')
        .expect(200); // Should use default limit
    });

    it('should handle invalid year parameters', async () => {
      await request(app)
        .get('/bibliography?year_from=abc&year_to=xyz')
        .expect(200); // Should ignore invalid parameters
    });
  });

  describe('Performance', () => {
    it('should respond within reasonable time for bibliography listing', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/bibliography?limit=20')
        .expect(200);
        
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should respond within reasonable time for bibliography analysis', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/bibliography/analysis?limit=10')
        .expect(200);
        
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(10000); // 10 seconds max for complex analysis
    });

    it('should respond within reasonable time for work bibliography', async () => {
      const bibResponse = await request(app)
        .get('/bibliography?limit=1')
        .expect(200);

      if (bibResponse.body.bibliography.length > 0) {
        const workId = bibResponse.body.bibliography[0].work_id;
        const startTime = Date.now();
        
        await request(app)
          .get(`/works/${workId}/bibliography`)
          .expect(200);
          
        const responseTime = Date.now() - startTime;
        expect(responseTime).toBeLessThan(3000); // 3 seconds max
      }
    });
  });
});
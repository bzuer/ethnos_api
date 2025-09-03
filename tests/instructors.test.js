const request = require('supertest');
const app = require('../src/app');

describe('Instructors Endpoints', () => {

  describe('GET /instructors', () => {
    it('should return instructors list with pagination', async () => {
      const response = await request(app)
        .get('/instructors?limit=5')
        .expect(200);

      expect(response.body).toHaveProperty('instructors');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.instructors)).toBe(true);
      expect(response.body.instructors.length).toBeLessThanOrEqual(5);
      
      if (response.body.instructors.length > 0) {
        const instructor = response.body.instructors[0];
        expect(instructor).toHaveProperty('person_id');
        expect(instructor).toHaveProperty('preferred_name');
        expect(instructor).toHaveProperty('courses_taught');
        expect(instructor).toHaveProperty('earliest_year');
        expect(instructor).toHaveProperty('latest_year');
      }
    });

    it('should filter instructors by role', async () => {
      const response = await request(app)
        .get('/instructors?role=PROFESSOR&limit=3')
        .expect(200);

      expect(response.body).toHaveProperty('instructors');
      if (response.body.instructors.length > 0) {
        response.body.instructors.forEach(instructor => {
          expect(instructor.roles).toContain('PROFESSOR');
        });
      }
    });

    it('should filter instructors by program_id', async () => {
      const response = await request(app)
        .get('/instructors?program_id=2&limit=3')
        .expect(200);

      expect(response.body).toHaveProperty('instructors');
      if (response.body.instructors.length > 0) {
        response.body.instructors.forEach(instructor => {
          expect(instructor.program_ids).toContain(2);
        });
      }
    });

    it('should filter instructors by year range', async () => {
      const response = await request(app)
        .get('/instructors?year_from=1968&year_to=1970&limit=3')
        .expect(200);

      expect(response.body).toHaveProperty('instructors');
      if (response.body.instructors.length > 0) {
        response.body.instructors.forEach(instructor => {
          expect(instructor.earliest_year).toBeLessThanOrEqual(1970);
          expect(instructor.latest_year).toBeGreaterThanOrEqual(1968);
        });
      }
    });

    it('should search instructors by name', async () => {
      const response = await request(app)
        .get('/instructors?search=bruce&limit=3')
        .expect(200);

      expect(response.body).toHaveProperty('instructors');
      if (response.body.instructors.length > 0) {
        const instructor = response.body.instructors[0];
        const searchTerm = 'bruce';
        const matchesSearch = 
          instructor.preferred_name.toLowerCase().includes(searchTerm) ||
          (instructor.given_names && instructor.given_names.toLowerCase().includes(searchTerm)) ||
          (instructor.family_name && instructor.family_name.toLowerCase().includes(searchTerm));
        expect(matchesSearch).toBe(true);
      }
    });
  });

  describe('GET /instructors/:id', () => {
    it('should return instructor details for valid ID', async () => {
      const instructorsResponse = await request(app)
        .get('/instructors?limit=1')
        .expect(200);

      if (instructorsResponse.body.instructors.length > 0) {
        const instructorId = instructorsResponse.body.instructors[0].person_id;
        
        const response = await request(app)
          .get(`/instructors/${instructorId}`)
          .expect(200);

        expect(response.body).toHaveProperty('person_id', instructorId);
        expect(response.body).toHaveProperty('preferred_name');
        expect(response.body).toHaveProperty('courses_taught');
        expect(response.body).toHaveProperty('programs_count');
        expect(response.body).toHaveProperty('bibliography_contributed');
        expect(response.body).toHaveProperty('roles');
        expect(Array.isArray(response.body.roles)).toBe(true);
      }
    });

    it('should return 404 for invalid instructor ID', async () => {
      await request(app)
        .get('/instructors/999999')
        .expect(404);
    });
  });

  describe('GET /instructors/:id/courses', () => {
    it('should return instructor courses', async () => {
      const instructorsResponse = await request(app)
        .get('/instructors?limit=1')
        .expect(200);

      if (instructorsResponse.body.instructors.length > 0) {
        const instructorId = instructorsResponse.body.instructors[0].person_id;
        
        const response = await request(app)
          .get(`/instructors/${instructorId}/courses?limit=5`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        if (response.body.length > 0) {
          const course = response.body[0];
          expect(course).toHaveProperty('id');
          expect(course).toHaveProperty('name');
          expect(course).toHaveProperty('code');
          expect(course).toHaveProperty('year');
          expect(course).toHaveProperty('role');
          expect(course).toHaveProperty('bibliography_count');
        }
      }
    });

    it('should filter instructor courses by year range', async () => {
      const instructorsResponse = await request(app)
        .get('/instructors?limit=1')
        .expect(200);

      if (instructorsResponse.body.instructors.length > 0) {
        const instructorId = instructorsResponse.body.instructors[0].person_id;
        
        const response = await request(app)
          .get(`/instructors/${instructorId}/courses?year_from=1968&year_to=1970`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        response.body.forEach(course => {
          expect(course.year).toBeGreaterThanOrEqual(1968);
          expect(course.year).toBeLessThanOrEqual(1970);
        });
      }
    });
  });

  describe('GET /instructors/:id/subjects', () => {
    it('should return instructor subject expertise', async () => {
      const instructorsResponse = await request(app)
        .get('/instructors?limit=1')
        .expect(200);

      if (instructorsResponse.body.instructors.length > 0) {
        const instructorId = instructorsResponse.body.instructors[0].person_id;
        
        const response = await request(app)
          .get(`/instructors/${instructorId}/subjects?limit=5`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        if (response.body.length > 0) {
          const subject = response.body[0];
          expect(subject).toHaveProperty('id');
          expect(subject).toHaveProperty('term');
          expect(subject).toHaveProperty('vocabulary');
          expect(subject).toHaveProperty('courses_count');
          expect(subject).toHaveProperty('works_count');
        }
      }
    });

    it('should filter subjects by vocabulary', async () => {
      const instructorsResponse = await request(app)
        .get('/instructors?limit=1')
        .expect(200);

      if (instructorsResponse.body.instructors.length > 0) {
        const instructorId = instructorsResponse.body.instructors[0].person_id;
        
        const response = await request(app)
          .get(`/instructors/${instructorId}/subjects?vocabulary=KEYWORD`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        response.body.forEach(subject => {
          expect(subject.vocabulary).toBe('KEYWORD');
        });
      }
    });
  });

  describe('GET /instructors/:id/bibliography', () => {
    it('should return instructor bibliography', async () => {
      const instructorsResponse = await request(app)
        .get('/instructors?limit=1')
        .expect(200);

      if (instructorsResponse.body.instructors.length > 0) {
        const instructorId = instructorsResponse.body.instructors[0].person_id;
        
        const response = await request(app)
          .get(`/instructors/${instructorId}/bibliography?limit=5`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        if (response.body.length > 0) {
          const bibEntry = response.body[0];
          expect(bibEntry).toHaveProperty('work_id');
          expect(bibEntry).toHaveProperty('title');
          expect(bibEntry).toHaveProperty('reading_type');
          expect(bibEntry).toHaveProperty('used_in_courses');
          expect(bibEntry).toHaveProperty('publication_year');
        }
      }
    });

    it('should filter bibliography by reading type', async () => {
      const instructorsResponse = await request(app)
        .get('/instructors?limit=1')
        .expect(200);

      if (instructorsResponse.body.instructors.length > 0) {
        const instructorId = instructorsResponse.body.instructors[0].person_id;
        
        const response = await request(app)
          .get(`/instructors/${instructorId}/bibliography?reading_type=RECOMMENDED`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        response.body.forEach(entry => {
          expect(entry.reading_type).toBe('RECOMMENDED');
        });
      }
    });
  });

  describe('GET /instructors/statistics', () => {
    it('should return instructors statistics', async () => {
      const response = await request(app)
        .get('/instructors/statistics')
        .expect(200);

      expect(response.body).toHaveProperty('total_instructors');
      expect(response.body).toHaveProperty('total_courses_taught');
      expect(response.body).toHaveProperty('programs_with_instructors');
      expect(response.body).toHaveProperty('avg_courses_per_instructor');
      expect(response.body).toHaveProperty('role_distribution');
      expect(response.body).toHaveProperty('top_instructors');
      
      expect(Array.isArray(response.body.role_distribution)).toBe(true);
      expect(Array.isArray(response.body.top_instructors)).toBe(true);
      
      if (response.body.role_distribution.length > 0) {
        const roleItem = response.body.role_distribution[0];
        expect(roleItem).toHaveProperty('role');
        expect(roleItem).toHaveProperty('instructor_count');
        expect(roleItem).toHaveProperty('assignment_count');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid limit parameter', async () => {
      await request(app)
        .get('/instructors?limit=abc')
        .expect(200); // Should use default limit
    });

    it('should handle invalid year range', async () => {
      await request(app)
        .get('/instructors?year_from=abc&year_to=xyz')
        .expect(200); // Should ignore invalid parameters
    });
  });

  describe('Performance', () => {
    it('should respond within reasonable time for instructors listing', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/instructors?limit=10')
        .expect(200);
        
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should respond within reasonable time for instructor details', async () => {
      const instructorsResponse = await request(app)
        .get('/instructors?limit=1')
        .expect(200);

      if (instructorsResponse.body.instructors.length > 0) {
        const instructorId = instructorsResponse.body.instructors[0].person_id;
        const startTime = Date.now();
        
        await request(app)
          .get(`/instructors/${instructorId}`)
          .expect(200);
          
        const responseTime = Date.now() - startTime;
        expect(responseTime).toBeLessThan(3000); // 3 seconds max
      }
    });
  });
});
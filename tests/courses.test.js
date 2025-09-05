const request = require('supertest');
const app = require('../src/app');

describe('Courses Endpoints', () => {
  
  describe('GET /courses', () => {
    it('should return courses list with pagination', async () => {
      const response = await request(app)
        .get('/courses?limit=5')
        .expect(200);

      expect(response.body).toHaveProperty('courses');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.courses)).toBe(true);
      expect(response.body.courses.length).toBeLessThanOrEqual(5);
      
      if (response.body.courses.length > 0) {
        const course = response.body.courses[0];
        expect(course).toHaveProperty('id');
        expect(course).toHaveProperty('name');
        expect(course).toHaveProperty('code');
        expect(course).toHaveProperty('year');
        expect(course).toHaveProperty('semester');
      }
    });

    it('should filter courses by program_id', async () => {
      const response = await request(app)
        .get('/courses?program_id=2&limit=3')
        .expect(200);

      expect(response.body).toHaveProperty('courses');
      if (response.body.courses.length > 0) {
        response.body.courses.forEach(course => {
          expect(course.program_id).toBe(2);
        });
      }
    });

    it('should filter courses by year', async () => {
      const response = await request(app)
        .get('/courses?year=1968&limit=3')
        .expect(200);

      expect(response.body).toHaveProperty('courses');
      if (response.body.courses.length > 0) {
        response.body.courses.forEach(course => {
          expect(course.year).toBe(1968);
        });
      }
    });

    it('should search courses by name or code', async () => {
      const response = await request(app)
        .get('/courses?search=instituições&limit=3')
        .expect(200);

      expect(response.body).toHaveProperty('courses');
      if (response.body.courses.length > 0) {
        const course = response.body.courses[0];
        const searchTerm = 'instituições';
        const matchesSearch = 
          course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.code.toLowerCase().includes(searchTerm.toLowerCase());
        expect(matchesSearch).toBe(true);
      }
    });
  });

  describe('GET /courses/:id', () => {
    it('should return course details for valid ID', async () => {
      const coursesResponse = await request(app)
        .get('/courses?limit=1')
        .expect(200);

      if (coursesResponse.body.courses.length > 0) {
        const courseId = coursesResponse.body.courses[0].id;
        
        const response = await request(app)
          .get(`/courses/${courseId}`)
          .expect(200);

        expect(response.body).toHaveProperty('id', courseId);
        expect(response.body).toHaveProperty('name');
        expect(response.body).toHaveProperty('code');
        expect(response.body).toHaveProperty('instructor_count');
        expect(response.body).toHaveProperty('bibliography_count');
      }
    });

    it('should return 404 for invalid course ID', async () => {
      await request(app)
        .get('/courses/999999')
        .expect(404);
    });
  });

  describe('GET /courses/:id/instructors', () => {
    it('should return course instructors', async () => {
      const coursesResponse = await request(app)
        .get('/courses?limit=1')
        .expect(200);

      if (coursesResponse.body.courses.length > 0) {
        const courseId = coursesResponse.body.courses[0].id;
        
        const response = await request(app)
          .get(`/courses/${courseId}/instructors`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        if (response.body.length > 0) {
          const instructor = response.body[0];
          expect(instructor).toHaveProperty('course_id', courseId);
          expect(instructor).toHaveProperty('preferred_name');
          expect(instructor).toHaveProperty('role');
        }
      }
    });

    it('should filter instructors by role', async () => {
      const coursesResponse = await request(app)
        .get('/courses?limit=1')
        .expect(200);

      if (coursesResponse.body.courses.length > 0) {
        const courseId = coursesResponse.body.courses[0].id;
        
        const response = await request(app)
          .get(`/courses/${courseId}/instructors?role=PROFESSOR`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        response.body.forEach(instructor => {
          expect(instructor.role).toBe('PROFESSOR');
        });
      }
    });
  });

  describe('GET /courses/:id/bibliography', () => {
    it('should return course bibliography', async () => {
      const coursesResponse = await request(app)
        .get('/courses?limit=1')
        .expect(200);

      if (coursesResponse.body.courses.length > 0) {
        const courseId = coursesResponse.body.courses[0].id;
        
        const response = await request(app)
          .get(`/courses/${courseId}/bibliography?limit=5`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        if (response.body.length > 0) {
          const bibEntry = response.body[0];
          expect(bibEntry).toHaveProperty('course_id', courseId);
          expect(bibEntry).toHaveProperty('work_id');
          expect(bibEntry).toHaveProperty('title');
          expect(bibEntry).toHaveProperty('reading_type');
        }
      }
    });

    it('should filter bibliography by reading type', async () => {
      const coursesResponse = await request(app)
        .get('/courses?limit=1')
        .expect(200);

      if (coursesResponse.body.courses.length > 0) {
        const courseId = coursesResponse.body.courses[0].id;
        
        const response = await request(app)
          .get(`/courses/${courseId}/bibliography?reading_type=RECOMMENDED`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        response.body.forEach(entry => {
          expect(entry.reading_type).toBe('RECOMMENDED');
        });
      }
    });
  });

  describe('GET /courses/:id/subjects', () => {
    it('should return course subjects', async () => {
      const coursesResponse = await request(app)
        .get('/courses?limit=1')
        .expect(200);

      if (coursesResponse.body.courses.length > 0) {
        const courseId = coursesResponse.body.courses[0].id;
        
        const response = await request(app)
          .get(`/courses/${courseId}/subjects?limit=5`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        if (response.body.length > 0) {
          const subject = response.body[0];
          expect(subject).toHaveProperty('id');
          expect(subject).toHaveProperty('term');
          expect(subject).toHaveProperty('vocabulary');
          expect(subject).toHaveProperty('work_count');
        }
      }
    });
  });

  describe('GET /courses/statistics', () => {
    it('should return courses statistics', async () => {
      const response = await request(app)
        .get('/courses/statistics')
        .expect(200);

      expect(response.body).toHaveProperty('total_courses');
      expect(response.body).toHaveProperty('programs_count');
      expect(response.body).toHaveProperty('earliest_year');
      expect(response.body).toHaveProperty('latest_year');
      expect(response.body).toHaveProperty('year_distribution');
      expect(response.body).toHaveProperty('semester_distribution');
      expect(Array.isArray(response.body.year_distribution)).toBe(true);
      expect(Array.isArray(response.body.semester_distribution)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid limit parameter', async () => {
      await request(app)
        .get('/courses?limit=abc')
        .expect(200); // Should use default limit
    });

    it('should handle negative offset parameter', async () => {
      await request(app)
        .get('/courses?offset=-10')
        .expect(200); // Should use default offset
    });
  });

  describe('Performance', () => {
    it('should respond within reasonable time for course listing', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/courses?limit=10')
        .expect(200);
        
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should respond within reasonable time for course details', async () => {
      const coursesResponse = await request(app)
        .get('/courses?limit=1')
        .expect(200);

      if (coursesResponse.body.courses.length > 0) {
        const courseId = coursesResponse.body.courses[0].id;
        const startTime = Date.now();
        
        await request(app)
          .get(`/courses/${courseId}`)
          .expect(200);
          
        const responseTime = Date.now() - startTime;
        expect(responseTime).toBeLessThan(3000); // 3 seconds max
      }
    });
  });
});
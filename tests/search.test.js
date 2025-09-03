const request = require('supertest');
const app = require('./helpers/test-app');

describe('Search API', () => {
  describe('GET /search/works', () => {
    it('should return fulltext search results for works', async () => {
      const res = await request(app)
        .get('/search/works?q=machine%20learning')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body).toHaveProperty('query', 'machine learning');
      expect(res.body).toHaveProperty('search_type', 'fulltext');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('query_time_ms');
      expect(res.body.meta).toHaveProperty('search_method', 'fulltext');
      expect(Array.isArray(res.body.data)).toBe(true);
      
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty('id');
        expect(res.body.data[0]).toHaveProperty('title');
        expect(res.body.data[0]).toHaveProperty('relevance');
      }
    });

    it('should accept filters (type, language, year)', async () => {
      const res = await request(app)
        .get('/search/works?q=test&type=ARTICLE&language=en&year_from=2020')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('query', 'test');
    });

    it('should return 400 for missing query', async () => {
      const res = await request(app)
        .get('/search/works')
        .expect(400);

      expect(res.body).toHaveProperty('status', 'error');
    });

    it('should return 400 for query too short', async () => {
      const res = await request(app)
        .get('/search/works?q=a')
        .expect(400);

      expect(res.body).toHaveProperty('status', 'error');
    });
  });

  describe('GET /search/persons', () => {
    it('should return fulltext search results for persons', async () => {
      const res = await request(app)
        .get('/search/persons?q=silva')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body).toHaveProperty('query', 'silva');
      expect(res.body).toHaveProperty('search_type', 'fulltext');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty('id');
        expect(res.body.data[0]).toHaveProperty('preferred_name');
        expect(res.body.data[0]).toHaveProperty('relevance');
        expect(res.body.data[0]).toHaveProperty('metrics');
      }
    });

    it('should accept verified filter', async () => {
      const res = await request(app)
        .get('/search/persons?q=silva&verified=true')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('query', 'silva');
    });
  });

  describe('GET /search/organizations', () => {
    it('should return search results for organizations', async () => {
      const res = await request(app)
        .get('/search/organizations?q=universidade')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body).toHaveProperty('query', 'universidade');
      expect(res.body).toHaveProperty('search_type', 'like');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty('id');
        expect(res.body.data[0]).toHaveProperty('name');
        expect(res.body.data[0]).toHaveProperty('location');
        expect(res.body.data[0]).toHaveProperty('metrics');
      }
    });

    it('should accept country and type filters', async () => {
      const res = await request(app)
        .get('/search/organizations?q=universidade&country_code=BR&type=UNIVERSITY')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('query', 'universidade');
    });
  });

  describe('GET /search/global', () => {
    it('should return combined search results', async () => {
      const res = await request(app)
        .get('/search/global?q=artificial%20intelligence')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(res.body).toHaveProperty('works');
      expect(res.body).toHaveProperty('persons');
      expect(res.body).toHaveProperty('organizations');
      expect(res.body).toHaveProperty('query', 'artificial intelligence');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('meta');
      
      expect(res.body.works).toHaveProperty('total');
      expect(res.body.works).toHaveProperty('results');
      expect(res.body.persons).toHaveProperty('total');
      expect(res.body.persons).toHaveProperty('results');
      expect(res.body.organizations).toHaveProperty('total');
      expect(res.body.organizations).toHaveProperty('results');
      
      expect(Array.isArray(res.body.works.results)).toBe(true);
      expect(Array.isArray(res.body.persons.results)).toBe(true);
      expect(Array.isArray(res.body.organizations.results)).toBe(true);
    });

    it('should accept limit parameter', async () => {
      const res = await request(app)
        .get('/search/global?q=test&limit=3')
        .expect(200);

      expect(res.body.works.results.length).toBeLessThanOrEqual(3);
      expect(res.body.persons.results.length).toBeLessThanOrEqual(3);
      expect(res.body.organizations.results.length).toBeLessThanOrEqual(3);
    });

    it('should return 400 for missing query', async () => {
      const res = await request(app)
        .get('/search/global')
        .expect(400);

      expect(res.body).toHaveProperty('status', 'error');
    });
  });

  describe('Performance Tests', () => {
    it('should complete fulltext search in reasonable time', async () => {
      const startTime = Date.now();
      
      const res = await request(app)
        .get('/search/works?q=machine%20learning')
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(5000); // 5s max
      expect(res.body.meta.query_time_ms).toBeLessThan(1000); // 1s for query
    });

    it('should complete global search in reasonable time', async () => {
      const startTime = Date.now();
      
      const res = await request(app)
        .get('/search/global?q=artificial%20intelligence&limit=5')
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(10000); // 10s max for global
      expect(res.body.meta.query_time_ms).toBeLessThan(2000); // 2s for query
    });
  });
});
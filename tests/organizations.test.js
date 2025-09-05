const request = require('supertest');
const app = require('../src/app');

describe('Organizations API', () => {
  describe('GET /organizations', () => {
    it('should return paginated list of organizations', async () => {
      const res = await request(app)
        .get('/organizations')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination).toHaveProperty('page');
      expect(res.body.pagination).toHaveProperty('limit');
      expect(res.body.pagination).toHaveProperty('total');
      expect(res.body.pagination).toHaveProperty('totalPages');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(20);
    });

    it('should accept search parameter', async () => {
      const res = await request(app)
        .get('/organizations?search=universidade')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
    });

    it('should accept country_code filter', async () => {
      const res = await request(app)
        .get('/organizations?country_code=BR')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      // Note: Just check that filter is accepted, data may vary
    });

    it('should accept type filter', async () => {
      const res = await request(app)
        .get('/organizations?type=UNIVERSITY')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      // Note: Just check that filter is accepted, data may vary
    });

    it('should return 400 for invalid search length', async () => {
      const res = await request(app)
        .get('/organizations?search=a')
        .expect(400);

      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('GET /organizations/:id', () => {
    it('should return organization details for valid ID', async () => {
      const res = await request(app)
        .get('/organizations/1')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('name');
      expect(res.body.data).toHaveProperty('type');
      expect(res.body.data).toHaveProperty('location');
      expect(res.body.data).toHaveProperty('metrics');
      expect(res.body.data).toHaveProperty('top_authors');
      expect(res.body.data).toHaveProperty('recent_works');
      expect(res.body.data.location).toHaveProperty('country_code');
      expect(res.body.data.metrics).toHaveProperty('works_count');
      expect(Array.isArray(res.body.data.top_authors)).toBe(true);
      expect(Array.isArray(res.body.data.recent_works)).toBe(true);
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .get('/organizations/invalid')
        .expect(400);

      expect(res.body).toHaveProperty('errors');
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request(app)
        .get('/organizations/999999999')
        .expect(404);

      expect(res.body).toHaveProperty('message');
      expect(res.body.status).toBe('error');
    });
  });
});
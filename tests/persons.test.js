const request = require('supertest');
const app = require('../src/app');

describe('Persons API', () => {
  describe('GET /persons', () => {
    it('should return paginated list of persons', async () => {
      const res = await request(app)
        .get('/persons')
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
        .get('/persons?search=silva')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
    });

    it('should accept verified filter', async () => {
      const res = await request(app)
        .get('/persons?verified=true')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      if (res.body.data.length > 0) {
        expect(res.body.data[0].is_verified).toBe(1);
      }
    });

    it('should accept signature search', async () => {
      const res = await request(app)
        .get('/persons?signature=silva')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
    });

    it('should return 400 for invalid search length', async () => {
      const res = await request(app)
        .get('/persons?search=a')
        .expect(400);

      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toBeInstanceOf(Array);
    });
  });

  describe('GET /persons/:id', () => {
    it('should return person details for valid ID', async () => {
      const res = await request(app)
        .get('/persons/1')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('preferred_name');
      expect(res.body.data).toHaveProperty('identifiers');
      expect(res.body.data).toHaveProperty('metrics');
      expect(res.body.data).toHaveProperty('recent_works');
      expect(res.body.data.identifiers).toHaveProperty('orcid');
      expect(res.body.data.metrics).toHaveProperty('works_count');
      expect(Array.isArray(res.body.data.recent_works)).toBe(true);
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .get('/persons/invalid')
        .expect(400);

      expect(res.body).toHaveProperty('status', 'error');
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toBeInstanceOf(Array);
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request(app)
        .get('/persons/999999999')
        .expect(404);

      expect(res.body).toHaveProperty('status', 'error');
      expect(res.body).toHaveProperty('message');
    });
  });
});
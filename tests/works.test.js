const request = require('supertest');
const app = require('../src/app');

describe('Works API', () => {
  describe('GET /works', () => {
    it('should return paginated list of works', async () => {
      const res = await request(app)
        .get('/works')
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

    it('should accept limit parameter', async () => {
      const res = await request(app)
        .get('/works?limit=5')
        .expect(200);

      expect(res.body.data.length).toBeLessThanOrEqual(5);
      expect(res.body.pagination.limit).toBe(5);
    });

    it('should accept search parameter', async () => {
      const res = await request(app)
        .get('/works?search=test')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
    });

    it('should accept type filter', async () => {
      const res = await request(app)
        .get('/works?type=OTHER')
        .expect(200);

      if (res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty('work_type');
      }
    });

    it('should return 400 for invalid limit', async () => {
      const res = await request(app)
        .get('/works?limit=invalid')
        .expect(400);

      expect(res.body).toHaveProperty('status', 'error');
      expect(res.body).toHaveProperty('message', 'Validation failed');
    });

    it('should return 400 for limit exceeding maximum', async () => {
      const res = await request(app)
        .get('/works?limit=200')
        .expect(400);

      expect(res.body).toHaveProperty('status', 'error');
      expect(res.body).toHaveProperty('message', 'Validation failed');
    });
  });

  describe('GET /works/:id', () => {
    it('should return work details for valid ID', async () => {
      const res = await request(app)
        .get('/works/1')
        .expect(200);

      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('title');
      expect(res.body.data).toHaveProperty('type');
      expect(res.body.data).toHaveProperty('publication');
      expect(res.body.data).toHaveProperty('authors');
      expect(Array.isArray(res.body.data.authors)).toBe(true);
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .get('/works/invalid')
        .expect(400);

      expect(res.body).toHaveProperty('status', 'error');
      expect(res.body).toHaveProperty('message', 'Validation failed');
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request(app)
        .get('/works/999999999')
        .expect(404);

      expect(res.body).toHaveProperty('status', 'error');
      expect(res.body).toHaveProperty('message');
    });
  });
});
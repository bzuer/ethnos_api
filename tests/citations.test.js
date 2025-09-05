const request = require('supertest');
const app = require('../src/app');

describe('Citations Endpoints', () => {
  describe('GET /works/:id/citations', () => {
    it('should return citations for a work', async () => {
      const res = await request(app)
        .get('/works/1/citations')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body.data).toHaveProperty('work_id', 1);
      expect(res.body.data).toHaveProperty('citing_works');
      expect(res.body.data).toHaveProperty('pagination');
      expect(res.body.data).toHaveProperty('filters');
      expect(Array.isArray(res.body.data.citing_works)).toBe(true);
      expect(res.body.meta).toHaveProperty('source', 'citations_analysis');
    });

    it('should handle citation type filter', async () => {
      const res = await request(app)
        .get('/works/1/citations?type=POSITIVE')
        .expect(200);

      expect(res.body.data.filters).toHaveProperty('type', 'POSITIVE');
    });

    it('should validate citation type', async () => {
      const res = await request(app)
        .get('/works/1/citations?type=INVALID')
        .expect(400);

      expect(res.body).toHaveProperty('status', 'error');
      expect(res.body).toHaveProperty('errors');
    });

    it('should handle pagination', async () => {
      const res = await request(app)
        .get('/works/1/citations?page=1&limit=10')
        .expect(200);

      expect(res.body.data.pagination).toHaveProperty('page', 1);
      expect(res.body.data.pagination).toHaveProperty('limit', 10);
    });
  });

  describe('GET /works/:id/references', () => {
    it('should return references made by a work', async () => {
      const res = await request(app)
        .get('/works/1/references')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body.data).toHaveProperty('work_id', 1);
      expect(res.body.data).toHaveProperty('referenced_works');
      expect(Array.isArray(res.body.data.referenced_works)).toBe(true);
    });
  });

  describe('GET /works/:id/metrics', () => {
    it('should return bibliometric metrics', async () => {
      const res = await request(app)
        .get('/works/1/metrics')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body.data).toHaveProperty('work_id', 1);
      expect(res.body.data).toHaveProperty('citation_metrics');
      expect(res.body.data).toHaveProperty('temporal_metrics');
      expect(res.body.data).toHaveProperty('impact_indicators');
    });

    it('should return 404 for non-existent work', async () => {
      const res = await request(app)
        .get('/works/999999/metrics')
        .expect(404);

      expect(res.body).toHaveProperty('status', 'error');
    });
  });

  describe('GET /works/:id/network', () => {
    it('should return citation network', async () => {
      const res = await request(app)
        .get('/works/1/network')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body.data).toHaveProperty('central_work_id', 1);
      expect(res.body.data).toHaveProperty('network_depth', 1);
      expect(res.body.data).toHaveProperty('nodes');
      expect(res.body.data).toHaveProperty('edges');
      expect(res.body.data).toHaveProperty('network_stats');
      expect(Array.isArray(res.body.data.edges)).toBe(true);
    });

    it('should handle depth parameter', async () => {
      const res = await request(app)
        .get('/works/1/network?depth=2')
        .expect(200);

      expect(res.body.data).toHaveProperty('network_depth', 2);
    });

    it('should validate depth parameter', async () => {
      const res = await request(app)
        .get('/works/1/network?depth=5')
        .expect(400);

      expect(res.body).toHaveProperty('status', 'error');
    });
  });

  describe('Parameter Validation', () => {
    it('should validate work ID format', async () => {
      const res = await request(app)
        .get('/works/invalid/citations')
        .expect(400);

      expect(res.body).toHaveProperty('status', 'error');
      expect(res.body).toHaveProperty('errors');
    });

    it('should validate pagination parameters', async () => {
      const res = await request(app)
        .get('/works/1/citations?page=0&limit=1000')
        .expect(400);

      expect(res.body).toHaveProperty('status', 'error');
    });
  });
});
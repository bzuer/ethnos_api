const request = require('supertest');
const app = require('../src/app');

describe('Files Endpoints', () => {
  describe('GET /api/files/:id', () => {
    it('should return file metadata for valid ID', async () => {
      const res = await request(app)
        .get('/api/files/180905')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body.data).toHaveProperty('id', 180905);
      expect(res.body.data).toHaveProperty('file_info');
      expect(res.body.data.file_info).toHaveProperty('format', 'PDF');
      expect(res.body.data).toHaveProperty('storage_info');
      expect(res.body.data).toHaveProperty('timestamps');
      expect(res.body.meta).toHaveProperty('source', 'file_system');
    });

    it('should return 404 for non-existent file', async () => {
      const res = await request(app)
        .get('/api/files/999999')
        .expect(404);

      expect(res.body).toHaveProperty('status', 'error');
      expect(res.body.message).toContain('not found');
    });

    it('should return 400 for invalid file ID', async () => {
      const res = await request(app)
        .get('/api/files/invalid')
        .expect(400);

      expect(res.body).toHaveProperty('status', 'error');
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/files/stats', () => {
    it('should return file statistics', async () => {
      const res = await request(app)
        .get('/api/files/stats')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body.data).toHaveProperty('total_statistics');
      expect(res.body.data).toHaveProperty('format_distribution');
      expect(res.body.data).toHaveProperty('size_statistics');
      expect(res.body.data).toHaveProperty('access_statistics');
      expect(res.body.meta).toHaveProperty('source', 'file_analytics');
    });

    it('should handle format filter', async () => {
      const res = await request(app)
        .get('/api/files/stats?format=PDF')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body.data.filters).toHaveProperty('format', 'PDF');
    });

    it('should validate format filter', async () => {
      const res = await request(app)
        .get('/api/files/stats?format=INVALID')
        .expect(400);

      expect(res.body).toHaveProperty('status', 'error');
    });
  });

  describe('GET /api/works/:id/files', () => {
    it('should return files for a work', async () => {
      const res = await request(app)
        .get('/api/works/1/files')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body.data).toHaveProperty('work_id', 1);
      expect(res.body.data).toHaveProperty('files');
      expect(res.body.data).toHaveProperty('pagination');
      expect(res.body.data).toHaveProperty('summary');
      expect(Array.isArray(res.body.data.files)).toBe(true);
    });

    it('should handle pagination', async () => {
      const res = await request(app)
        .get('/api/works/1/files?page=1&limit=5')
        .expect(200);

      expect(res.body.data.pagination).toHaveProperty('page', 1);
      expect(res.body.data.pagination).toHaveProperty('limit', 5);
    });
  });

  describe('GET /api/files/:id/download', () => {
    it('should prepare file download', async () => {
      const res = await request(app)
        .get('/api/files/180905/download')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body).toHaveProperty('message', 'Download prepared');
      expect(res.body.data).toHaveProperty('file_id', 180905);
      expect(res.body.data).toHaveProperty('filename');
      expect(res.body.data).toHaveProperty('content_type');
    });

    it('should return 404 for non-existent file download', async () => {
      const res = await request(app)
        .get('/api/files/999999/download')
        .expect(404);

      expect(res.body).toHaveProperty('status', 'error');
    });
  });
});
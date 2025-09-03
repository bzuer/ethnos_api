const { validationResult } = require('express-validator');
const filesService = require('../services/files.service');
const { logger } = require('../middleware/errorHandler');

class FilesController {
  /**
   * @swagger
   * /files/{id}:
   *   get:
   *     tags: [Files]
   *     summary: Get file metadata
   *     description: Retrieve detailed metadata for a specific file by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: File ID
   *     responses:
   *       200:
   *         description: File metadata retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/File'
   *                 meta:
   *                   type: object
   *                   properties:
   *                     query_time_ms:
   *                       type: integer
   *                       example: 45
   *                     source:
   *                       type: string
   *                       example: file_system
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  async getFileMetadata(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('File metadata validation failed:', errors.array());
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const fileId = req.params.id;

      const startTime = Date.now();
      const result = await filesService.getFileMetadata(fileId);
      const queryTime = Date.now() - startTime;

      if (!result) {
        logger.warn(`File metadata not found for file ${fileId}`);
        return res.status(404).json({
          status: 'error',
          message: `File with ID ${fileId} not found`
        });
      }

      logger.info(`File ${fileId} metadata retrieved in ${queryTime}ms`);

      res.json({
        status: 'success',
        data: result,
        meta: {
          query_time_ms: queryTime,
          source: 'file_system'
        }
      });
    } catch (error) {
      logger.error('Error in file metadata controller:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve file metadata'
      });
    }
  }

  /**
   * @swagger
   * /works/{id}/files:
   *   get:
   *     tags: [Files]
   *     summary: Get files for a work
   *     description: Retrieve all files associated with a specific work, with pagination and format filtering
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Work ID
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Items per page
   *       - in: query
   *         name: format
   *         schema:
   *           type: string
   *           enum: [PDF, EPUB, HTML, XML, DOCX, TXT, OTHER]
   *         description: File format filter
   *     responses:
   *       200:
   *         description: Work files retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   type: object
   *                   properties:
   *                     work_id:
   *                       type: integer
   *                       example: 12345
   *                     files:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/File'
   *                     pagination:
   *                       $ref: '#/components/schemas/PaginationMeta'
   *                 meta:
   *                   type: object
   *                   properties:
   *                     query_time_ms:
   *                       type: integer
   *                       example: 85
   *                     source:
   *                       type: string
   *                       example: file_system
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  async getWorkFiles(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Work files validation failed:', errors.array());
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const workId = req.params.id;
      const filters = {
        page: req.query.page,
        limit: req.query.limit,
        format: req.query.format
      };

      const startTime = Date.now();
      const result = await filesService.getWorkFiles(workId, filters);
      const queryTime = Date.now() - startTime;

      logger.info(`Work ${workId} files retrieved: ${result.files.length} files in ${queryTime}ms`);

      res.json({
        status: 'success',
        data: result,
        meta: {
          query_time_ms: queryTime,
          source: 'file_system'
        }
      });
    } catch (error) {
      logger.error('Error in work files controller:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve work files'
      });
    }
  }

  /**
   * @swagger
   * /files/{id}/download:
   *   get:
   *     tags: [Files]
   *     summary: Download a file
   *     description: Initiate download for a specific file. Returns download metadata in the current implementation.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: File ID
   *     responses:
   *       200:
   *         description: File download prepared successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 message:
   *                   type: string
   *                   example: Download prepared
   *                 data:
   *                   type: object
   *                   properties:
   *                     file_id:
   *                       type: integer
   *                       example: 789
   *                     filename:
   *                       type: string
   *                       example: document.pdf
   *                     size:
   *                       type: integer
   *                       example: 2048576
   *                       description: File size in bytes
   *                     content_type:
   *                       type: string
   *                       example: application/pdf
   *                     note:
   *                       type: string
   *                       example: In production, this would stream the actual file content
   *                 meta:
   *                   type: object
   *                   properties:
   *                     query_time_ms:
   *                       type: integer
   *                       example: 25
   *                     source:
   *                       type: string
   *                       example: file_download_system
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       403:
   *         description: File not available for download
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: error
   *                 message:
   *                   type: string
   *                   example: File is not available for download
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  async downloadFile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('File download validation failed:', errors.array());
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const fileId = req.params.id;

      const startTime = Date.now();
      const downloadInfo = await filesService.getFileDownloadInfo(fileId);
      const queryTime = Date.now() - startTime;

      if (!downloadInfo) {
        logger.warn(`Download info not found for file ${fileId}`);
        return res.status(404).json({
          status: 'error',
          message: `File with ID ${fileId} not found or not available for download`
        });
      }

      // Set download headers
      Object.entries(downloadInfo.download_headers).forEach(([key, value]) => {
        res.set(key, value);
      });

      logger.info(`File ${fileId} download initiated: ${downloadInfo.filename} in ${queryTime}ms`);

      // For this implementation, we'll return download metadata instead of actual file stream
      // In production, you would stream the actual file from storage
      res.json({
        status: 'success',
        message: 'Download prepared',
        data: {
          file_id: downloadInfo.file_id,
          filename: downloadInfo.filename,
          size: downloadInfo.size,
          content_type: downloadInfo.content_type,
          note: 'In production, this would stream the actual file content'
        },
        meta: {
          query_time_ms: queryTime,
          source: 'file_download_system'
        }
      });

      // Actual file streaming would be implemented like this:
      // const fs = require('fs');
      // const stream = fs.createReadStream(downloadInfo.storage_path);
      // stream.pipe(res);

    } catch (error) {
      if (error.message === 'File is not available for download') {
        logger.warn(`File download not available: ${req.params.id}`);
        return res.status(403).json({
          status: 'error',
          message: 'File is not available for download'
        });
      }

      logger.error('Error in file download controller:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to process file download'
      });
    }
  }

  /**
   * @swagger
   * /files/stats:
   *   get:
   *     tags: [Files]
   *     summary: Get file statistics
   *     description: Retrieve comprehensive statistics about files in the system, with filtering options
   *     parameters:
   *       - in: query
   *         name: format
   *         schema:
   *           type: string
   *           enum: [PDF, EPUB, HTML, XML, DOCX, TXT, OTHER]
   *         description: Filter by file format
   *       - in: query
   *         name: year_from
   *         schema:
   *           type: integer
   *           minimum: 1900
   *           maximum: 2030
   *         description: Filter files from this year onwards
   *       - in: query
   *         name: year_to
   *         schema:
   *           type: integer
   *           minimum: 1900
   *           maximum: 2030
   *         description: Filter files up to this year
   *     responses:
   *       200:
   *         description: File statistics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   type: object
   *                   properties:
   *                     total_files:
   *                       type: integer
   *                       example: 458920
   *                       description: Total number of files
   *                     total_size_bytes:
   *                       type: integer
   *                       example: 125486789632
   *                       description: Total size in bytes
   *                     total_size_gb:
   *                       type: number
   *                       format: float
   *                       example: 116.9
   *                       description: Total size in gigabytes
   *                     format_distribution:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           format:
   *                             type: string
   *                             example: PDF
   *                           count:
   *                             type: integer
   *                             example: 385650
   *                           percentage:
   *                             type: number
   *                             format: float
   *                             example: 84.0
   *                     availability_stats:
   *                       type: object
   *                       properties:
   *                         available_files:
   *                           type: integer
   *                           example: 425380
   *                         unavailable_files:
   *                           type: integer
   *                           example: 33540
   *                         availability_percentage:
   *                           type: number
   *                           format: float
   *                           example: 92.7
   *                     access_stats:
   *                       type: object
   *                       properties:
   *                         total_downloads:
   *                           type: integer
   *                           example: 1856420
   *                         avg_downloads_per_file:
   *                           type: number
   *                           format: float
   *                           example: 4.04
   *                 meta:
   *                   type: object
   *                   properties:
   *                     query_time_ms:
   *                       type: integer
   *                       example: 125
   *                     source:
   *                       type: string
   *                       example: file_analytics
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  async getFileStats(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('File statistics validation failed:', errors.array());
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const filters = {
        format: req.query.format,
        year_from: req.query.year_from,
        year_to: req.query.year_to
      };

      const startTime = Date.now();
      const result = await filesService.getFileStats(filters);
      const queryTime = Date.now() - startTime;

      logger.info(`File statistics retrieved in ${queryTime}ms`);

      res.json({
        status: 'success',
        data: result,
        meta: {
          query_time_ms: queryTime,
          source: 'file_analytics'
        }
      });
    } catch (error) {
      logger.error('Error in file statistics controller:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve file statistics'
      });
    }
  }
}

module.exports = new FilesController();
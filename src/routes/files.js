/**
 * @swagger
 * tags:
 *   name: Files
 *   description: File management and metadata operations
 */

const express = require('express');
const router = express.Router();
const { param, query } = require('express-validator');
const filesController = require('../controllers/files.controller');

const validateFileId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('File ID must be a positive integer')
];

const validateWorkId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Work ID must be a positive integer')
];

const validateFileFilters = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
    
  query('format')
    .optional()
    .isIn(['PDF', 'EPUB', 'HTML', 'XML', 'DOCX', 'TXT', 'OTHER'])
    .withMessage('Format must be one of: PDF, EPUB, HTML, XML, DOCX, TXT, OTHER')
];

const validateFileStats = [
  query('format')
    .optional()
    .isIn(['PDF', 'EPUB', 'HTML', 'XML', 'DOCX', 'TXT', 'OTHER'])
    .withMessage('Format must be one of: PDF, EPUB, HTML, XML, DOCX, TXT, OTHER'),
    
  query('year_from')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('Year from must be a valid year'),
    
  query('year_to')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('Year to must be a valid year')
];

/**
 * @swagger
 * /files/stats:
 *   get:
 *     summary: Get file statistics
 *     tags: [Files]
 *     description: Retrieve comprehensive statistics about files in the system
 *     parameters:
 *       - name: format
 *         in: query
 *         description: Filter by file format
 *         schema:
 *           type: string
 *           enum: [PDF, EPUB, HTML, XML, DOCX, TXT, OTHER]
 *       - name: year_from
 *         in: query
 *         description: Filter files from this publication year
 *         schema:
 *           type: integer
 *           example: 2020
 *       - name: year_to
 *         in: query
 *         description: Filter files up to this publication year
 *         schema:
 *           type: integer
 *           example: 2024
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_statistics:
 *                       type: object
 *                       properties:
 *                         total_files:
 *                           type: integer
 *                         available_files:
 *                           type: integer
 *                         availability_percentage:
 *                           type: integer
 *                     format_distribution:
 *                       type: object
 *                       properties:
 *                         pdf:
 *                           type: integer
 *                         epub:
 *                           type: integer
 *                         html:
 *                           type: integer
 *                         xml:
 *                           type: integer
 *                         other:
 *                           type: integer
 *                     size_statistics:
 *                       type: object
 *                       properties:
 *                         total_size_bytes:
 *                           type: integer
 *                         total_size_gb:
 *                           type: number
 *                         avg_size_mb:
 *                           type: number
 *                         max_size_mb:
 *                           type: number
 *                     access_statistics:
 *                       type: object
 *                       properties:
 *                         total_downloads:
 *                           type: integer
 *                         avg_downloads_per_file:
 *                           type: integer
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.get('/stats', validateFileStats, filesController.getFileStats);

/**
 * @swagger
 * /files/{id}:
 *   get:
 *     summary: Get file metadata
 *     tags: [Files]
 *     description: Retrieve comprehensive metadata for a specific file including linked publications and storage information
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: File ID
 *         schema:
 *           type: integer
 *           example: 1
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
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     file_info:
 *                       type: object
 *                       properties:
 *                         hash:
 *                           type: string
 *                         size:
 *                           type: integer
 *                         size_mb:
 *                           type: number
 *                         format:
 *                           type: string
 *                         version:
 *                           type: string
 *                         pages:
 *                           type: integer
 *                         language:
 *                           type: string
 *                     linked_publication:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         publication_id:
 *                           type: integer
 *                         work_id:
 *                           type: integer
 *                         work_title:
 *                           type: string
 *                         work_type:
 *                           type: string
 *                         publication_year:
 *                           type: integer
 *                         doi:
 *                           type: string
 *                     storage_info:
 *                       type: object
 *                       properties:
 *                         storage_path:
 *                           type: string
 *                         storage_provider:
 *                           type: string
 *                         is_available:
 *                           type: boolean
 *                         last_accessed_at:
 *                           type: string
 *                         access_count:
 *                           type: integer
 *                     timestamps:
 *                       type: object
 *                       properties:
 *                         created_at:
 *                           type: string
 *                         updated_at:
 *                           type: string
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', validateFileId, filesController.getFileMetadata);

/**
 * @swagger
 * /works/{id}/files:
 *   get:
 *     summary: Get files for a work
 *     tags: [Files]
 *     description: Retrieve all files associated with a specific work with filtering options
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Work ID
 *         schema:
 *           type: integer
 *           example: 1
 *       - name: format
 *         in: query
 *         description: Filter by file format
 *         schema:
 *           type: string
 *           enum: [PDF, EPUB, HTML, XML, DOCX, TXT, OTHER]
 *       - $ref: '#/components/parameters/pageParam'
 *       - $ref: '#/components/parameters/limitParam'
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     work_id:
 *                       type: integer
 *                     files:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           file_info:
 *                             type: object
 *                           availability:
 *                             type: object
 *                             properties:
 *                               is_available:
 *                                 type: boolean
 *                               storage_provider:
 *                                 type: string
 *                               access_count:
 *                                 type: integer
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total_files:
 *                           type: integer
 *                         formats_available:
 *                           type: array
 *                           items:
 *                             type: string
 *                         total_size_mb:
 *                           type: number
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/works/:id/files', [...validateWorkId, ...validateFileFilters], filesController.getWorkFiles);

/**
 * @swagger
 * /files/{id}/download:
 *   get:
 *     summary: Download a file
 *     tags: [Files]
 *     description: Prepare file download with proper headers and metadata
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: File ID
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: File download prepared
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     file_id:
 *                       type: integer
 *                     filename:
 *                       type: string
 *                     size:
 *                       type: integer
 *                     content_type:
 *                       type: string
 *                     note:
 *                       type: string
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
 */
router.get('/:id/download', validateFileId, filesController.downloadFile);

module.exports = router;
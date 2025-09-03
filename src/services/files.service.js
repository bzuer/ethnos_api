const { sequelize } = require('../models');
const cacheService = require('./cache.service');
const { logger } = require('../middleware/errorHandler');
const path = require('path');
const fs = require('fs').promises;

class FilesService {
  async getFileMetadata(fileId) {
    const cacheKey = `file:metadata:${fileId}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info(`File ${fileId} metadata retrieved from cache`);
        return cached;
      }

      const fileData = await sequelize.query(`
        SELECT 
          id,
          file_hash,
          file_size,
          file_format,
          version,
          pages,
          language,
          upload_date,
          download_count,
          file_md5
        FROM files
        WHERE id = ?
      `, {
        replacements: [parseInt(fileId)],
        type: sequelize.QueryTypes.SELECT
      });

      logger.debug(`Raw fileData for ${fileId}:`, fileData);
      
      if (!fileData || fileData.length === 0) {
        logger.warn(`File ${fileId} not found in database`);
        return null;
      }

      const file = fileData[0];
      if (!file) {
        logger.warn(`File ${fileId} returned empty result`);
        return null;
      }
      
      logger.debug(`Parsed file ${fileId} data:`, file);

      // Get linked publication info separately if exists
      let linkedPublication = null;
      try {
        const [pubData] = await sequelize.query(`
          SELECT 
            p.id as publication_id,
            w.id as work_id,
            w.title as work_title,
            w.work_type,
            pub.year as publication_year,
            pub.doi
          FROM publication_files pf
          INNER JOIN publications p ON pf.publication_id = p.id
          INNER JOIN works w ON p.work_id = w.id
          LEFT JOIN publications pub ON w.id = pub.work_id
          WHERE pf.file_id = :fileId
          LIMIT 1
        `, {
          replacements: { fileId: parseInt(fileId) },
          type: sequelize.QueryTypes.SELECT
        });

        if (pubData && pubData.length > 0) {
          const pub = pubData[0];
          linkedPublication = {
            publication_id: pub.publication_id,
            work_id: pub.work_id,
            work_title: pub.work_title,
            work_type: pub.work_type,
            publication_year: pub.publication_year,
            doi: pub.doi
          };
        }
      } catch (error) {
        logger.warn(`Could not fetch linked publication for file ${fileId}:`, error.message);
      }

      // Get file location info separately
      let locationInfo = {
        location_type: null,
        location_value: null,
        is_primary: false,
        is_available: false
      };

      try {
        const [locData] = await sequelize.query(`
          SELECT location_type, location_value, is_primary, is_active, created_at
          FROM file_locations 
          WHERE file_id = :fileId AND is_primary = 1
          LIMIT 1
        `, {
          replacements: { fileId: parseInt(fileId) },
          type: sequelize.QueryTypes.SELECT
        });

        if (locData && locData.length > 0) {
          const loc = locData[0];
          locationInfo = {
            location_type: loc.location_type,
            location_value: loc.location_value,
            is_primary: loc.is_primary || false,
            is_available: loc.is_active || false
          };
        }
      } catch (error) {
        logger.warn(`Could not fetch location info for file ${fileId}:`, error.message);
      }

      const result = {
        id: file.id,
        file_info: {
          hash: file.file_hash,
          size: parseInt(file.file_size) || 0,
          size_mb: file.file_size ? Math.round(parseInt(file.file_size) / (1024 * 1024) * 100) / 100 : 0,
          format: file.file_format,
          version: file.version,
          pages: file.pages,
          language: file.language,
          md5: file.file_md5
        },
        linked_publication: linkedPublication,
        storage_info: {
          location_type: locationInfo.location_type,
          location_value: locationInfo.location_value,
          is_primary: locationInfo.is_primary,
          is_available: locationInfo.is_available,
          download_count: parseInt(file.download_count) || 0
        },
        timestamps: {
          upload_date: file.upload_date
        }
      };

      await cacheService.set(cacheKey, result, 3600);
      logger.info(`File ${fileId} metadata cached`);
      
      return result;
    } catch (error) {
      logger.error(`Error fetching file metadata for ${fileId}:`, error);
      throw error;
    }
  }

  async getWorkFiles(workId, filters = {}) {
    const { page = 1, limit = 20, format } = filters;
    const offset = (page - 1) * limit;
    
    const cacheKey = `files:work:${workId}:${JSON.stringify(filters)}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info(`Files for work ${workId} retrieved from cache`);
        return cached;
      }

      const whereConditions = ['w.id = :workId'];
      const replacements = { workId: parseInt(workId), limit: parseInt(limit), offset: parseInt(offset) };

      if (format) {
        whereConditions.push('f.file_format = :format');
        replacements.format = format.toUpperCase();
      }

      const whereClause = whereConditions.join(' AND ');

      const [files, fileCount] = await Promise.all([
        sequelize.query(`
          SELECT 
            f.id,
            f.file_hash,
            f.file_size,
            f.file_format,
            f.version,
            f.pages,
            f.language,
            f.download_count,
            f.file_md5,
            fl.location_type,
            fl.is_active
          FROM files f
          INNER JOIN publication_files pf ON f.id = pf.file_id
          INNER JOIN publications p ON pf.publication_id = p.id
          INNER JOIN works w ON p.work_id = w.id
          LEFT JOIN file_locations fl ON f.id = fl.file_id AND fl.is_primary = 1
          WHERE ${whereClause}
          ORDER BY f.file_format, f.upload_date DESC
          LIMIT :limit OFFSET :offset
        `, {
          replacements,
          type: sequelize.QueryTypes.SELECT
        }),

        sequelize.query(`
          SELECT COUNT(DISTINCT f.id) as total
          FROM files f
          INNER JOIN publication_files pf ON f.id = pf.file_id
          INNER JOIN publications p ON pf.publication_id = p.id
          INNER JOIN works w ON p.work_id = w.id
          WHERE ${whereClause}
        `, {
          replacements: Object.fromEntries(
            Object.entries(replacements).filter(([key]) => !['limit', 'offset'].includes(key))
          ),
          type: sequelize.QueryTypes.SELECT
        })
      ]);

      const total = fileCount[0].total;
      const totalPages = Math.ceil(total / limit);

      const result = {
        work_id: parseInt(workId),
        files: files.map(file => ({
          id: file.id,
          file_info: {
            hash: file.file_hash,
            size: parseInt(file.file_size) || 0,
            size_mb: file.file_size ? Math.round(parseInt(file.file_size) / (1024 * 1024) * 100) / 100 : 0,
            format: file.file_format,
            version: file.version,
            pages: file.pages,
            language: file.language,
            md5: file.file_md5
          },
          availability: {
            is_available: file.is_active || false,
            location_type: file.location_type || null,
            download_count: parseInt(file.download_count) || 0
          }
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        filters: {
          format: format || null
        },
        summary: {
          total_files: parseInt(total),
          formats_available: [...new Set(files.map(f => f.file_format))],
          total_size_mb: Math.round(files.reduce((sum, f) => sum + (parseInt(f.file_size) || 0), 0) / (1024 * 1024) * 100) / 100
        }
      };

      await cacheService.set(cacheKey, result, 600);
      logger.info(`Files for work ${workId} cached: ${total} files`);
      
      return result;
    } catch (error) {
      logger.error(`Error fetching files for work ${workId}:`, error);
      throw error;
    }
  }

  async getFileDownloadInfo(fileId) {
    try {
      // Get file metadata and location
      const fileMetadata = await this.getFileMetadata(fileId);
      
      if (!fileMetadata) {
        return null;
      }

      // Check if file is available for download (simplified for demo)
      if (!fileMetadata) {
        logger.warn(`File ${fileId} metadata not found`);
        throw new Error('File not found');
      }

      // Update access count (async, don't wait)
      this.incrementAccessCount(fileId).catch(err => 
        logger.warn(`Failed to increment access count for file ${fileId}:`, err.message)
      );

      const downloadInfo = {
        file_id: fileMetadata.id,
        filename: this.generateFilename(fileMetadata),
        content_type: this.getContentType(fileMetadata.file_info.format),
        size: fileMetadata.file_info.size,
        storage_path: `/demo/files/${fileId}`, // Demo path
        storage_provider: fileMetadata.storage_info.location_type || 'demo',
        download_headers: {
          'X-Content-Disposition': `attachment; filename="${this.generateFilename(fileMetadata)}"`,
          'X-Content-Type': this.getContentType(fileMetadata.file_info.format),
          'X-Content-Length': fileMetadata.file_info.size.toString(),
          'X-File-Hash': fileMetadata.file_info.hash
        }
      };

      logger.info(`Download info prepared for file ${fileId}: ${downloadInfo.filename}`);
      return downloadInfo;
      
    } catch (error) {
      logger.error(`Error preparing download info for file ${fileId}:`, error);
      throw error;
    }
  }

  async incrementAccessCount(fileId) {
    try {
      await sequelize.query(`
        UPDATE files 
        SET download_count = download_count + 1
        WHERE id = :fileId
      `, {
        replacements: { fileId: parseInt(fileId) },
        type: sequelize.QueryTypes.UPDATE
      });

      logger.debug(`Download count incremented for file ${fileId}`);
    } catch (error) {
      logger.error(`Error incrementing download count for file ${fileId}:`, error);
      throw error;
    }
  }

  generateFilename(fileMetadata) {
    const workTitle = fileMetadata.linked_publication?.work_title || 'document';
    const format = fileMetadata.file_info.format.toLowerCase();
    const year = fileMetadata.linked_publication?.publication_year || '';
    
    // Sanitize title for filename
    const sanitizedTitle = workTitle
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    
    return `${sanitizedTitle}_${year}_${fileMetadata.id}.${format}`;
  }

  getContentType(format) {
    const contentTypes = {
      'PDF': 'application/pdf',
      'EPUB': 'application/epub+zip',
      'MOBI': 'application/x-mobipocket-ebook',
      'HTML': 'text/html',
      'XML': 'application/xml',
      'DOCX': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'TXT': 'text/plain',
      'OTHER': 'application/octet-stream'
    };

    return contentTypes[format] || 'application/octet-stream';
  }

  async getFileStats(filters = {}) {
    const { format, year_from, year_to } = filters;
    const cacheKey = `files:stats:${JSON.stringify(filters)}`;
    
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('File statistics retrieved from cache');
        return cached;
      }

      const whereConditions = ['1=1'];
      const replacements = {};

      if (format) {
        whereConditions.push('f.file_format = :format');
        replacements.format = format.toUpperCase();
      }

      if (year_from) {
        whereConditions.push('pub.year >= :yearFrom');
        replacements.yearFrom = parseInt(year_from);
      }

      if (year_to) {
        whereConditions.push('pub.year <= :yearTo');
        replacements.yearTo = parseInt(year_to);
      }

      const whereClause = whereConditions.join(' AND ');

      // Simplified stats query - focus on files table only
      const [stats] = await sequelize.query(`
        SELECT 
          COUNT(*) as total_files,
          
          -- Format breakdown
          SUM(CASE WHEN file_format = 'PDF' THEN 1 ELSE 0 END) as pdf_count,
          SUM(CASE WHEN file_format = 'EPUB' THEN 1 ELSE 0 END) as epub_count,
          SUM(CASE WHEN file_format = 'HTML' THEN 1 ELSE 0 END) as html_count,
          SUM(CASE WHEN file_format = 'XML' THEN 1 ELSE 0 END) as xml_count,
          SUM(CASE WHEN file_format = 'OTHER' THEN 1 ELSE 0 END) as other_count,
          SUM(CASE WHEN file_format = 'MOBI' THEN 1 ELSE 0 END) as mobi_count,
          SUM(CASE WHEN file_format = 'DOCX' THEN 1 ELSE 0 END) as docx_count,
          SUM(CASE WHEN file_format = 'TXT' THEN 1 ELSE 0 END) as txt_count,
          
          -- Size statistics
          SUM(COALESCE(file_size, 0)) as total_size_bytes,
          AVG(COALESCE(file_size, 0)) as avg_size_bytes,
          MAX(COALESCE(file_size, 0)) as max_size_bytes,
          
          -- Access statistics  
          SUM(COALESCE(download_count, 0)) as total_downloads,
          AVG(COALESCE(download_count, 0)) as avg_downloads_per_file
          
        FROM files
        WHERE 1=1
      `, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      const statsData = stats[0] || {};
      
      // Get availability info separately if needed
      let availabilityCount = 0;
      try {
        const [availData] = await sequelize.query(`
          SELECT COUNT(DISTINCT fl.file_id) as available_files
          FROM file_locations fl
          WHERE fl.is_active = 1
        `, {
          type: sequelize.QueryTypes.SELECT
        });
        availabilityCount = parseInt(availData[0]?.available_files) || 0;
      } catch (error) {
        logger.warn('Could not fetch availability stats:', error.message);
      }

      const totalFiles = parseInt(statsData.total_files) || 0;
      
      const result = {
        total_statistics: {
          total_files: totalFiles,
          available_files: availabilityCount,
          availability_percentage: totalFiles > 0 ? 
            Math.round((availabilityCount / totalFiles) * 100) : 0
        },
        format_distribution: {
          pdf: parseInt(statsData.pdf_count) || 0,
          epub: parseInt(statsData.epub_count) || 0,
          html: parseInt(statsData.html_count) || 0,
          xml: parseInt(statsData.xml_count) || 0,
          mobi: parseInt(statsData.mobi_count) || 0,
          docx: parseInt(statsData.docx_count) || 0,
          txt: parseInt(statsData.txt_count) || 0,
          other: parseInt(statsData.other_count) || 0
        },
        size_statistics: {
          total_size_bytes: parseInt(statsData.total_size_bytes) || 0,
          total_size_gb: statsData.total_size_bytes ? 
            Math.round(parseInt(statsData.total_size_bytes) / (1024 * 1024 * 1024) * 100) / 100 : 0,
          avg_size_mb: statsData.avg_size_bytes ? 
            Math.round(parseFloat(statsData.avg_size_bytes) / (1024 * 1024) * 100) / 100 : 0,
          max_size_mb: statsData.max_size_bytes ? 
            Math.round(parseInt(statsData.max_size_bytes) / (1024 * 1024) * 100) / 100 : 0
        },
        access_statistics: {
          total_downloads: parseInt(statsData.total_downloads) || 0,
          avg_downloads_per_file: Math.round(parseFloat(statsData.avg_downloads_per_file) || 0)
        },
        filters: filters
      };

      await cacheService.set(cacheKey, result, 3600);
      logger.info('File statistics cached');
      
      return result;
    } catch (error) {
      logger.error('Error fetching file statistics:', error);
      throw error;
    }
  }
}

module.exports = new FilesService();
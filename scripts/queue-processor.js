#!/usr/bin/env node
/**
 * Sphinx Queue Processor - Processes sphinx_queue table entries
 * Runs real-time indexing for works that were added/updated/deleted
 */

const { logger } = require('../src/middleware/errorHandler');
const sphinxService = require('../src/services/sphinx.service');
const { pool } = require('../src/config/database');

class QueueProcessor {
    constructor() {
        this.processing = false;
        this.batchSize = 10;
        this.maxRetries = 3;
    }

    async processQueue() {
        if (this.processing) {
            return;
        }

        this.processing = true;

        try {
            // Get pending queue items
            const query = `
                SELECT * FROM sphinx_queue 
                WHERE status = 'pending' AND retry_count < ?
                ORDER BY queued_at ASC 
                LIMIT ?
            `;
            
            const items = await pool.query(query, [this.maxRetries, this.batchSize]);
            
            if (items.length === 0) {
                logger.debug('Queue processor: No items to process');
                return;
            }

            logger.info(`Processing ${items.length} queue items`);

            for (const item of items) {
                await this.processItem(item);
            }

        } catch (error) {
            logger.error('Queue processing failed:', error);
        } finally {
            this.processing = false;
        }
    }

    async processItem(item) {
        try {
            // Mark as processing
            await pool.query(
                'UPDATE sphinx_queue SET status = ?, processed_at = NOW() WHERE id = ?',
                ['processing', item.id]
            );

            let success = false;

            switch (item.operation) {
                case 'INSERT':
                case 'UPDATE':
                    success = await this.indexWork(item);
                    break;
                case 'DELETE':
                    success = await this.deleteWork(item.work_id);
                    break;
            }

            if (success) {
                // Mark as completed
                await pool.query(
                    'UPDATE sphinx_queue SET status = ?, processed_at = NOW() WHERE id = ?',
                    ['completed', item.id]
                );
                
                logger.info('Queue item processed successfully', {
                    operation: item.operation,
                    work_id: item.work_id,
                    queue_id: item.id
                });
            } else {
                throw new Error('Processing failed');
            }

        } catch (error) {
            // Increment retry count
            const retryCount = item.retry_count + 1;
            
            if (retryCount >= this.maxRetries) {
                // Mark as failed permanently
                await pool.query(
                    'UPDATE sphinx_queue SET status = ?, retry_count = ?, error_message = ?, processed_at = NOW() WHERE id = ?',
                    ['failed', retryCount, error.message, item.id]
                );
                
                logger.error('Queue item failed permanently', {
                    operation: item.operation,
                    work_id: item.work_id,
                    queue_id: item.id,
                    retries: retryCount,
                    error: error.message
                });
            } else {
                // Reset to pending for retry
                await pool.query(
                    'UPDATE sphinx_queue SET status = ?, retry_count = ?, error_message = ? WHERE id = ?',
                    ['pending', retryCount, error.message, item.id]
                );
                
                logger.warn('Queue item failed, will retry', {
                    operation: item.operation,
                    work_id: item.work_id,
                    queue_id: item.id,
                    retries: retryCount
                });
            }
        }
    }

    async indexWork(item) {
        try {
            // Get complete work data for indexing
            const workQuery = `
                SELECT 
                    w.id,
                    w.title,
                    COALESCE(w.subtitle, '') as subtitle,
                    COALESCE(w.abstract, '') as abstract,
                    COALESCE(was.author_string, '') as author_string,
                    COALESCE(v.name, '') as venue_name,
                    COALESCE(pub.doi, w.temp_doi, '') as doi,
                    UNIX_TIMESTAMP(w.created_at) as created_ts,
                    COALESCE(pub.year, 0) as year,
                    w.work_type,
                    COALESCE(w.language, 'unknown') as language,
                    COALESCE(pub.open_access, 0) as open_access,
                    COALESCE(pub.peer_reviewed, 0) as peer_reviewed
                FROM works w
                LEFT JOIN work_author_summary was ON w.id = was.work_id
                LEFT JOIN publications pub ON w.id = pub.work_id
                LEFT JOIN venues v ON pub.venue_id = v.id
                WHERE w.id = ?
            `;
            
            const works = await pool.query(workQuery, [item.work_id]);
            
            if (works.length === 0) {
                throw new Error(`Work ${item.work_id} not found`);
            }

            const work = works[0];
            
            // Use SphinxQL REPLACE for INSERT/UPDATE operations
            const sphinxQuery = `
                REPLACE INTO works_rt 
                (id, title, subtitle, abstract, author_string, venue_name, doi, 
                 created_ts, year, work_type, language, open_access, peer_reviewed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            await sphinxService.ensureConnection();
            await sphinxService.connection.query(sphinxQuery, [
                work.id,
                work.title,
                work.subtitle,
                work.abstract,
                work.author_string,
                work.venue_name,
                work.doi,
                work.created_ts,
                work.year,
                work.work_type,
                work.language,
                work.open_access,
                work.peer_reviewed
            ]);

            return true;

        } catch (error) {
            logger.error('Work indexing failed', {
                work_id: item.work_id,
                error: error.message
            });
            return false;
        }
    }

    async deleteWork(workId) {
        try {
            await sphinxService.ensureConnection();
            await sphinxService.connection.query('DELETE FROM works_rt WHERE id = ?', [workId]);
            return true;
        } catch (error) {
            logger.error('Work deletion failed', {
                work_id: workId,
                error: error.message
            });
            return false;
        }
    }

    async getQueueStatus() {
        try {
            const statusQuery = `
                SELECT 
                    status,
                    operation,
                    COUNT(*) as count,
                    MIN(queued_at) as oldest,
                    MAX(queued_at) as newest
                FROM sphinx_queue 
                GROUP BY status, operation
                ORDER BY status, operation
            `;
            
            const results = await pool.query(statusQuery);
            return results;
            
        } catch (error) {
            logger.error('Failed to get queue status:', error);
            return [];
        }
    }

    async cleanup() {
        try {
            // Remove completed items older than 24 hours
            const cleanupQuery = `
                DELETE FROM sphinx_queue 
                WHERE status = 'completed' 
                AND processed_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `;
            
            const result = await pool.query(cleanupQuery);
            
            if (result.affectedRows > 0) {
                logger.info(`Cleaned up ${result.affectedRows} completed queue items`);
            }
            
        } catch (error) {
            logger.error('Queue cleanup failed:', error);
        }
    }
}

const processor = new QueueProcessor();

// Process queue immediately and then every 30 seconds
async function startProcessor() {
    try {
        await processor.processQueue();
        await processor.cleanup();
    } catch (error) {
        logger.error('Queue processor error:', error);
    }
    
    setTimeout(startProcessor, 30000); // 30 seconds
}

// Start the processor
if (require.main === module) {
    logger.info('Starting Sphinx queue processor...');
    startProcessor();
}

module.exports = processor;
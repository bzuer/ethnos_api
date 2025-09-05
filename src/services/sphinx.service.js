const mysql = require('mysql');
const { logger } = require('../middleware/errorHandler');

class SphinxService {
    constructor() {
        this.connection = null;
        this.isConnected = false;
        this.connectionConfig = {
            host: 'localhost',
            port: 9306,
            user: '',
            password: '',
            multipleStatements: true,
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true
        };
    }

    /**
     * Initialize connection to Sphinx Search via SphinxQL
     */
    async connect() {
        try {
            if (this.connection) {
                this.connection.end();
            }
            
            this.connection = mysql.createConnection(this.connectionConfig);
            
            return new Promise((resolve, reject) => {
                this.connection.connect((error) => {
                    if (error) {
                        this.isConnected = false;
                        logger.error('Failed to connect to Sphinx:', error);
                        reject(error);
                        return;
                    }
                    
                    this.isConnected = true;
                    
                    this.connection.query('SHOW TABLES', (error, results) => {
                        if (error) {
                            logger.error('Sphinx connection test failed:', error);
                            reject(error);
                            return;
                        }
                        
                        logger.info('Sphinx connection established', { 
                            indexes: results.length,
                            tables: results.map(r => r.Index || r.Table)
                        });
                        resolve(true);
                    });
                });
            });
        } catch (error) {
            this.isConnected = false;
            logger.error('Failed to connect to Sphinx:', error);
            throw error;
        }
    }

    /**
     * Ensure connection is active
     */
    async ensureConnection() {
        if (!this.isConnected || !this.connection) {
            await this.connect();
        }
    }

    /**
     * Search works using Sphinx with bibliographic field weighting
     * @param {string} query - Search query
     * @param {object} filters - Filters for year, work_type, language, etc.
     * @param {object} options - Pagination and sorting options
     * @returns {Promise<object>} Search results with relevance scores
     */
    async searchWorks(query, filters = {}, options = {}) {
        await this.ensureConnection();
        
        const { 
            limit = 50, 
            offset = 0, 
            orderBy = 'relevance DESC, year DESC' 
        } = options;

        try {
            const escapedQuery = query.replace(/'/g, "\\'");
            
            let matchExpression = `'${escapedQuery}'`;
            
            let sql = `
                SELECT *, 
                       WEIGHT() as relevance,
                       year,
                       work_type,
                       language,
                       peer_reviewed
                FROM works_poc 
                WHERE MATCH(${matchExpression})
            `;
            
            // Add filters
            const whereClauses = [];
            const params = [];
            
            if (filters.year) {
                whereClauses.push('year = ?');
                params.push(filters.year);
            }
            
            if (filters.work_type) {
                whereClauses.push('work_type = ?');
                params.push(filters.work_type);
            }
            
            if (filters.language && filters.language !== 'unknown') {
                whereClauses.push('language = ?');
                params.push(filters.language);
            }
            
            // open_access filter removed
            
            if (filters.peer_reviewed !== undefined) {
                whereClauses.push('peer_reviewed = ?');
                params.push(filters.peer_reviewed ? 1 : 0);
            }
            
            // Additional filters for advanced search
            if (filters.year_from) {
                whereClauses.push('year >= ?');
                params.push(parseInt(filters.year_from));
            }
            
            if (filters.year_to) {
                whereClauses.push('year <= ?');
                params.push(parseInt(filters.year_to));
            }
            
            if (filters.venue_name) {
                whereClauses.push('venue_name LIKE ?');
                params.push(`%${filters.venue_name}%`);
            }
            
            if (whereClauses.length > 0) {
                sql += ' AND ' + whereClauses.join(' AND ');
            }
            
            // Add ordering and pagination (Sphinx 2.2.11 syntax)
            if (parseInt(offset) > 0) {
                sql += ` ORDER BY ${orderBy} LIMIT ${parseInt(offset)}, ${parseInt(limit)}`;
            } else {
                sql += ` ORDER BY ${orderBy} LIMIT ${parseInt(limit)}`;
            }
            
            const startTime = Date.now();
            
            return new Promise((resolve, reject) => {
                this.connection.query(sql, params, (error, results) => {
                    const queryTime = Date.now() - startTime;
                    
                    if (error) {
                        logger.error('Sphinx search failed:', error);
                        reject(error);
                        return;
                    }
                    
                    logger.info('Sphinx search completed', {
                        query: query,
                        results: results.length,
                        queryTime: `${queryTime}ms`,
                        filters: Object.keys(filters).length
                    });
                    
                    const formattedResults = results.map(row => ({
                        id: row.id,
                        title: row.title,
                        subtitle: row.subtitle,
                        abstract: row.abstract,
                        author_string: row.author_string,
                        venue_name: row.venue_name,
                        doi: row.doi,
                        year: row.year,
                        work_type: row.work_type,
                        language: row.language,
                        peer_reviewed: Boolean(row.peer_reviewed),
                        relevance_score: row.relevance || row.weight,
                        created_ts: row.created_ts
                    }));
                    
                    resolve({
                        results: formattedResults,
                        total: results.length,
                        query_time: queryTime,
                        query: query,
                        filters: filters
                    });
                });
            });
            
        } catch (error) {
            logger.error('Sphinx search failed:', error);
            throw error;
        }
    }


    /**
     * Get faceted search results for bibliographic filtering
     * @param {string} query - Search query
     * @returns {Promise<object>} Faceted results
     */
    async getFacets(query) {
        await this.ensureConnection();
        
        try {
            const escapedQuery = query.replace(/'/g, "\\'");
            
            // Get facets using promises for parallel execution
            const yearPromise = new Promise((resolve, reject) => {
                this.connection.query(`
                    SELECT year, COUNT(*) as count 
                    FROM works_poc 
                    WHERE MATCH('${escapedQuery}') AND year > 0
                    GROUP BY year 
                    ORDER BY count DESC, year DESC 
                    LIMIT 20
                `, (error, results) => {
                    if (error) reject(error);
                    else resolve(results.map(f => ({ value: f.year, count: f.count })));
                });
            });

            const typePromise = new Promise((resolve, reject) => {
                this.connection.query(`
                    SELECT work_type, COUNT(*) as count 
                    FROM works_poc 
                    WHERE MATCH('${escapedQuery}') 
                    GROUP BY work_type 
                    ORDER BY count DESC 
                    LIMIT 10
                `, (error, results) => {
                    if (error) reject(error);
                    else resolve(results.map(f => ({ value: f.work_type, count: f.count })));
                });
            });

            const languagePromise = new Promise((resolve, reject) => {
                this.connection.query(`
                    SELECT language, COUNT(*) as count 
                    FROM works_poc 
                    WHERE MATCH('${escapedQuery}') AND language != 'unknown'
                    GROUP BY language 
                    ORDER BY count DESC 
                    LIMIT 10
                `, (error, results) => {
                    if (error) reject(error);
                    else resolve(results.map(f => ({ value: f.language, count: f.count })));
                });
            });

            // Get top venues and authors for this query
            const venuesPromise = new Promise((resolve, reject) => {
                this.connection.query(`
                    SELECT venue_name, COUNT(*) as count 
                    FROM works_poc 
                    WHERE MATCH('${escapedQuery}') AND venue_name != ''
                    GROUP BY venue_name 
                    ORDER BY count DESC 
                    LIMIT 15
                `, (error, results) => {
                    if (error) reject(error);
                    else resolve(results.map(f => ({ value: f.venue_name, count: f.count })));
                });
            });

            const authorsPromise = new Promise((resolve, reject) => {
                this.connection.query(`
                    SELECT author_string, COUNT(*) as count 
                    FROM works_poc 
                    WHERE MATCH('${escapedQuery}') AND author_string != ''
                    GROUP BY author_string 
                    ORDER BY count DESC 
                    LIMIT 10
                `, (error, results) => {
                    if (error) reject(error);
                    else resolve(results.map(f => ({ 
                        value: f.author_string.split(';')[0].trim(), // First author
                        count: f.count 
                    })));
                });
            });

            const [years, work_types, languages, venues, authors] = await Promise.all([
                yearPromise, typePromise, languagePromise, venuesPromise, authorsPromise
            ]);
            
            return { years, work_types, languages, venues, authors };
            
        } catch (error) {
            logger.error('Sphinx facets failed:', error);
            throw error;
        }
    }

    /**
     * Real-Time indexing: Insert new work into RT index
     * @param {object} workData - Work data to index
     */
    async indexWork(workData) {
        await this.ensureConnection();
        
        try {
            const sql = `
                INSERT INTO works_rt 
                (id, title, subtitle, abstract, author_string, venue_name, doi,
                 year, created_ts, work_type, language, open_access, peer_reviewed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const params = [
                workData.id,
                workData.title || '',
                workData.subtitle || '',
                workData.abstract || '',
                workData.author_string || '',
                workData.venue_name || '',
                workData.doi || '',
                workData.year || 0,
                Math.floor(Date.now() / 1000), // Unix timestamp
                workData.work_type || 'ARTICLE',
                workData.language || 'unknown',
                0, // open_access removed
                workData.peer_reviewed ? 1 : 0
            ];
            
            return new Promise((resolve, reject) => {
                this.connection.query(sql, params, (error, results) => {
                    if (error) {
                        logger.error('Sphinx query failed:', error);
                        reject(error);
                        return;
                    }
                    resolve(results);
                });
            });
            
            logger.info('Work indexed in RT index', { 
                work_id: workData.id, 
                title: workData.title?.substring(0, 50) + '...' 
            });
            
            return true;
            
        } catch (error) {
            logger.error('RT indexing failed:', error);
            throw error;
        }
    }

    /**
     * Real-Time indexing: Update existing work in RT index
     * @param {number} workId - Work ID to update
     * @param {object} updates - Fields to update
     */
    async updateWork(workId, updates) {
        await this.ensureConnection();
        
        try {
            const setParts = [];
            const params = [];
            
            // Build SET clause dynamically
            Object.entries(updates).forEach(([field, value]) => {
                setParts.push(`${field} = ?`);
                params.push(value);
            });
            
            params.push(workId);
            
            const sql = `UPDATE works_rt SET ${setParts.join(', ')} WHERE id = ?`;
            
            return new Promise((resolve, reject) => {
                this.connection.query(sql, params, (error, results) => {
                    if (error) {
                        logger.error('Sphinx query failed:', error);
                        reject(error);
                        return;
                    }
                    resolve(results);
                });
            }).then((results) => {
                logger.info('Work updated in RT index', { work_id: workId, fields: Object.keys(updates) });
                return true;
            });
            
        } catch (error) {
            logger.error('RT update failed:', error);
            throw error;
        }
    }

    /**
     * Get Sphinx status and performance metrics
     */
    async getStatus() {
        await this.ensureConnection();
        
        try {
            const statusPromise = new Promise((resolve, reject) => {
                this.connection.query('SHOW STATUS', (error, results) => {
                    if (error) reject(error);
                    else resolve(results);
                });
            });

            const variablesPromise = new Promise((resolve, reject) => {
                this.connection.query('SHOW VARIABLES', (error, results) => {
                    if (error) reject(error);
                    else resolve(results);
                });
            });

            const [status, variables] = await Promise.all([statusPromise, variablesPromise]);
            
            // Convert to object format
            const statusObj = {};
            status.forEach(row => {
                statusObj[row.Counter || row.Variable_name] = row.Value;
            });
            
            const variablesObj = {};
            variables.forEach(row => {
                variablesObj[row.Variable_name] = row.Value;
            });
            
            return {
                connected: this.isConnected,
                uptime: parseInt(statusObj.uptime) || 0,
                queries: parseInt(statusObj.queries) || 0,
                avg_query_time: parseFloat(statusObj.avg_query_wall) || 0,
                connections: parseInt(statusObj.connections) || 0,
                indexes_loaded: Object.keys(variablesObj).length,
                performance: {
                    query_wall: parseFloat(statusObj.query_wall) || 0,
                    queries_per_second: statusObj.uptime ? (statusObj.queries / statusObj.uptime).toFixed(2) : 0
                }
            };
            
        } catch (error) {
            logger.error('Sphinx status failed:', error);
            return {
                connected: false,
                error: error.message
            };
        }
    }

    /**
     * Advanced search with faceted results
     * @param {string} query - Search query
     * @param {object} filters - Search filters
     * @param {object} options - Search options
     * @returns {Promise<object>} Search results with facets
     */
    async searchWithFacets(query, filters = {}, options = {}) {
        const [searchResults, facets] = await Promise.all([
            this.searchWorks(query, filters, options),
            this.getFacets(query)
        ]);
        
        return {
            ...searchResults,
            facets,
            meta: {
                ...searchResults.meta,
                faceted_search: true,
                total_facets: Object.keys(facets).length
            }
        };
    }

    /**
     * Close connection
     */
    async close() {
        if (this.connection) {
            this.connection.end();
            this.connection = null;
            this.isConnected = false;
        }
    }
}

module.exports = new SphinxService();
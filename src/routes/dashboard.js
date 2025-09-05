/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Real-time analytics dashboard for search performance and system metrics
 */

const express = require('express');
const router = express.Router();
const sphinxMonitoring = require('../services/sphinxMonitoring.service');
const sphinxHealthCheck = require('../services/sphinxHealthCheck.service');
const autocompleteService = require('../services/autocomplete.service');
const { logger } = require('../middleware/errorHandler');

/**
 * @swagger
 * /dashboard/overview:
 *   get:
 *     summary: Get complete system overview for dashboard
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Complete dashboard overview
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
 *                     search_performance:
 *                       type: object
 *                     system_health:
 *                       type: object
 *                     recent_activity:
 *                       type: object
 */
router.get('/overview', async (req, res) => {
    try {
        const [
            sphinxMetrics,
            healthStatus,
            searchAnalytics
        ] = await Promise.all([
            sphinxMonitoring.getDetailedMetrics(),
            sphinxHealthCheck.getHealthStatus(),
            autocompleteService.getSearchAnalytics(7)
        ]);

        const overview = {
            timestamp: new Date().toISOString(),
            search_performance: {
                engine: healthStatus.searchEngine,
                queries_per_second: sphinxMetrics.metrics.queries_per_second,
                avg_response_time: sphinxMetrics.metrics.avg_response_time,
                error_rate: sphinxMetrics.metrics.error_rate,
                index_size_mb: sphinxMetrics.metrics.index_size_mb,
                performance_distribution: sphinxMetrics.performance_distribution
            },
            system_health: {
                rollback_active: healthStatus.rollbackActive,
                uptime_seconds: sphinxMetrics.metrics.uptime_seconds || 0,
                consecutive_failures: healthStatus.metrics.consecutiveFailures,
                last_successful_check: healthStatus.metrics.lastSuccessfulCheck,
                memory_usage: `${sphinxMetrics.metrics.index_size_mb}MB indexes`,
                connections: sphinxMetrics.metrics.connections || 0
            },
            recent_activity: {
                queries_last_hour: sphinxMetrics.metrics.queries_last_hour,
                queries_last_minute: sphinxMetrics.metrics.queries_last_minute,
                recent_queries: sphinxMetrics.recent_queries.slice(0, 10),
                search_analytics: Object.keys(searchAnalytics).length > 0 ? 
                    searchAnalytics : { message: 'No analytics data available' }
            },
            alerts: await router.checkSystemAlerts(sphinxMetrics, healthStatus)
        };

        res.json({
            status: 'success',
            data: overview
        });

    } catch (error) {
        logger.error('Dashboard overview failed', error);
        res.status(500).json({
            status: 'error',
            message: 'Dashboard overview failed',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /dashboard/performance:
 *   get:
 *     summary: Get detailed performance metrics for charts
 *     tags: [Dashboard]
 *     parameters:
 *       - name: hours
 *         in: query
 *         description: Number of hours of data to return
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 168
 *           default: 24
 *     responses:
 *       200:
 *         description: Performance metrics for visualization
 */
router.get('/performance', async (req, res) => {
    try {
        const hours = Math.min(parseInt(req.query.hours) || 24, 168);
        
        const detailedMetrics = sphinxMonitoring.getDetailedMetrics();
        const recentQueries = detailedMetrics.recent_queries || [];
        
        // Group queries by time buckets for charting
        const timeBuckets = router.createTimeBuckets(recentQueries, hours);
        const performanceChart = router.createPerformanceChart(timeBuckets);
        
        res.json({
            status: 'success',
            data: {
                chart_data: performanceChart,
                summary: {
                    total_queries: recentQueries.length,
                    avg_response_time: detailedMetrics.metrics.avg_response_time,
                    p95_response_time: detailedMetrics.performance_distribution?.percentiles?.p95 || 0,
                    error_count: recentQueries.filter(q => q.error).length
                },
                distribution: detailedMetrics.performance_distribution
            }
        });

    } catch (error) {
        logger.error('Dashboard performance metrics failed', error);
        res.status(500).json({
            status: 'error',
            message: 'Performance metrics failed'
        });
    }
});

/**
 * @swagger
 * /dashboard/search-trends:
 *   get:
 *     summary: Get search trends and popular queries
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Search trends analysis
 */
router.get('/search-trends', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        
        const [searchAnalytics, popularTerms] = await Promise.all([
            autocompleteService.getSearchAnalytics(days),
            autocompleteService.getPopularTerms(20)
        ]);

        // Process analytics for trending
        const trends = router.analyzeTrends(searchAnalytics, days);
        
        res.json({
            status: 'success',
            data: {
                trends,
                popular_terms: popularTerms,
                analytics_period: `${days} days`,
                generated_at: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Search trends analysis failed', error);
        res.status(500).json({
            status: 'error',
            message: 'Search trends analysis failed'
        });
    }
});

/**
 * @swagger
 * /dashboard/alerts:
 *   get:
 *     summary: Get current system alerts and warnings
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Current system alerts
 */
router.get('/alerts', async (req, res) => {
    try {
        const [sphinxMetrics, healthStatus] = await Promise.all([
            sphinxMonitoring.getMetrics(),
            sphinxHealthCheck.getHealthStatus()
        ]);

        const alerts = await router.checkSystemAlerts(sphinxMetrics, healthStatus);
        
        res.json({
            status: 'success',
            data: {
                alerts,
                alert_count: alerts.length,
                last_check: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Dashboard alerts check failed', error);
        res.status(500).json({
            status: 'error',
            message: 'Alerts check failed'
        });
    }
});

// Helper methods
router.checkSystemAlerts = async function(sphinxMetrics, healthStatus) {
    const alerts = [];
    
    // High error rate alert
    if (sphinxMetrics.error_rate > 0.05) {
        alerts.push({
            type: 'error',
            severity: 'high',
            message: `High error rate: ${(sphinxMetrics.error_rate * 100).toFixed(1)}%`,
            threshold: '5%',
            current_value: `${(sphinxMetrics.error_rate * 100).toFixed(1)}%`
        });
    }
    
    // Slow response time alert
    if (sphinxMetrics.avg_response_time > 50) {
        alerts.push({
            type: 'performance',
            severity: 'medium',
            message: `Slow average response time: ${sphinxMetrics.avg_response_time}ms`,
            threshold: '50ms',
            current_value: `${sphinxMetrics.avg_response_time}ms`
        });
    }
    
    // High query volume alert
    if (sphinxMetrics.queries_per_second > 100) {
        alerts.push({
            type: 'volume',
            severity: 'medium',
            message: `High query volume: ${sphinxMetrics.queries_per_second} QPS`,
            threshold: '100 QPS',
            current_value: `${sphinxMetrics.queries_per_second} QPS`
        });
    }
    
    // Large index size warning
    if (sphinxMetrics.index_size_mb > 1000) {
        alerts.push({
            type: 'storage',
            severity: 'low',
            message: `Large index size: ${sphinxMetrics.index_size_mb}MB`,
            threshold: '1000MB',
            current_value: `${sphinxMetrics.index_size_mb}MB`
        });
    }
    
    // Rollback active alert
    if (healthStatus.rollbackActive) {
        alerts.push({
            type: 'system',
            severity: 'high',
            message: 'Search engine rollback is active - using MariaDB fallback',
            threshold: 'No rollback',
            current_value: 'Rollback active'
        });
    }
    
    return alerts;
};

router.createTimeBuckets = function(queries, hours) {
    const buckets = {};
    const now = Date.now();
    const bucketSizeMs = (hours * 60 * 60 * 1000) / 50; // 50 data points
    
    queries.forEach(query => {
        const queryTime = new Date(query.timestamp).getTime();
        const bucketKey = Math.floor((now - queryTime) / bucketSizeMs);
        
        if (!buckets[bucketKey]) {
            buckets[bucketKey] = {
                timestamp: now - (bucketKey * bucketSizeMs),
                queries: [],
                total_time: 0,
                error_count: 0
            };
        }
        
        buckets[bucketKey].queries.push(query);
        buckets[bucketKey].total_time += query.responseTime;
        if (query.error) buckets[bucketKey].error_count++;
    });
    
    return Object.values(buckets);
};

router.createPerformanceChart = function(timeBuckets) {
    return timeBuckets.map(bucket => ({
        timestamp: new Date(bucket.timestamp).toISOString(),
        query_count: bucket.queries.length,
        avg_response_time: bucket.queries.length > 0 ? 
            bucket.total_time / bucket.queries.length : 0,
        error_count: bucket.error_count,
        error_rate: bucket.queries.length > 0 ? 
            bucket.error_count / bucket.queries.length : 0
    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

router.analyzeTrends = function(searchAnalytics, days) {
    const dates = Object.keys(searchAnalytics).sort();
    if (dates.length < 2) return { message: 'Insufficient data for trend analysis' };
    
    const trends = {
        search_volume: router.calculateTrend(dates.map(d => searchAnalytics[d].total_searches)),
        unique_queries: router.calculateTrend(dates.map(d => searchAnalytics[d].unique_queries)),
        avg_results: router.calculateTrend(dates.map(d => searchAnalytics[d].avg_results)),
        daily_data: dates.map(date => ({
            date,
            ...searchAnalytics[date]
        }))
    };
    
    return trends;
};

router.calculateTrend = function(values) {
    if (values.length < 2) return { trend: 'insufficient_data' };
    
    const recent = values.slice(-3).reduce((sum, v) => sum + v, 0) / 3;
    const older = values.slice(0, 3).reduce((sum, v) => sum + v, 0) / 3;
    
    const change = ((recent - older) / older) * 100;
    
    return {
        trend: change > 10 ? 'increasing' : change < -10 ? 'decreasing' : 'stable',
        change_percent: Math.round(change * 100) / 100,
        recent_average: Math.round(recent * 100) / 100,
        historical_average: Math.round(older * 100) / 100
    };
};

module.exports = router;
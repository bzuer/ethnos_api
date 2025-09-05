const express = require('express');
const router = express.Router();
const { getViolationStats, getBlockedIPs, unblockIP } = require('../middleware/rateLimiting');
const { logger } = require('../middleware/errorHandler');

/**
 * @swagger
 * /security/stats:
 *   get:
 *     summary: Get security monitoring statistics
 *     description: Returns rate limiting violations, blocked IPs, and security metrics
 *     tags: [Security]
 *     responses:
 *       200:
 *         description: Security statistics
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
 *                     violations:
 *                       type: object
 *                       description: IP addresses with recent violations
 *                     blocked_ips:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Currently blocked IP addresses
 *                     stats:
 *                       type: object
 *                       properties:
 *                         total_blocked:
 *                           type: number
 *                         total_violations:
 *                           type: number
 */
router.get('/stats', (req, res) => {
  try {
    const violations = getViolationStats();
    const blockedIPs = getBlockedIPs();
    
    res.json({
      status: 'success',
      data: {
        violations,
        blocked_ips: blockedIPs,
        stats: {
          total_blocked: blockedIPs.length,
          total_violations: Object.keys(violations).length
        }
      }
    });
  } catch (error) {
    logger.error('Error getting security stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve security statistics',
      code: 'SECURITY_STATS_ERROR'
    });
  }
});

/**
 * @swagger
 * /security/unblock/{ip}:
 *   post:
 *     summary: Unblock an IP address (admin function)
 *     description: Remove an IP from the blocked list
 *     tags: [Security]
 *     parameters:
 *       - in: path
 *         name: ip
 *         required: true
 *         schema:
 *           type: string
 *         description: IP address to unblock
 *     responses:
 *       200:
 *         description: IP unblocked successfully
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
 *                   example: IP unblocked successfully
 *       400:
 *         description: Invalid IP format
 *       404:
 *         description: IP not found in blocked list
 */
router.post('/unblock/:ip', (req, res) => {
  try {
    const { ip } = req.params;
    
    // Basic IP validation
    const ipPattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipPattern.test(ip)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid IP address format',
        code: 'INVALID_IP'
      });
    }
    
    const blockedIPs = getBlockedIPs();
    if (!blockedIPs.includes(ip)) {
      return res.status(404).json({
        status: 'error',
        message: 'IP address not found in blocked list',
        code: 'IP_NOT_BLOCKED'
      });
    }
    
    unblockIP(ip);
    
    logger.info('IP unblocked via API', { 
      ip, 
      requestor_ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      status: 'success',
      message: 'IP unblocked successfully',
      data: { unblocked_ip: ip }
    });
    
  } catch (error) {
    logger.error('Error unblocking IP:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to unblock IP address',
      code: 'UNBLOCK_ERROR'
    });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const EarningsService = require('../services/EarningsService');
const Earnings = require('../models/Earnings');
const { auth, requireRole } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');

/**
 * @route    GET /api/earnings/dashboard
 * @desc     Get rider's earnings dashboard
 * @access   Private (Rider only)
 */
router.get('/dashboard', auth, requireRole('rider'), cacheMiddleware.earnings, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    const dashboard = await EarningsService.getRiderEarningsDashboard(req.user.id, { period });
    
    res.json(dashboard);
  } catch (error) {
    console.error('Error fetching earnings dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching earnings dashboard',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    GET /api/earnings/summary
 * @desc     Get rider's earnings summary
 * @access   Private (Rider only)
 */
router.get('/summary', auth, requireRole('rider'), cacheMiddleware.earnings, async (req, res) => {
  try {
    const { period, startDate, endDate, paymentStatus } = req.query;
    
    let earningsSummary;
    
    if (period) {
      earningsSummary = await Earnings.getEarningsForPeriod(req.user.id, period);
    } else {
      earningsSummary = await Earnings.getRiderEarningsSummary(req.user.id, { 
        startDate, 
        endDate, 
        paymentStatus 
      });
    }
    
    res.json({
      success: true,
      ...earningsSummary
    });
  } catch (error) {
    console.error('Error fetching earnings summary:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching earnings summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    GET /api/earnings/history
 * @desc     Get rider's earnings history with pagination
 * @access   Private (Rider only)
 */
router.get('/history', auth, requireRole('rider'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      paymentStatus,
      startDate,
      endDate,
      sortBy = 'earnedAt',
      sortOrder = 'desc'
    } = req.query;
    
    const history = await EarningsService.getEarningsHistory(req.user.id, {
      page,
      limit,
      paymentStatus,
      startDate,
      endDate,
      sortBy,
      sortOrder
    });
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching earnings history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching earnings history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    GET /api/earnings/:id
 * @desc     Get specific earnings record
 * @access   Private (Rider only)
 */
router.get('/:id', auth, requireRole('rider'), async (req, res) => {
  try {
    const earnings = await Earnings.findOne({
      _id: req.params.id,
      rider: req.user.id
    })
      .populate('offer', 'title pickup delivery estimatedDistance estimatedDuration')
      .populate('payment', 'status processedAt paymentMethod transactionId');
    
    if (!earnings) {
      return res.status(404).json({
        success: false,
        message: 'Earnings record not found'
      });
    }
    
    res.json({
      success: true,
      earnings: earnings.getFormattedData()
    });
  } catch (error) {
    console.error('Error fetching earnings record:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching earnings record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    POST /api/earnings/generate/:offerId
 * @desc     Generate earnings for completed offer
 * @access   Private (Rider only)
 */
router.post('/generate/:offerId', auth, requireRole('rider'), async (req, res) => {
  try {
    const result = await EarningsService.generateEarningsFromOffer(req.params.offerId);
    
    // Verify the rider is the one assigned to this offer
    if (result.earnings && result.earnings.rider !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this offer'
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error generating earnings:', error);
    
    if (error.message.includes('not found') || error.message.includes('must be')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error generating earnings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    GET /api/earnings/comparison/:period
 * @desc     Get earnings comparison with platform averages
 * @access   Private (Rider only)
 */
router.get('/comparison/:period', auth, requireRole('rider'), async (req, res) => {
  try {
    const { period } = req.params;
    
    if (!['day', 'week', 'month', 'year'].includes(period)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid period. Must be one of: day, week, month, year'
      });
    }
    
    const comparison = await EarningsService.getEarningsComparison(req.user.id, period);
    
    res.json(comparison);
  } catch (error) {
    console.error('Error fetching earnings comparison:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching earnings comparison',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    GET /api/earnings/performance/:period
 * @desc     Get rider's performance statistics
 * @access   Private (Rider only)
 */
router.get('/performance/:period', auth, requireRole('rider'), async (req, res) => {
  try {
    const { period } = req.params;
    
    if (!['day', 'week', 'month', 'year'].includes(period)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid period. Must be one of: day, week, month, year'
      });
    }
    
    // Get earnings for the period
    const earningsSummary = await Earnings.getEarningsForPeriod(req.user.id, period);
    
    // Get rider's profile for additional metrics
    const User = require('../models/User');
    const rider = await User.findById(req.user.id).select('profile.rating profile.completedDeliveries');
    
    // Calculate performance metrics
    const performance = {
      rating: rider.profile?.rating || 0,
      completedDeliveries: rider.profile?.completedDeliveries || 0,
      earningsPerHour: earningsSummary.summary.averagePerHour || 0,
      earningsPerKm: earningsSummary.summary.averagePerKm || 0,
      totalEarnings: earningsSummary.summary.totalFinal || 0,
      deliveriesCompleted: earningsSummary.summary.totalDeliveries || 0,
      totalDistance: earningsSummary.summary.totalDistance || 0,
      totalDuration: earningsSummary.summary.totalDuration || 0
    };
    
    // Calculate efficiency score
    const efficiencyScore = calculateEfficiencyScore(performance);
    
    res.json({
      success: true,
      period,
      performance: {
        ...performance,
        efficiencyScore
      },
      dailyStats: earningsSummary.dailyEarnings
    });
  } catch (error) {
    console.error('Error fetching performance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching performance statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    GET /api/earnings/pending
 * @desc     Get rider's pending earnings
 * @access   Private (Rider only)
 */
router.get('/pending', auth, requireRole('rider'), async (req, res) => {
  try {
    const pendingEarnings = await Earnings.find({
      rider: req.user.id,
      paymentStatus: { $in: ['pending', 'processing'] }
    })
      .populate('offer', 'title pickup delivery')
      .sort({ earnedAt: -1 })
      .lean();
    
    const formattedEarnings = pendingEarnings.map(earning => ({
      id: earning._id,
      finalAmount: earning.netAmount + (earning.bonusAmount || 0),
      paymentStatus: earning.paymentStatus,
      earnedAt: earning.earnedAt,
      offer: earning.offer,
      distance: earning.distance,
      duration: earning.duration
    }));
    
    const totalPending = formattedEarnings.reduce((sum, earning) => sum + earning.finalAmount, 0);
    
    res.json({
      success: true,
      pendingEarnings: formattedEarnings,
      totalPending,
      count: formattedEarnings.length
    });
  } catch (error) {
    console.error('Error fetching pending earnings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching pending earnings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Admin routes (for platform management)

/**
 * @route    POST /api/earnings/:id/bonus
 * @desc     Add bonus to earnings record (Admin only)
 * @access   Private (Admin only)
 */
router.post('/:id/bonus', [
  auth,
  requireRole('admin'),
  check('amount', 'Bonus amount is required and must be positive').isFloat({ min: 0.01 }),
  check('reason', 'Reason is required').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  try {
    const { amount, reason } = req.body;
    
    const result = await EarningsService.addBonus(req.params.id, amount, reason, req.user.id);
    
    res.json(result);
  } catch (error) {
    console.error('Error adding bonus:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error adding bonus',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    POST /api/earnings/:id/adjustment
 * @desc     Add adjustment to earnings record (Admin only)
 * @access   Private (Admin only)
 */
router.post('/:id/adjustment', [
  auth,
  requireRole('admin'),
  check('amount', 'Adjustment amount is required').isNumeric(),
  check('reason', 'Reason is required').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  try {
    const { amount, reason } = req.body;
    
    const adjustment = {
      amount: parseFloat(amount),
      reason,
      appliedBy: req.user.id
    };
    
    const result = await EarningsService.addAdjustment(req.params.id, adjustment);
    
    res.json(result);
  } catch (error) {
    console.error('Error adding adjustment:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error adding adjustment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    PUT /api/earnings/:id/payment-status
 * @desc     Update payment status (Admin only)
 * @access   Private (Admin only)
 */
router.put('/:id/payment-status', [
  auth,
  requireRole('admin'),
  check('status', 'Valid payment status is required').isIn(['pending', 'processing', 'paid', 'failed'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  try {
    const { status } = req.body;
    
    const result = await EarningsService.updatePaymentStatus(req.params.id, status);
    
    res.json(result);
  } catch (error) {
    console.error('Error updating payment status:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error updating payment status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Helper function to calculate efficiency score
 * @param {Object} performance - Performance metrics
 * @returns {Number} - Efficiency score (0-100)
 */
function calculateEfficiencyScore(performance) {
  const {
    rating,
    earningsPerHour,
    earningsPerKm,
    completedDeliveries
  } = performance;
  
  // Weight factors
  const weights = {
    rating: 0.3,
    earningsPerHour: 0.3,
    earningsPerKm: 0.2,
    experience: 0.2
  };
  
  // Normalize values
  const normalizedRating = Math.min(rating / 5, 1); // 0-5 scale
  const normalizedEarningsPerHour = Math.min(earningsPerHour / 30, 1); // Assuming $30/hr is excellent
  const normalizedEarningsPerKm = Math.min(earningsPerKm / 2, 1); // Assuming $2/km is excellent
  
  // Experience factor (based on completed deliveries)
  const experienceFactor = Math.min(completedDeliveries / 100, 1); // 100+ deliveries is excellent
  
  // Calculate weighted score
  const score =
    (normalizedRating * weights.rating) +
    (normalizedEarningsPerHour * weights.earningsPerHour) +
    (normalizedEarningsPerKm * weights.earningsPerKm) +
    (experienceFactor * weights.experience);
  
  // Convert to 0-100 scale
  return Math.round(score * 100);
}

module.exports = router;
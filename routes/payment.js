const express = require('express');
const router = express.Router();
const PaymentService = require('../services/PaymentService');
const EarningsService = require('../services/EarningsService');
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');

// Initialize services
const paymentService = new PaymentService();
const earningsService = new EarningsService();

/**
 * @route POST /api/payments/process
 * @desc Process payment for a completed delivery
 * @access Private (Business only)
 */
router.post('/process', auth, async (req, res) => {
  try {
    // Verify user is business owner
    if (req.user.role !== 'business') {
      return res.status(403).json({
        success: false,
        message: 'Only business owners can process payments'
      });
    }

    const {
      offerId,
      paymentMethod,
      paymentMethodDetails
    } = req.body;

    // Validate required fields
    if (!offerId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Offer ID and payment method are required'
      });
    }

    // Process payment
    const payment = await paymentService.processPayment(offerId, {
      paymentMethod,
      paymentMethodDetails,
      currency: req.body.currency || 'USD',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      source: 'web'
    });

    res.status(201).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        payment: payment.getDetails()
      }
    });
  } catch (error) {
    console.error('Payment processing error:', error);
    
    if (error.message.includes('not found') || error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Payment processing failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/payments/:paymentId/retry
 * @desc Retry a failed payment
 * @access Private (Business only)
 */
router.post('/:paymentId/retry', auth, async (req, res) => {
  try {
    // Verify user is business owner
    if (req.user.role !== 'business') {
      return res.status(403).json({
        success: false,
        message: 'Only business owners can retry payments'
      });
    }

    const { paymentId } = req.params;

    // Verify payment belongs to user
    const existingPayment = await Payment.findById(paymentId);
    if (!existingPayment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (existingPayment.business.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Retry payment
    const payment = await paymentService.retryPayment(paymentId);

    res.json({
      success: true,
      message: 'Payment retry initiated',
      data: {
        payment: payment.getDetails()
      }
    });
  } catch (error) {
    console.error('Payment retry error:', error);
    
    if (error.message.includes('not found') || error.message.includes('cannot be retried')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Payment retry failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/payments/:paymentId/refund
 * @desc Process refund for a payment
 * @access Private (Business only)
 */
router.post('/:paymentId/refund', auth, async (req, res) => {
  try {
    // Verify user is business owner
    if (req.user.role !== 'business') {
      return res.status(403).json({
        success: false,
        message: 'Only business owners can process refunds'
      });
    }

    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    // Validate required fields
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Refund reason is required'
      });
    }

    // Verify payment belongs to user
    const existingPayment = await Payment.findById(paymentId);
    if (!existingPayment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (existingPayment.business.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Process refund
    const payment = await paymentService.refundPayment(paymentId, amount, reason);

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        payment: payment.getDetails()
      }
    });
  } catch (error) {
    console.error('Refund processing error:', error);
    
    if (error.message.includes('not found') || error.message.includes('Can only refund')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Refund processing failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/payments/history
 * @desc Get payment history for the authenticated user
 * @access Private
 */
router.get('/history', auth, async (req, res) => {
  try {
    const {
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      status,
      startDate,
      endDate,
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const result = await paymentService.getPaymentHistory(
      req.user.id,
      req.user.role,
      filters
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/payments/stats
 * @desc Get payment statistics for the authenticated user
 * @access Private
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await paymentService.getPaymentStats(req.user.id, req.user.role);

    res.json({
      success: true,
      data: {
        stats
      }
    });
  } catch (error) {
    console.error('Payment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/payments/:paymentId
 * @desc Get payment details
 * @access Private
 */
router.get('/:paymentId', auth, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId)
      .populate('offer', 'title packageDetails pickup delivery')
      .populate('business', 'businessName email')
      .populate('rider', 'name email profile.phone');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Verify user has access to this payment
    const userId = req.user.id;
    if (payment.business._id.toString() !== userId && payment.rider._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: {
        payment: payment.getDetails()
      }
    });
  } catch (error) {
    console.error('Payment details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/payments/calculate-fees
 * @desc Calculate fees for a payment amount
 * @access Private
 */
router.post('/calculate-fees', auth, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment amount is required'
      });
    }

    const feeBreakdown = paymentService.calculateFees(amount);

    res.json({
      success: true,
      data: {
        feeBreakdown
      }
    });
  } catch (error) {
    console.error('Fee calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate fees',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/payments/rider/earnings
 * @desc Get comprehensive rider earnings summary
 * @access Private (Rider only)
 */
router.get('/rider/earnings', auth, async (req, res) => {
  try {
    // Verify user is rider
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        success: false,
        message: 'Only riders can access earnings data'
      });
    }

    const { currency } = req.query;
    const earningsSummary = await earningsService.getRiderEarningsSummary(req.user.id, { currency });

    res.json({
      success: true,
      data: earningsSummary
    });
  } catch (error) {
    console.error('Rider earnings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve earnings data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/payments/rider/earnings/history
 * @desc Get detailed rider earnings history
 * @access Private (Rider only)
 */
router.get('/rider/earnings/history', auth, async (req, res) => {
  try {
    // Verify user is rider
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        success: false,
        message: 'Only riders can access earnings data'
      });
    }

    const {
      startDate,
      endDate,
      status,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filters = {
      startDate,
      endDate,
      status,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    };

    const earningsHistory = await earningsService.getRiderEarningsHistory(req.user.id, filters);

    res.json({
      success: true,
      data: earningsHistory
    });
  } catch (error) {
    console.error('Rider earnings history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve earnings history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/payments/rider/earnings/breakdown
 * @desc Get rider earnings breakdown by time period
 * @access Private (Rider only)
 */
router.get('/rider/earnings/breakdown', auth, async (req, res) => {
  try {
    // Verify user is rider
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        success: false,
        message: 'Only riders can access earnings data'
      });
    }

    const {
      period = 'monthly',
      startDate,
      endDate,
      limit = 12
    } = req.query;

    const options = {
      startDate,
      endDate,
      limit: parseInt(limit)
    };

    const breakdown = await earningsService.getEarningsBreakdown(req.user.id, period, options);

    res.json({
      success: true,
      data: {
        period,
        breakdown
      }
    });
  } catch (error) {
    console.error('Rider earnings breakdown error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve earnings breakdown',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/payments/rider/performance
 * @desc Get rider performance metrics
 * @access Private (Rider only)
 */
router.get('/rider/performance', auth, async (req, res) => {
  try {
    // Verify user is rider
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        success: false,
        message: 'Only riders can access performance data'
      });
    }

    const performanceMetrics = await earningsService.getRiderPerformanceMetrics(req.user.id);

    res.json({
      success: true,
      data: performanceMetrics
    });
  } catch (error) {
    console.error('Rider performance metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve performance metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
const PaymentService = require('../services/PaymentService');

describe('PaymentService Simple', () => {
  test('should initialize PaymentService', () => {
    const service = new PaymentService();
    expect(service).toBeDefined();
    expect(service.options.defaultCurrency).toBe('USD');
  });

  test('should calculate fees correctly', () => {
    const service = new PaymentService();
    const result = service.calculateFees(100);
    expect(result.totalAmount).toBe(100);
    expect(result.platformFee).toBeGreaterThan(0);
    expect(result.riderEarnings).toBeLessThan(100);
  });
});
const express = require('express');
const router = express.Router();
const {
  getCustomerReferralStats,
  createReferralPayout,
  getReferralPayouts,
  updateReferralPayout,
  deleteReferralPayout,
} = require('../controllers/referralPayoutController');
const { protect, admin } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/customer-stats/:leadId', admin, getCustomerReferralStats);
router.route('/')
  .get(getReferralPayouts)
  .post(admin, createReferralPayout);

router.route('/:id')
  .put(admin, updateReferralPayout)
  .delete(admin, deleteReferralPayout);

module.exports = router;

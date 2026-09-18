const express = require('express');
const router = express.Router();
const { createLead, getLeads, updateLead, deleteLead, logPhoneView, createPublicReferral, handleGoogleFormWebhook } = require('../controllers/leadController');
const { verifyWebhook, receiveWebhook } = require('../controllers/fbController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public Route
router.post('/public-referral', createPublicReferral);
router.post('/google-form-webhook', handleGoogleFormWebhook);

// Facebook Webhook Routes (Public)
router.get('/facebook/webhook', verifyWebhook);
router.post('/facebook/webhook', receiveWebhook);

router.route('/')
  .post(protect, createLead)
  .get(protect, getLeads);

router.route('/:id')
  .patch(protect, updateLead)
  .delete(protect, admin, deleteLead);

router.post('/:id/log-view-phone', protect, logPhoneView);

module.exports = router;

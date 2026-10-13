const express = require('express');
const router = express.Router();
const { createInvoice, getInvoices, deleteInvoice, updateInvoice, getNextInvoiceNo } = require('../controllers/invoiceController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/next-number', protect, getNextInvoiceNo);
router.route('/').get(protect, getInvoices).post(protect, createInvoice);
router.route('/:id')
  .delete(protect, admin, deleteInvoice)
  .put(protect, admin, updateInvoice);

module.exports = router;


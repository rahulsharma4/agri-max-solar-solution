const express = require('express');
const router = express.Router();
const {
  createInvoice,
  getInvoices,
  deleteInvoice,
  updateInvoice,
  getNextInvoiceNo,
  getInvoiceDeclaration,
  updateInvoiceDeclaration,
} = require('../controllers/invoiceController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/next-number', protect, getNextInvoiceNo);
router.route('/declaration')
  .get(protect, getInvoiceAccess, getInvoiceDeclaration)
  .put(protect, getInvoiceAccess, updateInvoiceDeclaration);
router.route('/').get(protect, getInvoices).post(protect, createInvoice);
router.route('/:id')
  .delete(protect, admin, deleteInvoice)
  .put(protect, admin, updateInvoice);

module.exports = router;

function getInvoiceAccess(req, res, next) {
  if (req.user && ['admin', 'staff'].includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({ message: 'Not authorized to access invoices' });
}

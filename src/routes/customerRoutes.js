const express = require('express');
const router = express.Router();
const {
  getMyData,
  addCustomerLead,
  createCustomerAccount,
  getCustomerList,
  updateCustomerSecurity,
  deleteCustomerAccount
} = require('../controllers/customerController');
const { protect, admin } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/my-data', getMyData);
router.post('/add-lead', addCustomerLead);
router.put('/update-security', updateCustomerSecurity);
router.post('/create-account', admin, createCustomerAccount);
router.delete('/delete-account/:leadId', admin, deleteCustomerAccount);
router.get('/list', getCustomerList);

module.exports = router;

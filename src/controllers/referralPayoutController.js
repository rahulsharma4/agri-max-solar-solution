const ReferralPayout = require('../models/referralPayoutModel');
const Lead = require('../models/leadModel');
const Quotation = require('../models/quotationModel');
const Payment = require('../models/paymentModel');

// @desc    Get stats & summary for a customer for Referral Payout calculation
// @route   GET /api/referral-payouts/customer-stats/:leadId
// @access  Private (Admin/Staff)
const getCustomerReferralStats = async (req, res) => {
  try {
    const { leadId } = req.params;
    const customer = await Lead.findById(leadId);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Fetch latest quotation for system capacity & value
    const quotation = await Quotation.findOne({ lead: leadId }).sort({ createdAt: -1 });
    
    // Fetch total payments received
    const payments = await Payment.find({ leadId });
    const totalPaymentReceived = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalQuotationValue = quotation ? (quotation.netPrice || quotation.netEffectivePrice || 0) : 0;
    const kwCapacity = quotation ? (quotation.systemSize || customer.solarCapacity || 'N/A') : (customer.solarCapacity || 'N/A');
    const pendingAmount = Math.max(0, totalQuotationValue - totalPaymentReceived);

    // Fetch leads referred by this customer
    const referredLeads = await Lead.find({ 
      $or: [
        { referredByCustomer: leadId },
        { referrerDetails: { $regex: customer.name, $options: 'i' } }
      ]
    }).select('name phone leadId status createdAt solarCapacity');

    // Fetch existing payout total
    const existingPayouts = await ReferralPayout.find({ customer: leadId });
    const totalPayoutsGiven = existingPayouts.reduce((sum, p) => sum + (p.payoutAmount || 0), 0);

    res.json({
      customer: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        leadId: customer.leadId,
      },
      kwCapacity,
      totalQuotationValue,
      totalPaymentReceived,
      pendingAmount,
      totalPayoutsGiven,
      referredLeads,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new referral payout
// @route   POST /api/referral-payouts
// @access  Private/Admin
const createReferralPayout = async (req, res) => {
  try {
    const {
      customer,
      referredLead,
      referralName,
      payoutAmount,
      kwCapacity,
      totalQuotationValue,
      totalPaymentReceived,
      pendingAmount,
      payoutDate,
      status,
      paymentMode,
      transactionRef,
      remarks,
    } = req.body;

    if (!customer || !payoutAmount || !referralName) {
      return res.status(400).json({ message: 'Customer, Referral Name and Payout Amount are required' });
    }

    const adminOwner = req.user.role === 'admin' ? req.user._id : req.user.owner;

    const payout = new ReferralPayout({
      customer,
      referredLead: referredLead || null,
      referralName,
      payoutAmount: Number(payoutAmount),
      kwCapacity: kwCapacity || '',
      totalQuotationValue: Number(totalQuotationValue || 0),
      totalPaymentReceived: Number(totalPaymentReceived || 0),
      pendingAmount: Number(pendingAmount || 0),
      payoutDate: payoutDate || Date.now(),
      status: status || 'Paid',
      paymentMode: paymentMode || 'Bank Transfer',
      transactionRef: transactionRef || '',
      remarks: remarks || '',
      createdBy: req.user._id,
      owner: adminOwner,
    });

    const createdPayout = await payout.save();
    const populatedPayout = await ReferralPayout.findById(createdPayout._id)
      .populate('customer', 'name phone leadId email')
      .populate('referredLead', 'name phone leadId');

    res.status(201).json(populatedPayout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all referral payouts
// @route   GET /api/referral-payouts
// @access  Private
const getReferralPayouts = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'customer') {
      if (!req.user.lead) {
        return res.json([]);
      }
      query = { customer: req.user.lead };
    } else {
      const adminOwner = req.user.role === 'admin' ? req.user._id : req.user.owner;
      query = { owner: adminOwner };
    }

    const payouts = await ReferralPayout.find(query)
      .populate('customer', 'name phone leadId email')
      .populate('referredLead', 'name phone leadId status')
      .sort({ createdAt: -1 });

    res.json(payouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update referral payout
// @route   PUT /api/referral-payouts/:id
// @access  Private/Admin
const updateReferralPayout = async (req, res) => {
  try {
    const payout = await ReferralPayout.findById(req.params.id);

    if (!payout) {
      return res.status(404).json({ message: 'Payout record not found' });
    }

    const {
      referralName,
      payoutAmount,
      status,
      paymentMode,
      transactionRef,
      remarks,
      payoutDate,
    } = req.body;

    if (referralName !== undefined) payout.referralName = referralName;
    if (payoutAmount !== undefined) payout.payoutAmount = Number(payoutAmount);
    if (status !== undefined) payout.status = status;
    if (paymentMode !== undefined) payout.paymentMode = paymentMode;
    if (transactionRef !== undefined) payout.transactionRef = transactionRef;
    if (remarks !== undefined) payout.remarks = remarks;
    if (payoutDate !== undefined) payout.payoutDate = payoutDate;

    const updatedPayout = await payout.save();
    const populatedPayout = await ReferralPayout.findById(updatedPayout._id)
      .populate('customer', 'name phone leadId email')
      .populate('referredLead', 'name phone leadId');

    res.json(populatedPayout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete referral payout
// @route   DELETE /api/referral-payouts/:id
// @access  Private/Admin
const deleteReferralPayout = async (req, res) => {
  try {
    const payout = await ReferralPayout.findById(req.params.id);

    if (!payout) {
      return res.status(404).json({ message: 'Payout record not found' });
    }

    await payout.deleteOne();
    res.json({ message: 'Referral payout removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCustomerReferralStats,
  createReferralPayout,
  getReferralPayouts,
  updateReferralPayout,
  deleteReferralPayout,
};

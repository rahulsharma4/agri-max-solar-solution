const User = require('../models/userModel');
const Lead = require('../models/leadModel');
const Quotation = require('../models/quotationModel');
const Payment = require('../models/paymentModel');
const Invoice = require('../models/invoiceModel');
const ReferralPayout = require('../models/referralPayoutModel');
const Notification = require('../models/notificationModel');

// @desc    Get complete data for logged in customer
// @route   GET /api/customer/my-data
// @access  Private (Customer only)
const getMyData = async (req, res) => {
  try {
    if (req.user.role !== 'customer' || !req.user.lead) {
      return res.status(403).json({ message: 'Access denied. Account is not linked to a customer profile.' });
    }

    const leadId = req.user.lead;
    const customerLead = await Lead.findById(leadId)
      .populate('assignedTo', 'name email phone');

    if (!customerLead) {
      return res.status(404).json({ message: 'Customer record not found' });
    }

    const quotations = await Quotation.find({ lead: leadId }).sort({ createdAt: -1 });
    const payments = await Payment.find({ leadId: leadId }).sort({ createdAt: -1 });
    const invoices = await Invoice.find({ lead: leadId }).sort({ createdAt: -1 });
    const referralPayouts = await ReferralPayout.find({ customer: leadId })
      .populate('referredLead', 'name phone leadId status')
      .sort({ createdAt: -1 });

    const referredLeads = await Lead.find({
      $or: [
        { referredByCustomer: leadId },
        { referrerDetails: { $regex: customerLead.name, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 });

    // Summary calculations
    const latestQuotation = quotations.length > 0 ? quotations[0] : null;
    const totalQuotationValue = latestQuotation ? (latestQuotation.netPrice || latestQuotation.netEffectivePrice || 0) : 0;
    const totalPaymentsReceived = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const pendingBalance = Math.max(0, totalQuotationValue - totalPaymentsReceived);
    const totalPayoutsEarned = referralPayouts.reduce((sum, p) => sum + (p.payoutAmount || 0), 0);

    res.json({
      customer: customerLead,
      quotations,
      payments,
      invoices,
      referralPayouts,
      referredLeads,
      summary: {
        systemSize: latestQuotation ? latestQuotation.systemSize : (customerLead.solarCapacity || 'N/A'),
        totalQuotationValue,
        totalPaymentsReceived,
        pendingBalance,
        totalPayoutsEarned,
        referredCount: referredLeads.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Customer submits a new lead (Refer a Friend)
// @route   POST /api/customer/add-lead
// @access  Private (Customer)
const addCustomerLead = async (req, res) => {
  try {
    if (req.user.role !== 'customer' || !req.user.lead) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const customerLead = await Lead.findById(req.user.lead);
    if (!customerLead) {
      return res.status(404).json({ message: 'Customer record not found' });
    }

    const { name, phone, email, address, monthlyBill, solarCapacity, remarks } = req.body;

    if (!name || !phone || !address) {
      return res.status(400).json({ message: 'Name, phone, and address are required' });
    }

    const adminOwner = req.user.owner || customerLead.owner;

    const newLead = new Lead({
      name,
      phone,
      email: email || '',
      address,
      monthlyBill: monthlyBill || 'Below 1800 rs',
      solarCapacity: solarCapacity || '',
      technicalRemarks: remarks || '',
      source: 'Existing Customer Referral',
      referredByCustomer: customerLead._id,
      referrerDetails: `${customerLead.name} (${customerLead.phone})`,
      createdBy: req.user._id,
      owner: adminOwner,
      status: 'Open(Not Assigned Yet)'
    });

    await newLead.save();

    // Create notification for admin
    await Notification.create({
      recipient: adminOwner,
      title: '🎁 New Customer Referral Received',
      message: `${customerLead.name} referred a new lead: ${name} (${phone})`,
      link: `/dashboard/leads`
    });

    res.status(201).json({
      message: 'Referral lead submitted successfully! Our team will contact them shortly.',
      lead: newLead
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin creates or updates Customer login credentials
// @route   POST /api/customer/create-account
// @access  Private (Admin)
const createCustomerAccount = async (req, res) => {
  try {
    const { leadId, email, password, name, phone } = req.body;

    if (!leadId || !email || !password) {
      return res.status(400).json({ message: 'Lead ID, Email, and Password are required' });
    }

    const targetLead = await Lead.findById(leadId);
    if (!targetLead) {
      return res.status(404).json({ message: 'Lead / Customer not found' });
    }

    const cleanEmail = email.toString().trim().toLowerCase();
    const cleanPassword = password.toString().trim();

    // Check if user account already exists for this lead or email
    let user = await User.findOne({ 
      $or: [
        { email: cleanEmail },
        { lead: leadId }
      ]
    });

    if (user) {
      // Update existing customer credentials
      user.email = cleanEmail;
      user.password = cleanPassword;
      user.role = 'customer';
      user.lead = leadId;
      user.status = 'active';
      user.isDeleted = false;
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();

      return res.json({
        message: 'Customer login credentials updated successfully!',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          lead: user.lead
        }
      });
    }

    // Create new user account
    user = new User({
      name: name || targetLead.name,
      email: cleanEmail,
      phone: phone || targetLead.phone || '0000000000',
      password: cleanPassword,
      role: 'customer',
      lead: leadId,
      owner: req.user._id,
      status: 'active'
    });

    await user.save();

    res.status(201).json({
      message: 'Customer Portal account created successfully!',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lead: user.lead
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'This email is already registered to another user account.' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get list of all customer leads (for selection in admin dropdowns)
// @route   GET /api/customer/list
// @access  Private (Admin/Staff)
const getCustomerList = async (req, res) => {
  try {
    const adminOwner = req.user.role === 'admin' ? req.user._id : req.user.owner;
    
    // Fetch all leads
    const leads = await Lead.find({ owner: adminOwner })
      .select('name phone email leadId status solarCapacity')
      .sort({ name: 1 });

    // Also fetch associated user credentials status for each lead
    const customerUsers = await User.find({ role: 'customer', owner: adminOwner }).select('lead email');
    const customerUserMap = {};
    customerUsers.forEach(u => {
      if (u.lead) customerUserMap[u.lead.toString()] = u.email;
    });

    const formattedList = leads.map(l => ({
      _id: l._id,
      name: l.name,
      phone: l.phone,
      email: l.email,
      leadId: l.leadId,
      status: l.status,
      solarCapacity: l.solarCapacity,
      hasLogin: !!customerUserMap[l._id.toString()],
      portalEmail: customerUserMap[l._id.toString()] || ''
    }));

    res.json(formattedList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Customer updates their own email and password
// @route   PUT /api/customer/update-security
// @access  Private (Customer)
const updateCustomerSecurity = async (req, res) => {
  try {
    const { email, currentPassword, newPassword, alternatePhone, whatsappNumber } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User account not found' });
    }

    if (email && email.toString().trim().toLowerCase() !== user.email.toLowerCase()) {
      const cleanEmail = email.toString().trim().toLowerCase();
      const emailExists = await User.findOne({ email: cleanEmail, _id: { $ne: user._id } });
      if (emailExists) {
        return res.status(400).json({ message: 'This email is already in use by another account.' });
      }
      user.email = cleanEmail;
    }

    if (newPassword && newPassword.trim() !== '') {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to change password' });
      }
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      user.password = newPassword.trim();
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }

    await user.save();

    // Also update lead record if alternatePhone or whatsappNumber provided
    if (req.user.lead) {
      const lead = await Lead.findById(req.user.lead);
      if (lead) {
        if (email) lead.email = user.email;
        if (!lead.personalInfo) lead.personalInfo = {};
        if (alternatePhone !== undefined) lead.personalInfo.alternatePhone = alternatePhone;
        if (whatsappNumber !== undefined) lead.personalInfo.whatsappNumber = whatsappNumber;
        await lead.save();
      }
    }

    res.json({
      message: 'Account settings & security credentials updated successfully!',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin deletes customer portal account for a lead
// @route   DELETE /api/customer/delete-account/:leadId
// @access  Private (Admin)
const deleteCustomerAccount = async (req, res) => {
  try {
    const { leadId } = req.params;
    
    const deletedUser = await User.findOneAndDelete({ 
      lead: leadId,
      role: 'customer'
    });

    if (!deletedUser) {
      return res.status(404).json({ message: 'No active customer portal account found for this lead.' });
    }

    res.json({ message: 'Customer portal account deleted successfully! Access revoked.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMyData,
  addCustomerLead,
  createCustomerAccount,
  getCustomerList,
  updateCustomerSecurity,
  deleteCustomerAccount
};


const mongoose = require('mongoose');

const referralPayoutSchema = mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },
    referredLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
    },
    referralName: {
      type: String,
      required: true,
    },
    payoutAmount: {
      type: Number,
      required: true,
    },
    kwCapacity: {
      type: String,
      default: '',
    },
    totalQuotationValue: {
      type: Number,
      default: 0,
    },
    totalPaymentReceived: {
      type: Number,
      default: 0,
    },
    pendingAmount: {
      type: Number,
      default: 0,
    },
    payoutDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Paid', 'Rejected'],
      default: 'Paid',
    },
    paymentMode: {
      type: String,
      enum: ['Bank Transfer', 'UPI', 'Cash', 'Cheque'],
      default: 'Bank Transfer',
    },
    transactionRef: {
      type: String,
      default: '',
    },
    remarks: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const ReferralPayout = mongoose.model('ReferralPayout', referralPayoutSchema);

module.exports = ReferralPayout;

const mongoose = require('mongoose');

const invoiceSettingsSchema = mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'global',
    },
    declaration: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const InvoiceSettings = mongoose.model('InvoiceSettings', invoiceSettingsSchema);

module.exports = InvoiceSettings;

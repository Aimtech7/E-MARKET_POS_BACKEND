const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const StoreSettings = Schema({
  shopName: { type: String, default: "EMMARKET SUPERMARKET" },
  address: { type: String, default: "123 Market Street, City" },
  phone: { type: String, default: "+1 234 567 890" },
  taxRate: { type: Number, default: 0 },
  currency: { type: String, default: "$" },
  receiptFooter: { type: String, default: "Thank you for shopping with us!" },
});

module.exports = mongoose.model("StoreSettings", StoreSettings);

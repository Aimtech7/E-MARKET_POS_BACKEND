const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DebtTransactionSchema = new Schema({
  customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
  saleId: { type: Schema.Types.ObjectId, ref: "Receipt" },
  amount: { type: Number, required: true },
  paid: { type: Number, default: 0 },
  balance: { type: Number, required: true },
  dueDate: { type: Date },
  status: { type: String, enum: ["pending", "partial", "paid"], default: "pending" },
  payments: [{
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    note: { type: String }
  }],
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("DebtTransaction", DebtTransactionSchema);

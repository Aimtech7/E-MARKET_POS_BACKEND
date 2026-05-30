const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const LoyaltyAccount = Schema({
  customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, unique: true },
  points: { type: Number, default: 0 },
  tier: { type: String, enum: ["Bronze", "Silver", "Gold", "Platinum"], default: "Bronze" },
  totalSpent: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("LoyaltyAccount", LoyaltyAccount);

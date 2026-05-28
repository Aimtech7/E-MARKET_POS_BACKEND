const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const BatchSchema = new Schema({
  batchNumber: { type: String, required: true, unique: true },
  expiryDate: { type: Date, required: true },
  receivedDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Batch", BatchSchema);

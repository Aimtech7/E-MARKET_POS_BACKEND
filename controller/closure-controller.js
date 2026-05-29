const DailyClosure = require("../model/DailyClosure");
const Receipt = require("../model/Receipt");
const Refund = require("../model/Refund");

const getClosureData = async (req, res) => {
  const { date } = req.query;
  try {
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    const receipts = await Receipt.find({ timestamp: { $gte: start, $lte: end } });
    const refunds = await Refund.find({ timestamp: { $gte: start, $lte: end } });

    const totalSales = receipts.reduce((acc, curr) => acc + curr.grandTotal, 0);
    const expectedCash = receipts.filter(r => r.paymentMethod === "Cash").reduce((acc, curr) => acc + curr.grandTotal, 0);
    const totalRefunds = refunds.reduce((acc, curr) => acc + curr.totalRefundedAmount, 0);

    return res.status(200).json({
      totalSales,
      expectedCash,
      totalRefunds
    });
  } catch (err) {
    return res.status(500).json({ message: "Error fetching closure data", error: err.message });
  }
};

const submitClosure = async (req, res) => {
  const { date, openingBalance, expectedCash, actualCash, totalSales, totalRefunds, notes } = req.body;
  const cashier = req.userData ? req.userData.username : "Cashier";

  try {
    const targetDate = date ? new Date(date) : new Date();
    
    // Check if already closed
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    const existingClosure = await DailyClosure.findOne({ date: { $gte: start, $lte: end } });
    if (existingClosure) {
      return res.status(400).json({ message: "A closure for this day has already been submitted." });
    }

    const difference = actualCash - expectedCash;

    const closure = new DailyClosure({
      date: targetDate,
      cashier,
      openingBalance,
      expectedCash,
      actualCash,
      difference,
      totalSales,
      totalRefunds,
      notes
    });

    await closure.save();

    return res.status(201).json({ message: "Daily closure submitted successfully", closure });
  } catch (err) {
    return res.status(500).json({ message: "Error submitting closure", error: err.message });
  }
};

const getClosures = async (req, res) => {
  try {
    const closures = await DailyClosure.find().sort({ date: -1 });
    return res.status(200).json(closures);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching closures", error: err.message });
  }
};

module.exports = {
  getClosureData,
  submitClosure,
  getClosures
};

const DebtTransaction = require("../model/DebtTransaction");
const Customer = require("../model/Customer");

const createDebt = async (req, res) => {
  const { customerId, saleId, amount, paid, dueDate } = req.body;
  try {
    const balance = amount - (paid || 0);
    const status = balance <= 0 ? "paid" : (paid > 0 ? "partial" : "pending");

    const debt = new DebtTransaction({
      customerId,
      saleId,
      amount,
      paid: paid || 0,
      balance,
      dueDate,
      status,
      payments: paid > 0 ? [{ amount: paid, note: "Initial payment" }] : [],
    });
    await debt.save();

    // Update customer balance
    await Customer.findByIdAndUpdate(customerId, { $inc: { balance: balance } });

    return res.status(201).json({ message: "Credit sale recorded", debt });
  } catch (err) {
    return res.status(500).json({ message: "Error creating debt", error: err.message });
  }
};

const recordPayment = async (req, res) => {
  const { amount, note } = req.body;
  try {
    const debt = await DebtTransaction.findById(req.params.id);
    if (!debt) {
      return res.status(404).json({ message: "Debt not found" });
    }

    debt.paid += amount;
    debt.balance = debt.amount - debt.paid;
    debt.status = debt.balance <= 0 ? "paid" : "partial";
    debt.payments.push({ amount, note: note || "Payment received" });
    await debt.save();

    // Update customer balance
    await Customer.findByIdAndUpdate(debt.customerId, { $inc: { balance: -amount } });

    return res.status(200).json({ message: "Payment recorded", debt });
  } catch (err) {
    return res.status(500).json({ message: "Error recording payment", error: err.message });
  }
};

const getCustomerDebts = async (req, res) => {
  try {
    const debts = await DebtTransaction.find({ customerId: req.params.customerId })
      .sort({ timestamp: -1 });
    return res.status(200).json(debts);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching debts", error: err.message });
  }
};

const getAllDebts = async (req, res) => {
  try {
    const debts = await DebtTransaction.find()
      .populate("customerId", "name phone")
      .sort({ timestamp: -1 });
    return res.status(200).json(debts);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching all debts", error: err.message });
  }
};

const getDebtStatement = async (req, res) => {
  try {
    const debt = await DebtTransaction.findById(req.params.id)
      .populate("customerId", "name phone email");
    if (!debt) {
      return res.status(404).json({ message: "Debt not found" });
    }
    return res.status(200).json(debt);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching statement", error: err.message });
  }
};

module.exports = {
  createDebt,
  recordPayment,
  getCustomerDebts,
  getAllDebts,
  getDebtStatement,
};

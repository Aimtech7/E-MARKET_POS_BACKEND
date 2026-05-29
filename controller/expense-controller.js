const Expense = require("../model/Expense");

const getAllExpenses = async (req, res) => {
  try {
    const { category, startDate, endDate } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(filter).sort({ date: -1 });
    return res.status(200).json(expenses);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching expenses", error: err.message });
  }
};

const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }
    return res.status(200).json(expense);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching expense", error: err.message });
  }
};

const createExpense = async (req, res) => {
  const { title, category, amount, date, notes } = req.body;
  const createdBy = req.userData ? req.userData.username : "System";
  try {
    const expense = new Expense({ title, category, amount, date, notes, createdBy });
    await expense.save();
    return res.status(201).json({ message: "Expense created", expense });
  } catch (err) {
    return res.status(500).json({ message: "Error creating expense", error: err.message });
  }
};

const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }
    return res.status(200).json({ message: "Expense updated", expense });
  } catch (err) {
    return res.status(500).json({ message: "Error updating expense", error: err.message });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }
    return res.status(200).json({ message: "Expense deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Error deleting expense", error: err.message });
  }
};

const getExpenseSummary = async (req, res) => {
  try {
    const { period } = req.query; // daily, weekly, monthly
    const now = new Date();
    let start;

    switch (period) {
      case "daily":
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      case "weekly":
        start = new Date(now);
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        break;
      case "monthly":
      default:
        start = new Date(now);
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        break;
    }

    const result = await Expense.aggregate([
      { $match: { date: { $gte: start, $lte: now } } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const grandTotal = result.reduce((acc, curr) => acc + curr.total, 0);

    return res.status(200).json({ categories: result, grandTotal });
  } catch (err) {
    return res.status(500).json({ message: "Error fetching expense summary", error: err.message });
  }
};

module.exports = {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
};

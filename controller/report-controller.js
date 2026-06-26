const Receipt = require("../model/Receipt");
const Product = require("../model/Product");
const { Parser } = require("json2csv");

const getSalesCSV = async (req, res) => {
  const { start, end } = req.query;
  try {
    let query = {};
    if (start && end) {
      query.timestamp = { $gte: new Date(start), $lte: new Date(end) };
    }
    const receipts = await Receipt.find(query).sort({ timestamp: -1 });
    
    if (!receipts || receipts.length === 0) {
      return res.status(404).json({ message: "No sales data found for this period" });
    }

    const data = receipts.map((r) => ({
      ReceiptNumber: r.receiptNumber,
      Date: r.timestamp ? r.timestamp.toISOString().split("T")[0] : "-",
      Time: r.timestamp ? r.timestamp.toISOString().split("T")[1].split(".")[0] : "-",
      Cashier: r.cashier,
      TotalAmount: r.grandTotal ? r.grandTotal.toFixed(2) : "0.00",
      ItemsCount: r.items.length,
      PaymentMethod: r.paymentMethod || "Cash",
    }));

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(data);

    res.header("Content-Type", "text/csv");
    res.attachment("sales_report.csv");
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ message: "Error generating report", error: err.message });
  }
};

const getInventoryCSV = async (req, res) => {
  try {
    const products = await Product.find().populate(["productCategory", "unitOfMeasure"]);
    
    const data = products.map((p) => ({
      SKU: p.sku || "-",
      ProductName: p.productName,
      Category: p.productCategory?.categoryName || "None",
      Price: p.productPrice.toFixed(2),
      StockQuantity: p.stockQuantity,
      ReorderLevel: p.reorderLevel,
      Status: p.stockQuantity <= p.reorderLevel ? "Low Stock" : "Adequate",
    }));

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(data);

    res.header("Content-Type", "text/csv");
    res.attachment("inventory_report.csv");
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ message: "Error generating report", error: err.message });
  }
};

const getProfitCSV = async (req, res) => {
  const { start, end } = req.query;
  try {
    let query = {};
    if (start && end) {
      query.timestamp = { $gte: new Date(start), $lte: new Date(end) };
    }
    const receipts = await Receipt.find(query).sort({ timestamp: -1 });

    if (!receipts || receipts.length === 0) {
      return res.status(404).json({ message: "No data found for this period" });
    }

    const data = receipts.map((r) => {
      const margin = r.grandTotal ? ((r.profit / r.grandTotal) * 100).toFixed(2) : 0;
      return {
        ReceiptNumber: r.receiptNumber,
        Date: r.timestamp ? r.timestamp.toISOString().split("T")[0] : "-",
        Revenue: r.grandTotal?.toFixed(2) || "0.00",
        Cost: r.totalCost?.toFixed(2) || "0.00",
        Profit: r.profit?.toFixed(2) || "0.00",
        "Margin (%)": margin,
      };
    });

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(data);

    res.header("Content-Type", "text/csv");
    res.attachment("profit_report.csv");
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ message: "Error generating profit report", error: err.message });
  }
};

const getSalesChartData = async (req, res) => {
  try {
    // Get last 7 days of sales grouped by date
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const receipts = await Receipt.find({ timestamp: { $gte: sevenDaysAgo } });

    const groupedData = receipts.reduce((acc, curr) => {
      const date = curr.timestamp ? curr.timestamp.toISOString().split("T")[0] : "-";
      if (!acc[date]) {
        acc[date] = { date, revenue: 0, profit: 0 };
      }
      acc[date].revenue += curr.grandTotal || 0;
      acc[date].profit += curr.profit || 0;
      return acc;
    }, {});

    const sortedData = Object.values(groupedData).sort((a, b) => new Date(a.date) - new Date(b.date));

    return res.status(200).json(sortedData);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching chart data", error: err.message });
  }
};

const getDailyReconciliation = async (req, res) => {
  try {
    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(); end.setHours(23,59,59,999);

    const receipts = await Receipt.find({ timestamp: { $gte: start, $lte: end } });
    let cash = 0, mpesa = 0, paystack = 0, card = 0;

    receipts.forEach(r => {
      const method = (r.paymentMethod || "cash").toLowerCase();
      if (method.includes("mpesa")) mpesa += r.grandTotal;
      else if (method.includes("paystack")) paystack += r.grandTotal;
      else if (method.includes("card")) card += r.grandTotal;
      else cash += r.grandTotal;
    });

    const totalExpected = cash + mpesa + paystack + card;
    return res.status(200).json({
      date: new Date().toISOString().split("T")[0],
      expected: { cash, mpesa, paystack, card, total: totalExpected }
    });
  } catch (err) { return res.status(500).json({ message: err.message }); }
};

const getProfitLossReport = async (req, res) => {
  try {
    const Expense = require("../model/Expense");
    const start = req.query.start ? new Date(req.query.start) : new Date(Date.now() - 30*24*3600*1000);
    const end = req.query.end ? new Date(req.query.end) : new Date();

    const salesAgg = await Receipt.aggregate([
      { $match: { timestamp: { $gte: start, $lte: end } } },
      { $group: { _id: null, revenue: { $sum: "$grandTotal" }, cost: { $sum: "$totalCost" }, grossProfit: { $sum: "$profit" } } }
    ]);

    const expAgg = await Expense.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: null, totalExp: { $sum: "$amount" } } }
    ]);

    const rev = salesAgg[0]?.revenue || 0;
    const cog = salesAgg[0]?.cost || 0;
    const gp = salesAgg[0]?.grossProfit || 0;
    const oexp = expAgg[0]?.totalExp || 0;
    const netProfit = gp - oexp;

    return res.status(200).json({
      period: { start, end },
      revenue: rev,
      costOfGoodsSold: cog,
      grossProfit: gp,
      operatingExpenses: oexp,
      netProfit,
      status: netProfit >= 0 ? "Profitable" : "Loss"
    });
  } catch (err) { return res.status(500).json({ message: err.message }); }
};

module.exports = {
  getSalesCSV,
  getInventoryCSV,
  getProfitCSV,
  getSalesChartData,
  getDailyReconciliation,
  getProfitLossReport
};

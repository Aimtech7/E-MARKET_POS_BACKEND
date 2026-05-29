const Receipt = require("../model/Receipt");
const Product = require("../model/Product");
const { Parser } = require("json2csv");

const getSalesCSV = async (req, res) => {
  const { start, end } = req.query;
  try {
    let query = {};
    if (start && end) {
      query.createdAt = { $gte: new Date(start), $lte: new Date(end) };
    }
    const receipts = await Receipt.find(query).sort({ createdAt: -1 });
    
    if (!receipts || receipts.length === 0) {
      return res.status(404).json({ message: "No sales data found for this period" });
    }

    const data = receipts.map((r) => ({
      ReceiptNumber: r.receiptNumber,
      Date: r.createdAt.toISOString().split("T")[0],
      Time: r.createdAt.toISOString().split("T")[1].split(".")[0],
      Cashier: r.cashierName,
      TotalAmount: r.totalAmount.toFixed(2),
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

module.exports = {
  getSalesCSV,
  getInventoryCSV,
  getProfitCSV
};

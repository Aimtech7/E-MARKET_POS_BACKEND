const mongoose = require("mongoose");
const Receipt = require("../model/Receipt");
const Product = require("../model/Product");
const Inventory = require("../model/InventoryMovement");

// Helper to get start and end of a given date
const getDayBounds = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getTodayAnalytics = async (req, res) => {
  try {
    const { start, end } = getDayBounds(new Date());

    const result = await Receipt.aggregate([
      { $match: { timestamp: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$grandTotal" },
          cost: { $sum: "$totalCost" },
          profit: { $sum: "$profit" },
          orders: { $sum: 1 },
          averageSale: { $avg: "$grandTotal" },
        },
      },
    ]);

    const data = result[0] || { revenue: 0, orders: 0, averageSale: 0 };
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching today's analytics", error: err.message });
  }
};

const getWeekAnalytics = async (req, res) => {
  try {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const result = await Receipt.aggregate([
      { $match: { timestamp: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          revenue: { $sum: "$grandTotal" },
          cost: { $sum: "$totalCost" },
          profit: { $sum: "$profit" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill missing days with 0
    const chartData = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const found = result.find((r) => r._id === dateStr);
      chartData.push({
        date: dateStr,
        revenue: found ? found.revenue : 0,
        cost: found ? found.cost : 0,
        profit: found ? found.profit : 0,
        orders: found ? found.orders : 0,
      });
    }

    const totalRevenue = chartData.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalOrders = chartData.reduce((acc, curr) => acc + curr.orders, 0);

    return res.status(200).json({
      chartData,
      summary: {
        revenue: totalRevenue,
        orders: totalOrders,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Error fetching weekly analytics", error: err.message });
  }
};

const getMonthAnalytics = async (req, res) => {
  try {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - 29); // Last 30 days
    start.setHours(0, 0, 0, 0);

    const result = await Receipt.aggregate([
      { $match: { timestamp: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          revenue: { $sum: "$grandTotal" },
          cost: { $sum: "$totalCost" },
          profit: { $sum: "$profit" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const chartData = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const found = result.find((r) => r._id === dateStr);
      chartData.push({
        date: dateStr,
        revenue: found ? found.revenue : 0,
        cost: found ? found.cost : 0,
        profit: found ? found.profit : 0,
        orders: found ? found.orders : 0,
      });
    }

    const totalRevenue = chartData.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalCost = chartData.reduce((acc, curr) => acc + curr.cost, 0);
    const totalProfit = chartData.reduce((acc, curr) => acc + curr.profit, 0);
    const totalOrders = chartData.reduce((acc, curr) => acc + curr.orders, 0);

    return res.status(200).json({
      chartData,
      summary: {
        revenue: totalRevenue,
        cost: totalCost,
        profit: totalProfit,
        orders: totalOrders,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Error fetching monthly analytics", error: err.message });
  }
};

const getProductAnalytics = async (req, res) => {
  try {
    // Unwind receipt items to aggregate by product
    const result = await Receipt.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productName",
          qtySold: { $sum: "$items.qty" },
          revenue: { $sum: { $multiply: ["$items.qty", "$items.unitPrice"] } },
        },
      },
      { $sort: { qtySold: -1 } },
      { $limit: 10 },
    ]);

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching product analytics", error: err.message });
  }
};

const getLowStockAnalytics = async (req, res) => {
  try {
    // Check inventory stock compared to product reorder level if available, 
    // or just assume a fixed threshold like 10 for "low stock".
    // Looking at Inventory model, it has 'stockQuantity', 'reorderLevel'.
    
    // Total Products Count
    const totalProducts = await Product.countDocuments();
    
    // Low Stock Count
    // Use aggregation to compare fields
    const lowStockResult = await Inventory.aggregate([
      {
        $match: {
          $expr: { $lte: ["$stockQuantity", { $ifNull: ["$reorderLevel", 10] }] },
        },
      },
    ]);

    return res.status(200).json({
      totalProducts,
      lowStockCount: lowStockResult.length,
      lowStockItems: lowStockResult,
    });
  } catch (err) {
    return res.status(500).json({ message: "Error fetching stock analytics", error: err.message });
  }
};

const getNetProfit = async (req, res) => {
  try {
    const { period } = req.query; // daily, weekly, monthly
    const Expense = require("../model/Expense");
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

    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    // Revenue from receipts
    const revenueResult = await Receipt.aggregate([
      { $match: { timestamp: { $gte: start, $lte: end } } },
      { $group: { _id: null, revenue: { $sum: "$grandTotal" }, cost: { $sum: "$totalCost" } } },
    ]);

    // Expenses
    const expenseResult = await Expense.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: null, totalExpenses: { $sum: "$amount" } } },
    ]);

    const revenue = revenueResult[0]?.revenue || 0;
    const costOfGoods = revenueResult[0]?.cost || 0;
    const expenses = expenseResult[0]?.totalExpenses || 0;
    const grossProfit = revenue - costOfGoods;
    const netProfit = grossProfit - expenses;

    return res.status(200).json({
      revenue,
      costOfGoods,
      grossProfit,
      expenses,
      netProfit,
      period: period || "monthly",
    });
  } catch (err) {
    return res.status(500).json({ message: "Error fetching net profit", error: err.message });
  }
};

const getInventoryForecast = async (req, res) => {
  try {
    // Phase 4 & 5: Inventory Forecasting & Smart Restock
    // Average Daily Sales over the last 30 days
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    // Aggregate item sales
    const salesAgg = await Receipt.aggregate([
      { $match: { timestamp: { $gte: start } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalSold: { $sum: "$items.qty" },
          productName: { $first: "$items.productName" }
        }
      }
    ]);

    // Fetch all products to get current stock
    const products = await Product.find().populate("supplierReference");

    const forecast = products.map((prod) => {
      const soldData = salesAgg.find(s => s._id?.toString() === prod._id.toString());
      const totalSold30Days = soldData ? soldData.totalSold : 0;
      
      const avgDailySales = totalSold30Days / 30;
      const avgWeeklySales = avgDailySales * 7;
      
      const currentStock = prod.stockQuantity || 0;
      let daysUntilStockOut = -1; // -1 means infinite/no sales
      
      if (avgDailySales > 0) {
        daysUntilStockOut = Math.floor(currentStock / avgDailySales);
      }

      // Restock Engine: (Average Sales * Lead Time) + Safety Stock
      // Assuming a standard Lead Time of 7 days and Safety Stock of 14 days
      const leadTime = 7;
      const safetyStock = Math.ceil(avgDailySales * 14);
      const suggestedOrderQty = Math.ceil((avgDailySales * leadTime) + safetyStock - currentStock);
      
      return {
        productId: prod._id,
        productName: prod.productName,
        currentStock,
        avgDailySales: avgDailySales.toFixed(2),
        avgWeeklySales: avgWeeklySales.toFixed(2),
        daysUntilStockOut,
        suggestedOrderQty: suggestedOrderQty > 0 ? suggestedOrderQty : 0,
        supplier: prod.supplierReference?.supplierName || "Unknown"
      };
    });

    // Sort by items closest to stock out
    forecast.sort((a, b) => {
      if (a.daysUntilStockOut === -1) return 1;
      if (b.daysUntilStockOut === -1) return -1;
      return a.daysUntilStockOut - b.daysUntilStockOut;
    });

    return res.status(200).json(forecast);
  } catch (err) {
    return res.status(500).json({ message: "Error forecasting inventory", error: err.message });
  }
};

const getEmployeeAnalytics = async (req, res) => {
  try {
    const { period } = req.query; 
    const now = new Date();
    let start = new Date(now);
    if (period === "daily") {
      start.setHours(0, 0, 0, 0);
    } else if (period === "weekly") {
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
    }

    const receiptAgg = await Receipt.aggregate([
      { $match: { timestamp: { $gte: start } } },
      {
        $group: {
          _id: "$cashier",
          totalRevenue: { $sum: "$grandTotal" },
          transactions: { $sum: 1 },
          averageSale: { $avg: "$grandTotal" }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    return res.status(200).json(receiptAgg);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching employee analytics", error: err.message });
  }
};

const getInventoryValuation = async (req, res) => {
  try {
    const products = await Product.find({ isArchived: false });
    let totalValue = 0;
    let totalRetailValue = 0;

    products.forEach((prod) => {
      const qty = prod.stockQuantity || 0;
      const cost = prod.costPrice || 0;
      const retail = prod.sellingPrice || prod.productPrice || 0;
      totalValue += qty * cost;
      totalRetailValue += qty * retail;
    });

    const potentialProfit = totalRetailValue - totalValue;

    return res.status(200).json({
      totalCostValue: totalValue,
      totalRetailValue,
      potentialProfit
    });
  } catch (err) {
    return res.status(500).json({ message: "Error calculating inventory valuation", error: err.message });
  }
};

const getExpiryAlerts = async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringProducts = await Product.find({
      isArchived: false,
      expiryDate: { $lte: thirtyDaysFromNow, $gte: today }
    }).sort({ expiryDate: 1 });

    const expiredProducts = await Product.find({
      isArchived: false,
      expiryDate: { $lt: today }
    }).sort({ expiryDate: 1 });

    return res.status(200).json({
      expiringIn30Days: expiringProducts,
      alreadyExpired: expiredProducts
    });
  } catch (err) {
    return res.status(500).json({ message: "Error fetching expiry alerts", error: err.message });
  }
};

module.exports = {
  getTodayAnalytics,
  getWeekAnalytics,
  getMonthAnalytics,
  getProductAnalytics,
  getLowStockAnalytics,
  getNetProfit,
  getInventoryForecast,
  getEmployeeAnalytics,
  getInventoryValuation,
  getExpiryAlerts
};

const mongoose = require("mongoose");
const Receipt = require("../model/Receipt");
const Product = require("../model/Product");
const Inventory = require("../model/Inventory");

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

module.exports = {
  getTodayAnalytics,
  getWeekAnalytics,
  getMonthAnalytics,
  getProductAnalytics,
  getLowStockAnalytics,
};

const Transaction = require("../model/Transaction");
const Refund = require("../model/Refund");
const Invoice = require("../model/Invoice");
const Product = require("../model/Product");
const Cart = require("../model/Cart");
const InventoryMovement = require("../model/InventoryMovement");

const getTransactions = async (req, res) => {
  const { cashier, paymentMethod, type, startDate, endDate, sort = "-timestamp" } = req.query;

  let query = {};
  if (cashier) query.cashier = cashier;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (type) query.type = type;

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.timestamp.$lte = end;
    }
  }

  try {
    const transactions = await Transaction.find(query)
      .populate({
        path: "invoice",
        populate: {
          path: "cart",
          populate: { path: "products.product" },
        },
      })
      .sort(sort);

    return res.status(200).json(transactions);
  } catch (err) {
    return res.status(500).json({ message: "Error retrieving sales logs", error: err.message });
  }
};

const refundTransaction = async (req, res) => {
  const { invoiceId, refundedItems, reason } = req.body;
  const cashierName = req.userData ? req.userData.username : "Cashier";

  if (!invoiceId || !refundedItems || refundedItems.length === 0) {
    return res.status(400).json({ message: "Missing required refund data parameters" });
  }

  try {
    const invoice = await Invoice.findById(invoiceId).populate({
      path: "cart",
      populate: { path: "products.product" },
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Process refund list and verify prices
    let totalRefundedAmount = 0;
    const itemsToSave = [];

    for (let rItem of refundedItems) {
      const product = await Product.findById(rItem.product);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${rItem.product}` });
      }

      // Ensure the product was in the original cart and check quantities
      const originalCartItem = invoice.cart.products.find(
        (cp) => cp.product._id.toString() === rItem.product.toString()
      );

      if (!originalCartItem) {
        return res.status(400).json({ message: `Product ${product.productName} was not in the original cart` });
      }

      if (rItem.qty > originalCartItem.qty) {
        return res.status(400).json({
          message: `Cannot refund more than original quantity (${originalCartItem.qty}) for ${product.productName}`,
        });
      }

      const itemRefundPrice = product.productPrice * rItem.qty;
      totalRefundedAmount += itemRefundPrice;

      itemsToSave.push({
        product: rItem.product,
        qty: rItem.qty,
        refundAmount: itemRefundPrice,
      });
    }

    // Apply proportional taxes and discounts from the original cart
    const discountOffset = totalRefundedAmount * invoice.cart.discount;
    const taxOffset = (totalRefundedAmount - discountOffset) * invoice.cart.tax;
    const finalRefundTotal = totalRefundedAmount - discountOffset + taxOffset;

    const refundNumber = `RFD-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const refund = new Refund({
      refundNumber,
      originalInvoice: invoiceId,
      refundedItems: itemsToSave,
      totalRefundedAmount: parseFloat(finalRefundTotal.toFixed(2)),
      reason: reason || "Customer Refund Request",
      cashier: cashierName,
    });

    await refund.save();

    // Create a transaction of type "refund" for auditing
    const transaction = new Transaction({
      transactionNumber: refundNumber.replace("RFD-", "TXN-RFD-"),
      invoice: invoiceId,
      cashier: cashierName,
      paymentMethod: invoice.paymentMethod,
      totalAmount: parseFloat((-finalRefundTotal).toFixed(2)), // Negative amount represents money returned
      type: "refund",
    });

    await transaction.save();

    // Restore stock levels and log inventory movements
    for (let rItem of itemsToSave) {
      const prod = await Product.findById(rItem.product);
      prod.stockQuantity += rItem.qty;
      await prod.save();

      const movement = new InventoryMovement({
        product: rItem.product,
        qty: rItem.qty,
        type: "refund",
        reason: `Returned products. Refund Receipt #${refundNumber}`,
      });
      await movement.save();
    }

    return res.status(201).json({
      message: "Refund processed successfully",
      refund,
      transaction,
    });
  } catch (err) {
    console.error("Refund error:", err);
    return res.status(500).json({ message: "Error executing partial/full transaction refund", error: err.message });
  }
};

const getTransactionAnalytics = async (req, res) => {
  try {
    // Pipeline to group daily sales totals
    const dailySales = await Transaction.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          totalSales: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]);

    // Payment methods distribution
    const paymentDistribution = await Transaction.aggregate([
      {
        $group: {
          _id: "$paymentMethod",
          totalAmount: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Transaction type summaries
    const typeSummary = await Transaction.aggregate([
      {
        $group: {
          _id: "$type",
          totalAmount: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Total gross sales (excluding refunds) and net sales
    const transactions = await Transaction.find({});
    let grossSales = 0;
    let totalRefunds = 0;
    let netSales = 0;

    transactions.forEach((tx) => {
      if (tx.type === "sale") {
        grossSales += tx.totalAmount;
        netSales += tx.totalAmount;
      } else if (tx.type === "refund") {
        totalRefunds += Math.abs(tx.totalAmount);
        netSales += tx.totalAmount; // subtracts refund
      }
    });

    return res.status(200).json({
      grossSales,
      totalRefunds,
      netSales,
      dailySales,
      paymentDistribution,
      typeSummary,
    });
  } catch (err) {
    return res.status(500).json({ message: "Error compiling sales analytics data summaries", error: err.message });
  }
};

module.exports = {
  getTransactions,
  refundTransaction,
  getTransactionAnalytics,
};

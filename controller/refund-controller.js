const Refund = require("../model/Refund");
const Invoice = require("../model/Invoice");
const Product = require("../model/Product");
const Inventory = require("../model/Inventory");

const processRefund = async (req, res) => {
  const { originalInvoiceId, itemsToRefund, reason } = req.body;
  const cashier = req.userData ? req.userData.username : "Admin";

  try {
    const invoice = await Invoice.findById(originalInvoiceId).populate({
      path: "cart",
      populate: { path: "products.product" }
    });
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const refundItems = itemsToRefund && itemsToRefund.length > 0 ? itemsToRefund : invoice.cart.products.map(p => ({
      productId: p.product._id,
      qty: p.qty
    }));

    let totalRefundedAmount = 0;
    const refundedItems = [];

    for (let item of refundItems) {
      const product = await Product.findById(item.productId);
      if (!product) continue;

      const refundAmount = item.qty * product.sellingPrice;
      totalRefundedAmount += refundAmount;

      refundedItems.push({
        product: product._id,
        qty: item.qty,
        refundAmount
      });

      // Restore inventory
      const inventory = await Inventory.findOne({ productId: product._id });
      if (inventory) {
        inventory.stockQuantity += item.qty;
        await inventory.save();
      } else {
        const newInv = new Inventory({
          productId: product._id,
          stockQuantity: item.qty
        });
        await newInv.save();
      }

      // Update product stock directly as well
      product.stockQuantity += item.qty;
      await product.save();
    }

    const refundNumber = `REF-${Date.now()}`;
    const refund = new Refund({
      refundNumber,
      originalInvoice: invoice._id,
      refundedItems,
      totalRefundedAmount,
      reason: reason || "Customer Request",
      cashier
    });

    await refund.save();

    return res.status(200).json({ message: "Refund processed successfully", refund });
  } catch (err) {
    return res.status(500).json({ message: "Error processing refund", error: err.message });
  }
};

const getRefunds = async (req, res) => {
  try {
    const refunds = await Refund.find().populate("originalInvoice").populate("refundedItems.product").sort({ timestamp: -1 });
    return res.status(200).json(refunds);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching refunds", error: err.message });
  }
};

module.exports = {
  processRefund,
  getRefunds
};

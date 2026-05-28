const InventoryMovement = require("../model/InventoryMovement");
const Product = require("../model/Product");

const getInventoryLogs = async (req, res) => {
  try {
    const logs = await InventoryMovement.find()
      .populate("product")
      .sort({ timestamp: -1 });
    return res.status(200).json(logs);
  } catch (err) {
    return res.status(500).json({ message: "Error retrieving inventory movement logs", error: err.message });
  }
};

const adjustStock = async (req, res) => {
  const { productId, qtyAdjustment, reason } = req.body;

  if (!productId || qtyAdjustment === undefined) {
    return res.status(400).json({ message: "Product ID and adjustment quantity are required parameters" });
  }

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.stockQuantity += qtyAdjustment;
    if (product.stockQuantity < 0) product.stockQuantity = 0; // Prevent negative physical stocks
    await product.save();

    const movement = new InventoryMovement({
      product: productId,
      qty: qtyAdjustment,
      type: "adjustment",
      reason: reason || "Manual Inventory Adjustment Log",
    });

    await movement.save();

    return res.status(200).json({
      message: "Inventory stock successfully adjusted",
      product,
      movement,
    });
  } catch (err) {
    return res.status(500).json({ message: "Error updating physical inventory levels", error: err.message });
  }
};

module.exports = {
  getInventoryLogs,
  adjustStock,
};

const InventoryMovement = require("../model/InventoryMovement");
const Product = require("../model/Product");
const User = require("../model/User");

const getInventoryLogs = async (req, res) => {
  try {
    const logs = await InventoryMovement.find()
      .populate("product")
      .populate("userId", "username fullName role")
      .sort({ timestamp: -1 });
    return res.status(200).json(logs);
  } catch (err) {
    return res.status(500).json({ message: "Error retrieving inventory movement logs", error: err.message });
  }
};

const _updateStock = async (req, res, actionType, actionEnum) => {
  const { productId, quantity, reason } = req.body;
  const qty = Number(quantity);

  if (!productId || isNaN(qty) || !reason) {
    return res.status(400).json({ message: "Product ID, valid quantity, and reason are required parameters" });
  }

  let finalQtyAdjustment = qty;
  if (actionEnum === "remove") {
    finalQtyAdjustment = -Math.abs(qty);
  } else if (actionEnum === "add") {
    finalQtyAdjustment = Math.abs(qty);
  }

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.stockQuantity += finalQtyAdjustment;
    if (product.stockQuantity < 0) product.stockQuantity = 0;
    await product.save();

    // Fetch user info from req.userData
    let userId = null;
    if (req.userData && req.userData.username) {
      const user = await User.findOne({ username: req.userData.username });
      if (user) userId = user._id;
    }

    const movement = new InventoryMovement({
      product: productId,
      qty: finalQtyAdjustment,
      quantity: Math.abs(qty),
      type: actionType,
      action: actionEnum,
      reason,
      userId
    });

    await movement.save();

    return res.status(200).json({
      message: `Inventory stock successfully ${actionEnum}ed`,
      product,
      movement,
    });
  } catch (err) {
    return res.status(500).json({ message: "Error updating physical inventory levels", error: err.message });
  }
};

const adjustStock = (req, res) => _updateStock(req, res, "adjustment", "adjust");
const addStock = (req, res) => _updateStock(req, res, "add", "add");
const removeStock = (req, res) => _updateStock(req, res, "remove", "remove");

module.exports = {
  getInventoryLogs,
  adjustStock,
  addStock,
  removeStock
};

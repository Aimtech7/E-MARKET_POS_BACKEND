const PurchaseOrder = require("../model/PurchaseOrder");
const Product = require("../model/Product");
const InventoryMovement = require("../model/InventoryMovement");

const createPO = async (req, res) => {
  const { supplier, items, totalAmount } = req.body;

  if (!supplier || !items || items.length === 0) {
    return res.status(400).json({ message: "Supplier and items are required to create a Purchase Order" });
  }

  try {
    const poNumber = `PO-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const po = new PurchaseOrder({
      poNumber,
      supplier,
      items,
      totalAmount,
      status: "Draft",
    });

    await po.save();
    return res.status(201).json(po);
  } catch (err) {
    return res.status(500).json({ message: "Error creating purchase order", error: err.message });
  }
};

const getPOs = async (req, res) => {
  try {
    const pos = await PurchaseOrder.find()
      .populate("supplier")
      .populate("items.product")
      .sort({ timestamp: -1 });
    return res.status(200).json(pos);
  } catch (err) {
    return res.status(500).json({ message: "Error retrieving purchase orders", error: err.message });
  }
};

const updatePOStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // e.g. Ordered, Received, Cancelled

  try {
    const po = await PurchaseOrder.findById(id);
    if (!po) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    const previousStatus = po.status;
    po.status = status;
    await po.save();

    // If status transitions to "Received", automatically restock products
    if (status === "Received" && previousStatus !== "Received") {
      for (let item of po.items) {
        const product = await Product.findById(item.product);
        if (product) {
          product.stockQuantity += item.qty;
          await product.save();

          const movement = new InventoryMovement({
            product: item.product,
            qty: item.qty,
            type: "restock",
            reason: `Restocked via Purchase Order #${po.poNumber}`,
          });
          await movement.save();
        }
      }
    }

    return res.status(200).json(po);
  } catch (err) {
    return res.status(500).json({ message: "Error modifying purchase order status", error: err.message });
  }
};

const deletePO = async (req, res) => {
  const { id } = req.params;
  try {
    const po = await PurchaseOrder.findById(id);
    if (!po) {
      return res.status(404).json({ message: "Purchase order not found" });
    }
    if (po.status === "Received") {
      return res.status(400).json({ message: "Cannot delete a received purchase order" });
    }
    await PurchaseOrder.findByIdAndDelete(id);
    return res.status(200).json({ message: "Purchase order deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Error deleting purchase order record", error: err.message });
  }
};

module.exports = {
  createPO,
  getPOs,
  updatePOStatus,
  deletePO,
};

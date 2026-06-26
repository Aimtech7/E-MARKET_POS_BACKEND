const GoodsReceivedNote = require("../model/GoodsReceivedNote");
const PurchaseOrder = require("../model/PurchaseOrder");
const Product = require("../model/Product");
const InventoryMovement = require("../model/InventoryMovement");

const getGrns = async (req, res) => {
  try {
    const grns = await GoodsReceivedNote.find().populate("purchaseOrder supplier items.product").sort({ createdAt: -1 });
    res.status(200).json(grns);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createGrn = async (req, res) => {
  try {
    const { purchaseOrder, supplier, supplierInvoiceNumber, items, notes, receivedBy } = req.body;
    let calcTotal = 0;
    (items || []).forEach(i => calcTotal += (i.receivedQty * i.unitCost));

    const grn = await GoodsReceivedNote.create({
      grnNumber: `GRN-${Date.now()}`,
      purchaseOrder,
      supplier,
      supplierInvoiceNumber,
      items: items || [],
      totalCost: calcTotal,
      status: "Draft",
      receivedBy: receivedBy || req.userData?.username || "Storekeeper",
      notes
    });
    res.status(201).json(grn);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Priority 2 & 5 Workflow: Verify GRN -> Mark Completed -> Update Inventory Stock!
const completeGrnReceiving = async (req, res) => {
  try {
    const grn = await GoodsReceivedNote.findById(req.params.id);
    if (!grn) return res.status(404).json({ message: "GRN not found" });
    if (grn.status === "Completed") return res.status(400).json({ message: "GRN already completed and inventory updated" });

    // Automatically update inventory for each received item
    for (const item of grn.items) {
      if (item.product && item.receivedQty > 0) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stockQuantity: item.receivedQty },
          $set: { costPrice: item.unitCost, batchNumber: item.batchNumber || "BATCH1" }
        });

        // Log movement
        try {
          await InventoryMovement.create({
            product: item.product,
            movementType: "IN",
            quantity: item.receivedQty,
            reason: `GRN Receiving ${grn.grnNumber}`,
            performedBy: req.userData?.username || grn.receivedBy || "Admin"
          });
        } catch (e) {}
      }
    }

    grn.status = "Completed";
    grn.verifiedBy = req.userData?.username || "Manager";
    await grn.save();

    if (grn.purchaseOrder) {
      await PurchaseOrder.findByIdAndUpdate(grn.purchaseOrder, { status: "Received" });
    }

    res.status(200).json({ message: "GRN Completed and Stock Quantities Updated!", grn });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getGrns, createGrn, completeGrnReceiving };

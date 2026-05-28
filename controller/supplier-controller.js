const Supplier = require("../model/Supplier");

const createSupplier = async (req, res) => {
  const { supplierName, contactName, email, phone, address } = req.body;

  if (!supplierName) {
    return res.status(400).json({ message: "Supplier name is required" });
  }

  try {
    const existing = await Supplier.findOne({ supplierName });
    if (existing) {
      return res.status(400).json({ message: "Supplier with this name already exists" });
    }

    const supplier = new Supplier({ supplierName, contactName, email, phone, address });
    await supplier.save();
    return res.status(201).json(supplier);
  } catch (err) {
    return res.status(500).json({ message: "Error creating supplier", error: err.message });
  }
};

const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find();
    return res.status(200).json(suppliers);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching suppliers list", error: err.message });
  }
};

const updateSupplier = async (req, res) => {
  const { id } = req.params;
  const { supplierName, contactName, email, phone, address } = req.body;

  try {
    const supplier = await Supplier.findByIdAndUpdate(
      id,
      { supplierName, contactName, email, phone, address },
      { new: true }
    );
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    return res.status(200).json(supplier);
  } catch (err) {
    return res.status(500).json({ message: "Error updating supplier information", error: err.message });
  }
};

const deleteSupplier = async (req, res) => {
  const { id } = req.params;
  try {
    const supplier = await Supplier.findByIdAndDelete(id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    return res.status(200).json({ message: "Supplier successfully deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Error deleting supplier profile", error: err.message });
  }
};

module.exports = {
  createSupplier,
  getSuppliers,
  updateSupplier,
  deleteSupplier,
};

const Supplier = require("../model/Supplier");

const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find();
    return res.status(200).json(suppliers.map(s => s.toObject({ getters: true })));
  } catch (err) {
    return res.status(500).json({ message: "Could not fetch suppliers" });
  }
};

const createSupplier = async (req, res) => {
  const { supplierName, contactName, phone, email, address } = req.body;
  try {
    const existing = await Supplier.findOne({ supplierName });
    if (existing) {
      return res.status(400).json({ message: "Supplier already exists" });
    }
    const supplier = new Supplier({
      supplierName,
      contactName,
      phone,
      email,
      address,
      isActive: true
    });
    await supplier.save();
    return res.status(201).json({ message: "Supplier created", supplier: supplier.toObject({ getters: true }) });
  } catch (err) {
    return res.status(500).json({ message: "Could not create supplier", error: err.message });
  }
};

const updateSupplier = async (req, res) => {
  const { supplierName, contactName, phone, email, address, isActive } = req.body;
  const { id } = req.params;
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      id,
      { supplierName, contactName, phone, email, address, isActive },
      { new: true }
    );
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    return res.status(200).json({ message: "Supplier updated", supplier: supplier.toObject({ getters: true }) });
  } catch (err) {
    return res.status(500).json({ message: "Could not update supplier", error: err.message });
  }
};

const deleteSupplier = async (req, res) => {
  const { id } = req.params;
  try {
    const supplier = await Supplier.findByIdAndDelete(id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    return res.status(200).json({ message: "Supplier deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Could not delete supplier", error: err.message });
  }
};

exports.getSuppliers = getSuppliers;
exports.createSupplier = createSupplier;
exports.updateSupplier = updateSupplier;
exports.deleteSupplier = deleteSupplier;

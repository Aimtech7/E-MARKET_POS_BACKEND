const Customer = require("../model/Customer");
const Receipt = require("../model/Receipt");

const searchCustomer = async (req, res) => {
  const { query } = req.query;
  try {
    const customers = await Customer.find({
      $or: [
        { phone: new RegExp(query, "i") },
        { name: new RegExp(query, "i") }
      ]
    }).limit(10);
    return res.status(200).json(customers);
  } catch (err) {
    return res.status(500).json({ message: "Error searching customers", error: err.message });
  }
};

const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    return res.status(200).json(customers);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching customers", error: err.message });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    return res.status(200).json(customer);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching customer", error: err.message });
  }
};

const createCustomer = async (req, res) => {
  const { name, phone, email, address } = req.body;
  try {
    const existing = await Customer.findOne({ phone });
    if (existing) {
      return res.status(400).json({ message: "Customer with this phone already exists" });
    }
    const customer = new Customer({ name, phone, email, address });
    await customer.save();
    return res.status(201).json({ message: "Customer created", customer });
  } catch (err) {
    return res.status(500).json({ message: "Error creating customer", error: err.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    return res.status(200).json({ message: "Customer updated", customer });
  } catch (err) {
    return res.status(500).json({ message: "Error updating customer", error: err.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    return res.status(200).json({ message: "Customer deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Error deleting customer", error: err.message });
  }
};

const getCustomerPurchaseHistory = async (req, res) => {
  try {
    const receipts = await Receipt.find({ "customer._id": req.params.id }).sort({ timestamp: -1 });
    return res.status(200).json(receipts);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching purchase history", error: err.message });
  }
};

exports.searchCustomer = searchCustomer;
exports.getAllCustomers = getAllCustomers;
exports.getCustomerById = getCustomerById;
exports.createCustomer = createCustomer;
exports.updateCustomer = updateCustomer;
exports.deleteCustomer = deleteCustomer;
exports.getCustomerPurchaseHistory = getCustomerPurchaseHistory;

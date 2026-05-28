const Invoice = require("../model/Invoice");
const Cart = require("../model/Cart");
const Transaction = require("../model/Transaction");
const Product = require("../model/Product");
const InventoryMovement = require("../model/InventoryMovement");
const path = require("path");
const fs = require("fs");
const { generateInvoicePDF } = require("../services/pdf-service");

// Generate unique invoice number: INV-YYYYMMDD-XXXX
const generateInvoiceNumber = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${dateStr}-${randomStr}`;
};

const createInvoice = async (req, res) => {
  const { cartId, amountPaid, changeGiven, paymentMethod } = req.body;
  const cashierName = req.userData ? req.userData.username : "Cashier";

  if (!cartId || amountPaid === undefined || changeGiven === undefined) {
    return res.status(400).json({ message: "Missing required transaction fields" });
  }

  try {
    const cart = await Cart.findById(cartId).populate({
      path: "products",
      populate: { path: "product" },
    });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Verify stock availability and prevent overselling
    for (let item of cart.products) {
      if (item.product.stockQuantity < item.qty) {
        return res.status(400).json({
          message: `Insufficient stock for ${item.product.productName}. Available: ${item.product.stockQuantity}, Requested: ${item.qty}`,
        });
      }
    }

    const invoiceNumber = await generateInvoiceNumber();
    const invoice = new Invoice({
      invoiceNumber,
      cart: cartId,
      cashier: cashierName,
      amountPaid,
      changeGiven,
      paymentMethod: paymentMethod || "Cash",
    });

    await invoice.save();

    // Create matching Transaction log
    const subtotal = cart.products.reduce((acc, p) => acc + p.qty * p.product.productPrice, 0);
    const discountAmount = subtotal * cart.discount;
    const taxAmount = (subtotal - discountAmount) * cart.tax;
    const totalAmount = subtotal - discountAmount + taxAmount;

    const transaction = new Transaction({
      transactionNumber: invoiceNumber.replace("INV-", "TXN-"),
      invoice: invoice._id,
      cashier: cashierName,
      paymentMethod: paymentMethod || "Cash",
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      type: "sale",
    });
    await transaction.save();

    // Deduct stock levels and save movement logs
    for (let item of cart.products) {
      const prod = await Product.findById(item.product._id);
      prod.stockQuantity -= item.qty;
      await prod.save();

      const movement = new InventoryMovement({
        product: item.product._id,
        qty: -item.qty,
        type: "sale",
        reason: `Supermarket checkout sale. Invoice #${invoiceNumber}`,
      });
      await movement.save();
    }

    // Generate PDF invoice
    const pdfFilename = `${invoiceNumber}.pdf`;
    const relativePdfPath = path.join("uploads", "invoices", pdfFilename);
    const absolutePdfPath = path.join(__dirname, "..", relativePdfPath);

    await generateInvoicePDF(invoice, cart, absolutePdfPath);

    invoice.pdfPath = `/uploads/invoices/${pdfFilename}`;
    await invoice.save();

    return res.status(201).json({
      message: "Invoice successfully created",
      invoice,
    });
  } catch (err) {
    console.error("Error creating invoice:", err);
    return res.status(500).json({ message: "Error generating transaction invoice record", error: err.message });
  }
};

const getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate({
        path: "cart",
        populate: {
          path: "products.product",
        },
      })
      .sort({ timestamp: -1 });
    return res.status(200).json(invoices);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching invoices list", error: err.message });
  }
};

const getInvoiceById = async (req, res) => {
  const invoiceId = req.params.id;
  try {
    const invoice = await Invoice.findById(invoiceId).populate({
      path: "cart",
      populate: {
        path: "products.product",
      },
    });
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    return res.status(200).json(invoice);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching invoice details", error: err.message });
  }
};

const getInvoicePDF = async (req, res) => {
  const invoiceId = req.params.id;
  try {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice || !invoice.pdfPath) {
      return res.status(404).json({ message: "Invoice or PDF not found" });
    }

    const absolutePdfPath = path.join(__dirname, "..", invoice.pdfPath);
    if (!fs.existsSync(absolutePdfPath)) {
      return res.status(404).json({ message: "Invoice PDF file not found on disk" });
    }

    res.contentType("application/pdf");
    return fs.createReadStream(absolutePdfPath).pipe(res);
  } catch (err) {
    return res.status(500).json({ message: "Error retrieving invoice PDF file", error: err.message });
  }
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  getInvoicePDF,
};

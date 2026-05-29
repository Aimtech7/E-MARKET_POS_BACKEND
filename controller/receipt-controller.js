const Receipt = require("../model/Receipt");
const Invoice = require("../model/Invoice");
const path = require("path");
const fs = require("fs");
const { generateReceiptPDF } = require("../services/receipt-service");

const generateReceiptNumber = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RCPT-${dateStr}-${randomStr}`;
};

const createReceipt = async (req, res) => {
  const { invoiceId, customer } = req.body;

  if (!invoiceId) {
    return res.status(400).json({ message: "Invoice ID is required" });
  }

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

    const cart = invoice.cart;
    
    let subtotal = 0;
    const items = cart.products.map(p => {
      const itemTotal = p.qty * p.product.productPrice;
      subtotal += itemTotal;
      return {
        productName: p.product.productName,
        qty: p.qty,
        unitPrice: p.product.productPrice,
      };
    });

    const discountAmount = subtotal * cart.discount;
    const taxAmount = (subtotal - discountAmount) * cart.tax;
    const grandTotal = subtotal - discountAmount + taxAmount;

    const receiptNumber = await generateReceiptNumber();

    const receipt = new Receipt({
      receiptNumber,
      invoiceReference: invoice._id,
      cartReference: cart._id,
      customer: customer || "Walk-in",
      cashier: invoice.cashier,
      items,
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount: parseFloat(discountAmount.toFixed(2)),
      tax: parseFloat(taxAmount.toFixed(2)),
      grandTotal: parseFloat(grandTotal.toFixed(2)),
      amountPaid: invoice.amountPaid,
      changeGiven: invoice.changeGiven,
      paymentMethod: invoice.paymentMethod,
    });

    await receipt.save();

    // Generate PDF
    const pdfFilename = `${receiptNumber}.pdf`;
    const relativePdfPath = path.join("uploads", "receipts", pdfFilename);
    const absolutePdfPath = path.join(__dirname, "..", relativePdfPath);

    await generateReceiptPDF(receipt, absolutePdfPath);

    receipt.pdfPath = `/uploads/receipts/${pdfFilename}`;
    await receipt.save();

    return res.status(201).json({
      message: "Receipt successfully created",
      receipt,
    });
  } catch (err) {
    console.error("Error creating receipt:", err);
    return res.status(500).json({ message: "Error generating receipt", error: err.message });
  }
};

const getReceipts = async (req, res) => {
  try {
    const receipts = await Receipt.find().sort({ timestamp: -1 });
    return res.status(200).json(receipts);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching receipts list", error: err.message });
  }
};

const getReceiptById = async (req, res) => {
  const receiptId = req.params.id;
  try {
    const receipt = await Receipt.findById(receiptId);
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }
    return res.status(200).json(receipt);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching receipt details", error: err.message });
  }
};

const getReceiptPDF = async (req, res) => {
  const receiptId = req.params.id;
  try {
    const receipt = await Receipt.findById(receiptId);
    if (!receipt || !receipt.pdfPath) {
      return res.status(404).json({ message: "Receipt or PDF not found" });
    }

    const absolutePdfPath = path.join(__dirname, "..", receipt.pdfPath);
    if (!fs.existsSync(absolutePdfPath)) {
      return res.status(404).json({ message: "Receipt PDF file not found on disk" });
    }

    res.contentType("application/pdf");
    return fs.createReadStream(absolutePdfPath).pipe(res);
  } catch (err) {
    return res.status(500).json({ message: "Error retrieving receipt PDF file", error: err.message });
  }
};

module.exports = {
  createReceipt,
  getReceipts,
  getReceiptById,
  getReceiptPDF,
};

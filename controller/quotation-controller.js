const Quotation = require("../model/Quotation");
const Invoice = require("../model/Invoice");
const Cart = require("../model/Cart");

const getQuotations = async (req, res) => {
  try {
    const quotes = await Quotation.find().populate("customerReference convertedInvoice").sort({ createdAt: -1 });
    res.status(200).json(quotes);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createQuotation = async (req, res) => {
  try {
    const { customerReference, customerName, cashier, items, subtotal, tax, discount, totalAmount, validUntil, notes } = req.body;
    const quote = await Quotation.create({
      quotationNumber: `QT-${Date.now()}`,
      customerReference,
      customerName: customerName || "Prospective Client",
      cashier: cashier || req.userData?.username || "Admin",
      items: items || [],
      subtotal: subtotal || 0,
      tax: tax || 0,
      discount: discount || 0,
      totalAmount: totalAmount || subtotal || 0,
      validUntil: validUntil || new Date(Date.now() + 30*24*60*60*1000), // 30 days
      status: "Draft",
      notes
    });
    res.status(201).json(quote);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateQuotationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const quote = await Quotation.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.status(200).json(quote);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Priority 2 Workflow: Convert Quotation -> Invoice -> Sale
const convertQuotationToInvoice = async (req, res) => {
  try {
    const quote = await Quotation.findById(req.params.id);
    if (!quote) return res.status(404).json({ message: "Quotation not found" });
    if (quote.status === "Invoiced") return res.status(400).json({ message: "Quotation already invoiced" });

    // Create a corresponding Cart for the invoice
    const cart = await Cart.create({
      items: quote.items.map(i => ({ product: i.product, qty: i.qty })),
      subtotal: quote.subtotal,
      totalPrice: quote.totalAmount
    });

    const inv = await Invoice.create({
      invoiceNumber: `INV-${Date.now()}`,
      cart: cart._id,
      cashier: quote.cashier,
      amountPaid: 0,
      changeGiven: 0,
      paymentStatus: "Pending",
      customer: quote.customerReference
    });

    quote.status = "Invoiced";
    quote.convertedInvoice = inv._id;
    await quote.save();

    res.status(200).json({ message: "Converted successfully", invoice: inv, quotation: quote });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getQuotations, createQuotation, updateQuotationStatus, convertQuotationToInvoice };

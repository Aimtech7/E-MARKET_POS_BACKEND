const DeliveryNote = require("../model/DeliveryNote");

const getDeliveryNotes = async (req, res) => {
  try {
    const notes = await DeliveryNote.find().populate("invoiceReference customerReference").sort({ createdAt: -1 });
    res.status(200).json(notes);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createDeliveryNote = async (req, res) => {
  try {
    const { invoiceReference, customerReference, customerName, deliveryAddress, items, notes } = req.body;
    const note = await DeliveryNote.create({
      deliveryNoteNumber: `DN-${Date.now()}`,
      invoiceReference,
      customerReference,
      customerName: customerName || "Walk-in Customer",
      deliveryAddress,
      items: items || [],
      deliveryStatus: "Pending",
      notes
    });
    res.status(201).json(note);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateDeliveryStatus = async (req, res) => {
  try {
    const { status, dispatchedBy, receivedBy } = req.body;
    const updated = await DeliveryNote.findByIdAndUpdate(
      req.params.id, 
      { deliveryStatus: status, dispatchedBy, receivedBy }, 
      { new: true }
    );
    res.status(200).json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const printDeliveryNotePdf = async (req, res) => {
  try {
    const note = await DeliveryNote.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Delivery note not found" });
    // Return mock PDF or HTML receipt representation
    res.status(200).json({ message: "PDF Generated", deliveryNoteNumber: note.deliveryNoteNumber, status: note.deliveryStatus });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getDeliveryNotes, createDeliveryNote, updateDeliveryStatus, printDeliveryNotePdf };

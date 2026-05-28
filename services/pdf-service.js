const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const generateInvoicePDF = (invoice, cart, filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A6", margin: 15 });

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Store Header / Branding
      doc
        .fillColor("#111111")
        .fontSize(16)
        .text("EMMARKET SUPERMARKET", { align: "center" })
        .fontSize(8)
        .text("123 Market Street, Cityville", { align: "center" })
        .text("Tel: +123-456-7890", { align: "center" })
        .moveDown(1);

      // Transaction Info
      doc
        .fontSize(8)
        .text(`Invoice No: ${invoice.invoiceNumber}`)
        .text(`Date: ${new Date(invoice.timestamp).toLocaleString()}`)
        .text(`Cashier: ${invoice.cashier}`)
        .text(`Payment Method: ${invoice.paymentMethod}`)
        .moveDown(1);

      // Table Header
      doc
        .fontSize(8)
        .text("Item", 15, doc.y, { width: 100, continued: true })
        .text("Qty", 120, doc.y, { width: 30, continued: true })
        .text("Price", 160, doc.y, { width: 40, continued: true })
        .text("Total", doc.x, doc.y, { align: "right" });

      doc.moveTo(15, doc.y + 2).lineTo(280, doc.y + 2).stroke();
      doc.moveDown(0.5);

      let subtotal = 0;

      // Table Rows
      cart.products.forEach((p) => {
        const itemTotal = p.qty * p.product.productPrice;
        subtotal += itemTotal;

        const currentY = doc.y;
        doc
          .fontSize(7)
          .text(p.product.productName, 15, currentY, { width: 100 })
          .text(p.qty.toString(), 120, currentY, { width: 30 })
          .text(`$${p.product.productPrice.toFixed(2)}`, 160, currentY, { width: 40 })
          .text(`$${itemTotal.toFixed(2)}`, 15, currentY, { align: "right" });
        
        doc.moveDown(0.5);
      });

      doc.moveTo(15, doc.y + 2).lineTo(280, doc.y + 2).stroke();
      doc.moveDown(0.5);

      // Financial calculations
      const discountAmount = subtotal * cart.discount;
      const taxAmount = (subtotal - discountAmount) * cart.tax;
      const finalTotal = subtotal - discountAmount + taxAmount;

      doc
        .fontSize(8)
        .text(`Subtotal: $${subtotal.toFixed(2)}`, { align: "right" })
        .text(`Discount (${(cart.discount * 100).toFixed(0)}%): -$${discountAmount.toFixed(2)}`, { align: "right" })
        .text(`Tax (${(cart.tax * 100).toFixed(0)}%): +$${taxAmount.toFixed(2)}`, { align: "right" })
        .fontSize(10)
        .text(`Total: $${finalTotal.toFixed(2)}`, { align: "right" })
        .fontSize(8)
        .text(`Amount Paid: $${invoice.amountPaid.toFixed(2)}`, { align: "right" })
        .text(`Change Given: $${invoice.changeGiven.toFixed(2)}`, { align: "right" })
        .moveDown(1.5);

      // Footer
      doc
        .fontSize(8)
        .text("Thank you for shopping with us!", { align: "center" })
        .text("Please retain this receipt as proof of purchase.", { align: "center" });

      doc.end();

      stream.on("finish", () => {
        resolve(filePath);
      });

      stream.on("error", (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateInvoicePDF };

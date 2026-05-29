const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const generateReceiptPDF = (receipt, filePath) => {
  return new Promise((resolve, reject) => {
    try {
      // 80mm thermal paper receipt dimensions (approx width 226 points)
      const doc = new PDFDocument({ 
        size: [226, 800], 
        margin: 10 
      });

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Store Header
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text("EMMARKET SUPERMARKET", { align: "center" })
        .fontSize(8)
        .font('Helvetica')
        .text("123 Market Street, Cityville", { align: "center" })
        .text("Tel: +123-456-7890", { align: "center" })
        .moveDown(1);

      // Receipt Info
      doc
        .fontSize(8)
        .text(`Receipt #: ${receipt.receiptNumber}`)
        .text(`Date: ${new Date(receipt.timestamp).toLocaleString()}`)
        .text(`Cashier: ${receipt.cashier}`)
        .text(`Customer: ${receipt.customer}`)
        .moveDown(1);

      // Separator
      doc.text("------------------------------------------", { align: "center" }).moveDown(0.5);

      // Items Header
      doc.text("Item", 10, doc.y, { width: 100, continued: true })
         .text("Qty", 110, doc.y, { width: 30, continued: true })
         .text("Price", 140, doc.y, { width: 40, continued: true })
         .text("Total", doc.x, doc.y, { align: "right" });
         
      doc.moveDown(0.5);
      doc.text("------------------------------------------", 10, doc.y, { align: "center" }).moveDown(0.5);

      // Items
      receipt.items.forEach((item) => {
        const itemTotal = item.qty * item.unitPrice;
        const currentY = doc.y;
        
        doc.text(item.productName.substring(0, 20), 10, currentY, { width: 100 })
           .text(item.qty.toString(), 110, currentY, { width: 30 })
           .text(item.unitPrice.toFixed(2), 140, currentY, { width: 40 })
           .text(itemTotal.toFixed(2), 10, currentY, { align: "right" });
        
        doc.moveDown(0.5);
      });

      doc.text("------------------------------------------", { align: "center" }).moveDown(0.5);

      // Totals
      doc.text(`Subtotal:`, 10, doc.y, { continued: true }).text(`${receipt.subtotal.toFixed(2)}`, { align: "right" });
      
      if (receipt.discount > 0) {
        doc.text(`Discount:`, 10, doc.y, { continued: true }).text(`-${receipt.discount.toFixed(2)}`, { align: "right" });
      }
      
      if (receipt.tax > 0) {
        doc.text(`Tax:`, 10, doc.y, { continued: true }).text(`+${receipt.tax.toFixed(2)}`, { align: "right" });
      }

      doc.moveDown(0.5);
      doc.font('Helvetica-Bold')
         .fontSize(10)
         .text(`TOTAL:`, 10, doc.y, { continued: true }).text(`${receipt.grandTotal.toFixed(2)}`, { align: "right" })
         .moveDown(0.5);
         
      doc.font('Helvetica')
         .fontSize(8)
         .text(`Paid (${receipt.paymentMethod}):`, 10, doc.y, { continued: true }).text(`${receipt.amountPaid.toFixed(2)}`, { align: "right" })
         .text(`Change:`, 10, doc.y, { continued: true }).text(`${receipt.changeGiven.toFixed(2)}`, { align: "right" })
         .moveDown(1.5);

      // Footer
      doc.text("Thank you for shopping with us!", { align: "center" })
         .text("Please retain this receipt.", { align: "center" });

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

module.exports = { generateReceiptPDF };

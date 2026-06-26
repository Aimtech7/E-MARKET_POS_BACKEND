const crypto = require("crypto");
const Receipt = require("../model/Receipt");

class EtimsService {
  constructor() {
    this.kraPin = process.env.KRA_PIN || "P051234567Z";
    this.bhfId = process.env.KRA_BRANCH_ID || "00";
    this.deviceSerial = process.env.KRA_VSCU_SERIAL || "VSCU-KENYA-9910";
  }

  generateControlCode(receiptNo, amount, timestamp) {
    const raw = `${this.kraPin}${receiptNo}${amount}${timestamp}`;
    const hash = crypto.createHash("sha256").update(raw).digest("hex").toUpperCase();
    return `${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}`;
  }

  formatInvoicePayload(receipt) {
    const isExempt = (receipt.items || []).some(i => (i.productName || "").toLowerCase().includes("book"));
    const taxRate = isExempt ? 0 : 0.16;
    const netAmount = receipt.grandTotal / (1 + taxRate);
    const vatAmount = receipt.grandTotal - netAmount;
    const ctrlCode = this.generateControlCode(receipt.receiptNumber, receipt.grandTotal, Date.now());

    return {
      invcNo: receipt.receiptNumber,
      orgInvcNo: 0,
      custTin: receipt.customerTin || "",
      custNm: receipt.customer || "Walk-in Buyer",
      salesTyCd: "N",
      rcptTyCd: "S",
      pmtTyCd: (receipt.paymentMethod || "CASH").toUpperCase() === "CASH" ? "01" : "05",
      salesSttsCd: "02", // Approved
      cfmDt: new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14),
      salesDt: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
      totItemCnt: (receipt.items || []).length,
      taxblAmtA: isExempt ? receipt.grandTotal : 0, // Exempt
      taxblAmtB: isExempt ? 0 : Number(netAmount.toFixed(2)), // 16% VAT
      taxRtB: 16,
      taxAmtB: isExempt ? 0 : Number(vatAmount.toFixed(2)),
      totTaxblAmt: Number(netAmount.toFixed(2)),
      totTaxAmt: Number(vatAmount.toFixed(2)),
      totAmt: receipt.grandTotal,
      prtrId: receipt.cashier || "Admin",
      vscuRcptPbctDt: new Date().toISOString(),
      sdcId: this.deviceSerial,
      mrcNo: ctrlCode,
      qrVerificationUrl: `https://etims.kra.go.ke/common/link/verify?tin=${this.kraPin}&bhfId=${this.bhfId}&invcNo=${receipt.receiptNumber}&crcl=${ctrlCode}`
    };
  }

  async getDailyTaxReport() {
    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(); end.setHours(23,59,59,999);

    const receipts = await Receipt.find({ timestamp: { $gte: start, $lte: end } });
    let totalGross = 0, totalVat = 0, totalExempt = 0;

    receipts.forEach(r => {
      totalGross += r.grandTotal;
      const hasBook = (r.items || []).some(i => (i.productName || "").toLowerCase().includes("book"));
      if (hasBook) {
        totalExempt += r.grandTotal;
      } else {
        const net = r.grandTotal / 1.16;
        totalVat += (r.grandTotal - net);
      }
    });

    return {
      kraPin: this.kraPin,
      branchId: this.bhfId,
      date: new Date().toISOString().slice(0, 10),
      zReportNumber: `Z-${Date.now().toString().slice(-6)}`,
      totalInvoicesCount: receipts.length,
      grossRevenue: Number(totalGross.toFixed(2)),
      vatableSalesNet: Number((totalGross - totalExempt - totalVat).toFixed(2)),
      totalVatTransmitted: Number(totalVat.toFixed(2)),
      exemptBookshopSales: Number(totalExempt.toFixed(2)),
      status: "COMPLIANT_READY_FOR_TRANSMISSION"
    };
  }
}

module.exports = new EtimsService();

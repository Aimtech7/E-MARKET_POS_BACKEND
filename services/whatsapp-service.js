const Notification = require("../model/Notification");

class WhatsappService {
  constructor() {
    this.apiToken = process.env.WHATSAPP_API_TOKEN || "";
    this.phoneId = process.env.WHATSAPP_PHONE_ID || "";
    this.baseUrl = `https://graph.facebook.com/v18.0/${this.phoneId}/messages`;
  }

  async sendDigitalReceipt(phone, receiptData) {
    let formattedPhone = String(phone).replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith("0")) formattedPhone = `254${formattedPhone.slice(1)}`;

    const messageText = `*E-MARKET POS OFFICIAL RECEIPT*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🧾 Receipt No: *${receiptData.receiptNumber}*\n` +
      `📅 Date: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}\n` +
      `👤 Cashier: ${receiptData.cashier}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 *Total Paid: KSH ${Number(receiptData.grandTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}*\n` +
      `💳 Method: ${receiptData.paymentMethod}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Thank you for shopping at E-Market Commercial Retail & Bookshop! 📚🛍️\n` +
      `Keep this digital receipt for warranty or return verification.`;

    try {
      if (this.apiToken && this.phoneId) {
        const response = await fetch(this.baseUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.apiToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: formattedPhone,
            type: "text",
            text: { body: messageText }
          })
        });
        const resData = await response.json();
        if (!response.ok) throw new Error(resData.error?.message || "WhatsApp Cloud API Error");
      } else {
        console.log(`[WHATSAPP DISPATCH SIMULATION] Sent Receipt ${receiptData.receiptNumber} to +${formattedPhone}`);
      }

      await Notification.create({
        title: "WhatsApp Receipt Sent",
        message: `Digital receipt ${receiptData.receiptNumber} dispatched to +${formattedPhone}`,
        type: "info"
      });

      return { success: true, recipient: formattedPhone };
    } catch (err) {
      console.error("WhatsApp Dispatch Error:", err.message);
      return { success: false, error: err.message };
    }
  }

  async sendExecutiveClosingReport(ownerPhone, reportSummary) {
    let formattedPhone = String(ownerPhone).replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith("0")) formattedPhone = `254${formattedPhone.slice(1)}`;

    const text = `📊 *E-MARKET 9:00 PM CLOSING REPORT*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📅 Date: ${new Date().toLocaleDateString('en-GB')}\n` +
      `💰 Gross Sales: KSH ${reportSummary.revenue.toLocaleString()}\n` +
      `📱 M-Pesa Total: KSH ${reportSummary.mpesa.toLocaleString()}\n` +
      `💵 Cash Drawer: KSH ${reportSummary.cash.toLocaleString()}\n` +
      `📦 Total Orders: ${reportSummary.orders}\n` +
      `📉 Expenses: KSH ${reportSummary.expenses.toLocaleString()}\n` +
      `🟢 *Net Profit: KSH ${reportSummary.netProfit.toLocaleString()}*\n` +
      `⚠️ Low Stock Alerts: ${reportSummary.lowStockCount} items`;

    try {
      if (this.apiToken && this.phoneId) {
        await fetch(this.baseUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.apiToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: formattedPhone,
            type: "text",
            text: { body: text }
          })
        });
      } else {
        console.log(`[WHATSAPP 9 PM CLOSING SIMULATION] Sent Executive Report to +${formattedPhone}\n${text}`);
      }
      return { success: true };
    } catch (e) {
      console.error("Owner Closing Dispatch Error:", e.message);
      return { success: false };
    }
  }
}

module.exports = new WhatsappService();

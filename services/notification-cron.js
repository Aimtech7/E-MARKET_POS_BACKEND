const whatsappService = require("./whatsapp-service");
const Receipt = require("../model/Receipt");
const Expense = require("../model/Expense");
const Product = require("../model/Product");

class NotificationCron {
  constructor() {
    this.timer = null;
    this.lastRunDate = "";
  }

  start() {
    // Check every 60 seconds
    this.timer = setInterval(() => this.checkAndRun(), 60000);
    console.log("📅 Evening Executive Closing Scheduler Initialized (Target: 21:00 Daily)");
  }

  async checkAndRun() {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    
    // Trigger at 9 PM (21:00 local server time)
    if (now.getHours() === 21 && this.lastRunDate !== todayStr) {
      this.lastRunDate = todayStr;
      await this.dispatchEveningReport();
    }
  }

  async dispatchEveningReport() {
    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(); end.setHours(23,59,59,999);

    try {
      const receipts = await Receipt.find({ timestamp: { $gte: start, $lte: end } });
      const expenses = await Expense.find({ date: { $gte: start, $lte: end } });
      const lowStockCount = await Product.countDocuments({ $expr: { $lte: ["$stockQuantity", "$reorderLevel"] } });

      let rev = 0, mpesa = 0, cash = 0;
      receipts.forEach(r => {
        rev += r.grandTotal;
        if ((r.paymentMethod || "").toLowerCase().includes("mpesa")) mpesa += r.grandTotal;
        else cash += r.grandTotal;
      });

      const expTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const netProfit = rev * 0.22 - expTotal; // Estimated 22% retail margin minus oexp

      const ownerPhone = process.env.OWNER_PHONE_NUMBER || "254712345678";
      await whatsappService.sendExecutiveClosingReport(ownerPhone, {
        revenue: rev,
        mpesa,
        cash,
        orders: receipts.length,
        expenses: expTotal,
        netProfit,
        lowStockCount
      });
    } catch (e) {
      console.error("Evening Dispatch Failed:", e.message);
    }
  }
}

module.exports = new NotificationCron();

const express = require("express");
const bodyParser = require("body-parser");
const { default: mongoose } = require("mongoose");
const categoryRoute = require("./routes/catgeory-route");
const unitOfMeasureRoute = require("./routes/unitOfmeasure-route");
const productRoute = require("./routes/product-route");
const userRoute = require("./routes/user-route");
const cartRoute = require("./routes/cart-route");
const invoiceRoute = require("./routes/invoice-route");
const transactionRoute = require("./routes/transaction-route");
const auditLogger = require("./middleware/audit-logger");
const supplierRoute = require("./routes/supplier-route");
const poRoute = require("./routes/po-route");
const inventoryRoute = require("./routes/inventory-route");
const receiptRoute = require("./routes/receipt-route");
const analyticsRoute = require("./routes/analytics-route");
const reportRoute = require("./routes/report-route");
const settingsRoute = require("./routes/settings-route");
const auditRoute = require("./routes/audit-route");
const backupRoute = require("./routes/backup-route");
const refundRoute = require("./routes/refund-route");
const closureRoute = require("./routes/closure-route");
const customerRoute = require("./routes/customer-route");
const notificationRoute = require("./routes/notification-route");
const expenseRoute = require("./routes/expense-route");
const debtRoute = require("./routes/debt-route");

let dotenv = require("dotenv").config();

const app = express();
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE"
  );
  next();
});

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");

app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(mongoSanitize());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use(limiter);

app.use(bodyParser.json());
app.use(auditLogger);
let gfsBucket;
mongoose.connection.once("open", () => {
  gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "uploads"
  });
});

app.get('/uploads/:filename', async (req, res) => {
  try {
    if (!gfsBucket) return res.status(500).json({ message: "GridFS not initialized" });
    const file = await gfsBucket.find({ filename: req.params.filename }).toArray();
    if (!file || file.length === 0) {
      return res.status(404).json({ message: "File not found" });
    }
    gfsBucket.openDownloadStreamByName(req.params.filename).pipe(res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.use("/category", categoryRoute);
app.use("/unit", unitOfMeasureRoute);
app.use("/product", productRoute);
app.use("/user", userRoute);
app.use("/cart", cartRoute);
app.use("/invoice", invoiceRoute);
app.use("/transaction", transactionRoute);
app.use("/supplier", supplierRoute);
app.use("/po", poRoute);
app.use("/inventory", inventoryRoute);
app.use("/receipt", receiptRoute);
app.use("/analytics", analyticsRoute);
app.use("/reports", reportRoute);
app.use("/settings", settingsRoute);
app.use("/audit", auditRoute);
app.use("/backups", backupRoute);
app.use("/refunds", refundRoute);
app.use("/closures", closureRoute);
app.use("/customer", customerRoute);
app.use("/notifications", notificationRoute);
app.use("/expenses", expenseRoute);
app.use("/debts", debtRoute);

app.get("/", async (req, res) => {

  return res.status(404).json({ message: "Error page not Found 404" });
});
const seedDefaultUsers = require("./seeds/default-users");

if (require.main === module) {
  mongoose
    .connect(process.env.MONGOPATH)
    .then(async (res) => {
      console.log("Connected to MongoDB.");
      // Run the seeder logic
      await seedDefaultUsers();
      
      app.listen(process.env.PORT, () => {
        console.log("SERVER RUNNING ON PORT " + process.env.PORT);
      });
    })
    .catch((err) => {
      console.log(err);
    });
}

module.exports = app;

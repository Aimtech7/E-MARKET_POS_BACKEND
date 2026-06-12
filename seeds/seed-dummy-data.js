const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Receipt = require("../model/Receipt");
const Product = require("../model/Product");
const Category = require("../model/Category");
const UnitOfMeasure = require("../model/UnitOfMeasure");
const User = require("../model/User");
const seedDefaultUsers = require("./default-users");

const DUMMY_IMAGE_URL = "https://via.placeholder.com/150";

async function runSeeder() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGOPATH || "mongodb://localhost:27017/emmarket_production");

    // 1. Seed Users
    await seedDefaultUsers();

    // 2. Seed Categories & Units
    console.log("Creating categories and units...");
    const catBeverages = await Category.findOneAndUpdate({ categoryName: "Beverages" }, { categoryName: "Beverages" }, { upsert: true, new: true });
    const catSnacks = await Category.findOneAndUpdate({ categoryName: "Snacks" }, { categoryName: "Snacks" }, { upsert: true, new: true });
    
    const unitPcs = await UnitOfMeasure.findOneAndUpdate({ unitOfMeasureName: "pcs" }, { unitOfMeasureName: "pcs", baseUnitOfMeasure: "pcs", conversionFactor: 1 }, { upsert: true, new: true });
    const unitBox = await UnitOfMeasure.findOneAndUpdate({ unitOfMeasureName: "box" }, { unitOfMeasureName: "box", baseUnitOfMeasure: "box", conversionFactor: 1 }, { upsert: true, new: true });

    // 3. Seed Products
    console.log("Creating products...");
    const productsData = [
      {
        productName: "Coca Cola 330ml",
        productCategory: catBeverages._id,
        unitOfMeasure: unitPcs._id,
        productImage: "public\\uploads\\dummy.jpg",
        productPrice: 1.5,
        costPrice: 0.8,
        sellingPrice: 1.5,
        profitMargin: 46.6,
        stockQuantity: 150,
        sku: "SKU-COCA-123",
        barcode: "123456789012"
      },
      {
        productName: "Lays Classic Potato Chips",
        productCategory: catSnacks._id,
        unitOfMeasure: unitPcs._id,
        productImage: "public\\uploads\\dummy.jpg",
        productPrice: 2.0,
        costPrice: 1.0,
        sellingPrice: 2.0,
        profitMargin: 50.0,
        stockQuantity: 200,
        sku: "SKU-LAYS-124",
        barcode: "123456789013"
      },
      {
        productName: "Oreo Cookies Box",
        productCategory: catSnacks._id,
        unitOfMeasure: unitBox._id,
        productImage: "public\\uploads\\dummy.jpg",
        productPrice: 4.5,
        costPrice: 2.5,
        sellingPrice: 4.5,
        profitMargin: 44.4,
        stockQuantity: 50,
        sku: "SKU-OREO-125",
        barcode: "123456789014"
      }
    ];

    const products = [];
    for (const p of productsData) {
      const prod = await Product.findOneAndUpdate({ sku: p.sku }, p, { upsert: true, new: true });
      products.push(prod);
    }

    // 4. Seed Dummy Receipts (Sales)
    console.log("Generating dummy sales data...");
    await Receipt.deleteMany({}); // Optional: clear existing test data
    
    const receipts = [];
    let receiptCounter = 1000;
    
    // Generate sales for the last 10 days
    for (let i = 0; i < 10; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // 2-5 receipts per day
      const receiptsPerDay = Math.floor(Math.random() * 4) + 2; 
      
      for (let j = 0; j < receiptsPerDay; j++) {
        // Randomize time in the day
        const timestamp = new Date(date);
        timestamp.setHours(Math.floor(Math.random() * 8) + 9); // between 9 AM and 5 PM
        timestamp.setMinutes(Math.floor(Math.random() * 60));

        const cartItems = [];
        let subtotal = 0;
        let totalCost = 0;

        // Add 1-3 random products to the receipt
        const itemsCount = Math.floor(Math.random() * 3) + 1;
        for (let k = 0; k < itemsCount; k++) {
          const product = products[Math.floor(Math.random() * products.length)];
          const qty = Math.floor(Math.random() * 3) + 1;
          
          cartItems.push({
            productName: product.productName,
            qty: qty,
            unitPrice: product.sellingPrice,
            costPrice: product.costPrice
          });
          
          subtotal += product.sellingPrice * qty;
          totalCost += product.costPrice * qty;
        }

        const discount = 0;
        const tax = subtotal * 0.1; // 10% tax for dummy
        const grandTotal = subtotal + tax - discount;
        const profit = grandTotal - totalCost; // simplistic profit calculation

        const receipt = new Receipt({
          receiptNumber: `REC-${receiptCounter++}`,
          invoiceReference: new mongoose.Types.ObjectId(),
          cartReference: new mongoose.Types.ObjectId(),
          customer: "Walk-in",
          cashier: "admin",
          items: cartItems,
          totalCost: totalCost,
          profit: profit,
          subtotal: subtotal,
          discount: discount,
          tax: tax,
          grandTotal: grandTotal,
          amountPaid: grandTotal,
          changeGiven: 0,
          paymentMethod: "Cash",
          timestamp: timestamp
        });

        receipts.push(receipt);
      }
    }
    
    await Receipt.insertMany(receipts);
    console.log(`Successfully generated ${receipts.length} dummy receipts!`);

    console.log("Seeding complete! You can now test the POS with data and goods.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
}

runSeeder();

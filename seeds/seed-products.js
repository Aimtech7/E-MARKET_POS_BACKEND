const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Product = require("../model/Product");
const Category = require("../model/Category");
const UnitOfMeasure = require("../model/UnitOfMeasure");

const DUMMY_IMAGE_URL = "https://via.placeholder.com/150";

async function seedProducts() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGOPATH || "mongodb://localhost:27017/emmarket_production");

    console.log("Creating categories and units...");
    const catBeverages = await Category.findOneAndUpdate({ categoryName: "Beverages" }, { categoryName: "Beverages" }, { upsert: true, new: true });
    const catSnacks = await Category.findOneAndUpdate({ categoryName: "Snacks" }, { categoryName: "Snacks" }, { upsert: true, new: true });
    
    const unitPcs = await UnitOfMeasure.findOneAndUpdate({ unitOfMeasureName: "pcs" }, { unitOfMeasureName: "pcs", baseUnitOfMeasure: "pcs", conversionFactor: 1 }, { upsert: true, new: true });
    const unitBox = await UnitOfMeasure.findOneAndUpdate({ unitOfMeasureName: "box" }, { unitOfMeasureName: "box", baseUnitOfMeasure: "box", conversionFactor: 1 }, { upsert: true, new: true });

    console.log("Creating products...");
    const products = [
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

    // Ensure dummy image file exists
    const uploadsDir = path.join(__dirname, "../public/uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const dummyImgPath = path.join(uploadsDir, "dummy.jpg");
    if (!fs.existsSync(dummyImgPath)) {
      fs.writeFileSync(dummyImgPath, "dummy image content"); // In real app, you might download an actual image
    }

    for (const p of products) {
      await Product.findOneAndUpdate({ sku: p.sku }, p, { upsert: true });
    }

    console.log("Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
}

seedProducts();

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./model/Product');
const Category = require('./model/Category');
const InventoryMovement = require('./model/InventoryMovement');

const testInventory = async () => {
  console.log("=========================================================================");
  console.log("INVENTORY COMPREHENSIVE AUDIT");
  console.log("=========================================================================");
  console.log("Timestamp     : " + new Date().toISOString());
  console.log("=========================================================================\n");

  let testResults = {};

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
  });

  // TEST 1: Product CRUD
  console.log("TEST 1: Product CRUD Operations");
  try {
    const category = await Category.findOne({});
    const testProduct = await Product.create({
      productName: "Test Product",
      productCategory: category ? category._id : null,
      unitOfMeasure: category ? category._id : null,
      productImage: "test.jpg",
      productPrice: 100,
      costPrice: 80,
      sellingPrice: 100,
      profitMargin: 20,
      barcode: `TEST${Date.now()}`,
      stockQuantity: 50,
      reorderLevel: 10,
      sku: `SKU-${Date.now()}`,
      isArchived: false
    });
    
    console.log(`  OK Product created: ${testProduct.productName}`);
    console.log(`  OK SKU: ${testProduct.sku}`);
    console.log(`  OK Barcode: ${testProduct.barcode}`);
    console.log(`  OK Stock: ${testProduct.stockQuantity}`);
    testResults['Product CRUD'] = 'PASSED';
    testResults['TestProductId'] = testProduct._id;
    
    await Product.findByIdAndDelete(testProduct._id);
  } catch (error) {
    console.error("  FAIL Product CRUD Error:", error.message);
    testResults['Product CRUD'] = `FAILED: ${error.message}`;
  }

  //	TEST 2: Category Management
  console.log("\nTEST 2: Category Management");
  try {
    const categories = await Category.find({});
    console.log(`  OK Found ${categories.length} categories`);
    
    if (categories.length > 0) {
      categories.forEach(cat => {
        console.log(`    - ${cat.categoryName || cat.name || 'Unnamed'}`);
      });
      testResults['Category Management'] = 'PASSED';
      testResults['CategoryCount'] = categories.length;
    } else {
      console.error("  FAIL No categories found");
      testResults['Category Management'] = 'FAILED';
    }
  } catch (error) {
    console.error("  FAIL Category Error:", error.message);
    testResults['Category Management'] = `FAILED: ${error.message}`;
  }

  // TEST 3: Low Stock Detection
  console.log("\nTEST 3: Low Stock Detection");
  try {
    const lowStockProducts = await Product.find({ 
      stockQuantity: { $lte: 5 }
    });
    
    console.log(`  OK Found ${lowStockProducts.length} low stock products`);
    lowStockProducts.forEach(p => {
      console.log(`    - ${p.productName}: ${p.stockQuantity} (reorder at ${p.reorderLevel})`);
    });
    testResults['Low Stock Detection'] = 'PASSED';
  } catch (error) {
    console.error("  FAIL Low Stock Error:", error.message);
    testResults['Low Stock Detection'] = `FAILED: ${error.message}`;
  }

  // TEST 4: Bookshop-Specific Fields
  console.log("\nTEST 4: Bookshop-Specific Fields");
  try {
    const bookProduct = await Product.findOne({ isbn: { $exists: true, $ne: null } });
    
    if (bookProduct) {
      console.log(`  OK Found book product: ${bookProduct.productName}`);
      console.log(`  OK ISBN: ${bookProduct.isbn}`);
      console.log(`  OK Author: ${bookProduct.author}`);
      console.log(`  OK Publisher: ${bookProduct.publisher}`);
      console.log(`  OK Genre: ${bookProduct.genre}`);
      console.log(`  OK Edition: ${bookProduct.edition}`);
      testResults['Bookshop Fields'] = 'PASSED';
    } else {
      console.log("  WARN No book products found (ISBN field)");
      testResults['Bookshop Fields'] = 'WARNING: No books';
    }
  } catch (error) {
    console.error("  FAIL Bookshop Fields Error:", error.message);
    testResults['Bookshop Fields'] = `FAILED: ${error.message}`;
  }

  // TEST 5: Stock Movement Recording
  console.log("\nTEST 5: Stock Movement Recording");
  try {
    const movement = await InventoryMovement.create({
      product: testResults['TestProductId'] || (await Product.findOne({}))._id,
      type: "sale",
      qty: 5,
      reason: "Test sale"
    });
    
    console.log(`  OK Stock movement recorded`);
    console.log(`  OK Movement type: ${movement.type}`);
    console.log(`  OK Quantity: ${movement.qty}`);
    testResults['Stock Movement'] = 'PASSED';
    
    await InventoryMovement.findByIdAndDelete(movement._id);
  } catch (error) {
    console.error("  FAIL Stock Movement Error:", error.message);
    testResults['Stock Movement'] = `FAILED: ${error.message}`;
  }

  // TEST 6: Product Search by SKU
  console.log("\nTEST 6: Product Search by SKU");
  try {
    const productWithSku = await Product.findOne({ sku: { $exists: true, $ne: null } });
    
    if (productWithSku) {
      console.log(`  OK Found product by SKU: ${productWithSku.sku}`);
      console.log(`  OK Product: ${productWithSku.productName}`);
      testResults['SKU Search'] = 'PASSED';
    } else {
      console.log("  WARN No products with SKU found");
      testResults['SKU Search'] = 'WARNING: No SKUs';
    }
  } catch (error) {
    console.error("  FAIL SKU Search Error:", error.message);
    testResults['SKU Search'] = `FAILED: ${error.message}`;
  }

  // TEST 7: Product Archiving
  console.log("\nTEST 7: Product Archiving");
  try {
    const testProduct = await Product.create({
      productName: "Archive Test",
      productCategory: (await Category.findOne({}))?._id,
      unitOfMeasure: (await Category.findOne({}))?._id,
      productImage: "test.jpg",
      productPrice: 50,
      barcode: `ARCHIVE${Date.now()}`,
      stockQuantity: 0,
      isArchived: false
    });
    
    const archivedProduct = await Product.findByIdAndUpdate(
      testProduct._id,
      { isArchived: true },
      { new: true }
    );
    
    if (archivedProduct.isArchived === true) {
      console.log(`  OK Product archived successfully`);
      testResults['Product Archiving'] = 'PASSED';
    } else {
      console.error("  FAIL Archiving failed");
      testResults['Product Archiving'] = 'FAILED';
    }
    
    await Product.findByIdAndDelete(testProduct._id);
  } catch (error) {
    console.error("  FAIL Archiving Error:", error.message);
    testResults['Product Archiving'] = `FAILED: ${error.message}`;
  }

  // TEST 8: Batch Number Tracking
  console.log("\nTEST 8: Batch Number Tracking");
  try {
    const productWithBatch = await Product.findOne({ batchNumber: { $exists: true, $ne: null } });
    
    if (productWithBatch) {
      console.log(`  OK Found product with batch: ${productWithBatch.batchNumber}`);
      console.log(`  OK Product: ${productWithBatch.productName}`);
      testResults['Batch Tracking'] = 'PASSED';
    } else {
      console.log("  WARN No products with batch numbers");
      testResults['Batch Tracking'] = 'WARNING: No batches';
    }
  } catch (error) {
    console.error("  FAIL Batch Tracking Error:", error.message);
    testResults['Batch Tracking'] = `FAILED: ${error.message}`;
  }

  // TEST 9: Expiry Date Tracking
  console.log("\nTEST 9: Expiry Date Tracking");
  try {
    const productWithExpiry = await Product.findOne({ expiryDate: { $exists: true, $ne: null } });
    
    if (productWithExpiry) {
      console.log(`  OK Found product with expiry: ${productWithExpiry.expiryDate}`);
      console.log(`  OK Product: ${productWithExpiry.productName}`);
      testResults['Expiry Tracking'] = 'PASSED';
    } else {
      console.log("  WARN No products with expiry dates");
      testResults['Expiry Tracking'] = 'WARNING: No expiry dates';
    }
  } catch (error) {
    console.error("  FAIL Expiry Tracking Error:", error.message);
    testResults['Expiry Tracking'] = `FAILED: ${error.message}`;
  }

  // TEST 10: Supplier Reference
  console.log("\nTEST 10: Supplier Reference");
  try {
    const productWithSupplier = await Product.findOne({ supplierReference: { $exists: true, $ne: null } });
    
    if (productWithSupplier) {
      console.log(`  OK Found product with supplier reference`);
      console.log(`  OK Product: ${productWithSupplier.productName}`);
      testResults['Supplier Reference'] = 'PASSED';
    } else {
      console.log("  WARN No products with supplier references");
      testResults['Supplier Reference'] = 'WARNING: No supplier refs';
    }
  } catch (error) {
    console.error("  FAIL Supplier Reference Error:", error.message);
    testResults['Supplier Reference'] = `FAILED: ${error.message}`;
  }

  // FINAL SUMMARY
  console.log("\n=========================================================================");
  console.log("INVENTORY AUDIT SUMMARY");
  console.log("=========================================================================");
  for (const [test, result] of Object.entries(testResults)) {
    const resultStr = String(result);
    const status = resultStr.includes('PASSED') ? 'PASS' : (resultStr.includes('FAILED') ? 'FAIL' : 'WARN');
    console.log(`  [${status}] ${test.padEnd(25)} : ${result}`);
  }
  console.log("=========================================================================\n");

  await mongoose.disconnect();
  process.exit(0);
};

testInventory();

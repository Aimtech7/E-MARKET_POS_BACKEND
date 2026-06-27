require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./model/Product');
const Category = require('./model/Category');
const Cart = require('./model/Cart');
const Invoice = require('./model/Invoice');
const Receipt = require('./model/Receipt');
const Transaction = require('./model/Transaction');

const testPOSWorkflow = async () => {
  console.log("=========================================================================");
  console.log("POS WORKFLOW COMPREHENSIVE AUDIT");
  console.log("=========================================================================");
  console.log("Timestamp     : " + new Date().toISOString());
  console.log("=========================================================================\n");

  let testResults = {};

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
  });

  // TEST 1: Product Search
  console.log("TEST 1: Product Search");
  try {
    const products = await Product.find({});
    console.log(`  OK Found ${products.length} products`);
    
    if (products.length > 0) {
      const firstProduct = products[0];
      console.log(`  OK Sample product: ${firstProduct.productName}`);
      console.log(`  OK Price: ${firstProduct.productPrice}`);
      console.log(`  OK Stock: ${firstProduct.stockQuantity}`);
      testResults['Product Search'] = 'PASSED';
      testResults['ProductCount'] = products.length;
    } else {
      console.error("  FAIL No products found");
      testResults['Product Search'] = 'FAILED';
    }
  } catch (error) {
    console.error("  FAIL Search Error:", error.message);
    testResults['Product Search'] = `FAILED: ${error.message}`;
  }

  // TEST 2: Barcode Search
  console.log("\nTEST 2: Barcode Search");
  try {
    const productWithBarcode = await Product.findOne({ barcode: { $exists: true, $ne: null } });
    
    if (productWithBarcode) {
      console.log(`  OK Found product with barcode: ${productWithBarcode.barcode}`);
      console.log(`  OK Product: ${productWithBarcode.productName}`);
      testResults['Barcode Search'] = 'PASSED';
    } else {
      console.log("  WARN No products with barcode found");
      testResults['Barcode Search'] = 'WARNING: No barcodes';
    }
  } catch (error) {
    console.error("  FAIL Barcode Error:", error.message);
    testResults['Barcode Search'] = `FAILED: ${error.message}`;
  }

  // TEST 3: Cart Creation
  console.log("\nTEST 3: Cart Creation");
  try {
    const testCart = await Cart.create({
      description: "Test Cart",
      tax: 0,
      discount: 0,
      products: []
    });
    
    if (testCart) {
      console.log(`  OK Cart created successfully`);
      console.log(`  OK Cart ID: ${testCart._id}`);
      testResults['Cart Creation'] = 'PASSED';
      testResults['TestCartId'] = testCart._id;
    } else {
      console.error("  FAIL Cart creation failed");
      testResults['Cart Creation'] = 'FAILED';
    }
  } catch (error) {
    console.error("  FAIL Cart Error:", error.message);
    testResults['Cart Creation'] = `FAILED: ${error.message}`;
  }

  // TEST 4: Add Item to Cart
  console.log("\nTEST 4: Add Item to Cart");
  try {
    const product = await Product.findOne({});
    const cart = await Cart.findOne({ _id: testResults['TestCartId'] });
    
    if (product && cart) {
      cart.products.push({
        product: product._id,
        qty: 2
      });
      
      const updatedCart = await cart.save();
      
      console.log(`  OK Item added to cart`);
      console.log(`  OK Product: ${product.productName}`);
      console.log(`  OK Quantity: 2`);
      testResults['Add to Cart'] = 'PASSED';
    } else {
      console.error("  FAIL Cannot add item - missing product or cart");
      testResults['Add to Cart'] = 'FAILED';
    }
  } catch (error) {
    console.error("  FAIL Add Item Error:", error.message);
    testResults['Add to Cart'] = `FAILED: ${error.message}`;
  }

  // TEST 5: Apply Discount
  console.log("\nTEST 5: Apply Discount");
  try {
    const cart = await Cart.findOne({ _id: testResults['TestCartId'] });
    
    if (cart) {
      cart.discount = 10; // 10% discount
      const updatedCart = await cart.save();
      
      console.log(`  OK Discount applied successfully`);
      console.log(`  OK Discount amount: ${cart.discount}`);
      testResults['Apply Discount'] = 'PASSED';
    } else {
      console.error("  FAIL Cart not found");
      testResults['Apply Discount'] = 'FAILED';
    }
  } catch (error) {
    console.error("  FAIL Discount Error:", error.message);
    testResults['Apply Discount'] = `FAILED: ${error.message}`;
  }

  // TEST 6: Apply Tax
  console.log("\nTEST 6: Apply Tax");
  try {
    const cart = await Cart.findOne({ _id: testResults['TestCartId'] });
    
    if (cart) {
      cart.tax = 16; // 16% VAT
      const updatedCart = await cart.save();
      
      console.log(`  OK Tax applied successfully`);
      console.log(`  OK Tax amount: ${cart.tax}`);
      testResults['Apply Tax'] = 'PASSED';
    } else {
      console.error("  FAIL Cart not found");
      testResults['Apply Tax'] = 'FAILED';
    }
  } catch (error) {
    console.error("  FAIL Tax Error:", error.message);
    testResults['Apply Tax'] = `FAILED: ${error.message}`;
  }

  // TEST 7: Checkout Process
  console.log("\nTEST 7: Checkout Process");
  try {
    const cart = await Cart.findOne({ _id: testResults['TestCartId'] });
    
    if (cart) {
      const invoice = await Invoice.create({
        invoiceNumber: `INV-${Date.now()}`,
        cart: cart._id,
        cashier: "test_cashier",
        amountPaid: 0,
        changeGiven: 0,
        paymentStatus: "Pending"
      });
      
      console.log(`  OK Invoice created successfully`);
      console.log(`  OK Invoice number: ${invoice.invoiceNumber}`);
      testResults['Checkout'] = 'PASSED';
      testResults['TestInvoiceId'] = invoice._id;
    } else {
      console.error("  FAIL Cart not found");
      testResults['Checkout'] = 'FAILED';
    }
  } catch (error) {
    console.error("  FAIL Checkout Error:", error.message);
    testResults['Checkout'] = `FAILED: ${error.message}`;
  }

  // TEST 8: Receipt Generation
  console.log("\nTEST 8: Receipt Generation");
  try {
    const invoice = await Invoice.findOne({ _id: testResults['TestInvoiceId'] });
    
    if (invoice) {
      const receipt = await Receipt.create({
        receiptNumber: `RCP-${Date.now()}`,
        invoiceReference: invoice._id,
        cartReference: invoice.cart,
        cashier: invoice.cashier,
        items: [],
        subtotal: 100,
        discount: 0,
        tax: 16,
        grandTotal: 116,
        amountPaid: 116,
        changeGiven: 0,
        paymentMethod: "Cash"
      });
      
      console.log(`  OK Receipt generated successfully`);
      console.log(`  OK Receipt number: ${receipt.receiptNumber}`);
      testResults['Receipt Generation'] = 'PASSED';
      testResults['TestReceiptId'] = receipt._id;
    } else {
      console.error("  FAIL Invoice not found");
      testResults['Receipt Generation'] = 'FAILED';
    }
  } catch (error) {
    console.error("  FAIL Receipt Error:", error.message);
    testResults['Receipt Generation'] = `FAILED: ${error.message}`;
  }

  // TEST 9: Transaction Recording
  console.log("\nTEST 9: Transaction Recording");
  try {
    const invoice = await Invoice.findOne({ _id: testResults['TestInvoiceId'] });
    
    if (invoice) {
      const transaction = await Transaction.create({
        transactionNumber: `TRX-${Date.now()}`,
        invoice: invoice._id,
        totalAmount: 116,
        paymentMethod: "Cash",
        paymentStatus: "completed",
        cashier: invoice.cashier
      });
      
      console.log(`  OK Transaction recorded successfully`);
      console.log(`  OK Transaction number: ${transaction.transactionNumber}`);
      testResults['Transaction Recording'] = 'PASSED';
    } else {
      console.error("  FAIL Invoice not found");
      testResults['Transaction Recording'] = 'FAILED';
    }
  } catch (error) {
    console.error("  FAIL Transaction Error:", error.message);
    testResults['Transaction Recording'] = `FAILED: ${error.message}`;
  }

  // TEST 10: Stock Update
  console.log("\nTEST 10: Stock Update After Sale");
  try {
    const cart = await Cart.findOne({ _id: testResults['TestCartId'] });
    
    if (cart && cart.products.length > 0) {
      for (const item of cart.products) {
        const product = await Product.findById(item.product);
        if (product) {
          product.stockQuantity -= item.qty;
          await product.save();
          console.log(`  OK Stock updated for ${product.productName}: ${product.stockQuantity}`);
        }
      }
      testResults['Stock Update'] = 'PASSED';
    } else {
      console.error("  FAIL Cart empty or not found");
      testResults['Stock Update'] = 'FAILED';
    }
  } catch (error) {
    console.error("  FAIL Stock Update Error:", error.message);
    testResults['Stock Update'] = `FAILED: ${error.message}`;
  }

  // Cleanup test data
  try {
    await Cart.findByIdAndDelete(testResults['TestCartId']);
    await Invoice.findByIdAndDelete(testResults['TestInvoiceId']);
    await Receipt.findByIdAndDelete(testResults['TestReceiptId']);
    console.log("\nOK Test data cleaned up");
  } catch (error) {
    console.log("\nWARN Cleanup error:", error.message);
  }

  // FINAL SUMMARY
  console.log("\n=========================================================================");
  console.log("POS WORKFLOW AUDIT SUMMARY");
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

testPOSWorkflow();

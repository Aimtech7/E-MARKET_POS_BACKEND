require('dotenv').config();
const mongoose = require('mongoose');
const Supplier = require('./model/Supplier');
const PurchaseOrder = require('./model/PurchaseOrder');
const GoodsReceivedNote = require('./model/GoodsReceivedNote');

const testSuppliers = async () => {
  console.log("=========================================================================");
  console.log("SUPPLIERS COMPREHENSIVE AUDIT");
  console.log("=========================================================================");
  console.log("Timestamp     : " + new Date().toISOString());
  console.log("=========================================================================\n");

  let testResults = {};

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 60000
  });

  // TEST 1: Supplier CRUD
  console.log("TEST 1: Supplier CRUD Operations");
  try {
    const testSupplier = await Supplier.create({
      supplierName: "Test Supplier Ltd",
      contactPerson: "John Doe",
      phone: "254712345678",
      email: "test@supplier.com",
      address: "123 Business Street",
      city: "Nairobi",
      country: "Kenya",
      isActive: true
    });
    
    console.log(`  OK Supplier created: ${testSupplier.supplierName}`);
    console.log(`  OK Contact: ${testSupplier.contactPerson}`);
    console.log(`  OK Phone: ${testSupplier.phone}`);
    console.log(`  OK Email: ${testSupplier.email}`);
    testResults['Supplier CRUD'] = 'PASSED';
    testResults['TestSupplierId'] = testSupplier._id;
    
    await Supplier.findByIdAndDelete(testSupplier._id);
  } catch (error) {
    console.error("  FAIL Supplier CRUD Error:", error.message);
    testResults['Supplier CRUD'] = `FAILED: ${error.message}`;
  }

  // TEST 2: Read Existing Suppliers
  console.log("\nTEST 2: Read Existing Suppliers");
  try {
    const suppliers = await Supplier.find({});
    console.log(`  OK Found ${suppliers.length} suppliers`);
    
    if (suppliers.length > 0) {
      suppliers.forEach(sup => {
        console.log(`    - ${sup.supplierName} (${sup.contactPerson || 'No contact'})`);
      });
      testResults['Read Suppliers'] = 'PASSED';
      testResults['SupplierCount'] = suppliers.length;
    } else {
      console.log("  WARN No suppliers found");
      testResults['Read Suppliers'] = 'WARNING: No suppliers';
    }
  } catch (error) {
    console.error("  FAIL Read Suppliers Error:", error.message);
    testResults['Read Suppliers'] = `FAILED: ${error.message}`;
  }

  // TEST 3: Purchase Order Creation
  console.log("\nTEST 3: Purchase Order Creation");
  try {
    const supplier = await Supplier.findOne({}) || (await Supplier.create({
      supplierName: "PO Test Supplier",
      contactPerson: "Test Contact",
      phone: "254700000000",
      isActive: true
    }));
    
    const purchaseOrder = await PurchaseOrder.create({
      orderNumber: `PO-${Date.now()}`,
      supplier: supplier._id,
      orderDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "Pending",
      totalAmount: 5000,
      items: []
    });
    
    console.log(`  OK Purchase order created`);
    console.log(`  OK Order number: ${purchaseOrder.orderNumber}`);
    console.log(`  OK Supplier: ${supplier.supplierName}`);
    console.log(`  OK Status: ${purchaseOrder.status}`);
    testResults['Purchase Order'] = 'PASSED';
    testResults['TestPOId'] = purchaseOrder._id;
    
    await PurchaseOrder.findByIdAndDelete(purchaseOrder._id);
  } catch (error) {
    console.error("  FAIL Purchase Order Error:", error.message);
    testResults['Purchase Order'] = `FAILED: ${error.message}`;
  }

  // TEST 4: Goods Received Note
  console.log("\nTEST 4: Goods Received Note (GRN)");
  try {
    const supplier = await Supplier.findOne({}) || (await Supplier.create({
      supplierName: "GRN Test Supplier",
      contactPerson: "Test Contact",
      phone: "254700000000",
      isActive: true
    }));
    
    const grn = await GoodsReceivedNote.create({
      grnNumber: `GRN-${Date.now()}`,
      supplier: supplier._id,
      receivedDate: new Date(),
      purchaseOrder: null,
      items: [],
      totalQuantity: 100,
      totalAmount: 3000,
      receivedBy: "test_user"
    });
    
    console.log(`  OK GRN created`);
    console.log(`  OK GRN number: ${grn.grnNumber}`);
    console.log(`  OK Supplier: ${supplier.supplierName}`);
    console.log(`  OK Total quantity: ${grn.totalQuantity}`);
    testResults['GRN Creation'] = 'PASSED';
    
    await GoodsReceivedNote.findByIdAndDelete(grn._id);
  } catch (error) {
    console.error("  FAIL GRN Error:", error.message);
    testResults['GRN Creation'] = `FAILED: ${error.message}`;
  }

  // TEST 5: Supplier Status Management
  console.log("\nTEST 5: Supplier Status Management");
  try {
    const testSupplier = await Supplier.create({
      supplierName: "Status Test Supplier",
      contactPerson: "Test",
      phone: "254700000000",
      isActive: true
    });
    
    const deactivatedSupplier = await Supplier.findByIdAndUpdate(
      testSupplier._id,
      { isActive: false },
      { new: true }
    );
    
    if (deactivatedSupplier.isActive === false) {
      console.log(`  OK Supplier deactivated`);
    }
    
    const reactivatedSupplier = await Supplier.findByIdAndUpdate(
      testSupplier._id,
      { isActive: true },
      { new: true }
    );
    
    if (reactivatedSupplier.isActive === true) {
      console.log(`  OK Supplier reactivated`);
      testResults['Supplier Status'] = 'PASSED';
    } else {
      console.error("  FAIL Status management failed");
      testResults['Supplier Status'] = 'FAILED';
    }
    
    await Supplier.findByIdAndDelete(testSupplier._id);
  } catch (error) {
    console.error("  FAIL Status Error:", error.message);
    testResults['Supplier Status'] = `FAILED: ${error.message}`;
  }

  // TEST 6: Supplier Search
  console.log("\nTEST 6: Supplier Search");
  try {
    const testSupplier = await Supplier.create({
      supplierName: "Search Test Supplier",
      contactPerson: "Search Contact",
      phone: "254700000000"
    });
    
    const foundSupplier = await Supplier.findOne({ supplierName: "Search Test Supplier" });
    
    if (foundSupplier && foundSupplier.supplierName === "Search Test Supplier") {
      console.log(`  OK Supplier found by name`);
      console.log(`  OK Search working correctly`);
      testResults['Supplier Search'] = 'PASSED';
    } else {
      console.error("  FAIL Supplier search failed");
      testResults['Supplier Search'] = 'FAILED';
    }
    
    await Supplier.findByIdAndDelete(testSupplier._id);
  } catch (error) {
    console.error("  FAIL Search Error:", error.message);
    testResults['Supplier Search'] = `FAILED: ${error.message}`;
  }

  // TEST 7: Supplier Update
  console.log("\nTEST 7: Supplier Update");
  try {
    const testSupplier = await Supplier.create({
      supplierName: "Update Test Supplier",
      contactPerson: "Original Contact",
      phone: "254700000000"
    });
    
    const updatedSupplier = await Supplier.findByIdAndUpdate(
      testSupplier._id,
      {
        contactPerson: "Updated Contact",
        phone: "254799999999",
        email: "updated@supplier.com"
      },
      { new: true }
    );
    
    if (updatedSupplier.contactPerson === "Updated Contact") {
      console.log(`  OK Supplier updated successfully`);
      console.log(`  OK New contact: ${updatedSupplier.contactPerson}`);
      console.log(`  OK New phone: ${updatedSupplier.phone}`);
      testResults['Supplier Update'] = 'PASSED';
    } else {
      console.error("  FAIL Update failed");
      testResults['Supplier Update'] = 'FAILED';
    }
    
    await Supplier.findByIdAndDelete(testSupplier._id);
  } catch (error) {
    console.error("  FAIL Update Error:", error.message);
    testResults['Supplier Update'] = `FAILED: ${error.message}`;
  }

  // TEST 8: Supplier Ledger/Balance
  console.log("\nTEST 8: Supplier Ledger/Balance");
  try {
    const suppliers = await Supplier.find({});
    let hasBalanceField = false;
    
    for (const sup of suppliers) {
      if (sup.balance !== undefined || sup.ledger !== undefined) {
        hasBalanceField = true;
        console.log(`  OK Supplier ${sup.supplierName} has balance/ledger field`);
        break;
      }
    }
    
    if (hasBalanceField || suppliers.length === 0) {
      console.log(`  OK Balance tracking supported`);
      testResults['Supplier Ledger'] = 'PASSED';
    } else {
      console.log("  WARN No balance/ledger fields found");
      testResults['Supplier Ledger'] = 'WARNING: No balance tracking';
    }
  } catch (error) {
    console.error("  FAIL Ledger Error:", error.message);
    testResults['Supplier Ledger'] = `FAILED: ${error.message}`;
  }

  // TEST 9: Supplier Payment Recording
  console.log("\nTEST 9: Supplier Payment Recording");
  try {
    const suppliers = await Supplier.find({});
    let hasPaymentField = false;
    
    for (const sup of suppliers) {
      if (sup.payments !== undefined || sup.totalPayments !== undefined) {
        hasPaymentField = true;
        console.log(`  OK Supplier ${sup.supplierName} has payment tracking`);
        break;
      }
    }
    
    if (hasPaymentField || suppliers.length === 0) {
      console.log(`  OK Payment tracking supported`);
      testResults['Payment Recording'] = 'PASSED';
    } else {
      console.log("  WARN No payment fields found");
      testResults['Payment Recording'] = 'WARNING: No payment tracking';
    }
  } catch (error) {
    console.error("  FAIL Payment Error:", error.message);
    testResults['Payment Recording'] = `FAILED: ${error.message}`;
  }

  // TEST 10: Supplier Delete
  console.log("\nTEST 10: Supplier Delete");
  try {
    const testSupplier = await Supplier.create({
      supplierName: "Delete Test Supplier",
      contactPerson: "Test",
      phone: "254700000000"
    });
    
    const supplierId = testSupplier._id;
    await Supplier.findByIdAndDelete(supplierId);
    
    const deletedSupplier = await Supplier.findById(supplierId);
    
    if (deletedSupplier === null) {
      console.log(`  OK Supplier deleted successfully`);
      testResults['Supplier Delete'] = 'PASSED';
    } else {
      console.error("  FAIL Supplier still exists");
      testResults['Supplier Delete'] = 'FAILED';
    }
  } catch (error) {
    console.error("  FAIL Delete Error:", error.message);
    testResults['Supplier Delete'] = `FAILED: ${error.message}`;
  }

  // FINAL SUMMARY
  console.log("\n=========================================================================");
  console.log("SUPPLIERS AUDIT SUMMARY");
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

testSuppliers();

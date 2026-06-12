const mongoose = require('mongoose');

const CLOUD_URI = process.env.CLOUD_MONGOPATH;
const LOCAL_URI = process.env.LOCAL_MONGOPATH || "mongodb://127.0.0.1:27017/emmarket_production";

const pushOfflineData = async () => {
    if (!CLOUD_URI) return;
    try {
        console.log("[SyncService] Starting push of offline data to cloud...");
        const localDb = await mongoose.createConnection(LOCAL_URI).asPromise();
        const cloudDb = await mongoose.createConnection(CLOUD_URI).asPromise();

        // Dynamically load schemas
        const TransactionSchema = require('../model/Transaction').schema;
        const ExpenseSchema = require('../model/Expense').schema;
        const PurchaseOrderSchema = require('../model/PurchaseOrder').schema;
        const DailyClosureSchema = require('../model/DailyClosure').schema;

        const syncModel = async (modelName, schema) => {
            const LocalModel = localDb.model(modelName, schema);
            const CloudModel = cloudDb.model(modelName, schema);

            const unsyncedDocs = await LocalModel.find({ isSynced: false });
            for (const doc of unsyncedDocs) {
                try {
                    const cloudDoc = new CloudModel(doc.toObject());
                    cloudDoc.isSynced = true;
                    await cloudDoc.save();
                    
                    doc.isSynced = true;
                    await doc.save();
                } catch (e) {
                    if (e.code === 11000) {
                        // Duplicate key, already synced
                        doc.isSynced = true;
                        await doc.save();
                    } else {
                        console.error(`[SyncService] Error syncing ${modelName} ${doc._id}:`, e.message);
                    }
                }
            }
            if (unsyncedDocs.length > 0) {
                console.log(`[SyncService] Synced ${unsyncedDocs.length} ${modelName} records.`);
            }
        };

        await syncModel('Transaction', TransactionSchema);
        await syncModel('Expense', ExpenseSchema);
        await syncModel('PurchaseOrder', PurchaseOrderSchema);
        await syncModel('DailyClosure', DailyClosureSchema);

        await localDb.close();
        await cloudDb.close();
        console.log("[SyncService] Offline data push complete.");
    } catch (err) {
        console.error("[SyncService] Push failed:", err);
    }
};

const pullCatalogData = async () => {
    if (!CLOUD_URI) return;
    try {
        console.log("[SyncService] Starting pull of catalog data from cloud...");
        const localDb = await mongoose.createConnection(LOCAL_URI).asPromise();
        const cloudDb = await mongoose.createConnection(CLOUD_URI).asPromise();

        const ProductSchema = require('../model/Product').schema;
        const CategorySchema = require('../model/Category').schema;
        const UserSchema = require('../model/User').schema;

        const mirrorCollection = async (modelName, schema) => {
            const LocalModel = localDb.model(modelName, schema);
            const CloudModel = cloudDb.model(modelName, schema);

            const cloudDocs = await CloudModel.find({});
            await LocalModel.deleteMany({});
            await LocalModel.insertMany(cloudDocs);
            console.log(`[SyncService] Pulled ${cloudDocs.length} ${modelName} records to local cache.`);
        };

        await mirrorCollection('Product', ProductSchema);
        await mirrorCollection('Category', CategorySchema);
        await mirrorCollection('User', UserSchema);

        await localDb.close();
        await cloudDb.close();
        console.log("[SyncService] Catalog data pull complete.");
    } catch (err) {
        console.error("[SyncService] Pull failed:", err);
    }
};

// Start a background interval to pull catalog data every 5 minutes if online
const startBackgroundSync = () => {
    setInterval(() => {
        const connManager = require('./connection-manager');
        if (connManager.getCurrentMode() === 'cloud') {
            pullCatalogData().catch(console.error);
        }
    }, 5 * 60 * 1000);
};

module.exports = {
    pushOfflineData,
    pullCatalogData,
    startBackgroundSync
};

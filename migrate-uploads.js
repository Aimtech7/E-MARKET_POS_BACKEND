require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoURI = process.env.MONGOPATH || "mongodb://127.0.0.1:27017/emmarket_production";

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connected to MongoDB");
    const db = mongoose.connection.db;
    const bucket = new mongoose.mongo.GridFSBucket(db, {
      bucketName: "uploads"
    });

    const uploadsDir = path.join(__dirname, 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      console.log("No uploads directory found. Nothing to migrate.");
      process.exit(0);
    }

    const files = fs.readdirSync(uploadsDir);
    if (files.length === 0) {
      console.log("Uploads directory is empty. Nothing to migrate.");
      process.exit(0);
    }

    let uploadedCount = 0;

    files.forEach(file => {
      const filePath = path.join(uploadsDir, file);
      // Skip directories
      if (fs.lstatSync(filePath).isDirectory()) return;

      const uploadStream = bucket.openUploadStream(file);
      const readStream = fs.createReadStream(filePath);

      readStream.pipe(uploadStream)
        .on('error', (err) => {
          console.error(`Failed to upload ${file}:`, err);
        })
        .on('finish', () => {
          console.log(`Successfully migrated ${file}`);
          uploadedCount++;
          if (uploadedCount === files.length) {
            console.log("All files migrated successfully.");
            process.exit(0);
          }
        });
    });
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

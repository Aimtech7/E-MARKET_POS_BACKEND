const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../model/User");

const seedDefaultUsers = async () => {
  try {
    const userCount = await User.countDocuments();
    
    if (userCount === 0) {
      console.log("No users found in database. Initializing default accounts...");
      
      const adminPassword = await bcrypt.hash("admin123", 12);
      const adminUser = new User({
        username: "admin",
        password: adminPassword,
        admin: true
      });
      await adminUser.save();
      console.log("-> Created default admin account (username: admin)");

      const cashierPassword = await bcrypt.hash("cashier123", 12);
      const cashierUser = new User({
        username: "cashier",
        password: cashierPassword,
        admin: false
      });
      await cashierUser.save();
      console.log("-> Created default cashier account (username: cashier)");
      
      console.log("Default user seeding complete.");
    } else {
      console.log(`Found ${userCount} existing users. Skipping default seeder.`);
    }
  } catch (error) {
    console.error("Error running user seeder:", error);
  }
};

module.exports = seedDefaultUsers;

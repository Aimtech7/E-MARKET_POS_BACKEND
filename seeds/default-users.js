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
        fullName: "System Administrator",
        email: "admin@emmarket.local",
        phone: "+1 234 567 8900",
        role: "admin",
        admin: true,
        isActive: true
      });
      await adminUser.save();
      console.log("-> Created default admin account (username: admin)");

      const cashierPassword = await bcrypt.hash("cashier123", 12);
      const cashierUser = new User({
        username: "cashier",
        password: cashierPassword,
        fullName: "Default Cashier",
        email: "cashier@emmarket.local",
        phone: "+1 234 567 8901",
        role: "cashier",
        admin: false,
        isActive: true
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

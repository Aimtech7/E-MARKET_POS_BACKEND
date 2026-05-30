const LoyaltyAccount = require("../model/LoyaltyAccount");
const Customer = require("../model/Customer");

const checkAndUpgradeTier = (points) => {
  if (points >= 5000) return "Platinum";
  if (points >= 2000) return "Gold";
  if (points >= 500) return "Silver";
  return "Bronze";
};

// Add points to customer after transaction
const addLoyaltyPoints = async (req, res) => {
  const { customerId, amountSpent } = req.body;
  if (!customerId || !amountSpent) return res.status(400).json({ message: "Customer ID and amount are required" });

  try {
    let account = await LoyaltyAccount.findOne({ customerId });
    if (!account) {
      account = new LoyaltyAccount({ customerId });
    }
    
    // $100 spent = 10 points => $1 = 0.1 points => amountSpent * 0.1
    const pointsEarned = Math.floor(amountSpent * 0.1);
    
    account.totalSpent += amountSpent;
    account.points += pointsEarned;
    account.tier = checkAndUpgradeTier(account.points);

    await account.save();
    return res.status(200).json(account);
  } catch (err) {
    return res.status(500).json({ message: "Error updating loyalty", error: err.message });
  }
};

// Redeem points for discount
const redeemLoyaltyPoints = async (req, res) => {
  const { customerId, pointsToRedeem } = req.body;
  if (!customerId || !pointsToRedeem) return res.status(400).json({ message: "Missing fields" });

  try {
    let account = await LoyaltyAccount.findOne({ customerId });
    if (!account) return res.status(404).json({ message: "Loyalty account not found" });

    if (account.points < pointsToRedeem) {
      return res.status(400).json({ message: "Insufficient points" });
    }

    account.points -= pointsToRedeem;
    // Tier stays the same (based on total points earned vs current points? 
    // Usually tier is based on total points earned. We'll leave tier logic simple for now.)
    
    await account.save();
    
    // 50 points = discount. Let's say $5 discount. The frontend can calculate the monetary value.
    return res.status(200).json(account);
  } catch (err) {
    return res.status(500).json({ message: "Error redeeming points", error: err.message });
  }
};

// Fetch Loyalty Dashboard Stats
const getLoyaltyDashboard = async (req, res) => {
  try {
    const topCustomers = await LoyaltyAccount.find()
      .sort({ points: -1 })
      .limit(10)
      .populate("customerId", "customerName email phone");

    const loyaltyRevenueAgg = await LoyaltyAccount.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: "$totalSpent" }, totalPoints: { $sum: "$points" } } }
    ]);

    return res.status(200).json({
      topCustomers,
      loyaltyRevenue: loyaltyRevenueAgg[0]?.totalRevenue || 0,
      totalOutstandingPoints: loyaltyRevenueAgg[0]?.totalPoints || 0
    });
  } catch (err) {
    return res.status(500).json({ message: "Error fetching dashboard", error: err.message });
  }
};

const getCustomerLoyalty = async (req, res) => {
  try {
    const account = await LoyaltyAccount.findOne({ customerId: req.params.customerId });
    if (!account) return res.status(404).json({ message: "No loyalty account found" });
    return res.status(200).json(account);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching loyalty info", error: err.message });
  }
};

module.exports = {
  addLoyaltyPoints,
  redeemLoyaltyPoints,
  getLoyaltyDashboard,
  getCustomerLoyalty
};

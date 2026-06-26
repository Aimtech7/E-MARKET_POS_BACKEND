const Customer = require("../model/Customer");
const AuditLog = require("../model/AuditLog");

// Calculate Tier based on points
const getCustomerTier = (points) => {
  if (points >= 1000) return "Platinum Reader";
  if (points >= 500) return "Gold Reader";
  if (points >= 200) return "Silver Reader";
  return "Bronze Club";
};

const getCustomerLoyalty = async (req, res) => {
  const { phone } = req.params;
  try {
    const cust = await Customer.findOne({ phone });
    if (!cust) return res.status(404).json({ message: "Customer not registered in Book Club" });

    const tier = getCustomerTier(cust.loyaltyPoints);
    const storeCreditValue = cust.loyaltyPoints * 5; // e.g. 1 point = Ksh 5

    return res.status(200).json({
      name: cust.name,
      phone: cust.phone,
      points: cust.loyaltyPoints,
      tier,
      redeemableCreditKsh: storeCreditValue
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const redeemLoyaltyPoints = async (req, res) => {
  const { phone, pointsToRedeem, saleId } = req.body;
  
  if (!phone || !pointsToRedeem || pointsToRedeem <= 0) {
    return res.status(400).json({ message: "Invalid phone or points parameter" });
  }

  try {
    const cust = await Customer.findOne({ phone });
    if (!cust) return res.status(404).json({ message: "Customer not found" });

    if (cust.loyaltyPoints < pointsToRedeem) {
      return res.status(400).json({ message: `Insufficient loyalty points. Available: ${cust.loyaltyPoints}` });
    }

    const discountKsh = pointsToRedeem * 5; // Ksh 5 per point
    cust.loyaltyPoints -= pointsToRedeem;
    await cust.save();

    try {
      await AuditLog.create({
        username: req.userData?.username || "Cashier",
        method: "POST",
        url: "/loyalty/redeem",
        payload: { action: "LOYALTY_REDEEMED", phone, pointsToRedeem, discountKsh, saleId }
      });
    } catch (e) {}

    return res.status(200).json({
      message: "Points redeemed successfully",
      discountAppliedKsh: discountKsh,
      remainingPoints: cust.loyaltyPoints,
      tier: getCustomerTier(cust.loyaltyPoints)
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const awardPurchasePoints = async (req, res) => {
  const { phone, amountSpent } = req.body;
  if (!phone || !amountSpent) return res.status(400).json({ message: "Missing required parameters" });

  try {
    const earnedPoints = Math.floor(amountSpent / 100); // 1 point per Ksh 100
    if (earnedPoints <= 0) return res.status(200).json({ message: "No points earned for this amount", earnedPoints: 0 });

    let cust = await Customer.findOne({ phone });
    if (!cust) {
      cust = await Customer.create({ name: `Reader (${phone})`, phone, loyaltyPoints: earnedPoints });
    } else {
      cust.loyaltyPoints += earnedPoints;
      await cust.save();
    }

    return res.status(200).json({
      message: `Awarded ${earnedPoints} Book Club points`,
      totalPoints: cust.loyaltyPoints,
      tier: getCustomerTier(cust.loyaltyPoints)
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getCustomerLoyalty,
  redeemLoyaltyPoints,
  awardPurchasePoints
};

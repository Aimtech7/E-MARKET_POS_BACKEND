const StoreSettings = require("../model/StoreSettings");

const getSettings = async (req, res) => {
  try {
    let settings = await StoreSettings.findOne();
    if (!settings) {
      settings = new StoreSettings({});
      await settings.save();
    }
    return res.status(200).json(settings);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching settings", error: err.message });
  }
};

const updateSettings = async (req, res) => {
  const { shopName, address, phone, shopEmail, taxRate, currency, receiptFooter } = req.body;
  try {
    let settings = await StoreSettings.findOne();
    if (!settings) {
      settings = new StoreSettings({ shopName, address, phone, shopEmail, taxRate, currency, receiptFooter });
    } else {
      settings.shopName = shopName || settings.shopName;
      settings.address = address || settings.address;
      settings.phone = phone || settings.phone;
      settings.shopEmail = shopEmail || settings.shopEmail;
      if (taxRate !== undefined) settings.taxRate = taxRate;
      settings.currency = currency || settings.currency;
      settings.receiptFooter = receiptFooter || settings.receiptFooter;
    }
    await settings.save();
    return res.status(200).json({ message: "Store settings updated successfully", settings });
  } catch (err) {
    return res.status(500).json({ message: "Error updating settings", error: err.message });
  }
};

module.exports = {
  getSettings,
  updateSettings
};

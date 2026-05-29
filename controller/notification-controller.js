const Notification = require("../model/Notification");
const Product = require("../model/Product");

// Get all notifications for the user
const getNotifications = async (req, res) => {
  try {
    // 1. Auto-generate low stock notifications before fetching
    const products = await Product.find();
    for (const p of products) {
      if (p.stockQuantity <= (p.reorderLevel || 5)) {
        // check if an unread notification already exists for this product
        const exists = await Notification.findOne({
          title: "Low Stock Alert",
          message: { $regex: p.productName },
          isRead: false
        });
        if (!exists) {
          await Notification.create({
            title: "Low Stock Alert",
            message: `${p.productName} is running low on stock (${p.stockQuantity} remaining).`,
            type: "warning",
            link: "/inventory"
          });
        }
      }
    }

    const notifications = await Notification.find().sort({ timestamp: -1 }).limit(50);
    return res.status(200).json(notifications);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching notifications", error: err.message });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    const notif = await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
    return res.status(200).json(notif);
  } catch (err) {
    return res.status(500).json({ message: "Error updating notification", error: err.message });
  }
};

// Mark all as read
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    return res.status(200).json({ message: "All notifications marked as read." });
  } catch (err) {
    return res.status(500).json({ message: "Error updating notifications", error: err.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};

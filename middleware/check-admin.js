module.exports = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  try {
    if (!req.userData || !req.userData.admin) {
      return res.status(403).json({ message: "Access Denied: You do not have administrator privileges." });
    }
    next();
  } catch (err) {
    return res.status(403).json({ message: "Access Denied: Administrator privileges required." });
  }
};

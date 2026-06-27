const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "app_token_secret_key_production_2026";

module.exports = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "401 Unauthorized: Authorization header missing" });
    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "401 Unauthorized: Bearer token missing" });

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, JWT_SECRET);
    } catch(e) {
      decodedToken = jwt.verify(token, "app_token"); // Fallback for legacy tokens
    }

    req.userData = { 
      username: decodedToken.username, 
      admin: decodedToken.admin,
      role: decodedToken.role || (decodedToken.admin ? "admin" : "cashier")
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "401 Unauthorized: Token expired or invalid" });
  }
};

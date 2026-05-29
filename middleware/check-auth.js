const jwt = require("jsonwebtoken");
module.exports = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      throw new Error("authorization failed");
    }
    const decodedToken = jwt.verify(token, "app_token");
    req.userData = { 
      username: decodedToken.username, 
      admin: decodedToken.admin 
    };
    next();
  } catch (err) {
    return next("authorization failed");
  }
};

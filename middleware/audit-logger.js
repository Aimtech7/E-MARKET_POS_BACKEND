const fs = require("fs");
const path = require("path");

const AuditLog = require("../model/AuditLog");

const auditLogger = (req, res, next) => {
  const method = req.method;
  const url = req.url;
  const ip = req.ip || req.connection.remoteAddress;

  if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    // We bind to the finish event to ensure req.userData is populated by auth middleware if applicable
    res.on("finish", () => {
      const username = req.userData ? req.userData.username : "Anonymous";
      const payload = req.body;
      
      const logMessage = `[${new Date().toISOString()}] IP: ${ip} | User: ${username} | Action: ${method} ${url} | Payload: ${JSON.stringify(payload)}\n`;

      const logDir = path.join(__dirname, "..", "logs");
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logFile = path.join(logDir, "audit.log");
      fs.appendFile(logFile, logMessage, (err) => {
        if (err) console.error("Failed to write to audit log file:", err);
      });

      // Persist to MongoDB
      const logEntry = new AuditLog({
        ip,
        username,
        method,
        url,
        payload
      });
      logEntry.save().catch(err => console.error("Failed to save audit log to DB:", err));
    });
  }

  next();
};

module.exports = auditLogger;

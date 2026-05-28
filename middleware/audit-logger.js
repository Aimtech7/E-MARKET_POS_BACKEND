const fs = require("fs");
const path = require("path");

const auditLogger = (req, res, next) => {
  const method = req.method;
  const url = req.url;
  const ip = req.ip || req.connection.remoteAddress;
  const username = req.userData ? req.userData.username : "Anonymous";

  if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] IP: ${ip} | User: ${username} | Action: ${method} ${url} | Payload: ${JSON.stringify(req.body)}\n`;

    const logDir = path.join(__dirname, "..", "logs");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, "audit.log");
    fs.appendFile(logFile, logMessage, (err) => {
      if (err) {
        console.error("Failed to write to audit log file:", err);
      }
    });
  }

  next();
};

module.exports = auditLogger;

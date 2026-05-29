const User = require("../model/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    if (users) {
      return res.status(200).json(users);
    }
    return res.status(404).json({ message: "No users found" });
  } catch (err) {
    return res.status(500).json({ message: "Error fetching users, please try again" });
  }
};

const createUser = async (req, res) => {
  const { username, password, fullName, email, phone, role } = req.body;
  let user;
  try {
    user = await User.findOne({ username: username });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
  if (!user) {
    try {
      const isAdmin = role === "admin";
      user = new User({
        username,
        password: await bcrypt.hash(password, 12),
        fullName: fullName || username,
        email: email || "",
        phone: phone || "",
        role: role || "cashier",
        admin: isAdmin,
        isActive: true
      });
      await user.save();
    } catch (err) {
      return res.status(500).json({ message: "Could not create this user" });
    }
    const userResponse = user.toObject();
    delete userResponse.password;
    return res.status(201).json(userResponse);
  }
  return res.status(400).json({ message: "Username already exists" });
};

const updateUser = async (req, res) => {
  const { username } = req.params;
  const { fullName, email, phone, role } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (fullName) user.fullName = fullName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (role) {
      user.role = role;
      user.admin = role === "admin";
    }

    await user.save();
    const userResponse = user.toObject();
    delete userResponse.password;
    return res.status(200).json(userResponse);
  } catch (error) {
    return res.status(500).json({ message: "Error updating user" });
  }
};

const resetPassword = async (req, res) => {
  const { username } = req.params;
  const { newPassword } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Error resetting password" });
  }
};

const toggleActiveStatus = async (req, res) => {
  const { username } = req.params;
  const { isActive } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isActive = isActive;
    await user.save();
    return res.status(200).json({ message: `User account ${isActive ? 'enabled' : 'disabled'} successfully`, isActive });
  } catch (error) {
    return res.status(500).json({ message: "Error toggling user status" });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findOneAndDelete({ username: id });
    if (user) {
      return res.status(200).json({ message: "user have been deleted" });
    }
    return res.status(404).json({ message: "User not found" });
  } catch (err) {
    res.status(500).json({ message: "error cannot delete this user" });
  }
};

const login = async (req, res, next) => {
  const { username, password } = req.body;
  let user;
  try {
    user = await User.findOne({ username: username });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(503).json({ message: "Database unavailable, please try again" });
  }
  
  if (!user) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  if (user.isActive === false) {
    return res.status(403).json({ message: "Account is disabled. Please contact the administrator." });
  }

  try {
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
  } catch (err) {
    console.error("Bcrypt Error:", err);
    return res.status(500).json({ message: "Authentication service error" });
  }
  
  let token;
  try {
    token = jwt.sign({ username: user.username, admin: user.admin, role: user.role }, "app_token", {
      expiresIn: "12h",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Token generation failed" });
  }

  try {
    user.lastLogin = new Date();
    await user.save();
  } catch(err) {
    console.error("Failed to update lastLogin", err);
  }

  res.status(201).json({ 
    username: user.username, 
    token: token, 
    admin: user.admin,
    role: user.role,
    fullName: user.fullName
  });
};

exports.getUsers = getUsers;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.resetPassword = resetPassword;
exports.toggleActiveStatus = toggleActiveStatus;
exports.deleteUser = deleteUser;
exports.login = login;

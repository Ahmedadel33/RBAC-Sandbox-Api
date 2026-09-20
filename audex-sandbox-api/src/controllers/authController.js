const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { ensureDefaultRBAC } = require('../services/rbacService');

const JWT_SECRET = process.env.JWT_SECRET || 'audex_dev_secret_key';

const sendTokenResponse = (user, statusCode, res) => {
  const roleName = user.role && typeof user.role === 'object'
    ? (user.role.name || user.roleName || 'viewer')
    : (user.roleName || user.role || 'viewer');

  const roleId = user.role && typeof user.role === 'object'
    ? user.role._id || user.roleId
    : user.roleId || null;

  const token = jwt.sign(
    { id: user._id, role: roleName, roleId, department: user.department },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  const options = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    httpOnly: true
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: roleName,
        department: user.department
      }
    });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    await ensureDefaultRBAC();

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: role || 'viewer',
      department
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: normalizedEmail }).populate('role');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
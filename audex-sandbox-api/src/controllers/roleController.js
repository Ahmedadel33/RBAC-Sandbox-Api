const Permission = require('../models/Permission');
const Role = require('../models/Role');
const User = require('../models/User');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getRoleIdentifiers = async (input) => {
  if (!input) return [];

  const items = Array.isArray(input) ? input : [input];

  const result = [];
  for (const item of items) {
    if (!item) continue;

    if (typeof item === 'string') {
      const permission = await Permission.findOne({ _id: item });
      if (permission) {
        result.push(permission._id);
        continue;
      }

      const normalized = item.trim();
      const permissionByName = await Permission.findOne({ name: normalized });
      if (permissionByName) {
        result.push(permissionByName._id);
        continue;
      }

      const permissionByMethodAndPath = normalized.includes(' ') ? normalized.split(' ') : null;
      if (permissionByMethodAndPath && permissionByMethodAndPath.length === 2) {
        const [method, path] = permissionByMethodAndPath;
        const dynamicPermission = await Permission.findOne({ method: method.toUpperCase(), path });
        if (dynamicPermission) result.push(dynamicPermission._id);
      }
      continue;
    }

    if (item && item._id) {
      result.push(item._id);
    }
  }

  return [...new Set(result.map((value) => value.toString()))].map((value) => value);
};

const getRoles = async (req, res) => {
  try {
    const roles = await Role.find().populate('permissions');
    return res.status(200).json({ success: true, count: roles.length, data: roles });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error while fetching roles', error: error.message });
  }
};

const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a role name' });
    }

    const existingRole = await Role.findOne({
      name: { $regex: `^${escapeRegex(String(name).trim())}$`, $options: 'i' }
    });
    if (existingRole) {
      return res.status(400).json({ success: false, message: 'Role already exists' });
    }

    const permissionIds = await getRoleIdentifiers(permissions || []);
    const role = await Role.create({
      name: String(name).trim(),
      description: description || '',
      permissions: permissionIds
    });

    const populatedRole = await Role.findById(role._id).populate('permissions');
    return res.status(201).json({ success: true, data: populatedRole });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error while creating role', error: error.message });
  }
};

const updateRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (name && String(name).trim()) role.name = String(name).trim();
    if (description !== undefined) role.description = description || '';
    if (permissions) role.permissions = await getRoleIdentifiers(permissions);

    await role.save();

    const updatedRole = await Role.findById(role._id).populate('permissions');
    return res.status(200).json({ success: true, data: updatedRole });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error while updating role', error: error.message });
  }
};

const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const fallbackRole = await Role.findOne({
      name: { $regex: '^viewer$', $options: 'i' }
    });
    await User.updateMany({ role: role._id }, { role: fallbackRole ? fallbackRole._id : null, roleName: fallbackRole ? fallbackRole.name : 'viewer' });

    await role.deleteOne();
    return res.status(200).json({ success: true, message: 'Role deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error while deleting role', error: error.message });
  }
};

const getPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find();
    return res.status(200).json({ success: true, count: permissions.length, data: permissions });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error while fetching permissions', error: error.message });
  }
};

const createPermission = async (req, res) => {
  try {
    const { name, method, path, description } = req.body;

    if (!name || !method || !path) {
      return res.status(400).json({ success: false, message: 'Please provide permission name, method, and path' });
    }

    const normalizedMethod = String(method).toUpperCase();
    const existingPermission = await Permission.findOne({ method: normalizedMethod, path: String(path).trim() });
    if (existingPermission) {
      return res.status(400).json({ success: false, message: 'Permission already exists' });
    }

    const permission = await Permission.create({
      name: String(name).trim(),
      method: normalizedMethod,
      path: String(path).trim(),
      description: description || ''
    });

    return res.status(201).json({ success: true, data: permission });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error while creating permission', error: error.message });
  }
};

const updatePermission = async (req, res) => {
  try {
    const { name, method, path, description } = req.body;
    const permission = await Permission.findById(req.params.id);

    if (!permission) {
      return res.status(404).json({ success: false, message: 'Permission not found' });
    }

    if (name) permission.name = String(name).trim();
    if (method) permission.method = String(method).toUpperCase();
    if (path) permission.path = String(path).trim();
    if (description !== undefined) permission.description = description || '';

    await permission.save();
    return res.status(200).json({ success: true, data: permission });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error while updating permission', error: error.message });
  }
};

const deletePermission = async (req, res) => {
  try {
    const permission = await Permission.findById(req.params.id);
    if (!permission) {
      return res.status(404).json({ success: false, message: 'Permission not found' });
    }

    await Role.updateMany({}, { $pull: { permissions: permission._id } });
    await permission.deleteOne();
    return res.status(200).json({ success: true, message: 'Permission deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error while deleting permission', error: error.message });
  }
};

module.exports = {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
  createPermission,
  updatePermission,
  deletePermission
};

const mongoose = require('mongoose');
const Permission = require('../models/Permission');
const Role = require('../models/Role');
const User = require('../models/User');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const DEFAULT_PERMISSION_DEFINITIONS = [
  { name: 'Read Projects', method: 'GET', path: '/api/projects' },
  { name: 'Read Project', method: 'GET', path: '/api/projects/:id' },
  { name: 'Create Project', method: 'POST', path: '/api/projects' },
  { name: 'Update Project', method: 'PUT', path: '/api/projects/:id' },
  { name: 'Delete Project', method: 'DELETE', path: '/api/projects/:id' },
  { name: 'Read Roles', method: 'GET', path: '/api/roles' },
  { name: 'Create Role', method: 'POST', path: '/api/roles' },
  { name: 'Update Role', method: 'PUT', path: '/api/roles/:id' },
  { name: 'Delete Role', method: 'DELETE', path: '/api/roles/:id' },
  { name: 'Read Permissions', method: 'GET', path: '/api/permissions' },
  { name: 'Create Permission', method: 'POST', path: '/api/permissions' },
  { name: 'Update Permission', method: 'PUT', path: '/api/permissions/:id' },
  { name: 'Delete Permission', method: 'DELETE', path: '/api/permissions/:id' }
];

const DEFAULT_ROLE_DEFINITIONS = [
  {
    name: 'admin',
    description: 'Full access to project and RBAC management',
    permissions: [
      'GET /api/projects',
      'GET /api/projects/:id',
      'POST /api/projects',
      'PUT /api/projects/:id',
      'DELETE /api/projects/:id',
      'GET /api/roles',
      'POST /api/roles',
      'PUT /api/roles/:id',
      'DELETE /api/roles/:id',
      'GET /api/permissions',
      'POST /api/permissions',
      'PUT /api/permissions/:id',
      'DELETE /api/permissions/:id'
    ]
  },
  {
    name: 'manager',
    description: 'Project access and management',
    permissions: [
      'GET /api/projects',
      'GET /api/projects/:id',
      'POST /api/projects',
      'PUT /api/projects/:id',
      'DELETE /api/projects/:id'
    ]
  },
  {
    name: 'viewer',
    description: 'Read-only project access',
    permissions: ['GET /api/projects', 'GET /api/projects/:id']
  }
];

const normalizePermissionPath = (value) => {
  if (!value) return '/';
  const normalized = String(value).split('?')[0].trim();
  return normalized.length ? normalized.replace(/\/+$/, '') || '/' : '/';
};

const permissionMatches = (storedPath, requestedPath) => {
  const pattern = normalizePermissionPath(storedPath);
  const actual = normalizePermissionPath(requestedPath);

  if (pattern === actual) return true;

  const routePattern = pattern
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) return '[^/]+';
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');

  const regex = new RegExp(`^${routePattern}$`);
  return regex.test(actual);
};

const resolveUserRole = async (user) => {
  if (!user) return null;

  const candidate = user.roleId || user.role;
  const query = {};

  if (candidate && mongoose.Types.ObjectId.isValid(String(candidate))) {
    query._id = candidate;
  } else if (candidate) {
    query.name = { $regex: `^${escapeRegex(String(candidate).trim())}$`, $options: 'i' };
  }

  if (!Object.keys(query).length) return null;

  let role = await Role.findOne(query).populate('permissions');

  if (!role) {
    await ensureDefaultRBAC();
    role = await Role.findOne(query).populate('permissions');
  }

  if (role) {
    const roleName = String(role.name || '').toLowerCase();
    const defaultRole = DEFAULT_ROLE_DEFINITIONS.find((entry) => String(entry.name).toLowerCase() === roleName);

    if (defaultRole) {
      const defaultPermissionIds = await Promise.all(
        defaultRole.permissions.map(async (key) => {
          const [method, path] = key.split(' ');
          const permission = await Permission.findOne({ method: String(method).toUpperCase(), path });
          return permission ? permission._id.toString() : null;
        })
      );

      const missingIds = [...new Set(defaultPermissionIds.filter(Boolean).filter((id) => {
        const currentIds = (role.permissions || []).map((permission) => permission._id ? permission._id.toString() : permission.toString());
        return !currentIds.includes(id);
      }))];

      if (missingIds.length) {
        await Role.findByIdAndUpdate(role._id, { $addToSet: { permissions: { $each: missingIds.map((value) => new mongoose.Types.ObjectId(value)) } } }, { new: true });
        role = await Role.findById(role._id).populate('permissions');
      }
    }
  }

  return role;
};

const ensureDefaultRBAC = async () => {
  const permissions = await Promise.all(
    DEFAULT_PERMISSION_DEFINITIONS.map(async (permission) => {
      return Permission.findOneAndUpdate(
        { method: permission.method.toUpperCase(), path: permission.path },
        {
          ...permission,
          method: permission.method.toUpperCase(),
          name: permission.name || `${permission.method} ${permission.path}`
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    })
  );

  const permissionLookup = new Map(
    permissions.map((permission) => [`${permission.method} ${permission.path}`, permission._id])
  );

  for (const roleDefinition of DEFAULT_ROLE_DEFINITIONS) {
    const rolePermissions = roleDefinition.permissions
      .map((permissionKey) => permissionLookup.get(permissionKey))
      .filter(Boolean);

    await Role.findOneAndUpdate(
      { name: roleDefinition.name },
      {
        name: roleDefinition.name,
        description: roleDefinition.description,
        permissions: rolePermissions
      },
      { upsert: true, new: true }
    );
  }

  const legacyRoleNames = ['admin', 'manager', 'viewer'];
  const legacyUsers = await User.find({
    $or: [
      { role: { $type: 'string' } },
      { roleName: { $in: legacyRoleNames } },
      { role: { $in: legacyRoleNames } }
    ]
  });

  for (const user of legacyUsers) {
    const legacyRoleName = user.roleName || user.role;
    if (!legacyRoleNames.includes(String(legacyRoleName).toLowerCase())) continue;

    const mappedRole = await Role.findOne({
      name: { $regex: `^${escapeRegex(String(legacyRoleName).trim())}$`, $options: 'i' }
    });
    if (!mappedRole) continue;

    user.role = mappedRole._id;
    user.roleName = mappedRole.name;
    await user.save();
  }

  return {
    permissions,
    roles: await Role.find().populate('permissions')
  };
};

module.exports = {
  DEFAULT_PERMISSION_DEFINITIONS,
  DEFAULT_ROLE_DEFINITIONS,
  ensureDefaultRBAC,
  normalizePermissionPath,
  permissionMatches,
  resolveUserRole
};

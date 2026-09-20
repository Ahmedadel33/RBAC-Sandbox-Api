const { ensureDefaultRBAC, resolveUserRole, permissionMatches } = require('../services/rbacService');

const normalizeMethod = (method) => String(method || '').toUpperCase();

const parsePermissionRequest = (args, req) => {
  if (args.length === 2 && ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].includes(String(args[0]).toUpperCase())) {
    return {
      method: normalizeMethod(args[0]),
      path: String(args[1]).trim()
    };
  }

  if (args.length === 1) {
    const [firstArg] = args;

    if (typeof firstArg === 'object' && firstArg && firstArg.method && firstArg.path) {
      return {
        method: normalizeMethod(firstArg.method),
        path: String(firstArg.path).trim()
      };
    }

    if (typeof firstArg === 'string' && firstArg.includes(' ')) {
      const [method, path] = firstArg.split(' ');
      return {
        method: normalizeMethod(method),
        path: String(path).trim()
      };
    }
  }

  return null;
};

const authorize = (...args) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user not found'
      });
    }

    const permissionRequest = parsePermissionRequest(args, req);
    if (permissionRequest) {
      await ensureDefaultRBAC();
      const userRole = await resolveUserRole(req.user);
      const actualPath = req.originalUrl ? req.originalUrl.split('?')[0] : req.baseUrl + req.path;

      if (!userRole || !userRole.permissions || userRole.permissions.length === 0) {
        return res.status(403).json({
          success: false,
          message: `Role (${req.user.role || 'unknown'}) is not authorized for ${permissionRequest.method} ${permissionRequest.path}`
        });
      }

      const hasPermission = userRole.permissions.some((permission) => {
        return normalizeMethod(permission.method) === permissionRequest.method && permissionMatches(permission.path, permissionRequest.path || actualPath);
      });

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Role (${req.user.role || 'unknown'}) is not authorized for ${permissionRequest.method} ${permissionRequest.path}`
        });
      }

      return next();
    }

    if (args.length > 0 && args.every((arg) => typeof arg === 'string')) {
      const allowedRoles = args.map((role) => String(role).toLowerCase());
      const currentRole = String(req.user.role || '').toLowerCase();

      if (!allowedRoles.includes(currentRole)) {
        return res.status(403).json({
          success: false,
          message: `Role (${req.user.role || 'unknown'}) is not authorized to access this route`
        });
      }

      return next();
    }

    return next();
  };
};

module.exports = { authorize };
const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
  createPermission,
  updatePermission,
  deletePermission
} = require('../controllers/roleController');

router.get('/roles', protect, authorize('GET', '/api/roles'), getRoles);
router.post('/roles', protect, authorize('POST', '/api/roles'), createRole);
router.put('/roles/:id', protect, authorize('PUT', '/api/roles/:id'), updateRole);
router.delete('/roles/:id', protect, authorize('DELETE', '/api/roles/:id'), deleteRole);

router.get('/permissions', protect, authorize('GET', '/api/permissions'), getPermissions);
router.post('/permissions', protect, authorize('POST', '/api/permissions'), createPermission);
router.put('/permissions/:id', protect, authorize('PUT', '/api/permissions/:id'), updatePermission);
router.delete('/permissions/:id', protect, authorize('DELETE', '/api/permissions/:id'), deletePermission);

module.exports = router;

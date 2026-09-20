const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.get('/projects', protect, authorize('GET', '/api/projects'), getProjects);
router.get('/projects/:id', protect, authorize('GET', '/api/projects/:id'), getProjectById);
router.post('/projects', protect, authorize('POST', '/api/projects'), createProject);
router.put('/projects/:id', protect, authorize('PUT', '/api/projects/:id'), updateProject);
router.delete('/projects/:id', protect, authorize('DELETE', '/api/projects/:id'), deleteProject);

module.exports = router;
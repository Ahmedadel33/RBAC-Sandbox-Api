const Project = require('../models/Project');

const getProjectQuery = (user) => {
  const roleName = String(user?.role || '').toLowerCase();
  const userId = user?.id;
  const department = user?.department;

  if (roleName === 'admin') return {};
  if (roleName === 'manager') return { department };
  return { assignedTo: userId };
};

const getSandboxProjects = async (req, res) => {
  try {
    const query = getProjectQuery(req.user);
    const projects = await Project.find(query).populate('assignedTo', 'name email');

    return res.status(200).json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server Error while fetching sandbox projects',
      error: error.message
    });
  }
};

const getProjects = async (req, res) => {
  return getSandboxProjects(req, res);
};

const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('assignedTo', 'name email');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: project
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server Error while fetching project',
      error: error.message
    });
  }
};

const createProject = async (req, res) => {
  try {
    const { title, description, department } = req.body;

    if (!title || !department) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title and department'
      });
    }

    const project = await Project.create({
      title,
      description,
      department,
      assignedTo: req.body.assignedTo || req.user.id
    });

    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server Error while creating project',
      error: error.message
    });
  }
};

const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const { title, description, department, assignedTo } = req.body;

    if (title) project.title = title;
    if (description !== undefined) project.description = description;
    if (department) project.department = department;
    if (assignedTo) project.assignedTo = assignedTo;

    await project.save();

    const updatedProject = await Project.findById(project._id).populate('assignedTo', 'name email');

    return res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: updatedProject
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server Error while updating project',
      error: error.message
    });
  }
};

const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    await project.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
      data: project
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server Error while deleting project',
      error: error.message
    });
  }
};

module.exports = {
  getSandboxProjects,
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
};
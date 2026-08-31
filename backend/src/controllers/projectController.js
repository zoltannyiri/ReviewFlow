import { createProject, getProjects, getProjectById, updateProject, deleteProject } from '../services/projectService.js';

export const create = async (req, res) => {
  try {
    const { organizationId, name, allowedDomains } = req.body;

    if (!organizationId || !name?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'organizationId and name are required',
      });
    }

    if (
      allowedDomains !== undefined &&
      !Array.isArray(allowedDomains)
    ) {
      return res.status(400).json({
        success: false,
        message: 'allowedDomains must be an array',
      });
    }

    const project = await createProject({
      userId: req.user.id,
      organizationId,
      name,
      allowedDomains,
    });

    return res.status(201).json({
      success: true,
      project,
    });
  } catch (error) {
    if (error.message === 'ORGANIZATION_ACCESS_DENIED') {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this organization',
      });
    }

    console.error('Create project error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const list = async (req, res) => {
  try {
    const projects = await getProjects(req.user.id);

    return res.status(200).json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error('Get projects error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getOne = async (req, res) => {
  try {
    const project = await getProjectById(
      req.user.id,
      req.params.id
    );

    return res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    if (error.message === 'PROJECT_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    console.error('Get project error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const update = async (req, res) => {
  try {
    const {
      name,
      allowedDomains,
    } = req.body;

    if (
      name !== undefined &&
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Project name cannot be empty',
      });
    }

    if (
      allowedDomains !== undefined &&
      !Array.isArray(allowedDomains)
    ) {
      return res.status(400).json({
        success: false,
        message: 'allowedDomains must be an array',
      });
    }

    const project = await updateProject({
      userId: req.user.id,
      projectId: req.params.id,
      name,
      allowedDomains,
    });

    return res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    if (error.message === 'PROJECT_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    console.error('Update project error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const remove = async (req, res) => {
  try {
    await deleteProject({
      userId: req.user.id,
      projectId: req.params.id,
    });

    return res.status(204).send();
  } catch (error) {
    if (error.message === 'PROJECT_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    if (error.message === 'PROJECT_DELETE_FORBIDDEN') {
      return res.status(403).json({
        success: false,
        message: 'You cannot delete this project',
      });
    }

    console.error('Delete project error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
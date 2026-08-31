import { createProject, getProjects, getProjectById, updateProject, updateProjectOrigins, deleteProject } from '../services/projectService.js';
import { normalizeAllowedOrigins } from '../utils/projectUrl.js';

export const create = async (req, res) => {
  try {
    if (!req.body || Array.isArray(req.body) || Object.keys(req.body).some((key) => !['organizationId', 'name', 'allowedDomains'].includes(key))) {
      return res.status(400).json({ success: false, message: 'Invalid project details' });
    }
    const { organizationId, name, allowedDomains } = req.body;

    if (typeof organizationId !== 'string' || typeof name !== 'string' || !name.trim() || name.length > 160 || name.includes('\0')) {
      return res.status(400).json({
        success: false,
        message: 'organizationId and name are required',
      });
    }

    const normalizedDomains = allowedDomains === undefined
      ? undefined
      : normalizeAllowedOrigins(allowedDomains, { allowEmpty: true });

    const project = await createProject({
      userId: req.user.id,
      organizationId,
      name,
      allowedDomains: normalizedDomains,
    });

    return res.status(201).json({
      success: true,
      project,
    });
  } catch (error) {
    if (error.message === 'INVALID_ALLOWED_ORIGINS') {
      return res.status(400).json({ success: false, message: 'Use valid HTTPS origins (HTTP is allowed only on localhost)' });
    }
    if (error.message === 'USER_NOT_MEMBER_OF_ORGANIZATION') {
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
    if (!req.body || Array.isArray(req.body) || Object.keys(req.body).length === 0 ||
        Object.keys(req.body).some((key) => !['name', 'allowedDomains'].includes(key))) {
      return res.status(400).json({ success: false, message: 'Invalid project update' });
    }
    const {
      name,
      allowedDomains,
    } = req.body;

    if (
      name !== undefined &&
      (typeof name !== 'string' || !name.trim() || name.length > 160 || name.includes('\0'))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Project name cannot be empty',
      });
    }

    const normalizedDomains = allowedDomains === undefined
      ? undefined
      : normalizeAllowedOrigins(allowedDomains);

    const project = await updateProject({
      userId: req.user.id,
      projectId: req.params.id,
      name,
      allowedDomains: normalizedDomains,
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

    if (error.message === 'PROJECT_SETTINGS_FORBIDDEN') {
      return res.status(403).json({ success: false, message: 'Only owners and admins can change project origins' });
    }

    if (error.message === 'ORIGIN_IN_USE') {
      return res.status(409).json({ success: false, message: 'An existing review round uses this origin' });
    }

    if (error.message === 'INVALID_ALLOWED_ORIGINS') {
      return res.status(400).json({ success: false, message: 'Use valid HTTPS origins (HTTP is allowed only on localhost)' });
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

export const updateOrigins = async (req, res) => {
  try {
    const body = req.body;
    if (!body || Array.isArray(body) || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'origins')) {
      return res.status(400).json({ success: false, message: 'origins is required' });
    }
    const allowedDomains = normalizeAllowedOrigins(body.origins);
    const project = await updateProjectOrigins({
      userId: req.user.id,
      projectId: req.params.id,
      allowedDomains,
    });
    return res.json({ success: true, project });
  } catch (error) {
    if (error.message === 'INVALID_ALLOWED_ORIGINS') {
      return res.status(400).json({ success: false, message: 'Use valid HTTPS origins (HTTP is allowed only on localhost)' });
    }
    if (error.message === 'PROJECT_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    if (error.message === 'PROJECT_SETTINGS_FORBIDDEN') {
      return res.status(403).json({ success: false, message: 'Only owners and admins can change project origins' });
    }
    if (error.message === 'ORIGIN_IN_USE') {
      return res.status(409).json({ success: false, message: 'An existing review round uses this origin' });
    }
    console.error('Update project origins error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

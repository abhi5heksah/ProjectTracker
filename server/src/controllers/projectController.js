const prisma = require('../services/db');

const createProject = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Project name is required' });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        ownerId: req.user.userId,
      },
    });

    res.status(201).json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

const getProjects = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    
    // Get projects where user is owner OR a member
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, projects });
  } catch (err) {
    next(err);
  }
};

const getProjectById = async (req, res, next) => {
  try {
    // Project and Role are attached by the authorizeProjectRole middleware
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        nodes: true,
        edges: true,
      }
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const mappedProject = {
      ...project,
      nodes: project.nodes.map(n => ({
        id: n.id,
        type: n.type,
        position: { x: n.positionX, y: n.positionY },
        data: n.data,
      }))
    };

    res.status(200).json({ success: true, project: mappedProject, userRole: req.projectRole });
  } catch (err) {
    next(err);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const project = await prisma.project.update({
      where: { id: req.params.projectId },
      data: { name, description },
    });
    res.status(200).json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    await prisma.project.delete({
      where: { id: req.params.projectId },
    });
    res.status(200).json({ success: true, message: 'Project deleted successfully' });
  } catch (err) {
    next(err);
  }
};

const inviteMember = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const { projectId } = req.params;

    if (!email || !role) {
      return res.status(400).json({ success: false, message: 'Email and role are required' });
    }

    const userToInvite = await prisma.user.findUnique({ where: { email } });
    if (!userToInvite) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (userToInvite.id === req.project.ownerId) {
      return res.status(400).json({ success: false, message: 'User is already the owner' });
    }

    const member = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: userToInvite.id } },
      update: { role },
      create: { projectId, userId: userToInvite.id, role },
    });

    res.status(200).json({ success: true, member });
  } catch (err) {
    next(err);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;
    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } }
    });
    res.status(200).json({ success: true, message: 'Member removed' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  inviteMember,
  removeMember,
};

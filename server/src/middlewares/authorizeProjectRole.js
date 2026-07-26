const prisma = require('../services/db');

/**
 * Middleware to check if the authenticated user has a specific role or higher on a project.
 * Hierarchy: OWNER > EDITOR > VIEWER
 */
const authorizeProjectRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.userId;

      if (!projectId) {
        return res.status(400).json({ success: false, message: 'Project ID is required' });
      }

      // First check if user is the OWNER in the Project table directly
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      let userRole = null;
      if (project.ownerId === userId) {
        userRole = 'OWNER';
      } else {
        // If not owner, check ProjectMembers
        const member = await prisma.projectMember.findUnique({
          where: {
            projectId_userId: { projectId, userId },
          },
        });
        if (member) {
          userRole = member.role;
        }
      }

      if (!userRole) {
        return res.status(403).json({ success: false, message: 'Access denied to this project' });
      }

      const roleHierarchy = {
        OWNER: 3,
        EDITOR: 2,
        VIEWER: 1,
      };

      if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
        return res.status(403).json({ success: false, message: `Requires ${requiredRole} role on project` });
      }

      // Attach project and role to request for convenience
      req.projectRole = userRole;
      req.project = project;
      
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = authorizeProjectRole;

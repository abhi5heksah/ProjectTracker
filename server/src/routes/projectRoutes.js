const express = require('express');
const { 
  createProject, 
  getProjects, 
  getProjectById, 
  updateProject, 
  deleteProject, 
  inviteMember,
  removeMember
} = require('../controllers/projectController');
const authenticate = require('../middlewares/authenticate');
const authorizeProjectRole = require('../middlewares/authorizeProjectRole');
const { aiLimiter } = require('../middlewares/rateLimiter');
const { analyzeDoc } = require('../controllers/aiController');

const router = express.Router();

// All project routes require authentication
router.use(authenticate);

router.post('/', createProject);
router.get('/', getProjects);

// Specific project routes require authorization checks
router.get('/:projectId', authorizeProjectRole('VIEWER'), getProjectById);
router.put('/:projectId', authorizeProjectRole('EDITOR'), updateProject);
router.delete('/:projectId', authorizeProjectRole('OWNER'), deleteProject);

// Member management
router.post('/:projectId/members', authorizeProjectRole('OWNER'), inviteMember);
router.delete('/:projectId/members/:userId', authorizeProjectRole('OWNER'), removeMember);

// AI Document Import
router.post('/:projectId/import/analyze-doc', authorizeProjectRole('EDITOR'), aiLimiter, analyzeDoc);

module.exports = router;

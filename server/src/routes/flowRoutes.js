const express = require('express');
const { getFlow, updateFlow } = require('../controllers/flowController');
const authenticate = require('../middlewares/authenticate');
const authorizeProjectRole = require('../middlewares/authorizeProjectRole');

const router = express.Router();

router.use(authenticate);

// Getting a flow just requires VIEWER
router.get('/:projectId', authorizeProjectRole('VIEWER'), getFlow);

// Updating a flow requires EDITOR or OWNER
router.put('/:projectId', authorizeProjectRole('EDITOR'), updateFlow);

module.exports = router;

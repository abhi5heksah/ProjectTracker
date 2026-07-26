const prisma = require('../services/db');

const getFlow = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        nodes: true,
        edges: true,
      }
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const mappedNodes = project.nodes.map(n => ({
      id: n.id,
      type: n.type,
      position: { x: n.positionX, y: n.positionY },
      data: n.data,
    }));

    const mappedEdges = project.edges.map(e => ({
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      type: e.type,
    }));

    res.status(200).json({ 
      success: true, 
      nodes: mappedNodes,
      edges: mappedEdges
    });
  } catch (err) {
    next(err);
  }
};

const updateFlow = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { nodes, edges } = req.body;

    // Use a transaction to clear existing and recreate, or upsert.
    // Given React Flow allows free editing, delete all and insert is easiest,
    // but in a production app with history we might want upserts.
    // We'll use a transaction to delete and insert for simplicity and accuracy of exact current state.
    
    await prisma.$transaction(async (tx) => {
      // 1. Delete all current nodes and edges
      await tx.edge.deleteMany({ where: { projectId } });
      await tx.node.deleteMany({ where: { projectId } });

      // 2. Insert new nodes
      if (nodes && nodes.length > 0) {
        await tx.node.createMany({
          data: nodes.map(n => ({
            id: n.id,
            projectId,
            type: n.type,
            positionX: n.position.x,
            positionY: n.position.y,
            data: n.data, // Prisma handles JSON
          }))
        });
      }

      // 3. Insert new edges
      if (edges && edges.length > 0) {
        await tx.edge.createMany({
          data: edges.map(e => ({
            id: e.id,
            projectId,
            sourceNodeId: e.source,
            targetNodeId: e.target,
            type: e.type || 'default',
          }))
        });
      }
    });

    res.status(200).json({ success: true, message: 'Flow saved successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getFlow,
  updateFlow
};

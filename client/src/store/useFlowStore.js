import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from 'reactflow';
import api from '../api/axios';
import { getSocket } from '../api/socket';

const useFlowStore = create((set, get) => ({
  nodes: [],
  edges: [],
  projectId: null,
  userRole: null, // to restrict edits for VIEWER
  loading: false,

  setProjectContext: (projectId, userRole) => set({ projectId, userRole }),

  onNodesChange: (changes) => {
    // Prevent dragging or selecting if viewer
    if (get().userRole === 'VIEWER') return;
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
    
    // Check if we need to emit (ignore selection changes to reduce noise)
    const significantChanges = changes.filter(c => c.type !== 'select');
    if (significantChanges.length > 0) {
      const socket = getSocket();
      if (socket) socket.emit('flowUpdate', { projectId: get().projectId, type: 'nodes', changes: significantChanges });
    }
  },

  onEdgesChange: (changes) => {
    if (get().userRole === 'VIEWER') return;
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });

    const significantChanges = changes.filter(c => c.type !== 'select');
    if (significantChanges.length > 0) {
      const socket = getSocket();
      if (socket) socket.emit('flowUpdate', { projectId: get().projectId, type: 'edges', changes: significantChanges });
    }
  },

  onConnect: (connection) => {
    if (get().userRole === 'VIEWER') return;
    const edge = { ...connection, id: `e-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
    set({
      edges: addEdge(edge, get().edges),
    });
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (nodeType, position) => {
    if (get().userRole === 'VIEWER') return;
    const newNode = {
      id: `node-${Date.now()}`,
      type: nodeType,
      position,
      data: {
        label: `New ${nodeType}`,
        status: 'todo',
        description: ''
      },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  updateNodeData: (nodeId, data) => {
    if (get().userRole === 'VIEWER') return;
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      }),
    });
  },

  deleteNode: (nodeId) => {
    if (get().userRole === 'VIEWER') return;
    
    // Remove edges connected to this node
    const edgesToRemove = get().edges.filter(e => e.source === nodeId || e.target === nodeId);
    const edgeChanges = edgesToRemove.map(e => ({ id: e.id, type: 'remove' }));
    
    if (edgeChanges.length > 0) {
       get().onEdgesChange(edgeChanges);
    }
    
    get().onNodesChange([{ id: nodeId, type: 'remove' }]);
  },

  loadFlow: async (projectId) => {
    set({ loading: true });
    try {
      const res = await api.get(`/flows/${projectId}`); // We will create this backend route
      set({ 
        nodes: res.data.nodes || [], 
        edges: res.data.edges || [],
        loading: false 
      });
    } catch (err) {
      console.error('Failed to load flow', err);
      set({ loading: false });
    }
  },
  
  saveFlow: async () => {
    if (get().userRole === 'VIEWER') return;
    const projectId = get().projectId;
    if (!projectId) return;
    try {
      await api.put(`/flows/${projectId}`, {
        nodes: get().nodes,
        edges: get().edges
      });
    } catch (err) {
      console.error('Failed to save flow', err);
    }
  },

  applyRemoteChanges: (type, changes) => {
    if (type === 'nodes') {
      set({ nodes: applyNodeChanges(changes, get().nodes) });
    } else if (type === 'edges') {
      set({ edges: applyEdgeChanges(changes, get().edges) });
    }
  }
}));

export default useFlowStore;

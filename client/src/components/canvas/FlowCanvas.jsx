import React, { useEffect, useCallback, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import useFlowStore from '../../store/useFlowStore';
import { PhaseNode, FeatureNode, TaskNode } from './nodes/CustomNodes';
import './FlowCanvas.css';
import { Save, Plus, AlignLeft, Upload, Search, ArrowLeft, Sun, Moon, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useTheme } from '../../hooks/useTheme';
import toast from 'react-hot-toast';
import { getLayoutedElements } from '../../utils/layout';
import api from '../../api/axios';

const nodeTypes = {
  phase: PhaseNode,
  feature: FeatureNode,
  task: TaskNode,
};

const FlowCanvas = ({ projectId, userRole }) => {
  const { 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onConnect, 
    loadFlow, 
    setProjectContext,
    addNode,
    saveFlow
  } = useFlowStore();

  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [docText, setDocText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewSnapshot, setPreviewSnapshot] = useState(null);

  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setProjectContext(projectId, userRole);
    loadFlow(projectId);
  }, [projectId, userRole, setProjectContext, loadFlow]);

  const displayNodes = React.useMemo(() => {
    if (!searchQuery) return nodes;
    const lowerQuery = searchQuery.toLowerCase();
    return nodes.map(n => {
      const label = n.data?.label || '';
      const matches = label.toLowerCase().includes(lowerQuery);
      return {
        ...n,
        style: { 
          ...n.style, 
          opacity: matches ? 1 : 0.2,
          transition: 'opacity 0.2s ease',
          boxShadow: matches ? '0 0 15px rgba(167, 139, 250, 0.8)' : 'none'
        }
      };
    });
  }, [nodes, searchQuery]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    toast.success(`Selected node: ${node.data.label}`, {
      icon: '🎯',
      style: {
        borderRadius: '10px',
        background: 'var(--bg-panel)',
        color: 'var(--text-main)',
        border: '1px solid var(--border-color)',
      },
    });
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleAddNode = (type) => {
    // Basic position generation, can be improved
    const position = { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 };
    addNode(type, position);
  };

  const onLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    useFlowStore.getState().setNodes(layoutedNodes);
    useFlowStore.getState().setEdges(layoutedEdges);
  }, [nodes, edges]);

  const parseImportedJSON = (json, rootName = 'Imported Root') => {
    let importedNodes = [];
    let importedEdges = [];

    if (json && typeof json === 'object' && (Array.isArray(json.nodes) || Array.isArray(json.edges))) {
      importedNodes = Array.isArray(json.nodes) ? json.nodes : [];
      importedEdges = Array.isArray(json.edges) ? json.edges : [];
    } else if (Array.isArray(json) && json.length > 0 && json[0].id && json[0].position) {
      importedNodes = json;
    } else {
      const traverse = (data, parentId = null, label = 'Root') => {
        const id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const isObject = data !== null && typeof data === 'object';
        const isArray = Array.isArray(data);
        
        let nodeLabel = String(label);
        let description = '';
        
        if (isObject && !isArray) {
           if (data.label) nodeLabel = data.label;
           else if (data.name) nodeLabel = data.name;
           else if (data.title) nodeLabel = data.title;
           
           if (data.description) description = data.description;
        } else if (!isObject) {
           description = String(data);
        }

        importedNodes.push({
          id,
          type: parentId ? 'task' : 'phase', 
          position: { x: Math.random() * 500, y: Math.random() * 500 },
          data: {
            label: nodeLabel,
            status: (isObject && data.status) ? data.status : 'todo',
            description: description
          }
        });

        if (parentId) {
          importedEdges.push({
            id: `e-${parentId}-${id}`,
            source: parentId,
            target: id,
            type: 'default'
          });
        }

        if (isObject) {
          Object.keys(data).forEach(key => {
            if (!['name', 'title', 'label', 'description', 'status'].includes(key)) {
              traverse(data[key], id, isArray ? `${nodeLabel} Item` : key);
            }
          });
        }
      };
      
      traverse(json, null, rootName);
    }

    importedNodes = importedNodes.map(n => {
      if (!n.position && n.positionX !== undefined && n.positionY !== undefined) {
        return { ...n, position: { x: n.positionX, y: n.positionY } };
      }
      if (!n.position) {
        return { ...n, position: { x: Math.random() * 500, y: Math.random() * 500 } };
      }
      return n;
    });

    return { importedNodes, importedEdges };
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        const { importedNodes, importedEdges } = parseImportedJSON(json, file.name.replace('.json', ''));
        
        const currentNodes = useFlowStore.getState().nodes;
        const currentEdges = useFlowStore.getState().edges;

        useFlowStore.getState().setNodes([...currentNodes, ...importedNodes]);
        useFlowStore.getState().setEdges([...currentEdges, ...importedEdges]);
      } catch (err) {
        alert('Error parsing JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const handleAIAnalyze = async () => {
    if (!docText.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await api.post(`/projects/${projectId}/import/analyze-doc`, { docText });
      if (res.data.success) {
        const currentNodes = useFlowStore.getState().nodes;
        const currentEdges = useFlowStore.getState().edges;
        setPreviewSnapshot({ nodes: [...currentNodes], edges: [...currentEdges] });
        
        const { importedNodes, importedEdges } = parseImportedJSON(res.data.data, 'AI Generated Flow');
        useFlowStore.getState().setNodes([...currentNodes, ...importedNodes]);
        useFlowStore.getState().setEdges([...currentEdges, ...importedEdges]);
        
        setIsPreviewMode(true);
        setShowAIModal(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error analyzing document.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAcceptPreview = async () => {
    setIsPreviewMode(false);
    setPreviewSnapshot(null);
    await saveFlow();
    toast.success('AI generated flow saved successfully!', {
      style: {
        borderRadius: '10px',
        background: 'var(--bg-panel)',
        color: 'var(--text-main)',
        border: '1px solid var(--border-color)',
      }
    });
  };

  const handleRegeneratePreview = () => {
    if (previewSnapshot) {
      useFlowStore.getState().setNodes(previewSnapshot.nodes);
      useFlowStore.getState().setEdges(previewSnapshot.edges);
    }
    setIsPreviewMode(false);
    setShowAIModal(true);
  };

  const handleCancelPreview = () => {
    if (previewSnapshot) {
      useFlowStore.getState().setNodes(previewSnapshot.nodes);
      useFlowStore.getState().setEdges(previewSnapshot.edges);
    }
    setIsPreviewMode(false);
    setPreviewSnapshot(null);
  };

  // Manual save with toast
  const handleManualSave = async () => {
    if (isPreviewMode) return;
    await saveFlow();
    toast.success('Flow saved successfully!', {
      style: {
        borderRadius: '10px',
        background: 'var(--bg-panel)',
        color: 'var(--text-main)',
        border: '1px solid var(--border-color)',
      },
    });
  };

  // Debounced auto-save
  useEffect(() => {
    if (userRole === 'VIEWER' || isPreviewMode) return;
    const timeoutId = setTimeout(() => {
      if (nodes.length > 0 || edges.length > 0) {
        saveFlow();
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [nodes, edges, userRole, saveFlow]);

  return (
    <div className="flow-container">
      <div className="flow-toolbar glass-panel">
        <div className="toolbar-actions">
          <button className="btn-secondary" onClick={() => navigate('/dashboard')}><ArrowLeft size={14}/> Back</button>
          <button className="btn-secondary" onClick={toggleTheme} title="Toggle Theme">
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>
          <div className="toolbar-divider"></div>
          {userRole !== 'VIEWER' && (
            <>
              <button className="btn-secondary" onClick={() => handleAddNode('phase')}><Plus size={14}/> Phase</button>
              <button className="btn-secondary" onClick={() => handleAddNode('feature')}><Plus size={14}/> Feature</button>
              <button className="btn-secondary" onClick={() => handleAddNode('task')}><Plus size={14}/> Task</button>
              <div className="toolbar-divider"></div>
              <button className="btn-secondary" onClick={handleManualSave}><Save size={14}/> Save</button>
              <button className="btn-secondary" onClick={onLayout}><AlignLeft size={14}/> Auto-Layout</button>
              <label className="btn-secondary file-upload-btn">
                <Upload size={14}/> Import JSON
                <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
              </label>
              <button className="btn-secondary" onClick={() => setShowAIModal(true)}><FileText size={14}/> Analyze Document</button>
              <div className="toolbar-divider"></div>
            </>
          )}
          <div className="search-container">
            <Search size={14} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search nodes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>
      
      <div className="flow-wrapper">
        <ReactFlow
          nodes={displayNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
          className="react-flow-custom"
        >
          <Background color="#a78bfa" gap={16} />
          <Controls />
          <MiniMap 
            nodeColor={(node) => {
              switch (node.type) {
                case 'phase': return '#4f46e5';
                case 'feature': return '#d946ef';
                case 'task': return '#10b981';
                default: return '#eee';
              }
            }} 
            maskColor="rgba(18, 18, 28, 0.7)"
          />
        </ReactFlow>

        {selectedNode && (
          <Sidebar 
            node={selectedNode} 
            onClose={() => setSelectedNode(null)} 
            userRole={userRole} 
          />
        )}
      </div>

      {isPreviewMode && (
        <div className="preview-action-bar">
          <span className="preview-label">Preview Mode</span>
          <button className="btn-primary" onClick={handleAcceptPreview}>Accept & Save</button>
          <button className="btn-secondary" onClick={handleRegeneratePreview}>Regenerate</button>
          <button className="btn-secondary" onClick={handleCancelPreview}>Cancel</button>
        </div>
      )}

      {showAIModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ width: '600px', maxWidth: '90vw' }}>
            <h2>Analyze Document</h2>
            <p style={{ marginBottom: '15px', color: 'var(--text-muted)' }}>
              Paste your product requirements document (PRD) here. AI will extract the architecture.
            </p>
            <textarea
              style={{ width: '100%', height: '200px', marginBottom: '15px', padding: '10px', borderRadius: '8px', background: 'var(--bg-base)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
              placeholder="e.g. Users can log in via email/password or SSO..."
              value={docText}
              onChange={(e) => setDocText(e.target.value)}
            />
            <div className="modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowAIModal(false)} disabled={isAnalyzing}>Cancel</button>
              <button className="btn-primary" onClick={handleAIAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowCanvas;

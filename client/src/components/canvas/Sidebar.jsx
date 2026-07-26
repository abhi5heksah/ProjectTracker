import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import useFlowStore from '../../store/useFlowStore';

const Sidebar = ({ node, onClose, userRole }) => {
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const [formData, setFormData] = useState(node.data);

  useEffect(() => {
    setFormData(node.data);
  }, [node]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSave = () => {
    updateNodeData(node.id, formData);
    onClose();
  };

  const isViewer = userRole === 'VIEWER';

  const COLORS = [
    { id: '', label: 'Default', hex: 'transparent', border: 'var(--border-color)' },
    { id: 'indigo', label: 'Indigo', hex: '#6366f1', border: '#6366f1' },
    { id: 'fuchsia', label: 'Fuchsia', hex: '#d946ef', border: '#d946ef' },
    { id: 'emerald', label: 'Emerald', hex: '#10b981', border: '#10b981' },
    { id: 'orange', label: 'Orange', hex: '#f97316', border: '#f97316' },
    { id: 'rose', label: 'Rose', hex: '#f43f5e', border: '#f43f5e' },
  ];

  return (
    <div className="sidebar glass-panel">
      <div className="sidebar-header">
        <h3>Edit Node</h3>
        <button className="btn-icon" onClick={onClose}><X size={18}/></button>
      </div>

      <div className="sidebar-body">
        <div className="form-group">
          <label>Label</label>
          <input 
            type="text" 
            name="label" 
            value={formData.label || ''} 
            onChange={handleChange} 
            disabled={isViewer}
          />
        </div>

        <div className="form-group">
          <label>Status</label>
          <select 
            name="status" 
            value={formData.status || 'todo'} 
            onChange={handleChange}
            disabled={isViewer}
            className="custom-select"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea 
            name="description" 
            value={formData.description || ''} 
            onChange={handleChange} 
            disabled={isViewer}
            rows={4}
          />
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input 
            type="checkbox"
            name="isImplemented"
            checked={formData.isImplemented || false}
            onChange={handleCheckboxChange}
            disabled={isViewer}
            style={{ width: '16px', height: '16px', cursor: isViewer ? 'default' : 'pointer' }}
          />
          <label style={{ margin: 0 }}>Implementation Completed</label>
        </div>

        <div className="form-group">
          <label>Node Color</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '5px', flexWrap: 'wrap' }}>
            {COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => !isViewer && setFormData(prev => ({ ...prev, color: c.id }))}
                title={c.label}
                disabled={isViewer}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: c.hex,
                  border: `2px solid ${formData.color === c.id ? 'var(--text-main)' : c.border}`,
                  cursor: isViewer ? 'default' : 'pointer',
                  padding: 0,
                  transition: 'all 0.2s',
                  boxShadow: formData.color === c.id ? '0 0 0 2px var(--bg-base)' : 'none'
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {!isViewer && (
        <div className="sidebar-footer" style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={handleSave}>Apply Changes</button>
          <button 
            className="btn-secondary" 
            style={{ borderColor: '#ef4444', color: '#ef4444' }} 
            onClick={() => {
              useFlowStore.getState().deleteNode(node.id);
              onClose();
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;

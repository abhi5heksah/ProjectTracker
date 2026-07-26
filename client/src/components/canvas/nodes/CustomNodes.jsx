import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { CheckCircle2 } from 'lucide-react';
import './Nodes.css';

const BaseNode = ({ data, type, isConnectable }) => {
  const statusColors = {
    todo: '#a0a0b0',
    in_progress: '#3b82f6',
    done: '#10b981',
  };

  const badgeColor = statusColors[data.status] || statusColors.todo;
  const colorClass = data.color ? `color-theme-${data.color}` : '';

  return (
    <div className={`custom-node ${type}-node glass-panel ${colorClass}`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable} 
        className="custom-handle" 
      />
      
      <div className="node-header">
        <span className="node-badge" style={{ backgroundColor: badgeColor }}>
          {data.status.replace('_', ' ').toUpperCase()}
        </span>
        <span className="node-type">{type.toUpperCase()}</span>
      </div>
      
      <div className="node-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <strong style={{ wordBreak: 'break-word' }}>{data.label}</strong>
        {data.isImplemented && <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />}
      </div>

      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={isConnectable} 
        className="custom-handle" 
      />
    </div>
  );
};

export const PhaseNode = memo((props) => <BaseNode {...props} type="phase" />);
export const FeatureNode = memo((props) => <BaseNode {...props} type="feature" />);
export const TaskNode = memo((props) => <BaseNode {...props} type="task" />);

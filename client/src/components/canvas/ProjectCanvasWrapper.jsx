import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import FlowCanvas from './FlowCanvas';
import { ArrowLeft } from 'lucide-react';
import useFlowStore from '../../store/useFlowStore';
import { getSocket } from '../../api/socket';

const ProjectCanvasWrapper = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const applyRemoteChanges = useFlowStore(state => state.applyRemoteChanges);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        const res = await api.get(`/projects/${projectId}`);
        setProjectData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };
    fetchProjectDetails();
  }, [projectId]);

  useEffect(() => {
    if (!loading && !error) {
      const socket = getSocket();
      socket.emit('joinProject', projectId);

      socket.on('flowChange', ({ type, changes }) => {
        applyRemoteChanges(type, changes);
      });

      return () => {
        socket.emit('leaveProject', projectId);
        socket.off('flowChange');
      };
    }
  }, [projectId, loading, error, applyRemoteChanges]);

  if (loading) {
    return <div style={{ color: 'white', padding: '20px' }}>Loading canvas...</div>;
  }

  if (error || !projectData) {
    return (
      <div style={{ color: 'white', padding: '20px', textAlign: 'center' }}>
        <p>{error}</p>
        <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw' }}>
      <FlowCanvas 
        projectId={projectId} 
        userRole={projectData.userRole} 
      />
    </div>
  );
};

export default ProjectCanvasWrapper;

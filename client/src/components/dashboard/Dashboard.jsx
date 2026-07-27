import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import useProjectStore from '../../store/useProjectStore';
import api from '../../api/axios';
import './Dashboard.css';
import { LogOut, Plus, Trash2, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { Skeleton } from 'boneyard-js/react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, clearAuth } = useAuthStore();
  const { projects, fetchProjects, createProject, deleteProject, loading } = useProjectStore();
  
  const [showModal, setShowModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      clearAuth();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setIsSubmitting(true);
    try {
      await createProject(newProjectName, newProjectDesc);
      setShowModal(false);
      setNewProjectName('');
      setNewProjectDesc('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-brand">
          <h1>Project Tracker</h1>
          <span className="user-badge">Logged in as {user?.name}</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={toggleTheme} className="btn-secondary" title="Toggle Theme">
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button onClick={handleLogout} className="btn-secondary">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="projects-header">
          <h2>Your Projects</h2>
          <button onClick={() => setShowModal(true)} className="btn-primary-small">
            <Plus size={16} /> New Project
          </button>
        </div>

        <Skeleton name="projects-dashboard" loading={loading}>
          {projects.length === 0 ? (
            <div className="empty-state">
              <p>You don't have any projects yet.</p>
              <button onClick={() => setShowModal(true)} className="btn-primary">
                Create your first project
              </button>
            </div>
          ) : (
            <div className="projects-grid">
              {projects.map((project) => (
                <div 
                  key={project.id} 
                  className="project-card glass-panel"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  <div className="project-card-content">
                    <h3>{project.name}</h3>
                    <p>{project.description || 'No description provided.'}</p>
                  </div>
                  <div className="project-card-footer">
                    <span className="project-role">
                      {project.ownerId === user?.id ? 'Owner' : 'Member'}
                    </span>
                    {project.ownerId === user?.id && (
                      <button 
                        className="btn-icon-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          if(confirm('Are you sure you want to delete this project?')) {
                            deleteProject(project.id);
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Skeleton>
      </main>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <h2>Create New Project</h2>
            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label>Project Name</label>
                <input 
                  type="text" 
                  value={newProjectName} 
                  onChange={(e) => setNewProjectName(e.target.value)} 
                  required 
                  placeholder="e.g., E-commerce Redesign"
                />
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <input 
                  type="text" 
                  value={newProjectDesc} 
                  onChange={(e) => setNewProjectDesc(e.target.value)} 
                  placeholder="What is this project about?"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

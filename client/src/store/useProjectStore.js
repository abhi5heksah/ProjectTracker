import { create } from 'zustand';
import api from '../api/axios';

const useProjectStore = create((set) => ({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/projects');
      set({ projects: res.data.projects, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch projects', loading: false });
    }
  },
  createProject: async (name, description) => {
    try {
      const res = await api.post('/projects', { name, description });
      set((state) => ({ projects: [res.data.project, ...state.projects] }));
      return res.data.project;
    } catch (err) {
      throw err;
    }
  },
  deleteProject: async (id) => {
    try {
      await api.delete(`/projects/${id}`);
      set((state) => ({ projects: state.projects.filter(p => p.id !== id) }));
    } catch (err) {
      throw err;
    }
  }
}));

export default useProjectStore;

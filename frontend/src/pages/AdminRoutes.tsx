import { useState, useEffect } from 'react';
import { Modal } from '../components/Modal';
import api from '../services/api';
import { Plus, Route } from 'lucide-react';

interface PredefinedRoute {
  id: number;
  name: string;
  description: string;
}

export default function AdminRoutes() {
  const [routes, setRoutes] = useState<PredefinedRoute[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(true);

  const fetchRoutes = async () => {
    try {
      const res = await api.get('/routes_api');
      setRoutes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Basic implementation without full coordinates geometry right now
      await api.post('/routes_api', { ...formData, startLocation: {}, endLocation: {} });
      setIsModalOpen(false);
      setFormData({ name: '', description: '' });
      fetchRoutes();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 h-full bg-slate-50/50">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 border-b-2 border-emerald-500 pb-2 inline-flex items-center gap-2">
              <Route className="text-emerald-600" /> Routes & Stops
            </h1>
            <p className="text-slate-500 mt-2">Configure default paths and planned delivery stops for your fleet.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-sm font-medium"
          >
            <Plus className="h-5 w-5" /> New Route
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {loading ? (
               <li className="p-8 text-center text-slate-400">Loading routes...</li>
            ) : routes.length === 0 ? (
               <li className="p-8 text-center text-slate-400">No routes configured.</li>
            ) : (
              routes.map(rt => (
                <li key={rt.id} className="p-6 hover:bg-slate-50 transition flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg mb-1">{rt.name}</h3>
                    <p className="text-slate-500 text-sm">{rt.description || 'No description'}</p>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold">
                    0 Stops
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Define a New Route">
          <form onSubmit={handleSubmit} className="px-2 py-2 flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Route Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Morning Logistics Route A"
                className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm outline-none dark:text-white"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
              <textarea
                placeholder="Enter path details, checkpoints, or schedule notes..."
                className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm outline-none dark:text-white min-h-[120px] resize-none"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                className="px-5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl font-semibold text-white bg-slate-900 hover:bg-black transition-colors shadow-md active:scale-95"
              >
                Save Route
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}

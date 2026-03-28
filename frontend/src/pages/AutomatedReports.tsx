import { useState, useEffect } from 'react';
import { Modal } from '../components/Modal';
import api from '../services/api';
import { Plus, FileText, Trash2, Clock, Mail } from 'lucide-react';

interface ReportTask {
  id: number;
  name: string;
  type: string;
  schedule: string;
  emailList: string;
}

export default function AutomatedReports() {
  const [reports, setReports] = useState<ReportTask[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'FLEET_SUMMARY', schedule: '0 0 * * *', emailList: '' });
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const res = await api.get('/automated_reports');
      setReports(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/automated_reports', formData);
      setIsModalOpen(false);
      setFormData({ name: '', type: 'FLEET_SUMMARY', schedule: '0 0 * * *', emailList: '' });
      fetchReports();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if(!confirm('Cancel this automated report?')) return;
    try {
      await api.delete(`/automated_reports/${id}`);
      fetchReports();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 h-full bg-slate-50/50">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 border-b-2 border-rose-500 pb-2 inline-flex items-center gap-2">
              <FileText className="text-rose-600" /> Automated Reports
            </h1>
            <p className="text-slate-500 mt-2">Schedule automatic periodic status reports to be sent via email.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition shadow-sm font-medium"
          >
            <Plus className="h-5 w-5" /> Schedule Report
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-xs font-semibold tracking-wider text-slate-500 uppercase">Report Name</th>
                <th className="p-4 text-xs font-semibold tracking-wider text-slate-500 uppercase">Type</th>
                <th className="p-4 text-xs font-semibold tracking-wider text-slate-500 uppercase">Schedule (Cron)</th>
                <th className="p-4 text-xs font-semibold tracking-wider text-slate-500 uppercase">Recipients</th>
                <th className="p-4 text-xs font-semibold tracking-wider text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">Loading automated reports...</td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">No scheduled reports found.</td>
                </tr>
              ) : (
                reports.map(rep => (
                  <tr key={rep.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-medium text-slate-900">{rep.name}</td>
                    <td className="p-4">
                      <span className="bg-rose-50 text-rose-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                        {rep.type}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 font-mono text-sm flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {rep.schedule}
                    </td>
                    <td className="p-4 text-slate-500 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {rep.emailList.split(',').length} email(s)
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleDelete(rep.id)} className="text-red-400 hover:text-red-600 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Format a recurring report">
          <form onSubmit={handleSubmit} className="px-2 py-2 flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Schedule Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Daily Fuel Summary"
                className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm outline-none dark:text-white"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
               <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Data Type</label>
               <select
                 className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm outline-none dark:text-white appearance-none"
                 value={formData.type}
                 onChange={e => setFormData({ ...formData, type: e.target.value })}
               >
                  <option value="FLEET_SUMMARY">Fleet Summary</option>
                  <option value="DRIVER_BEHAVIOUR">Driver Behaviour</option>
                  <option value="FUEL">Fuel Analytics</option>
               </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Cron Schedule Constraint</label>
              <input
                type="text"
                required
                placeholder="e.g. 0 0 * * * for midnight every day"
                className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl font-mono text-sm focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm outline-none dark:text-white"
                value={formData.schedule}
                onChange={e => setFormData({ ...formData, schedule: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Recipient Emails (comma separated)</label>
              <input
                type="text"
                required
                placeholder="e.g. admin@example.com, boss@company.com"
                className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm outline-none dark:text-white"
                value={formData.emailList}
                onChange={e => setFormData({ ...formData, emailList: e.target.value })}
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
                Schedule Task
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}

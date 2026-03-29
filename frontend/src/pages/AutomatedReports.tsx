import React, { useState, useEffect } from 'react';
import { Modal } from '../components/Modal';
import api from '../services/api';
import { FileText, Trash2, Clock, Mail, BarChart3, Download, RefreshCw, Calendar, Car, Plus, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { format, subDays, startOfMonth, startOfYear } from 'date-fns';

interface ReportTask {
  id: number;
  name: string;
  type: string;
  schedule: string;
  emailList: string;
}

interface VehicleReport {
  vehicleId: number;
  vehicleName: string;
  licensePlate: string;
  totalDistance: string;     
  fuelConsumption: string;   
  startFuel: string;
  endFuel: string;
}

function CustomSelect({ value, options, onChange, fullWidth = false }: { value: string, options: {value: string, label: string}[], onChange: (val: string) => void, fullWidth?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label;

  return (
    <div className="relative w-full">
      <div 
        className={`appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-2 pl-4 pr-10 rounded-lg focus-within:ring-2 focus-within:ring-emerald-500 cursor-pointer outline-none text-sm transition-all shadow-sm flex items-center justify-between ${fullWidth ? 'w-full' : 'sm:w-44'}`}
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[160px] bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden py-1">
          {options.map(opt => (
            <div 
              key={opt.value}
              className={`px-4 py-2 cursor-pointer hover:bg-emerald-50 transition-colors text-sm ${value === opt.value ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 font-medium'}`}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AutomatedReports() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'automation'>('analytics');
  
  // Analytics State
  const [vehicleReports, setVehicleReports] = useState<VehicleReport[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [dateRange, setDateRange] = useState<'today' | '7days' | 'month' | 'this_year'>('7days');
  
  // Automation State
  const [tasks, setTasks] = useState<ReportTask[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [expandedEmailsIds, setExpandedEmailsIds] = useState<number[]>([]);
  const [formData, setFormData] = useState({ 
    name: '', 
    type: 'FLEET_SUMMARY', 
    schedule: '0 0 * * *', 
    emailList: '' 
  });
  const [simpleSchedule, setSimpleSchedule] = useState('daily');
  const [addEmailModal, setAddEmailModal] = useState<{isOpen: boolean, taskId: number|null}>({isOpen: false, taskId: null});
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/automated_reports');
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setTasksLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setReportLoading(true);
    try {
      const end = new Date();
      let start = end;
      if (dateRange === '7days') start = subDays(end, 7);
      if (dateRange === 'month') start = startOfMonth(end);
      if (dateRange === 'this_year') start = startOfYear(end);
      
      const res = await api.get(`/reports/vehicles?startDate=${start.toISOString()}&endDate=${end.toISOString()}`);
      setVehicleReports(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setReportLoading(false);
    }
  };

  const mapSimpleToCron = (opt: string) => {
     if (opt === 'daily') return '0 0 * * *';
     if (opt === 'weekly') return '0 0 * * 1';
     if (opt === 'monthly') return '0 0 1 * *';
     if (opt === 'yearly') return '0 0 1 1 *';
     return '0 0 * * *';
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const finalCron = mapSimpleToCron(simpleSchedule);
      await api.post('/automated_reports', { ...formData, schedule: finalCron });
      setIsModalOpen(false);
      setFormData({ name: '', type: 'FLEET_SUMMARY', schedule: '0 0 * * *', emailList: '' });
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (id: number) => {
    if(!confirm('Delete this automated report schedule?')) return;
    try {
      await api.delete(`/automated_reports/${id}`);
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmailModal.taskId || !newEmail) return;
    try {
      const taskToEdit = tasks.find(t => t.id === addEmailModal.taskId);
      if (!taskToEdit) return;
      const updatedList = taskToEdit.emailList ? `${taskToEdit.emailList}, ${newEmail}` : newEmail;
      
      await api.patch(`/automated_reports/${addEmailModal.taskId}`, { emailList: updatedList });
      
      setAddEmailModal({isOpen: false, taskId: null});
      setNewEmail('');
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = () => {
    if (!vehicleReports.length) return;
    
    const startStr = dateRange === 'today' ? format(new Date(), 'yyyy-MM-dd') : dateRange === '7days' ? format(subDays(new Date(), 7), 'yyyy-MM-dd') : dateRange === 'month' ? format(startOfMonth(new Date()), 'yyyy-MM-dd') : format(startOfYear(new Date()), 'yyyy-MM-dd');
    const headerTitle = ['Report Period:', `${startStr} to ${format(new Date(), 'yyyy-MM-dd')}`];
    const spacer: string[] = [];
    const headers = ['Vehicle', 'Plate', 'Distance (km)', 'Fuel Used (L)'];
    const rows = vehicleReports.map(r => [
      r.vehicleName, 
      r.licensePlate, 
      r.totalDistance, 
      r.fuelConsumption
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," + headerTitle.join(",") + "\n" + spacer.join(",") + "\n" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fleet_report_${dateRange}_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartData = vehicleReports
    .map(r => ({
      name: r.vehicleName,
      Distance: parseFloat(r.totalDistance) || 0,
      Fuel: parseFloat(r.fuelConsumption) || 0
    }))
    .filter(r => r.Distance > 0 || r.Fuel > 0)
    .sort((a,b) => b.Distance - a.Distance)
    .slice(0, 10);

  const parseCronPretty = (cron: string) => {
     if (cron.includes('1 1 *')) return 'Yearly';
     if (cron.includes('1 * *')) return 'Monthly';
     if (cron.includes('* 1')) return 'Weekly';
     return 'Daily';
  };

  return (
    <div className="p-8 h-full bg-slate-50/50 overflow-y-auto w-full">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 border-b-2 border-emerald-500 pb-2 inline-flex items-center gap-2">
              <BarChart3 className="text-emerald-600" /> Reports & Analytics
            </h1>
            <p className="text-slate-500 mt-2">Generate historical insights, dispatch scheduled summaries, and export data.</p>
          </div>
          
          <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
             <button 
               className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'analytics' ? 'bg-slate-100 text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               onClick={() => setActiveTab('analytics')}
             >
               Reports Generator
             </button>
             <button 
               className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'automation' ? 'bg-slate-100 text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               onClick={() => setActiveTab('automation')}
             >
               Automation Tasks
             </button>
          </div>
        </div>

        {activeTab === 'analytics' && (
           <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3">
                  <Calendar className="text-slate-400 h-5 w-5" />
                  <CustomSelect 
                    value={dateRange} 
                    options={[
                      {value: 'today', label: 'Today'},
                      {value: '7days', label: 'Last 7 Days'},
                      {value: 'month', label: 'This Month'},
                      {value: 'this_year', label: 'This Year'}
                    ]}
                    onChange={(val) => setDateRange(val as any)} 
                  />
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={fetchAnalytics}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium"
                    disabled={reportLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${reportLoading ? 'animate-spin' : ''}`} /> Sync
                  </button>
                  <button 
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-slate-800 hover:bg-slate-900 shadow-sm rounded-lg transition-colors font-medium"
                  >
                    <Download className="h-4 w-4" /> Export CSV
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 inline-flex items-center gap-2">
                       <Car className="h-4 w-4 text-emerald-500" /> Fleet Distance Traveled (Top 10)
                    </h3>
                    <div className="h-64">
                      {reportLoading ? (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">Crunching data...</div>
                      ) : chartData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">No activity recorded.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="name" tick={false} axisLine={false} tickLine={false} />
                            <YAxis tick={{fontSize: 11, fill: '#64748B'}} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                            <Bar dataKey="Distance" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                 </div>

                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 inline-flex items-center gap-2">
                       <BarChart3 className="h-4 w-4 text-indigo-500" /> Fuel Consumption Profile
                    </h3>
                    <div className="h-64">
                      {reportLoading ? (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">Crunching data...</div>
                      ) : chartData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">No fuel records.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorFuel" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="name" tick={false} axisLine={false} tickLine={false} />
                            <YAxis tick={{fontSize: 11, fill: '#64748B'}} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                            <Area type="monotone" dataKey="Fuel" stroke="#6366F1" fillOpacity={1} fill="url(#colorFuel)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                 </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                          <th className="p-4 font-semibold">Vehicle</th>
                          <th className="p-4 font-semibold">License Plate</th>
                          <th className="p-4 font-semibold">Distance Traveled</th>
                          <th className="p-4 font-semibold">Est. Fuel Consumed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {reportLoading ? (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-400 text-sm">Building matrices...</td></tr>
                         ) : vehicleReports.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-400 text-sm">No telemetry matching query.</td></tr>
                         ) : (
                            vehicleReports.map((r, i) => (
                              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 text-sm font-medium text-slate-800">{r.vehicleName}</td>
                                <td className="p-4">
                                  <span className="inline-flex px-2 py-1 text-[10px] font-mono font-bold bg-slate-100 text-slate-600 rounded border border-slate-200 shadow-sm uppercase tracking-widest whitespace-nowrap">
                                        {r.licensePlate}
                                  </span>
                                </td>
                                <td className="p-4 text-sm tracking-tight font-medium text-slate-700">{r.totalDistance} <span className="text-slate-400 text-xs">km</span></td>
                                <td className="p-4 text-sm tracking-tight font-medium text-slate-700">{r.fuelConsumption} <span className="text-slate-400 text-xs">Liters</span></td>
                              </tr>
                            ))
                         )}
                      </tbody>
                    </table>
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'automation' && (
           <div className="space-y-6">
               <div className="flex justify-between items-center mb-2">
                 <p className="text-sm text-slate-500">Configure the system to autonomously email PDF/CSV fleet reports on a recurring schedule.</p>
                 <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-sm font-medium text-sm"
                 >
                    <Mail className="h-4 w-4" /> New Email Task
                 </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {tasksLoading ? (
                    <div className="col-span-full py-12 text-center text-slate-400">Loading automated tasks...</div>
                 ) : tasks.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm border-dashed">
                      <FileText className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                      No automation tasks configured.
                    </div>
                 ) : (
                    tasks.map(task => (
                      <div key={task.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 group flex flex-col justify-between">
                         <div>
                            <div className="flex justify-between items-start mb-3">
                              <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase border border-emerald-100 flex items-center gap-1.5">
                                 <Clock className="w-3 h-3" /> {parseCronPretty(task.schedule)}
                              </span>
                              <button 
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <h3 className="font-bold text-slate-900 mb-1">{task.name}</h3>
                            <div className="mb-2">
                              <p className={`text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded border border-slate-100 transition-all duration-300 ${expandedEmailsIds.includes(task.id) ? 'max-h-48 overflow-y-auto break-words whitespace-pre-wrap' : 'truncate'}`} title={task.emailList}>
                                 To: {task.emailList}
                              </p>
                              {task.emailList && task.emailList.length > 30 && (
                                <button
                                  onClick={() => setExpandedEmailsIds(prev => prev.includes(task.id) ? prev.filter(id => id !== task.id) : [...prev, task.id])}
                                  className="text-[10px] text-slate-500 hover:text-slate-700 font-medium tracking-wide uppercase mt-1"
                                >
                                  {expandedEmailsIds.includes(task.id) ? 'Show Less' : 'View All Emails'}
                                </button>
                              )}
                            </div>
                            <button
                              onClick={() => setAddEmailModal({isOpen: true, taskId: task.id})}
                              className="mb-4 flex items-center gap-1 text-[10px] text-emerald-600 font-bold uppercase tracking-wider hover:text-emerald-700 transition"
                            >
                              <Plus className="h-3 w-3" /> Add Email
                            </button>
                         </div>
                         <div className="text-xs text-slate-400 pt-3 border-t border-slate-100 flex items-center justify-between">
                            Type: {task.type.replace('_', ' ')}
                            <span className="flex items-center gap-1 text-emerald-600">
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Active
                            </span>
                         </div>
                      </div>
                    ))
                 )}
               </div>
           </div>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Automation Task">
          <form onSubmit={handleSubmitTask} className="w-[450px] p-2 flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Report Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Weekly Management Digest"
                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1.5">Report Type</label>
                 <CustomSelect 
                     fullWidth
                     value={formData.type}
                     options={[
                       {value: 'FLEET_SUMMARY', label: 'Fleet Summary'},
                       {value: 'FUEL_ANALYSIS', label: 'Fuel Analytics'},
                       {value: 'BEHAVIOR_ALERTS', label: 'Driver Behavior'}
                     ]}
                     onChange={val => setFormData({ ...formData, type: val })}
                   />
               </div>
               <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1.5">Dispatch Schedule</label>
                 <CustomSelect 
                     fullWidth
                     value={simpleSchedule}
                     options={[
                       {value: 'daily', label: 'Daily at Midnight'},
                       {value: 'weekly', label: 'Weekly (Monday)'},
                       {value: 'monthly', label: 'Monthly (1st)'},
                       {value: 'yearly', label: 'Yearly (Jan 1st)'}
                     ]}
                     onChange={val => setSimpleSchedule(val)}
                   />
               </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Recipient Emails</label>
              <textarea
                required
                placeholder="john@example.com, manager@example.com..."
                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all resize-none h-24"
                value={formData.emailList}
                onChange={e => setFormData({ ...formData, emailList: e.target.value })}
              />
              <p className="text-[10px] text-slate-400 mt-2">Separate multiple email addresses with a comma.</p>
            </div>
            
            <div className="pt-4 flex justify-end gap-3 mt-2 border-t border-slate-100">
              <button
                type="button"
                className="px-5 py-2.5 rounded-xl font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors text-sm"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md active:scale-95 text-sm"
              >
                Start Automation
              </button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={addEmailModal.isOpen} onClose={() => setAddEmailModal({isOpen: false, taskId: null})} title="Add Recipient">
          <form onSubmit={handleAddEmailSubmit} className="w-[350px] p-2 flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Email Address</label>
              <input
                type="email"
                required
                placeholder="new.user@example.com"
                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 mt-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                className="px-4 py-2 rounded-xl font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 text-sm"
                onClick={() => setAddEmailModal({isOpen: false, taskId: null})}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md active:scale-95 text-sm"
              >
                Add
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}

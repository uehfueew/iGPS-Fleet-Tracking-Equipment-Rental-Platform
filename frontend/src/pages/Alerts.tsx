import { useEffect, useState, useContext, Fragment } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ShieldAlert, Info, AlertTriangle, Bell, CheckCircle2, AlertCircle, CheckCheck } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const Alerts = () => {
 const authContext = useContext(AuthContext);
 const token = authContext ? authContext.token : null;
 const [alerts, setAlerts] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [filter, setFilter] = useState('all');
 const [showMarkAllModal, setShowMarkAllModal] = useState(false);

 useEffect(() => {
 fetchAlerts();
 }, [token]);

 const fetchAlerts = async () => {
 try {
 setLoading(true);
 const res = await api.get('/alerts');
 setAlerts(res.data);
 } catch (error) {
 console.error('Failed to fetch alerts:', error);
 } finally {
 setLoading(false);
 }
 };

 const getAlertIcon = (type: string) => {
 switch (type?.toLowerCase()) {
 case 'geofence_exit':
 return <ShieldAlert className="w-6 h-6 text-purple-600" />;
 case 'speeding':
 return <AlertTriangle className="w-6 h-6 text-red-600" />;
 case 'maintenance':
 return <AlertCircle className="w-6 h-6 text-amber-600" />;
 default:
 return <Info className="w-6 h-6 text-blue-600" />;
 }
 };

 const markAsRead = async (id: number) => {
 const original = [...alerts];
 setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
 try {
 await api.put(`/alerts/${id}/read`);
 } catch (err) {
 console.error('Failed to update alert');
 setAlerts(original);
 }
 };

 const confirmMarkAll = async () => {
 const original = [...alerts];
 setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
 setShowMarkAllModal(false);
 
 try {
 await api.put(`/alerts/mark-all-read`);
 } catch (err) {
 console.error('Failed to update all alerts');
 setAlerts(original);
 }
 };

 const filteredAlerts = alerts.filter(a => {
  if (filter === 'unread') return !a.isRead;
  if (filter === 'read') return a.isRead;
  return true;
 });

 const unreadCount = alerts.filter(a => !a.isRead).length;

 return (
 <div className="p-8 max-w-5xl mx-auto min-h-screen">
 <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
 <div>
 <h2 className="text-4xl font-extrabold text-gray-900 dark:text-slate-300 flex items-center gap-4">
 <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-full relative">
 <Bell className="w-10 h-10 text-blue-600" />
 {unreadCount > 0 && (
 <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
 )}
 </div>
 System Alerts
 </h2>
 <p className="text-gray-500 dark:text-slate-400 mt-4 text-lg">Monitor critical events, geofence breaches, and maintenance warnings across your fleet.</p>
 </div>
 
 <div className="flex flex-col sm:flex-row gap-4">
 <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl h-fit">
  <button onClick={() => setFilter('all')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filter === 'all' ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:text-slate-300'}`}>All</button>
  <button onClick={() => setFilter('unread')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filter === 'unread' ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:text-slate-300'}`}>Unread</button>
  <button onClick={() => setFilter('read')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filter === 'read' ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:text-slate-300'}`}>Read</button>
 </div>
 {unreadCount > 0 && (
 <button
 onClick={() => setShowMarkAllModal(true)}
 className="flex items-center justify-center gap-2 px-5 py-2.5 h-fit whitespace-nowrap bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-gray-700 dark:text-slate-300 font-semibold hover:bg-gray-50 dark:hover:bg-slate-800/80 transition-colors shadow-sm"
 >
 <CheckCheck className="w-5 h-5" />
 Mark All Read
 </button>
 )}
 </div>
 </div>

 {loading ? (
 <div className="flex justify-center items-center py-20">
 <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
 </div>
 ) : (filteredAlerts.length === 0 ? (
 <motion.div 
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="text-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm"
 >
 <div className="mx-auto w-24 h-24 bg-gray-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
 <CheckCircle2 className="h-12 w-12 text-gray-400 dark:text-slate-500" />
 </div>
 <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-300">All Clear!</h3>
 <p className="mt-2 text-gray-500 dark:text-slate-400 text-lg">You have no new alerts matching your criteria.</p>
 </motion.div>
 ) : (
 <div className="grid gap-4">
 <AnimatePresence>
 {filteredAlerts.map(a => (
 <motion.div
 key={a.id}
 layout
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className={`group flex flex-col sm:flex-row items-start sm:items-center gap-5 p-6 rounded-2xl border transition-all duration-300 ${
 a.isRead 
 ? 'bg-gray-50 dark:bg-slate-800/40 border-gray-100 dark:border-slate-800/60 opacity-70 hover:opacity-100' 
 : 'bg-white dark:bg-indigo-950/40 border-blue-100 dark:border-indigo-900/60 shadow-lg hover:shadow-xl'
 }`}
 >
 <div className={`p-4 rounded-xl shrink-0 transition-colors ${
 a.isRead ? 'bg-gray-100 dark:bg-slate-800/80 ' : 'bg-blue-50 dark:bg-blue-900/30 '
 }`}>
 {getAlertIcon(a.type)}
 </div>
 
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-3 mb-2">
 {!a.isRead && (
 <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold uppercase tracking-wider shadow-sm">
 New Alert
 </span>
 )}
 <span className="text-sm font-semibold tracking-wide text-gray-400 dark:text-slate-500">
 {new Date(a.timestamp).toLocaleString(undefined, {
 month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
 })}
 </span>
 </div>
 <p className={`text-lg transition-colors ${a.isRead ? 'text-gray-600 dark:text-slate-400 ' : 'text-gray-900 dark:text-slate-300 font-medium'}`}>
 {a.vehicle?.name ? <span className="font-bold mr-2 text-gray-800 dark:text-slate-200">{a.vehicle.name}</span> : null}
 {a.message}
 </p>
 </div>
 
 {!a.isRead && (
 <button
 onClick={() => markAsRead(a.id)}
 className="shrink-0 mt-4 sm:mt-0 px-6 py-3 border-2 border-gray-100 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 dark:hover:bg-slate-700 hover:border-gray-200 dark:border-slate-800 dark:hover:border-slate-600 transition-all active:scale-95"
 >
 Mark as Read
 </button>
 )}
 </motion.div>
 ))}
 </AnimatePresence>
 </div>
 ))}

 {/* Confirmation Modal */}
 <AnimatePresence>
 {showMarkAllModal && (
 <Fragment>
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-sm"
 onClick={() => setShowMarkAllModal(false)}
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.9, y: 30 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9, y: 30 }}
 className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
 >
 <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden pointer-events-auto">
 <div className="p-8 text-center">
 <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
 <CheckCheck className="w-10 h-10 text-blue-600" />
 </div>
 <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-300 mb-2">Mark all as read?</h3>
 <p className="text-gray-500 dark:text-slate-400 mb-8 text-lg">Are you sure you want to dismiss all {unreadCount} unread alerts? You can still view them later.</p>
 
 <div className="flex flex-col sm:flex-row gap-3">
 <button
 onClick={() => setShowMarkAllModal(false)}
 className="flex-1 px-6 py-4 rounded-xl border-2 border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 font-bold hover:bg-gray-50 dark:hover:bg-slate-800/80 dark:hover:bg-slate-700 transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={confirmMarkAll}
 className="flex-1 px-6 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5"
 >
 Confirm
 </button>
 </div>
 </div>
 </div>
 </motion.div>
 </Fragment>
 )}
 </AnimatePresence>
 </div>
 );
};

export default Alerts;

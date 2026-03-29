import { useEffect, useState } from 'react';
import { Truck, Calendar, Bell, ShieldCheck, CarFront } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import api from '../services/api';

interface DashboardStats {
  totalAssets: number;
  activeAssets: number;
  totalRentals: number;
  activeRentals: number;
  alerts: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalAssets: 0,
    activeAssets: 0,
    totalRentals: 0,
    activeRentals: 0,
    alerts: 0
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const vehiclesRes = await api.get('/vehicles');
      const rentalsRes = await api.get('/rentals');
      const alertsRes = await api.get('/alerts');
      
      const vehicles = vehiclesRes.data;
      const rentals = rentalsRes.data;
      const alerts = alertsRes.data || [];

      const activeVehicles = vehicles.length;
      const activeRentals = rentals.filter((r: any) => r.status?.toLowerCase() === 'active').length;
      const totalAlerts = alerts.length;

      setStats({
        totalAssets: vehicles.length,
        activeAssets: activeVehicles,
        totalRentals: rentals.length,
        activeRentals: activeRentals,
        alerts: totalAlerts
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const alertsData = [
    { name: 'Speeding', value: 8 },
    { name: 'Idling', value: 12 },
    { name: 'Maintenance', value: 3 },
    { name: 'Geofence', value: 5 }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12 p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-300 tracking-tight font-sans">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium tracking-wide">Good morning, here is your fleet overview.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
              <Truck className="h-6 w-6" />
            </div>
            <h3 className="text-blue-500 font-semibold text-sm uppercase tracking-wider">Total Fleet</h3>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-extrabold text-slate-800 dark:text-slate-200">{stats.totalAssets}</p>
            <p className="text-slate-400 dark:text-slate-500 font-medium pb-1 tracking-wide">vehicles</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-emerald-50 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-emerald-100 p-3 rounded-lg text-emerald-600">
              <CarFront className="h-6 w-6" />
            </div>
            <h3 className="text-emerald-500 font-semibold text-sm uppercase tracking-wider">Active Assets</h3>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-extrabold text-emerald-600">{stats.activeAssets}</p>
            <p className="text-slate-400 dark:text-slate-500 font-medium pb-1 tracking-wide">online</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-amber-100 p-3 rounded-lg text-amber-600">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-amber-500 font-semibold text-sm uppercase tracking-wider">Active Rentals</h3>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-extrabold text-slate-800 dark:text-slate-200">{stats.activeRentals}</p>
            <p className="text-slate-400 dark:text-slate-500 font-medium pb-1 tracking-wide">contracts</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-red-50 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-red-100 p-3 rounded-lg text-red-600">
              <Bell className="h-6 w-6" />
            </div>
            <h3 className="text-red-500 font-semibold text-sm uppercase tracking-wider">Total Alerts</h3>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-extrabold text-red-600">{stats.alerts}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col h-full lg:col-span-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-300 mb-6 font-sans">Alerts Distribution</h3>
          <div className="flex-1 w-full min-h-0">
            {alertsData && alertsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={alertsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {alertsData.map((_entry, index) => (
                       <Cell key={'cell-'+index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
                <Bell className="h-10 w-10 mb-2 opacity-20" />
                <p>No alerts recorded</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col h-full lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-300 mb-6 font-sans">System Activity Snapshot</h3>
          <div className="flex-1 w-full min-h-0">
            {alertsData && alertsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Mon', alerts: 4, rentals: 2, vehiclesActive: 10 },
                  { name: 'Tue', alerts: 1, rentals: 3, vehiclesActive: 12 },
                  { name: 'Wed', alerts: 0, rentals: 3, vehiclesActive: 12 },
                  { name: 'Thu', alerts: 7, rentals: 4, vehiclesActive: 11 },
                  { name: 'Fri', alerts: 2, rentals: 5, vehiclesActive: 14 }
                ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="vehiclesActive" fill="#3b82f6" name="Active Vehicles" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="rentals" fill="#10b981" name="Rentals" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="alerts" fill="#ef4444" name="Alerts" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
                <ShieldCheck className="h-10 w-10 mb-2 opacity-20" />
                <p>No activity recorded</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

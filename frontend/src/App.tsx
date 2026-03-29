import { useContext, useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import Map from './components/Map';
import Login from './pages/Login';
import Register from './pages/Register';
import EquipmentList from './pages/EquipmentList';
import AdminRentals from './pages/AdminRentals';
import VehicleHistory from './pages/VehicleHistory';
import AdminGeofences from './pages/AdminGeofences';
import Alerts from './pages/Alerts';
import Dashboard from './pages/Dashboard';
import AdminGroups from './pages/AdminGroups';
import AdminDrivers from './pages/AdminDrivers';

import AdminRoutes from './pages/AdminRoutes';
import AutomatedReports from './pages/AutomatedReports';
import CompanyProfile from './pages/CompanyProfile';
import AdminVehicles from './pages/AdminVehicles';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthContext } from './context/AuthContext';
import { Navigation, LogOut, Map as MapIcon, Calendar, Bell, Shield, Activity, BarChart3, HardHat, FileText, Users, UsersRound, Route as RouteIcon, Building, Car, Sun, Moon } from 'lucide-react';

function App() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkClass = (path: string) => {
    const isActive = location.pathname === path;
    return `flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-300'}`;
  };

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden font-sans transition-colors duration-200">
      {user && location.pathname !== "/login" && location.pathname !== "/register" && (
        <aside className="w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-sm z-10 transition-colors duration-200">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg text-blue-600 dark:text-blue-400">
              <Navigation className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent">
              iGPS Platform
            </h1>
          </div>
          
          <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3">Overview</p>
            <Link to="/" className={navLinkClass('/')}>
              <MapIcon className="h-4 w-4" /> Live Map
            </Link>
            <Link to="/dashboard" className={navLinkClass('/dashboard')}>
              <BarChart3 className="h-4 w-4" /> Dashboard
            </Link>
            <Link to="/alerts" className={navLinkClass('/alerts')}>
              <Bell className="h-4 w-4" /> Alerts
            </Link>
            
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-6 px-3">Operations</p>
            <Link to="/admin/vehicles" className={navLinkClass('/admin/vehicles')}>
              <Car className="h-4 w-4" /> Fleet Vehicles
            </Link>
            <Link to="/admin/drivers" className={navLinkClass('/admin/drivers')}>
              <UsersRound className="h-4 w-4" /> Drivers & Logs
            </Link>
            <Link to="/admin/routes" className={navLinkClass('/admin/routes')}>
              <RouteIcon className="h-4 w-4" /> Routes & Stops
            </Link>
            <Link to="/history" className={navLinkClass('/history')}>
              <Activity className="h-4 w-4" /> Route History
            </Link>
            <Link to="/equipment" className={navLinkClass('/equipment')}>
              <HardHat className="h-4 w-4" /> Equipment Rental
            </Link>
            <Link to="/admin/rentals" className={navLinkClass('/admin/rentals')}>
              <Calendar className="h-4 w-4" /> Manage Bookings
            </Link>

            {user.role === 'admin' && (
              <>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-6 px-3">Administration</p>
                <Link to="/admin/geofences" className={navLinkClass('/admin/geofences')}>
                  <Shield className="h-4 w-4" /> Setup Geofences
                </Link>
                <Link to="/admin/reports" className={navLinkClass('/admin/reports')}>
                  <FileText className="h-4 w-4" /> Reports & Automation
                </Link>
                <Link to="/admin/groups" className={navLinkClass('/admin/groups')}>
                  <Users className="h-4 w-4" /> Groups & Subaccounts
                </Link>
                <Link to="/admin/company" className={navLinkClass('/admin/company')}>
                  <Building className="h-4 w-4" /> Company Profile
                </Link>
              </>
            )}
          </div>

          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3 mb-4 px-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{user.username}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role}</span>
                </div>
              </div>
              <button 
                onClick={() => setDarkMode(!darkMode)} 
                className="p-2 rounded-md text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="Toggle Dark Mode"
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </aside>
      )}

      <main className="flex-1 relative overflow-y-auto bg-white dark:bg-slate-950 transition-colors duration-200">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/admin/company" element={<CompanyProfile />} />            <Route path="/admin/vehicles" element={<AdminVehicles />} />                    <Route path="/admin/rentals" element={<AdminRentals />} />
            <Route path="/admin/geofences" element={<AdminGeofences />} />
            <Route path="/admin/groups" element={<AdminGroups />} />
            <Route path="/admin/drivers" element={<AdminDrivers />} />
            <Route path="/admin/routes" element={<AdminRoutes />} />
            <Route path="/admin/reports" element={<AutomatedReports />} />
            <Route path="/history" element={<VehicleHistory />} />
            <Route path="/" element={<Map />} />
            <Route path="/equipment" element={<EquipmentList />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}

export default App;
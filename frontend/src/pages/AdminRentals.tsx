import { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ShieldAlert, Check, X, Calendar, Settings } from 'lucide-react';
import { format } from 'date-fns';

interface Rental {
  id: number;
  startDate: string;
  endDate: string;
  status: string;
  equipment: { name: string };
  client?: { username: string };
}

const AdminRentals = () => {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [error, setError] = useState('');
  const { token, user } = useContext(AuthContext);

  useEffect(() => {
    fetchRentals();
  }, [token]);

  const fetchRentals = async () => {
    try {
      const res = await fetch('/api/rentals', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRentals(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/rentals/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update status');
      fetchRentals(); // refresh list
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
         <div className="text-center bg-white p-12 rounded-2xl border border-slate-200 shadow-sm max-w-md">
            <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
            <p className="text-slate-500">You do not have the required administrator privileges to view this page.</p>
         </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Approved</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Pending</span>;
      case 'declined':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">Declined</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-50 relative overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-200 bg-white shadow-sm flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
             <Settings className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Rental Requests</h2>
            <p className="text-sm text-slate-500 font-medium">Manage and approve client equipment reservations.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3">
              <ShieldAlert className="h-5 w-5" />
              <span className="font-medium text-sm">{error}</span>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Equipment</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dates</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rentals.map(rental => (
                    <tr key={rental.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">#{rental.id}</td>
                      <td className="px-6 py-4 text-sm text-slate-900 font-bold">{rental.equipment.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{rental.client?.username || 'Unknown'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                           <Calendar className="h-4 w-4 text-slate-400" />
                           {format(new Date(rental.startDate), 'MMM dd')} - {format(new Date(rental.endDate), 'MMM dd, yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(rental.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {rental.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleUpdateStatus(rental.id, 'approved')} 
                              className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors border border-emerald-200 shadow-sm"
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(rental.id, 'declined')} 
                              className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition-colors border border-rose-200 shadow-sm"
                              title="Decline"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium italic">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {rentals.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                        No rentals found in the system.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRentals;
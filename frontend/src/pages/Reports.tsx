import React, { useEffect, useState } from 'react';

import api from '../services/api';

interface VehicleReport {
  vehicleId: number;
  vehicleName: string;
  licensePlate: string;
  totalDistance: string;     // stringified number
  fuelConsumption: string;   // stringified number
  startFuel: string;
  endFuel: string;
}

const Reports: React.FC = () => {
  const [reports, setReports] = useState<VehicleReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');
  // for a real app, you would use a date picker to set start and end dates.
  
  useEffect(() => {
    fetchReports();
  }, [period]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      // Mock start and end dates for full range for now
      const res = await api.get('/api/reports/vehicles?period=' + period);
      setReports(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-screen">
      
      
      <div className="p-8 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Vehicle Reports</h1>
          
          <div className="flex gap-2">
            <select 
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-white border text-gray-700 px-4 py-2 rounded shadow-sm focus:outline-none"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <button onClick={fetchReports} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 shadow-sm">
              Refresh
            </button>
            <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded border hover:bg-gray-300 shadow-sm">
              Export PDF
            </button>
          </div>
        </div>

        {loading ? (
          <p>Loading reports...</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Plate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distance Driven (km)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fuel Consumed (L/%)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start/End Fuel</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((r) => (
                  <tr key={r.vehicleId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.vehicleName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.licensePlate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{r.totalDistance} km</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">{r.fuelConsumption}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {r.startFuel} → {r.endFuel}
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No report data found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;

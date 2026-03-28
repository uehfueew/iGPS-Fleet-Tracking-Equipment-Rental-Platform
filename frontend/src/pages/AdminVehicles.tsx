import React, { useState, useEffect } from 'react';
import { Modal } from '../components/Modal';
import api from '../services/api';
import {
  Car, Plus, Trash2, Edit2, Search, AlertTriangle, 
  Activity, Cpu, Link, HelpCircle
} from 'lucide-react';

interface Vehicle {
  id: number;
  name: string;
  licensePlate: string;
  deviceId?: string;
}

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [currentVehicle, setCurrentVehicle] = useState<Partial<Vehicle>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/vehicles');
      setVehicles(res.data);
    } catch (err: any) {
      setError('Failed to load vehicles from the server.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isEditModalOpen && currentVehicle.id) {
        await api.put(`/vehicles/${currentVehicle.id}`, currentVehicle);
      } else {
        await api.post('/vehicles', currentVehicle);
      }
      await fetchVehicles();
      closeModals();
    } catch (err: any) {
      console.error(err);
      alert('Failed to save vehicle. Make sure the license plate is unique and data is valid.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVehicle = async () => {
    if (!currentVehicle.id) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/vehicles/${currentVehicle.id}`);
      await fetchVehicles();
      closeModals();
    } catch (err) {
      console.error(err);
      alert('Failed to delete vehicle.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setCurrentVehicle({});
  };

  const openAddModal = () => {
    setCurrentVehicle({});
    setIsAddModalOpen(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setCurrentVehicle(vehicle);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (vehicle: Vehicle) => {
    setCurrentVehicle(vehicle);
    setIsDeleteModalOpen(true);
  };

  const filteredVehicles = vehicles.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.deviceId && v.deviceId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Profile Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative isolate">
        <div className="absolute right-0 top-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3"></div>
        <div className="p-8 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-inner">
              <Car className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Fleet Vehicles</h1>
              <p className="text-slate-500 mt-1 font-medium">Manage your fleet and activate GPS trackers</p>
            </div>
          </div>
          
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" />
            Activate Tracker
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between bg-slate-50/50">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search vehicles, plates, or tracker IDs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <Activity className="h-4 w-4" />
            Total Active Vehicles: <span className="text-slate-900 font-bold">{vehicles.length}</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500">
              <Activity className="h-8 w-8 animate-spin mx-auto mb-3 text-slate-400" />
              <p>Loading fleet data...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{error}</p>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="p-16 text-center">
              <div className="inline-flex items-center justify-center p-4 bg-slate-50 rounded-full mb-4">
                <Car className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Vehicles Found</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-6">You don't have any vehicles matching your search, or you haven't activated any trackers yet.</p>
              <button onClick={openAddModal} className="text-slate-900 font-semibold hover:underline">
                + Activate your first tracker
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="font-semibold text-slate-600 text-sm py-4 px-6">Vehicle Details</th>
                  <th className="font-semibold text-slate-600 text-sm py-4 px-6">License Plate</th>
                  <th className="font-semibold text-slate-600 text-sm py-4 px-6">Tracker Connection</th>
                  <th className="font-semibold text-slate-600 text-sm py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.map(vehicle => (
                  <tr key={vehicle.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                          <Car className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{vehicle.name}</div>
                          <div className="text-xs text-slate-500">ID: {vehicle.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-sm font-mono font-bold text-slate-700">
                        {vehicle.licensePlate}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {vehicle.deviceId ? (
                        <div className="flex items-center gap-2">
                          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          </span>
                          <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                            <Cpu className="h-4 w-4 text-slate-400" />
                            {vehicle.deviceId}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-400"></span>
                          <span className="text-sm font-medium text-amber-600">No Tracker Linked</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(vehicle)}
                          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Vehicle"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(vehicle)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Vehicle"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={closeModals}
        title={isEditModalOpen ? "Edit Vehicle Settings" : "Activate Tracker"}
      >
        <form onSubmit={handleSaveVehicle} className="space-y-6">
          <div className="space-y-4">
            
            {/* If adding new, show a nice banner explaining Tracker Activation */}
            {!isEditModalOpen && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex gap-4">
                <div className="mt-1 flex-shrink-0">
                  <div className="h-8 w-8 bg-slate-900 text-white rounded-full flex items-center justify-center">
                    <Link className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Link your hardware</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    To activate a vehicle on your live map, plug the GPS device into your vehicle and enter the unique Device Identifier (IMEI) printed on the tracker's barcode sticker below.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Delivery Van 1"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  value={currentVehicle.name || ''}
                  onChange={e => setCurrentVehicle({ ...currentVehicle, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">License Plate *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. ABC-1234"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-mono uppercase"
                  value={currentVehicle.licensePlate || ''}
                  onChange={e => setCurrentVehicle({ ...currentVehicle, licensePlate: e.target.value })}
                />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 mt-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-900 mb-1">
                Hardware Tracker ID (IMEI)
                <div className="group relative cursor-help">
                  <HelpCircle className="h-4 w-4 text-slate-400" />
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-slate-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity text-center">
                    The 15-digit number on the back of your tracker box.
                  </div>
                </div>
              </label>
              <div className="relative">
                <Cpu className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. 8675309012345"
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-900 transition-colors font-mono tracking-wider font-semibold"
                  value={currentVehicle.deviceId || ''}
                  onChange={e => setCurrentVehicle({ ...currentVehicle, deviceId: e.target.value })}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Leave this blank if you are simply registering asset details without a live GPS tracker.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={closeModals}
              className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEditModalOpen ? 'Save Changes' : 'Activate & Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={closeModals}
        title="Remove Vehicle"
      >
        <div className="space-y-6">
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex gap-4 border border-red-100">
            <AlertTriangle className="h-6 w-6 flex-shrink-0" />
            <div>
              <h4 className="font-semibold">Warning: Destructive Action</h4>
              <p className="text-sm mt-1">
                Are you sure you want to remove <strong>{currentVehicle.name}</strong> from your fleet? 
                This will un-link the tracker and permanently delete all associated location history.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={closeModals}
              className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteVehicle}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Removing...' : 'Yes, Remove Vehicle'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

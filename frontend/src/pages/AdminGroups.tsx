import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../components/Modal';
import api from '../services/api';
import { 
  Plus, Trash2, Edit2, Car, Network, X, Check, 
  AlertTriangle, ChevronRight, ChevronDown, 
  Search, Layers, Activity, FolderGit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Vehicle {
  id: number;
  name: string;
  licensePlate: string;
}

interface Group {
  id: number;
  name: string;
  description: string;
  parentId: number | null;
  parent?: Group;
  subgroups?: Group[];
  vehicles?: Vehicle[];
}

// Helper to get all inherited vehicles from subgroups
const getInheritedVehiclesInfo = (groupId: number, allGroups: Group[]): { vehicle: Vehicle, sourceName: string }[] => {
  let result: { vehicle: Vehicle, sourceName: string }[] = [];
  const children = allGroups.filter(g => g.parentId === groupId);
  for (const child of children) {
    if (child.vehicles) {
      child.vehicles.forEach(v => result.push({ vehicle: v, sourceName: child.name }));
    }
    result = result.concat(getInheritedVehiclesInfo(child.id, allGroups));
  }
  return result;
};

interface GroupNodeProps {
  group: Group;
  level?: number;
  allGroups: Group[];
  filteredGroups: Group[];
  expandedNodes: Set<number>;
  searchTerm: string;
  onToggle: (id: number, forceExpand?: boolean) => void;
  onManageVehicles: (group: Group) => void;
  onAddSubgroup: (group: Group) => void;
  onEdit: (group: Group) => void;
  onDelete: (id: number) => void;
}

const GroupNodeItem: React.FC<GroupNodeProps> = ({
  group, level = 0, allGroups, filteredGroups, expandedNodes, searchTerm,
  onToggle, onManageVehicles, onAddSubgroup, onEdit, onDelete
}) => {
  const [showFullDesc, setShowFullDesc] = useState(false);
  
  const isExpanded = expandedNodes.has(group.id) || !!searchTerm;
  const childGroups = filteredGroups.filter(g => g.parentId === group.id);
  const hasChildren = childGroups.length > 0;
  
  const directVehiclesCount = group.vehicles?.length || 0;
  const inheritedVehicles = getInheritedVehiclesInfo(group.id, allGroups);
  const totalVehicles = directVehiclesCount + inheritedVehicles.length;

  const isDescriptionLong = group.description && group.description.length > 70;
  const displayDescription = showFullDesc ? group.description : group.description?.slice(0, 70) + (isDescriptionLong ? '...' : '');

  return (
    <div className="w-full">
      <motion.div 
          onClick={() => onToggle(group.id)}
          initial={false}
          className={`
              relative flex flex-col sm:flex-row sm:items-center justify-between p-4 my-3
              bg-white dark:bg-slate-900 rounded-2xl shadow-sm border cursor-pointer
              ${level === 0 ? 'border-l-4 border-l-indigo-500 border-gray-200 dark:border-slate-800' : 'border-gray-100 dark:border-slate-800'}
              hover:shadow-md transition-all group/node
          `}
          style={{ marginLeft: `${level * 32}px`, width: `calc(100% - ${level * 32}px)` }}
      >
          {/* Left side info */}
          <div className="flex items-center gap-4 mb-3 sm:mb-0 flex-1 min-w-0 pr-4">
              <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(group.id);
                  }}
                  className={`w-6 h-6 shrink-0 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 transition-colors ${!hasChildren ? 'opacity-0 cursor-default' : ''}`}
                  disabled={!hasChildren}
              >
                  {hasChildren ? (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />) : null}
              </button>
              
              <div className={`w-10 h-10 rounded-xl flex items-center shrink-0 justify-center text-white shadow-sm
                  ${level === 0 ? 'bg-indigo-500' : level === 1 ? 'bg-blue-500' : 'bg-cyan-500'}
              `}>
                  {level === 0 ? <Network className="w-5 h-5"/> : <FolderGit2 className="w-5 h-5"/>}
              </div>

              <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 dark:text-slate-300 text-lg flex items-center gap-2 truncate">
                      {group.name}
                  </h3>
                  {group.description && (
                    <div className="text-sm text-gray-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        <span className="inline break-words">
                            {displayDescription}
                        </span>
                        {isDescriptionLong && (
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               setShowFullDesc(!showFullDesc);
                             }}
                             className="inline-block ml-1.5 text-indigo-500 font-medium hover:underline text-xs whitespace-nowrap"
                           >
                             {showFullDesc ? 'Show less' : 'See all'}
                           </button>
                        )}
                    </div>
                  )}
              </div>
          </div>

          {/* Right side actions & stats */}
          <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end pl-14 sm:pl-0 shrink-0">
              <div className="flex gap-2 sm:gap-3">
                  <span title={`Direct: ${directVehiclesCount} | Inherited: ${inheritedVehicles.length}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 text-sm font-medium rounded-lg border border-gray-200 dark:border-slate-800">
                      <Car className="w-4 h-4 text-blue-500" /> {totalVehicles}
                  </span>
                  <span title="Direct Subgroups" className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 text-sm font-medium rounded-lg border border-gray-200 dark:border-slate-800">
                      <Layers className="w-4 h-4 text-indigo-500" /> {childGroups.length}
                  </span>
              </div>
              
              {/* Actions group */}
              <div className="flex gap-1.5 opacity-100 sm:opacity-60 sm:group-hover/node:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); onManageVehicles(group); }} className="p-2 text-gray-600 dark:text-slate-400 hover:text-white hover:bg-blue-600 rounded-lg transition" title="Manage Vehicles">
                      <Car className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onAddSubgroup(group); }} className="p-2 text-gray-600 dark:text-slate-400 hover:text-white hover:bg-emerald-600 rounded-lg transition" title="Add Subgroup">
                      <Plus className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onEdit(group); }} className="p-2 text-gray-600 dark:text-slate-400 hover:text-white hover:bg-indigo-600 rounded-lg transition" title="Edit Group">
                      <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(group.id); }} className="p-2 text-gray-600 dark:text-slate-400 hover:text-white hover:bg-red-600 rounded-lg transition" title="Delete Group">
                      <Trash2 className="w-4 h-4" />
                  </button>
              </div>
          </div>
      </motion.div>

      {/* Render Children inside AnimatePresence */}
      <AnimatePresence>
          {isExpanded && hasChildren && (
              <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
              >
                  <div className="relative pl-8">
                      {/* Vertical connecting line */}
                      <div className="absolute left-[44px] top-4 bottom-4 w-px bg-gray-200 z-0"></div>
                      
                      <div className="relative z-10 flex flex-col w-full pb-2">
                          {childGroups.map(child => (
                              <div key={child.id} className="relative">
                                  {/* Horizontal branch line */}
                                  <div className="absolute left-[-20px] top-1/2 w-5 h-px bg-gray-200 -translate-y-[10px] z-0"></div>
                                  <GroupNodeItem 
                                    group={child} 
                                    level={level + 1} 
                                    allGroups={allGroups}
                                    filteredGroups={filteredGroups}
                                    expandedNodes={expandedNodes}
                                    searchTerm={searchTerm}
                                    onToggle={onToggle}
                                    onManageVehicles={onManageVehicles}
                                    onAddSubgroup={onAddSubgroup}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                  />
                              </div>
                          ))}
                      </div>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default function AdminGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Group Form State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', parentId: '' });
  const [parentNameContext, setParentNameContext] = useState<string | null>(null);

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Vehicle Assignment State
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [managingGroup, setManagingGroup] = useState<Group | null>(null);

  // Tree Expansion state
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

  const fetchData = async () => {
    try {
      setLoading(true);
      const [groupsRes, vehiclesRes] = await Promise.all([
        api.get('/groups'),
        api.get('/groups/available-vehicles')
      ]);
      setGroups(groupsRes.data);
      setAvailableVehicles(vehiclesRes.data);
      
      // Auto-expand all on first load if we don't have many
      if (expandedNodes.size === 0 && groupsRes.data.length < 20) {
          const allIds = new Set<number>(groupsRes.data.map((g: Group) => g.id));
          setExpandedNodes(allIds);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateTopLevel = () => {
    setEditingGroupId(null);
    setFormData({ name: '', description: '', parentId: '' });
    setParentNameContext(null);
    setIsGroupModalOpen(true);
  };

  const handleOpenAddSubgroup = (parentGroup: Group) => {
    setEditingGroupId(null);
    setFormData({ name: '', description: '', parentId: parentGroup.id.toString() });
    setParentNameContext(parentGroup.name);
    toggleNode(parentGroup.id, true);
    setIsGroupModalOpen(true);
  };

  const handleOpenEdit = (group: Group) => {
    setEditingGroupId(group.id);
    const parent = groups.find(g => g.id === group.parentId);
    setParentNameContext(parent ? parent.name : null);
    setFormData({ 
      name: group.name, 
      description: group.description || '', 
      parentId: group.parentId ? group.parentId.toString() : '' 
    });
    setIsGroupModalOpen(true);
  };

  const submitGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGroupId) {
        await api.put(`/groups/${editingGroupId}`, formData);
      } else {
        await api.post('/groups', formData);
      }
      setIsGroupModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.delete(`/groups/${deleteConfirmId}`);
      setDeleteConfirmId(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const openVehicleManager = (group: Group) => {
    setManagingGroup(group);
    setIsVehicleModalOpen(true);
  };

  const assignVehicle = async (vehicleId: number) => {
    if (!managingGroup) return;
    try {
      await api.post(`/groups/${managingGroup.id}/vehicles`, { vehicleId });
      fetchData();
      
      setManagingGroup(prev => {
        if (!prev) return prev;
        const v = availableVehicles.find(x => x.id === vehicleId);
        if (!v) return prev;
        return { ...prev, vehicles: [...(prev.vehicles || []), v] };
      });
      setAvailableVehicles(prev => prev.filter(v => v.id !== vehicleId));
    } catch (err) {
      console.error(err);
    }
  };

  const removeVehicle = async (vehicleId: number) => {
    if (!managingGroup) return;
    try {
      await api.delete(`/groups/${managingGroup.id}/vehicles/${vehicleId}`);
      fetchData();
      
      setManagingGroup(prev => {
        if (!prev) return prev;
        const v = prev.vehicles?.find(x => x.id === vehicleId);
        if (v) setAvailableVehicles(a => [...a, v]);
        return { ...prev, vehicles: prev.vehicles?.filter(x => x.id !== vehicleId) };
      });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleNode = (id: number, forceExpand?: boolean) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (forceExpand) {
          next.add(id);
      } else {
          if (next.has(id)) next.delete(id);
          else next.add(id);
      }
      return next;
    });
  };

  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groups;
    const term = searchTerm.toLowerCase();
    
    const matchingIds = new Set<number>();
    
    groups.forEach(g => {
        if (g.name.toLowerCase().includes(term) || (g.description && g.description.toLowerCase().includes(term))) {
            matchingIds.add(g.id);
            let current = g.parentId;
            while (current) {
                matchingIds.add(current);
                const p = groups.find(x => x.id === current);
                current = p ? p.parentId : null;
            }
        }
    });

    return groups.filter(g => matchingIds.has(g.id));
  }, [groups, searchTerm]);

  const topLevelCount = groups.filter(g => !g.parentId).length;
  const subGroupCount = groups.length - topLevelCount;
  const totalVehiclesAssigned = groups.reduce((acc, g) => acc + (g.vehicles?.length || 0), 0);

  const topLevelNodes = filteredGroups.filter(g => !g.parentId);

  // Computed state for vehicle modal
  const inheritedModalVehicles = useMemo(() => {
    if (!managingGroup) return [];
    return getInheritedVehiclesInfo(managingGroup.id, groups);
  }, [managingGroup, groups]);

  return (
    <div className="p-6 md:p-8 h-full bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Header & Stats Dashboard */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
            <div className="xl:col-span-1 flex flex-col justify-center">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-slate-300 flex items-center gap-3">
                    Organization
                </h1>
                <p className="text-gray-500 dark:text-slate-400 mt-2 text-sm">Visualize and structure your entire fleet hierarchy dynamically.</p>
                <div className="mt-4">
                    <button
                        onClick={handleOpenCreateTopLevel}
                        className="flex w-full justify-center items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-lg shadow-indigo-200 font-semibold"
                    >
                        <Plus className="w-5 h-5" /> New Group
                    </button>
                </div>
            </div>

            <div className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-5">
                       <Network className="w-32 h-32" />
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex justify-center items-center text-indigo-600">
                        <Network className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-gray-500 dark:text-slate-400 font-medium text-sm">Top Level Regions</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-slate-300">{topLevelCount}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-5">
                       <Layers className="w-32 h-32" />
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex justify-center items-center text-emerald-600">
                        <Layers className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-gray-500 dark:text-slate-400 font-medium text-sm">Total Subgroups</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-slate-300">{subGroupCount}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-5">
                       <Activity className="w-32 h-32" />
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex justify-center items-center text-amber-600">
                        <Car className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-gray-500 dark:text-slate-400 font-medium text-sm">Assigned Vehicles</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-slate-300">{totalVehiclesAssigned}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <div className="relative w-full sm:max-w-md">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                <input 
                    type="text" 
                    placeholder="Search groups, regions, subdivisions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
            </div>
            
            <div className="flex gap-3 w-full sm:w-auto">
                <button onClick={() => setExpandedNodes(new Set(groups.map(g => g.id)))} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-800 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition shadow-sm">
                    Expand All
                </button>
                <button onClick={() => setExpandedNodes(new Set())} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-800 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition shadow-sm">
                    Collapse All
                </button>
            </div>
        </div>

        {/* Main Tree Area */}
        <div className="bg-transparent mt-4 pb-20">
            {loading ? (
                <div className="flex justify-center p-20">
                    <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
                </div>
            ) : topLevelNodes.length === 0 ? (
                <div className="text-center p-16 bg-white dark:bg-slate-900 shadow-sm border border-gray-100 dark:border-slate-800 rounded-3xl">
                    <FolderGit2 className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-slate-300 mb-2">
                        {searchTerm ? 'No groups found matching search.' : 'Organization Empty'}
                    </h3>
                    <p className="text-gray-500 dark:text-slate-400 max-w-md mx-auto">
                        {searchTerm ? 'Try adjusting your search criteria above.' : 'Start structuring your operations by creating a primary division.'}
                    </p>
                </div>
            ) : (
                <div className="flex flex-col">
                    {topLevelNodes.map(group => (
                        <GroupNodeItem 
                           key={group.id} 
                           group={group} 
                           allGroups={groups}
                           filteredGroups={filteredGroups}
                           expandedNodes={expandedNodes}
                           searchTerm={searchTerm}
                           onToggle={toggleNode}
                           onManageVehicles={openVehicleManager}
                           onAddSubgroup={handleOpenAddSubgroup}
                           onEdit={handleOpenEdit}
                           onDelete={setDeleteConfirmId}
                        />
                    ))}
                </div>
            )}
        </div>

        {/* Create/Edit Group Modal */}
        <Modal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} title={editingGroupId ? "Edit Configuration" : (parentNameContext ? "Create Sub-Division" : "Create Top-Level Division")}>
          <form onSubmit={submitGroup} className="flex flex-col gap-5">
            {parentNameContext && (
               <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-100 flex items-center gap-3 text-emerald-800 text-sm font-medium shadow-sm">
                 <FolderGit2 className="w-5 h-5 text-emerald-500" /> 
                 Branching off from: <span className="font-bold text-emerald-700 px-2 py-0.5 bg-emerald-100 rounded-md">{parentNameContext}</span>
               </div>
            )}
            
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Group Designation Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Northern Operations"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-800 rounded-xl focus:bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Operational Details (Optional)</label>
                <textarea
                  placeholder="Briefly describe the responsibilities..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-800 rounded-xl focus:bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none min-h-[120px] resize-none"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            
            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                className="px-5 py-2.5 rounded-xl font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                onClick={() => setIsGroupModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-md shadow-indigo-200 flex items-center gap-2"
              >
                <Check className="w-4 h-4"/> {editingGroupId ? 'Update Designations' : `Save Division`}
              </button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title="Terminate Division">
           <div className="flex flex-col gap-4">
              <div className="bg-red-50 p-5 rounded-2xl flex gap-4 text-red-800 items-start border border-red-100">
                 <div className="bg-red-100 p-2 rounded-full">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                 </div>
                 <div>
                   <h4 className="font-bold text-lg mb-1">Confirm Termination</h4>
                   <p className="text-sm">Deleting this node will forcefully unlink any immediate subdivisions and orphaned vehicles. They will be pushed to the root pool or available status.</p>
                   <p className="text-sm mt-3 font-semibold text-red-700">This architectural change cannot be reversed.</p>
                 </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                 <button type="button" onClick={() => setDeleteConfirmId(null)} className="px-5 py-2.5 rounded-xl font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition">
                    Abort
                 </button>
                 <button type="button" onClick={confirmDelete} className="px-5 py-2.5 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-200 transition flex items-center gap-2">
                    <Trash2 className="w-4 h-4"/> Confirm Deletion
                 </button>
              </div>
           </div>
        </Modal>

        {/* Vehicle Assignment Modal */}
        <Modal isOpen={isVehicleModalOpen} onClose={() => setIsVehicleModalOpen(false)} title={`Fleet Assignment: ${managingGroup?.name}`}>
           <div className="flex flex-col gap-6">
              <div className="bg-gray-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-gray-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div> Connected Assets
                    </h4>
                    <span className="text-xs font-semibold px-2 py-1 bg-gray-200 rounded-md text-gray-700 dark:text-slate-300">
                        {(managingGroup?.vehicles?.length || 0) + inheritedModalVehicles.length}
                    </span>
                </div>
                {(!managingGroup?.vehicles?.length && inheritedModalVehicles.length === 0) ? (
                   <div className="py-6 text-center border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-xl">
                       <Car className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                       <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">No assets assigned</p>
                   </div>
                ) : (
                   <ul className="space-y-2.5 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                     <AnimatePresence>
                     {managingGroup?.vehicles?.map(v => (
                        <motion.li initial={{opacity:0, x:-10}} animate={{opacity:1, x:0}} exit={{opacity:0, scale:0.95}} key={`dir-${v.id}`} className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm group/veh">
                           <div className="flex items-center gap-3 text-sm font-semibold text-gray-900 dark:text-slate-300">
                             <div className="bg-blue-50 p-2 rounded-lg text-blue-600 border border-blue-100">
                               <Car className="w-4 h-4" />
                             </div>
                             <div>
                                 <div>{v.name}</div>
                                 <div className="text-[11px] text-gray-400 dark:text-slate-500 uppercase tracking-wide">{v.licensePlate}</div>
                             </div>
                           </div>
                           <button type="button" onClick={() => removeVehicle(v.id)} className="text-gray-400 dark:text-slate-500 hover:text-white hover:bg-red-500 p-2 rounded-lg transition" title="Detach from group">
                             <X className="w-4 h-4" />
                           </button>
                        </motion.li>
                     ))}
                     
                     {inheritedModalVehicles.map(info => (
                        <motion.li initial={{opacity:0, x:-10}} animate={{opacity:1, x:0}} exit={{opacity:0, scale:0.95}} key={`inh-${info.vehicle.id}`} className="flex items-center justify-between bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
                           <div className="flex items-center gap-3 text-sm font-semibold text-gray-600 dark:text-slate-400">
                             <div className="bg-white dark:bg-slate-900 p-2 rounded-lg text-gray-400 dark:text-slate-500 border border-gray-200 dark:border-slate-800">
                               <Car className="w-4 h-4" />
                             </div>
                             <div>
                                 <div className="flex items-center gap-2">
                                     {info.vehicle.name} 
                                     <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded uppercase tracking-wider">
                                       via {info.sourceName}
                                     </span>
                                 </div>
                                 <div className="text-[11px] text-gray-400 dark:text-slate-500 uppercase tracking-wide">{info.vehicle.licensePlate}</div>
                             </div>
                           </div>
                           {/* Inherited vehicles cannot be removed from here, they must be removed from their specific subgroup */}
                        </motion.li>
                     ))}
                     </AnimatePresence>
                   </ul>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-4 px-1">
                    <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Available Pool
                    </h4>
                    <span className="text-xs font-semibold px-2 py-1 bg-gray-200 text-gray-700 dark:text-slate-300 rounded-md">{availableVehicles.length}</span>
                </div>
                
                {availableVehicles.length === 0 ? (
                   <div className="py-6 text-center bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800">
                       <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">No unassigned assets available globally.</p>
                   </div>
                ) : (
                   <ul className="space-y-2.5 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                     <AnimatePresence>
                     {availableVehicles.map(v => (
                        <motion.li initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0, scale:0.95}} key={v.id} className="flex items-center justify-between border border-gray-200 dark:border-slate-800 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/80 transition bg-white dark:bg-slate-900 shadow-sm">
                           <div className="flex items-center gap-3 text-sm font-semibold text-gray-700 dark:text-slate-300">
                                <div className="p-2 bg-gray-100 dark:bg-slate-800 rounded-lg text-gray-500 dark:text-slate-400">
                                    <Car className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-gray-900 dark:text-slate-300">{v.name}</div>
                                    <div className="text-[11px] text-gray-400 dark:text-slate-500 uppercase tracking-wide">{v.licensePlate}</div>
                                </div>
                           </div>
                           <button type="button" onClick={() => assignVehicle(v.id)} className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-white px-3 py-2 bg-emerald-50 hover:bg-emerald-500 rounded-lg transition border border-emerald-100">
                             <Plus className="w-3.5 h-3.5" /> Bind
                           </button>
                        </motion.li>
                     ))}
                     </AnimatePresence>
                   </ul>
                )}
              </div>
           </div>
        </Modal>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
}

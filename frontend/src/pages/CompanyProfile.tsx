import { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Building, MapPin, Phone, FileText, Upload, Save, 
  AlertCircle, CheckCircle2, Image as ImageIcon, Globe, 
  Briefcase, Users, Calendar, Fingerprint 
} from 'lucide-react';

const cn = (...classes: (string | undefined | boolean)[]) => classes.filter(Boolean).join(' ');

const CompanyProfile = () => {
  const [name, setName] = useState('');
  const [locations, setLocations] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [taxId, setTaxId] = useState('');
  const [industry, setIndustry] = useState('');
  const [employeeCount, setEmployeeCount] = useState('');
  const [establishedYear, setEstablishedYear] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/profile');
        if (res.data) {
          setName(res.data.name || '');
          setLocations(res.data.locations || '');
          setPhoneNumber(res.data.phoneNumber || '');
          setDescription(res.data.description || '');
          setWebsite(res.data.website || '');
          setTaxId(res.data.taxId || '');
          setIndustry(res.data.industry || '');
          setEmployeeCount(res.data.employeeCount || '');
          setEstablishedYear(res.data.establishedYear?.toString() || '');
          setLogoUrl(res.data.logoUrl || '');
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image too large. Maximum size is 2MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.put('/profile', {
        name,
        locations,
        phoneNumber,
        description,
        website,
        taxId,
        industry,
        employeeCount,
        establishedYear: establishedYear ? parseInt(establishedYear, 10) : null,
        logoUrl
      });
      setSuccess('Company profile updated successfully.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-slate-50/80">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
          <p className="text-blue-600 font-bold tracking-wide">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80 pb-12 w-full font-sans">
      {/* Clean Professional Header Banner */}
      <div className="bg-white px-8 py-8 border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-5">
            <div className="h-14 w-14 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center shadow-sm">
              <Building className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Organization Profile</h1>
              <p className="text-slate-500 mt-1 text-sm font-medium">Configure your platform identity, contact details, and public-facing information.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-8 py-8 max-w-5xl mx-auto w-full">
        {/* Notifications */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg shadow-sm flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg shadow-sm flex items-start gap-3 text-emerald-800 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{success}</p>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Section 1: Branding (Primary Blue Theme) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden border-t-4 border-t-blue-500">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-blue-500" /> Brand Identity
              </h3>
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="md:w-1/3">
                  <p className="text-sm text-slate-500 leading-relaxed">
                    This logo will be displayed on reports, invoices, and your public rental portal. Choose a clear, high-resolution image.
                  </p>
                </div>
                
                <div className="md:w-2/3 flex items-center gap-8">
                  <div className="relative group">
                    <div className={cn(
                      "h-32 w-32 rounded-2xl border-2 flex items-center justify-center overflow-hidden transition-all duration-300 shadow-sm",
                      logoUrl ? "border-slate-200 bg-white" : "border-dashed border-blue-200 bg-blue-50/50 group-hover:border-blue-400 group-hover:bg-blue-50"
                    )}>
                      {logoUrl ? (
                        <img src={logoUrl} alt="Company Logo" className="h-full w-full object-contain p-2" />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-blue-300 group-hover:text-blue-500 transition-colors" />
                      )}
                    </div>
                    <label className="absolute bottom-2 right-2 h-9 w-9 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-105 z-10 border-2 border-white">
                      <Upload className="h-4 w-4" />
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-700 mb-2">Upload Guidelines</h4>
                    <ul className="text-xs text-slate-500 space-y-1.5 list-none">
                      <li className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-blue-400"></div> Recommended size: 512x512 pixels</li>
                      <li className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-blue-400"></div> Maximum file size: 2MB</li>
                      <li className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-blue-400"></div> Formats: PNG, JPG, SVG</li>
                    </ul>
                    {logoUrl && (
                      <button type="button" onClick={() => setLogoUrl('')} className="mt-4 text-sm font-bold text-red-500 hover:text-red-700 transition-colors px-3 py-1.5 bg-red-50 rounded-lg border border-red-100 hover:bg-red-100">
                        Remove Logo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: General Information (Indigo Theme) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden border-t-4 border-t-indigo-500">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Building className="h-5 w-5 text-indigo-500" /> General Information
              </h3>
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/3">
                  <p className="text-sm text-slate-500 leading-relaxed">
                    The primary details of your business. This helps us tailor your operational experience inside the platform.
                  </p>
                </div>
                
                <div className="md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700">Legal Company Name *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-500">
                        <Building className="h-5 w-5" />
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="block w-full pl-11 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all shadow-sm"
                        placeholder="E.g. Acme Transport & Logistics LLC"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">Industry / Sector</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-orange-500">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="block w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all shadow-sm appearance-none"
                      >
                        <option value="">Select Industry</option>
                        <option value="Transportation">Transportation & Freight</option>
                        <option value="Construction">Construction & Heavy Machinery</option>
                        <option value="Equipment Rental">Equipment Rental</option>
                        <option value="Logistics">Logistics & Supply Chain</option>
                        <option value="Agriculture">Agriculture</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">Tax ID / VAT Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-500">
                        <Fingerprint className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all shadow-sm"
                        placeholder="XX-XXXXXXX"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">Company Size</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-500">
                        <Users className="h-4 w-4" />
                      </div>
                      <select
                        value={employeeCount}
                        onChange={(e) => setEmployeeCount(e.target.value)}
                        className="block w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all shadow-sm appearance-none"
                      >
                        <option value="">Select Size</option>
                        <option value="1-10">1-10 Employees</option>
                        <option value="11-50">11-50 Employees</option>
                        <option value="51-200">51-200 Employees</option>
                        <option value="201-500">201-500 Employees</option>
                        <option value="500+">500+ Employees</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">Year Established</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-purple-500">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <input
                        type="number"
                        min="1800"
                        max="2099"
                        value={establishedYear}
                        onChange={(e) => setEstablishedYear(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all shadow-sm"
                        placeholder="YYYY"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Contact & Locations (Teal/Green Theme) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden border-t-4 border-t-emerald-500">
             <div className="bg-slate-50 border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Globe className="h-5 w-5 text-emerald-500" /> Reach & Presence
              </h3>
            </div>
             <div className="p-6 sm:p-8">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/3">
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Where your assets operate and how clients can reach you on the web or by phone.
                  </p>
                </div>
                
                <div className="md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">Corporate Phone</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600">
                        <Phone className="h-5 w-5" />
                      </div>
                      <input
                        type="text"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="block w-full pl-11 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all shadow-sm"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">Website</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-sky-500">
                        <Globe className="h-5 w-5" />
                      </div>
                      <input
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="block w-full pl-11 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all shadow-sm"
                        placeholder="https://www.yourdomain.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700">Operating Locations</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-red-500">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <input
                        type="text"
                        value={locations}
                        onChange={(e) => setLocations(e.target.value)}
                        className="block w-full pl-11 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all shadow-sm"
                        placeholder="Headquarters, Hub A, Depot B..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700">Company Bio / Description</label>
                    <div className="relative">
                      <div className="absolute top-3.5 left-3.5 pointer-events-none text-amber-500">
                        <FileText className="h-5 w-5" />
                      </div>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="block w-full pl-11 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all resize-none shadow-sm"
                        placeholder="Tell us about your company operations, mission, and fleet..."
                      />
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              className="px-6 py-2.5 border border-slate-300 rounded-xl shadow-sm text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all focus:ring-2 focus:ring-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 py-2.5 px-8 rounded-xl shadow-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
              {!saving && <Save className="h-4 w-4" />}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CompanyProfile;
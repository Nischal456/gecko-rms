"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/app/admin/Sidebar"; 
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, ChefHat, Banknote, Shield, Briefcase, Calculator, UtensilsCrossed,
  Edit2, Calendar, Wallet, History, Loader2, X,
  UserCircle2, ArrowRight, BellRing, CheckCircle2, XCircle, 
  Phone, Mail, KeyRound, Save, User, CalendarDays, RefreshCcw,
  Users, Search, Trash2, Eye, EyeOff, Wand2, HeartPulse, Contact, GlassWater
} from "lucide-react";
import { toast } from "sonner";
import { getStaff } from "@/app/actions/staff"; 
import { getStaffDetails, recordPayment, updateLeaveStatus, createLeaveRequest, saveStaff, deleteStaff } from "@/app/actions/staff-management";
import { getDashboardData } from "@/app/actions/dashboard";

// NEPALI MONTHS DATA
const NEPALI_MONTHS = [
  "Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Ashwin", 
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
];

const CURRENT_NEPALI_YEAR = "2081";

export default function StaffPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // DRAWER STATE
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'details'>('create');
  const [selectedStaff, setSelectedStaff] = useState<any>(null); 
  const [activeTab, setActiveTab] = useState<'profile' | 'payroll' | 'leave'>('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false); 

  // PIN VISIBILITY STATE
  const [showPin, setShowPin] = useState(false);

  // INPUTS (PAYROLL)
  const [amount, setAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payType, setPayType] = useState("salary");
  const [selectedMonth, setSelectedMonth] = useState(NEPALI_MONTHS[0]);
  const [selectedYear, setSelectedYear] = useState(CURRENT_NEPALI_YEAR);

  // INPUTS (LEAVE)
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  // INPUTS (NEW STAFF)
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setRefreshing(true);
    const [dashRes, staffRes] = await Promise.all([getDashboardData(), getStaff()]);
    if(dashRes) setTenant(dashRes.tenant);
    if(staffRes.success) setStaffList(staffRes.data || []);
    setLoading(false);
    setRefreshing(false);
  }

  // --- ICON HELPER ---
  const getRoleIcon = (role: string) => {
    switch(role) {
        case 'manager': return <Briefcase className="w-6 h-6" />;
        case 'chef': return <ChefHat className="w-6 h-6" />;
        case 'cashier': return <Calculator className="w-6 h-6" />;
        case 'waiter': return <UtensilsCrossed className="w-6 h-6" />;
        case 'bartender': return <GlassWater className="w-6 h-6" />; // Added Bartender Icon
        default: return <User className="w-6 h-6" />;
    }
  };

  const getRoleStyles = (role: string) => {
    switch(role) {
        case 'manager': return 'bg-purple-50 text-purple-600 border-purple-100';
        case 'chef': return 'bg-orange-50 text-orange-600 border-orange-100';
        case 'cashier': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        case 'waiter': return 'bg-blue-50 text-blue-600 border-blue-100';
        case 'bartender': return 'bg-pink-50 text-pink-600 border-pink-100'; // Added Bartender Style
        default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  // --- DRAWER ACTIONS ---
  function openNewStaff() {
      setSelectedStaff(null);
      setDrawerMode('create');
      setIsEditingProfile(true);
      setShowPin(false);
      setIsDrawerOpen(true);
  }

  async function openStaffDetails(staff: any) {
      setSelectedStaff({ ...staff, isLoading: true });
      setDrawerMode('details');
      setIsEditingProfile(false);
      setShowPin(false);
      setIsDrawerOpen(true);
      
      if (staff.hasPendingLeave) setActiveTab('leave');
      else setActiveTab('profile');

      const res = await getStaffDetails(staff.id);
      if (res.success) {
          setSelectedStaff({ 
              ...res.staff, 
              payments: res.payments, 
              leaves: res.leaves,
              isLoading: false 
          });
      }
  }

  // --- LOGIC: CREATE / UPDATE STAFF ---
  async function handleSaveStaff(e: React.FormEvent) {
      e.preventDefault();
      setIsSubmitting(true);
      
      const formData = new FormData(formRef.current!);
      const data = {
          id: selectedStaff?.id, 
          full_name: formData.get("full_name"),
          role: formData.get("role"),
          pin_code: formData.get("pin_code"),
          phone: formData.get("phone"),
          email: formData.get("email"),
          salary: Number(formData.get("salary")) || 0,
          status: 'active',
          emergency_contact_name: formData.get("emergency_contact_name"),
          emergency_contact_phone: formData.get("emergency_contact_phone")
      };

      const res = await saveStaff(data); 
      
      if (res.success) {
          toast.success(selectedStaff ? "Profile Updated" : "Staff Onboarded");
          if (drawerMode === 'create') setIsDrawerOpen(false);
          else {
              setIsEditingProfile(false);
              openStaffDetails({ ...selectedStaff, ...data });
          }
          await loadData();
      } else {
          toast.error(res.error || "Operation failed");
      }
      setIsSubmitting(false);
  }

  // --- DELETE STAFF ---
  async function handleDeleteStaff(id: string) {
      if(!confirm("Permanently delete this staff member?")) return;
      
      const res = await deleteStaff(id);
      if (res.success) {
          toast.success("Staff Deleted");
          setIsDrawerOpen(false);
          loadData();
      } else {
          toast.error("Failed to delete staff");
      }
  }

  // --- PIN GENERATOR ---
  const generatePin = () => {
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      const input = formRef.current?.elements.namedItem("pin_code") as HTMLInputElement;
      if(input) {
          input.value = pin;
          setShowPin(true);
          toast.info("Secure PIN Generated");
      }
  };

  // --- LOGIC: PAYROLL ---
  async function handlePayment() {
      if(!amount) return toast.error("Enter amount");
      const salaryString = `${selectedMonth} ${selectedYear}`;
      const res = await recordPayment(selectedStaff.id, Number(amount), payType, payNote, salaryString);
      if(res.success) {
          toast.success(`Payment recorded: ${salaryString}`);
          setAmount(""); setPayNote("");
          openStaffDetails(selectedStaff); 
      } else { toast.error("Payment failed"); }
  }

  // --- LOGIC: LEAVE ---
  async function handleLeaveApproval(leaveId: string, status: 'approved' | 'rejected') {
      toast.loading("Processing...");
      await updateLeaveStatus(leaveId, selectedStaff.id, status);
      toast.dismiss();
      toast.success(`Leave ${status}`);
      openStaffDetails(selectedStaff); 
  }

  async function handleManualLeave() {
      if(!leaveStart || !leaveEnd) return toast.error("Select dates");
      await createLeaveRequest(selectedStaff.id, leaveStart, leaveEnd, leaveReason || "Manual Entry by Admin");
      toast.success("Leave Logged");
      setLeaveStart(""); setLeaveEnd(""); setLeaveReason("");
      openStaffDetails(selectedStaff);
  }

  // FILTER LIST
  const filteredList = staffList.filter(s => 
      s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone?.includes(searchQuery)
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="w-10 h-10 text-emerald-500 animate-spin" /></div>;

  return (
    <div className="flex h-[100dvh] bg-[#F8FAFC] font-sans text-slate-900 selection:bg-emerald-500 selection:text-white overflow-hidden">
      <Sidebar tenantName={tenant?.name} tenantCode={tenant?.code} logo={tenant?.logo_url} />
      
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* HEADER */}
        <header className="flex-shrink-0 px-8 py-6 bg-white border-b border-slate-100 flex justify-between items-center gap-4">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Workforce</h1>
                <p className="text-sm font-bold text-slate-400 mt-1 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Manage team & access
                </p>
            </div>
            
            <div className="flex-1 max-w-md hidden md:block">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                    <input 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search staff..." 
                        className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                </div>
            </div>

            <div className="flex gap-3">
                <button onClick={loadData} className={`p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all ${refreshing ? 'animate-spin' : ''}`}>
                    <RefreshCcw className="w-5 h-5" />
                </button>
                <button onClick={openNewStaff} className="h-12 px-6 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-900/10 hover:scale-105 transition-all flex items-center gap-2 active:scale-95">
                    <Plus className="w-5 h-5" /> New Staff
                </button>
            </div>
        </header>

        {/* STAFF GRID */}
        <div className="flex-1 overflow-y-auto p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                {filteredList.map((staff) => (
                    <div 
                        key={staff.id} 
                        onClick={() => openStaffDetails(staff)}
                        className={`bg-white p-6 rounded-[2rem] border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden ${staff.hasPendingLeave ? 'border-orange-200 ring-2 ring-orange-100' : 'border-slate-100'}`}
                    >
                        {staff.hasPendingLeave && (
                            <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide animate-pulse">
                                <BellRing className="w-3 h-3 fill-orange-700" /> Review Request
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-inner ${getRoleStyles(staff.role)}`}>
                                {getRoleIcon(staff.role)}
                            </div>
                        </div>

                        <h3 className="text-xl font-black text-slate-900">{staff.full_name}</h3>
                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{staff.role}</p>
                        
                        <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center text-xs font-bold text-slate-400">
                            <span className="flex items-center gap-1"><Banknote className="w-3 h-3" /> Rs {staff.salary?.toLocaleString() || 0}</span>
                            <span className="flex items-center gap-1 group-hover:text-emerald-500 transition-colors">Manage <ArrowRight className="w-3 h-3" /></span>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* --- SMART DRAWER --- */}
        <AnimatePresence>
            {isDrawerOpen && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDrawerOpen(false)} className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" />
                    <motion.div 
                        initial={{ x: "100%" }} 
                        animate={{ x: 0 }} 
                        exit={{ x: "100%" }} 
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-2 bottom-2 right-2 w-full max-w-xl bg-white rounded-[2rem] shadow-2xl z-50 overflow-hidden flex flex-col border border-slate-100"
                    >
                        {/* DRAWER HEADER */}
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{drawerMode === 'create' ? "Onboard Staff" : selectedStaff?.full_name}</h2>
                                <p className="text-sm font-bold text-slate-400 mt-1">{drawerMode === 'create' ? "Create new profile" : selectedStaff?.role}</p>
                            </div>
                            <div className="flex gap-2">
                                {drawerMode === 'details' && (
                                    <button onClick={() => handleDeleteStaff(selectedStaff.id)} className="w-10 h-10 rounded-full bg-white border border-red-100 text-red-400 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 className="w-5 h-5" /></button>
                                )}
                                <button onClick={() => setIsDrawerOpen(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                            </div>
                        </div>

                        {/* --- CREATE / EDIT FORM --- */}
                        {(drawerMode === 'create' || isEditingProfile) && (
                            <form ref={formRef} onSubmit={handleSaveStaff} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Full Name</label>
                                        <div className="relative">
                                            <UserCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                            <input name="full_name" defaultValue={selectedStaff?.full_name} required placeholder="e.g. Nischal Shrestha" className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Role</label>
                                            <div className="relative">
                                                <select name="role" defaultValue={selectedStaff?.role || 'waiter'} className="w-full h-14 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 appearance-none">
                                                    <option value="manager">Manager</option>
                                                    <option value="chef">Chef</option>
                                                    <option value="waiter">Waiter</option>
                                                    <option value="cashier">Cashier</option>
                                                    
                                                    {/* FEATURE FLAG: Show Bartender ONLY if split_kot_bot is active, OR if the staff is already a bartender */}
                                                    {(tenant?.feature_flags?.split_kot_bot || selectedStaff?.role === 'bartender') && (
                                                        <option value="bartender">Bartender</option>
                                                    )}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Access PIN</label>
                                            <div className="relative flex items-center">
                                                <KeyRound className="absolute left-4 w-5 h-5 text-slate-300 z-10" />
                                                <input 
                                                    name="pin_code" 
                                                    type={showPin ? "text" : "password"} 
                                                    defaultValue={selectedStaff?.pin_code} 
                                                    maxLength={4} 
                                                    required 
                                                    placeholder="0000" 
                                                    className="w-full h-14 pl-12 pr-20 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 transition-all tracking-widest text-center" 
                                                />
                                                <div className="absolute right-2 flex gap-1">
                                                    <button type="button" onClick={() => setShowPin(!showPin)} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"><Eye className="w-4 h-4" /></button>
                                                    <button type="button" onClick={generatePin} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"><Wand2 className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact & Salary */}
                                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                                        <label className="text-xs font-black uppercase text-slate-400">Contact & Salary</label>
                                        <div className="flex gap-4">
                                            <input name="phone" defaultValue={selectedStaff?.phone} placeholder="Phone" className="flex-1 h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-slate-400" />
                                            <input name="email" defaultValue={selectedStaff?.email} placeholder="Email" className="flex-1 h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-slate-400" />
                                        </div>
                                        <input name="salary" defaultValue={selectedStaff?.salary} type="number" placeholder="Monthly Salary (Rs)" className="w-full h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-slate-400" />
                                    </div>

                                    {/* Emergency Contact */}
                                    <div className="p-5 rounded-2xl bg-orange-50/50 border border-orange-100 space-y-4">
                                        <label className="text-xs font-black uppercase text-orange-400 flex items-center gap-2"><HeartPulse className="w-4 h-4" /> Emergency Contact</label>
                                        <div className="flex gap-4">
                                            <input name="emergency_contact_name" defaultValue={selectedStaff?.emergency_contact_name} placeholder="Contact Person Name" className="flex-1 h-10 px-4 bg-white border border-orange-200 rounded-xl text-sm font-bold outline-none focus:border-orange-400" />
                                            <input name="emergency_contact_phone" defaultValue={selectedStaff?.emergency_contact_phone} placeholder="Phone Number" className="flex-1 h-10 px-4 bg-white border border-orange-200 rounded-xl text-sm font-bold outline-none focus:border-orange-400" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    {isEditingProfile && drawerMode !== 'create' && (
                                        <button type="button" onClick={() => setIsEditingProfile(false)} className="flex-1 h-16 bg-white border border-slate-200 text-slate-500 rounded-[1.5rem] font-bold text-lg hover:bg-slate-50 transition-colors">Cancel</button>
                                    )}
                                    <button disabled={isSubmitting} className="flex-1 h-16 bg-slate-900 text-white rounded-[1.5rem] font-bold text-lg shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                                        {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <>{drawerMode === 'create' ? 'Create' : 'Update'} <Save className="w-5 h-5" /></>}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* --- MODE B: VIEW DETAILS (Read-Only + Tabs) --- */}
                        {drawerMode === 'details' && !isEditingProfile && selectedStaff && (
                            <div className="flex flex-col h-full">
                                {/* TABS */}
                                <div className="flex p-2 gap-2 bg-white border-b border-slate-100">
                                    {['profile', 'payroll', 'leave'].map(tab => (
                                        <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>{tab}</button>
                                    ))}
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 bg-white relative custom-scrollbar">
                                    {selectedStaff.isLoading ? (
                                        <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
                                    ) : (
                                        <>
                                            {/* PROFILE TAB */}
                                            {activeTab === 'profile' && (
                                                <div className="space-y-6 pb-20">
                                                    <div className="p-6 rounded-[1.5rem] bg-slate-50 border border-slate-100">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <h3 className="font-black text-slate-900 flex items-center gap-2"><UserCircle2 className="w-5 h-5" /> Personal Details</h3>
                                                            <button onClick={() => setIsEditingProfile(true)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-emerald-600 hover:border-emerald-200 transition-colors flex items-center gap-1"><Edit2 className="w-3 h-3" /> Edit</button>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                                            <div><span className="block text-xs font-bold text-slate-400 uppercase">Phone</span><p className="font-bold">{selectedStaff.phone || "-"}</p></div>
                                                            <div><span className="block text-xs font-bold text-slate-400 uppercase">Email</span><p className="font-bold">{selectedStaff.email || "-"}</p></div>
                                                            <div><span className="block text-xs font-bold text-slate-400 uppercase">Base Salary</span><p className="font-bold text-emerald-600">Rs {selectedStaff.salary?.toLocaleString()}</p></div>
                                                            <div><span className="block text-xs font-bold text-slate-400 uppercase">Joined</span><p className="font-bold">{selectedStaff.created_at ? new Date(selectedStaff.created_at).toLocaleDateString() : '-'}</p></div>
                                                            <div className="col-span-2"><span className="block text-xs font-bold text-slate-400 uppercase mb-1">Access PIN</span><p className="font-bold tracking-[0.5em] bg-slate-200 px-3 py-1 rounded-lg inline-block text-slate-600">••••</p></div>
                                                        </div>
                                                    </div>

                                                    {/* Emergency Contact Display */}
                                                    <div className="p-6 rounded-[1.5rem] bg-orange-50 border border-orange-100">
                                                        <h3 className="font-black text-orange-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider"><HeartPulse className="w-4 h-4" /> Emergency Contact</h3>
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <p className="font-bold text-slate-900">{selectedStaff.emergency_contact_name || "Not provided"}</p>
                                                                <p className="text-xs font-bold text-orange-600">{selectedStaff.emergency_contact_phone || "-"}</p>
                                                            </div>
                                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-orange-400 shadow-sm"><Contact className="w-5 h-5" /></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* PAYROLL TAB */}
                                            {activeTab === 'payroll' && (
                                                <div className="space-y-8 pb-20">
                                                    <div className="p-6 rounded-[2rem] bg-slate-900 text-white relative overflow-hidden shadow-xl shadow-slate-900/20">
                                                        <div className="absolute top-0 right-0 p-6 opacity-10"><Wallet className="w-32 h-32 text-white" /></div>
                                                        <h3 className="font-black mb-6 flex items-center gap-2 relative z-10"><Banknote className="w-5 h-5" /> Record Payment</h3>
                                                        <div className="space-y-4 relative z-10">
                                                            <div className="grid grid-cols-2 gap-3"><select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="h-12 px-4 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold outline-none focus:border-emerald-500">{NEPALI_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select><input value={selectedYear} onChange={e => setSelectedYear(e.target.value)} placeholder="Year" className="h-12 px-4 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold outline-none focus:border-emerald-500" /></div>
                                                            <div className="grid grid-cols-2 gap-3"><input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="Rs Amount" className="h-12 px-4 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold outline-none focus:border-emerald-500 placeholder:text-slate-500" /><select value={payType} onChange={e => setPayType(e.target.value)} className="h-12 px-4 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold outline-none focus:border-emerald-500"><option value="salary">Salary</option><option value="bonus">Bonus</option><option value="advance">Advance</option></select></div>
                                                            <input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Note (Optional)" className="w-full h-12 px-4 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold outline-none focus:border-emerald-500 placeholder:text-slate-500" />
                                                            <button onClick={handlePayment} className="w-full h-14 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20">Confirm Payment</button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-slate-900 mb-4 text-xs uppercase tracking-wider flex items-center gap-2"><History className="w-4 h-4" /> Payment History</h3>
                                                        <div className="space-y-3">{selectedStaff.payments?.map((pay: any) => (<div key={pay.id} className="flex justify-between items-center p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><CalendarDays className="w-5 h-5" /></div><div><p className="font-black text-slate-900 text-lg">Rs {pay.amount.toLocaleString()}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{pay.type} • {pay.salary_month}</p></div></div><div className="text-right"><span className="text-xs font-bold text-slate-400 block">{new Date(pay.payment_date).toLocaleDateString()}</span></div></div>))}</div>
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'leave' && (
                                                <div className="space-y-8 pb-20">
                                                    {selectedStaff.leaves?.some((l: any) => l.status === 'pending') && (
                                                        <div className="space-y-4">
                                                            <div className="flex items-center gap-2 bg-orange-50 p-3 rounded-xl border border-orange-100"><BellRing className="w-5 h-5 text-orange-600 animate-bounce" /><div><h3 className="font-black text-orange-900 text-sm">Action Required</h3></div></div>
                                                            {selectedStaff.leaves.filter((l: any) => l.status === 'pending').map((leave: any) => (<div key={leave.id} className="p-6 rounded-[2rem] bg-white border-2 border-orange-100 shadow-sm relative overflow-hidden"><p className="text-xs font-black text-orange-400 uppercase tracking-widest mb-2">Request</p><h4 className="text-xl font-black text-slate-900 mb-1">{leave.reason}</h4><p className="text-sm font-bold text-slate-500 mb-6">{new Date(leave.start_date).toLocaleDateString()} — {new Date(leave.end_date).toLocaleDateString()}</p><div className="flex gap-3"><button onClick={() => handleLeaveApproval(leave.id, 'approved')} className="flex-1 h-12 bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-600"><CheckCircle2 className="w-4 h-4" /> Approve</button><button onClick={() => handleLeaveApproval(leave.id, 'rejected')} className="flex-1 h-12 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-200"><XCircle className="w-4 h-4" /> Reject</button></div></div>))}
                                                        </div>
                                                    )}
                                                    <div className="pt-6 border-t border-slate-100"><h3 className="font-black text-slate-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">Log Manual Leave</h3><div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3"><div className="flex gap-3"><input type="date" value={leaveStart} onChange={e => setLeaveStart(e.target.value)} className="flex-1 h-10 px-3 rounded-lg bg-white border border-slate-200 outline-none text-xs font-bold" /><input type="date" value={leaveEnd} onChange={e => setLeaveEnd(e.target.value)} className="flex-1 h-10 px-3 rounded-lg bg-white border border-slate-200 outline-none text-xs font-bold" /></div><input value={leaveReason} onChange={e => setLeaveReason(e.target.value)} placeholder="Reason" className="w-full h-10 px-3 rounded-lg bg-white border border-slate-200 outline-none text-xs font-bold" /><button onClick={handleManualLeave} className="w-full h-10 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800">Log Leave</button></div></div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>

      </main>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Power, Monitor, CreditCard, ChefHat, 
  Smartphone, Database, Lock, Trash2, ExternalLink,
  ShieldCheck, Ban, CheckCircle2, AlertCircle, Save
} from "lucide-react";
import { toast } from "sonner";
import { getTenantById, updateFeatureFlags, toggleSubscription, deleteTenant } from "@/app/actions/super-admin";
import { motion } from "framer-motion";

// --- TOGGLE SWITCH COMPONENT ---
function SystemToggle({ label, description, icon: Icon, active, onToggle }: any) {
  return (
    <div 
      onClick={onToggle}
      className={`relative cursor-pointer group p-6 rounded-3xl border-2 transition-all duration-300 ${active 
        ? 'bg-gecko-50/50 border-gecko-500 shadow-xl shadow-gecko-100' 
        : 'bg-white border-slate-100 hover:border-slate-200 opacity-80'}`}
    >
       <div className="flex justify-between items-start mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${active ? 'bg-gecko-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
             <Icon className="w-6 h-6" />
          </div>
          <div className={`w-14 h-8 rounded-full p-1 transition-colors ${active ? 'bg-gecko-500' : 'bg-slate-200'}`}>
             <motion.div 
               className="w-6 h-6 bg-white rounded-full shadow-sm"
               animate={{ x: active ? 24 : 0 }}
               transition={{ type: "spring", stiffness: 500, damping: 30 }}
             />
          </div>
       </div>
       <h3 className={`font-bold text-lg mb-1 ${active ? 'text-slate-900' : 'text-slate-500'}`}>{label}</h3>
       <p className="text-xs font-medium text-slate-400 leading-relaxed">{description}</p>
    </div>
  )
}

export default function RestaurantControlCenter() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  
  // Local state for features to allow instant UI feedback
  const [features, setFeatures] = useState<any>({});

  useEffect(() => {
    async function init() {
      const res = await getTenantById(Number(id));
      if(res.success) {
        setTenant(res.data);
        // Default flags if null
        setFeatures(res.data.feature_flags || { 
          inventory: false, 
          kitchen_display: false, 
          accounts: false, 
          qr_ordering: false,
          staff_app: false
        });
      } else {
        toast.error("Could not load node data");
        router.push("/super-admin");
      }
      setLoading(false);
    }
    init();
  }, [id, router]);

  async function handleFeatureToggle(key: string) {
    const newFeatures = { ...features, [key]: !features[key] };
    setFeatures(newFeatures); // Instant UI update
    
    // Background save
    const res = await updateFeatureFlags(Number(id), newFeatures);
    if(res.success) {
       toast.success(`${key.replace('_', ' ')} updated`);
    } else {
       toast.error("Failed to save changes");
       setFeatures(features); // Revert
    }
  }

  async function handleSubscription() {
    toast.loading("Switching status...");
    await toggleSubscription(Number(id), tenant.subscription_status);
    toast.dismiss();
    // Reload data
    const res = await getTenantById(Number(id));
    if(res.success) setTenant(res.data);
  }

  if(loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin text-gecko-500"><Power /></div></div>;

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-12">
       <div className="max-w-5xl mx-auto space-y-8">
          
          {/* NAV */}
          <button onClick={() => router.push("/super-admin")} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-colors">
             <ArrowLeft className="w-4 h-4" /> Back to HQ
          </button>

          {/* HEADER CARD */}
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-slate-100 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-gecko-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
             
             <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
                <div>
                   <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-3xl shadow-lg shadow-slate-900/20">
                         {tenant.name[0]}
                      </div>
                      <div>
                         <h1 className="text-3xl md:text-4xl font-black text-slate-900">{tenant.name}</h1>
                         <p className="text-slate-400 font-bold tracking-wider uppercase">{tenant.code} • {tenant.plan} PLAN</p>
                      </div>
                   </div>
                   <div className="flex gap-3">
                      <span className={`px-4 py-2 rounded-full text-xs font-black uppercase flex items-center gap-2 ${tenant.subscription_status === 'active' ? 'bg-gecko-100 text-gecko-700' : 'bg-red-100 text-red-700'}`}>
                         {tenant.subscription_status === 'active' ? <CheckCircle2 className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
                         {tenant.subscription_status}
                      </span>
                      <span className="px-4 py-2 rounded-full text-xs font-black uppercase bg-slate-100 text-slate-500">
                         v2.4.0 Stable
                      </span>
                   </div>
                </div>

                <div className="flex flex-col gap-3 min-w-[200px]">
                   <button 
                      onClick={handleSubscription}
                      className={`h-14 rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${tenant.subscription_status === 'active' ? 'bg-white text-red-500 border-2 border-red-50 hover:bg-red-50' : 'bg-gecko-500 text-white shadow-gecko-200 hover:bg-gecko-600'}`}
                   >
                      <Power className="w-5 h-5" />
                      {tenant.subscription_status === 'active' ? 'Suspend Access' : 'Activate Access'}
                   </button>
                   <button onClick={() => toast.info("Opening Admin...")} className="h-14 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-200 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                      <ExternalLink className="w-5 h-5" /> Impersonate
                   </button>
                </div>
             </div>
          </div>

          {/* SYSTEM GRID */}
          <div className="space-y-6">
             <div className="flex items-center gap-3 px-2">
                <ShieldCheck className="w-5 h-5 text-gecko-500" />
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-wide">System Modules</h2>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <SystemToggle 
                   label="Kitchen Display" 
                   description="Enable digital KDS screens for kitchen staff. Disables paper printing."
                   icon={Monitor}
                   active={features.kitchen_display}
                   onToggle={() => handleFeatureToggle('kitchen_display')}
                />
                <SystemToggle 
                   label="Smart Inventory" 
                   description="Recipe-based deduction and stock alerts. Required for food cost reports."
                   icon={Database}
                   active={features.inventory}
                   onToggle={() => handleFeatureToggle('inventory')}
                />
                <SystemToggle 
                   label="Accounting Core" 
                   description="Tax (VAT), Expenses, P&L, and daily closing reports."
                   icon={CreditCard}
                   active={features.accounts}
                   onToggle={() => handleFeatureToggle('accounts')}
                />
                <SystemToggle 
                   label="Waiter App" 
                   description="Allow mobile ordering from staff phones via local WiFi."
                   icon={Smartphone}
                   active={features.staff_app}
                   onToggle={() => handleFeatureToggle('staff_app')}
                />
                <SystemToggle 
                   label="QR Ordering" 
                   description="Allow customers to scan table QR to place orders directly."
                   icon={ChefHat}
                   active={features.qr_ordering}
                   onToggle={() => handleFeatureToggle('qr_ordering')}
                />
                 <SystemToggle 
                   label="Offline Sync" 
                   description="Allow operations to continue when internet connection drops."
                   icon={Database}
                   active={true} // Always on for SaaS
                   onToggle={() => toast.message("Core Feature", { description: "Offline Sync cannot be disabled." })}
                />
             </div>
          </div>

          {/* DANGER ZONE */}
          <div className="mt-12 pt-12 border-t border-slate-200">
             <div className="bg-red-50 rounded-3xl p-8 border border-red-100 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                   <h3 className="text-lg font-bold text-red-900 flex items-center gap-2">
                      <Ban className="w-5 h-5" /> Danger Zone
                   </h3>
                   <p className="text-red-700/80 text-sm mt-1 max-w-md">
                      Permanently delete this restaurant and all associated data (orders, menu, staff). This action cannot be undone.
                   </p>
                </div>
                <button 
                  onClick={async () => {
                     if(confirm("FINAL WARNING: Delete this restaurant?")) {
                        await deleteTenant(Number(id));
                        router.push("/super-admin");
                        toast.error("Restaurant Destroyed");
                     }
                  }}
                  className="px-6 py-3 bg-white border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2"
                >
                   <Trash2 className="w-4 h-4" /> Delete Database
                </button>
             </div>
          </div>

       </div>
    </div>
  )
}
"use client";
import { useState } from "react";
import { updateStoreSettings } from "@/app/actions/cashier"; 
import { Store, Wallet, Save, Loader2, Trash2, ImagePlus, CheckCircle2, QrCode, AlertTriangle,Banknote } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// --- IMAGE COMPRESSION HELPER ---
async function compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
        const reader = new FileReader(); 
        reader.readAsDataURL(file);
        reader.onload = (e) => { 
            const img = new Image(); 
            img.src = e.target?.result as string; 
            img.onload = () => { 
                const c = document.createElement('canvas'); 
                const s = 600 / img.width; 
                c.width = 600; 
                c.height = img.height * s; 
                const ctx = c.getContext('2d'); 
                ctx?.drawImage(img, 0, 0, c.width, c.height); 
                c.toBlob((b) => { 
                    if(b) resolve(new File([b], file.name, { type: 'image/jpeg', lastModified: Date.now() })); 
                    else resolve(file); 
                }, 'image/jpeg', 0.8); 
            } 
        }
    });
}

export default function SettingsView({ data, onSave }: any) {
    const [profile, setProfile] = useState({ 
        name: data.restaurant?.name || "", 
        address: data.restaurant?.address || "", 
        phone: data.restaurant?.phone || "" 
    });
    
    const [accounts, setAccounts] = useState<any[]>(data.restaurant?.bank_accounts || []);
    const [newAcc, setNewAcc] = useState({ name: "", number: "", qrUrl: "" });
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // --- UPLOAD HANDLER ---
    const handleUpload = async (e: any) => { 
        const file = e.target.files?.[0]; 
        if(!file) return; 
        
        setIsUploading(true); 
        const toastId = toast.loading("Compressing and Uploading QR...");
        
        try { 
            const compressed = await compressImage(file); 
            const formData = new FormData(); 
            formData.append("file", compressed); 
            formData.append("upload_preset", "gecko_preset"); 
            
            const res = await fetch(`https://api.cloudinary.com/v1_1/dczy4dbgc/image/upload`, { 
                method: "POST", 
                body: formData 
            }); 
            
            const d = await res.json(); 
            if(d.secure_url) { 
                setNewAcc({...newAcc, qrUrl: d.secure_url}); 
                toast.success("QR Code Uploaded!", { id: toastId }); 
            } else {
                throw new Error("Upload failed");
            }
        } catch(e) { 
            toast.error("Upload Failed. Please check your connection.", { id: toastId }); 
        } finally {
            setIsUploading(false); 
        }
    };

    // --- ADD PAYMENT METHOD ---
    const handleAddMethod = () => {
        if (!newAcc.name.trim()) {
            toast.error("Please enter a provider name (e.g., eSewa, Fonepay)");
            return;
        }
        setAccounts([...accounts, { name: newAcc.name.trim(), qrUrl: newAcc.qrUrl }]);
        setNewAcc({ name: "", number: "", qrUrl: "" }); // Reset form
        toast.success(`${newAcc.name} added to payment methods.`);
    };

    // --- PREMIUM DELETE CONFIRMATION TOAST ---
    const handleRemoveMethod = (indexToRemove: number, accName: string) => {
        toast.custom((t) => (
            <div className="bg-white p-5 rounded-[1.5rem] shadow-2xl border border-slate-100 flex flex-col gap-4 w-full sm:w-[320px] pointer-events-auto">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="pt-0.5">
                        <h4 className="font-black text-slate-900 text-sm tracking-tight">Delete Method?</h4>
                        <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
                            Are you sure you want to remove <strong className="text-slate-800">{accName}</strong>? This will remove it from the checkout screen.
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 mt-1">
                    <button 
                        onClick={() => toast.dismiss(t)} 
                        className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => {
                            setAccounts(prev => prev.filter((_, idx) => idx !== indexToRemove));
                            toast.dismiss(t);
                            toast.success(`${accName} removed.`);
                        }} 
                        className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-red-500/25 active:scale-95"
                    >
                        Yes, Delete
                    </button>
                </div>
            </div>
        ), { duration: 8000 }); // Stays visible for 8 seconds unless interacted with
    };

    // --- SAVE CONFIGURATION ---
    const handleSave = async () => {
        if(!profile.name) return toast.error("Restaurant Name is required!");
        
        setIsSaving(true);
        const toastId = toast.loading("Saving configuration...");
        
        try {
            const res = await onSave(profile, accounts);
            if(res && res.success) {
                toast.success("Settings saved successfully!", { id: toastId });
            } else {
                toast.error(res?.error || "Failed to save settings", { id: toastId });
            }
        } catch (error) {
            toast.error("System error while saving.", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto bg-[#F8FAFC] pb-[140px] custom-scrollbar">
            
            {/* HEADER WITH INTEGRATED SAVE BUTTON */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">System Settings</h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Configure Receipt & Billing</p>
                </div>
                
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className={`w-full md:w-auto px-8 py-3.5 rounded-2xl font-black text-white shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${isSaving ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30'}`}
                >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isSaving ? "Saving..." : "Save Configuration"}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                
                {/* --- PROFILE SETTINGS --- */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100">
                    <h3 className="font-black text-xl mb-6 flex items-center gap-3 text-slate-900">
                        <div className="p-2.5 bg-emerald-50 rounded-xl"><Store className="w-6 h-6 text-emerald-600" /></div>
                        Receipt Header
                    </h3>
                    
                    <div className="space-y-5">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2 mb-1 block">Restaurant Name</label>
                            <input value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full p-4 bg-slate-50 text-slate-900 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500 focus:bg-white transition-all shadow-sm" placeholder="e.g., Gecko Lounge"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2 mb-1 block">Address</label>
                            <input value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} className="w-full p-4 bg-slate-50 text-slate-900 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500 focus:bg-white transition-all shadow-sm" placeholder="e.g., Thamel, Kathmandu"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2 mb-1 block">Phone Number</label>
                            <input value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full p-4 bg-slate-50 text-slate-900 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500 focus:bg-white transition-all shadow-sm" placeholder="e.g., +977 9800000000"/>
                        </div>
                    </div>
                </motion.div>

                {/* --- PAYMENT ACCOUNTS SETTINGS --- */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col h-full">
                    <h3 className="font-black text-xl mb-6 flex items-center gap-3 text-slate-900">
                        <div className="p-2.5 bg-indigo-50 rounded-xl"><Wallet className="w-6 h-6 text-indigo-600" /></div>
                        Payment Methods
                    </h3>
                    
                    {/* Active Methods List */}
                    <div className="space-y-3 mb-6 flex-1">
                        <AnimatePresence>
                            {accounts.map((acc, i) => (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group">
                                    <div className="flex items-center gap-3">
                                        {acc.qrUrl ? <QrCode className="w-5 h-5 text-emerald-500" /> : <Banknote className="w-5 h-5 text-slate-400" />}
                                        <span className="font-black text-slate-700">{acc.name}</span>
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveMethod(i, acc.name)} 
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {accounts.length === 0 && <p className="text-sm font-bold text-slate-400 text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl">No payment methods added yet.</p>}
                    </div>

                    {/* Add New Method Form */}
                    {accounts.length < 4 && (
                        <div className="mt-auto p-5 md:p-6 bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                            
                            <h4 className="text-white font-black mb-4 flex items-center gap-2 relative z-10">Add New Method</h4>
                            
                            <input 
                                value={newAcc.name} 
                                onChange={e => setNewAcc({...newAcc, name: e.target.value})} 
                                placeholder="Provider Name (e.g. eSewa, Fonepay)" 
                                className="w-full p-4 bg-white/10 text-white placeholder-slate-400 border border-white/20 rounded-xl mb-4 font-bold text-sm outline-none focus:border-emerald-400 focus:bg-white/20 transition-all relative z-10" 
                            />
                            
                            {/* Visual QR Upload Box - FIXED TAILWIND CONFLICT HERE */}
                            <div className="relative h-28 bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center cursor-pointer mb-4 transition-colors z-10 overflow-hidden">
                                {isUploading ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Uploading...</span>
                                    </div>
                                ) : newAcc.qrUrl ? (
                                    <div className="relative w-full h-full flex items-center justify-center group">
                                        <img src={newAcc.qrUrl} alt="QR Preview" className="h-full w-auto object-contain p-2 mix-blend-screen bg-white rounded-lg" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-2">
                                            <ImagePlus className="w-4 h-4" /> Change QR
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-slate-400">
                                        <QrCode className="w-6 h-6 mb-2 opacity-50" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Upload QR (Optional)</span>
                                    </div>
                                )}
                                <input type="file" accept="image/*" onChange={handleUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            </div>

                            <button onClick={handleAddMethod} className="w-full py-3.5 bg-emerald-500 text-white rounded-xl font-black text-sm hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 relative z-10 flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-5 h-5" /> Add to List
                            </button>
                        </div>
                    )}
                </motion.div>

            </div>
        </div>
    )
}
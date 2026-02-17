"use client";
import { useState } from "react";
import { updateStoreSettings } from "@/app/actions/cashier"; 
import { Store, Wallet, Save, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

async function compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = (e) => { const img=new Image(); img.src=e.target?.result as string; img.onload=()=>{ const c=document.createElement('canvas'); const s=600/img.width; c.width=600; c.height=img.height*s; const ctx=c.getContext('2d'); ctx?.drawImage(img,0,0,c.width,c.height); c.toBlob((b)=>{ if(b)resolve(new File([b],file.name,{type:'image/jpeg',lastModified:Date.now()})); else resolve(file); },'image/jpeg',0.8); } }
    });
}

export default function SettingsView({ data, onSave }: any) {
    const [profile, setProfile] = useState({ name: data.restaurant?.name || "", address: data.restaurant?.address || "", phone: data.restaurant?.phone || "" });
    const [accounts, setAccounts] = useState<any[]>(data.restaurant?.bank_accounts || []);
    const [newAcc, setNewAcc] = useState({ name: "", number: "", qrUrl: "" });
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async (e: any) => { 
        const file = e.target.files?.[0]; if(!file) return; setIsUploading(true); 
        try { 
            const compressed = await compressImage(file); 
            const formData = new FormData(); formData.append("file", compressed); formData.append("upload_preset", "gecko_preset"); 
            const res = await fetch(`https://api.cloudinary.com/v1_1/dczy4dbgc/image/upload`, { method: "POST", body: formData }); 
            const d = await res.json(); 
            if(d.secure_url) { setNewAcc({...newAcc, qrUrl: d.secure_url}); toast.success("QR Uploaded"); } 
        } catch(e) { toast.error("Upload Failed"); } 
        setIsUploading(false); 
    };

    return (
        <div className="p-8 h-full overflow-y-auto bg-[#F8FAFC] pb-32">
            <h1 className="text-3xl font-black text-slate-900 mb-8">System Settings</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-32">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Store className="w-5 h-5 text-emerald-500" /> Receipt Header</h3>
                    <div className="space-y-4">
                        <input value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500 transition-all" placeholder="Restaurant Name"/>
                        <input value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500 transition-all" placeholder="Address"/>
                        <input value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500 transition-all" placeholder="Phone"/>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Wallet className="w-5 h-5 text-emerald-500" /> Accounts</h3>
                    <div className="space-y-3">{accounts.map((acc, i) => (<div key={i} className="flex justify-between p-3 bg-slate-50 rounded-xl mb-2"><span className="font-bold">{acc.name}</span><button onClick={() => setAccounts(accounts.filter((_, idx) => idx !== i))} className="text-red-400"><Trash2 className="w-4 h-4" /></button></div>))}</div>
                    {accounts.length < 3 && (<div className="mt-6 p-6 bg-slate-50 rounded-3xl border border-dashed border-slate-200"><input value={newAcc.name} onChange={e => setNewAcc({...newAcc, name: e.target.value})} placeholder="Provider Name" className="w-full p-3 bg-white rounded-xl mb-3 font-bold text-sm outline-none" /><div className="relative h-20 bg-white rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer mb-3">{isUploading ? <Loader2 className="animate-spin text-slate-400" /> : <span className="text-xs font-bold text-slate-400 uppercase">Upload QR</span>}<input type="file" onChange={handleUpload} className="absolute inset-0 opacity-0" /></div><button onClick={() => { if(newAcc.name) setAccounts([...accounts, newAcc]); setNewAcc({name:"", number:"", qrUrl:""}) }} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm">Add Method</button></div>)}
                </div>
            </div>
            <button onClick={() => onSave(profile, accounts)} className="fixed bottom-10 right-10 bg-emerald-600 text-white px-10 py-4 rounded-full font-black shadow-xl flex items-center gap-2 hover:scale-105 transition-all"><Save className="w-5 h-5" /> Save Configuration</button>
        </div>
    )
}
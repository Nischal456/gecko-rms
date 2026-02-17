"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Utensils, ShoppingBag, ArrowRight, Store, ChefHat } from "lucide-react";
import Sidebar from "@/app/staff/waiter/Sidebar";

export default function NewOrderPage() {
  const router = useRouter();

  const handleSelection = (type: 'dine-in' | 'takeaway') => {
    if (type === 'dine-in') {
      // UPDATED: Go to the new Table Selection Page
      router.push('/staff/waiter/new-order/tables'); 
    } else {
      // Go directly to POS for Takeaway
      router.push('/staff/waiter/pos?type=takeaway'); 
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900">
      <Sidebar />
      
      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden">
        <div className="max-w-4xl w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Start New Order</h1>
            <p className="text-slate-500 text-lg font-medium">Select the service type to proceed</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* DINE IN OPTION */}
            <motion.button
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelection('dine-in')}
              className="group relative bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/20 border-2 border-slate-100 hover:border-emerald-500 transition-all duration-300 text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Store className="w-64 h-64 text-emerald-900" />
              </div>
              
              <div className="relative z-10">
                <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mb-8 group-hover:bg-emerald-500 transition-colors duration-300">
                  <Utensils className="w-10 h-10 text-emerald-600 group-hover:text-white transition-colors" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Dine-In</h2>
                <p className="text-slate-500 font-medium mb-8">Select a table from the floor plan and start serving.</p>
                
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm uppercase tracking-wider group-hover:gap-4 transition-all">
                  Select Table <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </motion.button>

            {/* TAKEAWAY OPTION */}
            <motion.button
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelection('takeaway')}
              className="group relative bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl hover:shadow-2xl hover:shadow-orange-500/20 border-2 border-slate-100 hover:border-orange-500 transition-all duration-300 text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <ShoppingBag className="w-64 h-64 text-orange-900" />
              </div>
              
              <div className="relative z-10">
                <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center mb-8 group-hover:bg-orange-500 transition-colors duration-300">
                  <ChefHat className="w-10 h-10 text-orange-600 group-hover:text-white transition-colors" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Takeaway</h2>
                <p className="text-slate-500 font-medium mb-8">Direct order entry for counter service or pickup.</p>
                
                <div className="flex items-center gap-2 text-orange-600 font-bold text-sm uppercase tracking-wider group-hover:gap-4 transition-all">
                  Open POS <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </motion.button>
          </div>
        </div>
      </main>
    </div>
  );
}
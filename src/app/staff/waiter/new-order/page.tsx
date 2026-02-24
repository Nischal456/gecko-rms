"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Utensils, ShoppingBag, ArrowRight, Store, ChefHat, Sparkles } from "lucide-react";
import Sidebar from "@/app/staff/waiter/Sidebar";

export default function NewOrderPage() {
  const router = useRouter();

  const handleSelection = (type: 'dine-in' | 'takeaway') => {
    if (type === 'dine-in') {
      router.push('/staff/waiter/new-order/tables'); 
    } else {
      router.push('/staff/waiter/pos?type=takeaway'); 
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  // CRITICAL FIX: 'as const' solves the TypeScript transition error
  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="flex h-[100dvh] bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden relative">
      <Sidebar />
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-emerald-50/50 to-transparent pointer-events-none" />
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />

      {/* FULLY SCROLLABLE MAIN CONTAINER (Fixes small screen cutoffs) */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
        <div className="min-h-full flex flex-col items-center justify-center p-5 md:p-8 lg:p-12 pb-[140px] md:pb-12">
            
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="max-w-4xl w-full my-auto mt-10 md:mt-auto"
          >
            <motion.div variants={itemVariants} className="text-center mb-10 md:mb-14">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-500 shadow-sm mb-4">
                <Utensils className="w-3.5 h-3.5 text-emerald-500" /> Start Serving
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight mb-4 leading-tight">
                New Order
              </h1>
              <p className="text-slate-500 text-base md:text-lg font-bold">Select the service type to proceed</p>
            </motion.div>

            {/* CRITICAL FIX: Changed to lg:grid-cols-2 so it stacks cleanly on iPad Portrait! */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6 lg:gap-8">
              
              {/* DINE IN OPTION */}
              <motion.button
                variants={itemVariants}
                whileHover={{ y: -8, scale: 1.01 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleSelection('dine-in')}
                className="group relative bg-white rounded-[2rem] lg:rounded-[2.5rem] p-6 md:p-8 lg:p-12 shadow-xl shadow-slate-200/50 border-2 border-slate-100 hover:border-emerald-400 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300 text-left overflow-hidden flex flex-col"
              >
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-emerald-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute top-4 right-4 md:top-8 md:right-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500 pointer-events-none">
                  <Store className="w-32 h-32 md:w-48 md:h-48 text-emerald-900" />
                </div>
                
                <div className="relative z-10 flex-1 flex flex-col">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-50 border border-emerald-100 rounded-[1.5rem] flex items-center justify-center mb-6 md:mb-8 group-hover:bg-emerald-500 transition-colors duration-300 shadow-inner group-hover:shadow-lg group-hover:shadow-emerald-500/30 shrink-0">
                    <Utensils className="w-8 h-8 md:w-10 md:h-10 text-emerald-600 group-hover:text-white transition-colors" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-3 tracking-tight">Dine-In</h2>
                  <p className="text-slate-500 text-sm md:text-base font-medium mb-8 leading-relaxed flex-1 pr-6">
                    Select a table from the live floor plan and start taking the customer's order.
                  </p>
                  
                  <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] md:text-xs uppercase tracking-widest group-hover:gap-4 transition-all bg-emerald-50 w-max px-4 py-2.5 rounded-xl group-hover:bg-emerald-100">
                    Select Table <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                </div>
              </motion.button>

              {/* TAKEAWAY OPTION */}
              <motion.button
                variants={itemVariants}
                whileHover={{ y: -8, scale: 1.01 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleSelection('takeaway')}
                className="group relative bg-white rounded-[2rem] lg:rounded-[2.5rem] p-6 md:p-8 lg:p-12 shadow-xl shadow-slate-200/50 border-2 border-slate-100 hover:border-orange-400 hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300 text-left overflow-hidden flex flex-col"
              >
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-orange-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute top-4 right-4 md:top-8 md:right-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500 pointer-events-none">
                  <ShoppingBag className="w-32 h-32 md:w-48 md:h-48 text-orange-900" />
                </div>
                
                <div className="relative z-10 flex-1 flex flex-col">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-orange-50 border border-orange-100 rounded-[1.5rem] flex items-center justify-center mb-6 md:mb-8 group-hover:bg-orange-500 transition-colors duration-300 shadow-inner group-hover:shadow-lg group-hover:shadow-orange-500/30 shrink-0">
                    <ChefHat className="w-8 h-8 md:w-10 md:h-10 text-orange-600 group-hover:text-white transition-colors" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-3 tracking-tight">Takeaway</h2>
                  <p className="text-slate-500 text-sm md:text-base font-medium mb-8 leading-relaxed flex-1 pr-6">
                    Direct order entry for counter service, walk-ins, or immediate pickup.
                  </p>
                  
                  <div className="flex items-center gap-2 text-orange-600 font-black text-[10px] md:text-xs uppercase tracking-widest group-hover:gap-4 transition-all bg-orange-50 w-max px-4 py-2.5 rounded-xl group-hover:bg-orange-100">
                    Open POS <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                </div>
              </motion.button>
              
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
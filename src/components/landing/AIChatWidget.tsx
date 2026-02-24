"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Sparkles, Send, MessageCircle, Info, Zap, Smartphone } from "lucide-react";

export default function AIChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{role: 'ai'|'user', text: string}[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasGreeted = useRef(false);

    // Auto-Greeting
    useEffect(() => {
        if (isOpen && !hasGreeted.current) {
            hasGreeted.current = true;
            setIsTyping(true);
            setTimeout(() => {
                setIsTyping(false);
                setMessages([{ 
                    role: 'ai', 
                    text: "Namaste! 🙏 Welcome to GeckoRMS.\n\nWe provide the fastest, The web-based operating system for high-volume restaurants in Nepal. Syncs menus, orders, and inventory in real-time.\n\nHow can I assist you today?" 
                }]);
            }, 800);
        }
    }, [isOpen]);

    // Auto-Scroll
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, isTyping]);

    const handleSend = async (textOverride?: string) => {
        const userMsg = textOverride || input;
        if (!userMsg.trim()) return;
        
        setInput("");
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsTyping(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                body: JSON.stringify({ message: userMsg, history: messages }),
            });
            const data = await res.json();
            setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'ai', text: "Please WhatsApp us at +977 9765009755." }]);
        } finally {
            setIsTyping(false);
        }
    };

    const QUICK_ACTIONS = [
        { label: "Pricing Plans", icon: <Info className="w-3.5 h-3.5" />, query: "What are your pricing plans?" },
        { label: "Key Features", icon: <Zap className="w-3.5 h-3.5" />, query: "What are the main features of GeckoRMS?" },
        { label: "Connect WhatsApp", icon: <Smartphone className="w-3.5 h-3.5" />, query: "How can I contact a human?" }
    ];

    return (
        <div className="fixed bottom-5 right-5 z-[100] flex flex-col items-end font-sans">
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8, y: 20, transformOrigin: "bottom right" }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="mb-4 w-[90vw] sm:w-[360px] bg-white border border-slate-100 rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col h-[550px] max-h-[80vh]"
                    >
                        {/* Premium Header */}
                        <div className="bg-emerald-600 px-5 py-4 flex items-center justify-between shadow-sm relative z-10 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                                        <Bot className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-emerald-600 rounded-full"></div>
                                </div>
                                <div>
                                    <h3 className="font-black text-white text-lg leading-tight tracking-tight">Gecko AI</h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" />
                                        <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest">Online Now</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setIsOpen(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Chat Body */}
                        <div ref={scrollRef} className="flex-1 p-5 overflow-y-auto custom-scrollbar bg-slate-50/50 space-y-4">
                            {messages.map((m, i) => (
                                <motion.div 
                                    key={i} 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                                >
                                    {m.role === 'ai' && (
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-1 border border-emerald-200 shadow-sm">
                                            <Bot className="w-4 h-4 text-emerald-600" />
                                        </div>
                                    )}
                                    <div className={`px-4 py-3 rounded-2xl text-[13px] font-medium leading-relaxed max-w-[80%] shadow-sm ${
                                        m.role === 'user' 
                                            ? 'bg-slate-900 text-white rounded-tr-sm' 
                                            : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm'
                                    }`}>
                                        {/* Auto-Link WhatsApp & Format Text */}
                                        {m.text.split('\n').map((line, lineIdx) => (
                                            <p key={lineIdx} className={lineIdx !== 0 ? "mt-2" : ""}>
                                                {line.split(/(\+977\s?9\d{9})/).map((part, idx) => 
                                                    part.includes("+977") ? (
                                                        <a key={idx} href="https://wa.me/9779765009755" target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-bold hover:underline inline-flex items-center gap-1">
                                                            {part}
                                                        </a>
                                                    ) : (
                                                        // Replace bold markdown with actual bold tags
                                                        <span key={idx} dangerouslySetInnerHTML={{ __html: part.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                                    )
                                                )}
                                            </p>
                                        ))}
                                    </div>
                                </motion.div>
                            ))}
                            {isTyping && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-200 shadow-sm">
                                        <Bot className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1.5 items-center h-10 shadow-sm">
                                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quick Actions & Input Area */}
                        <div className="bg-white border-t border-slate-100 shrink-0">
                            
                            {/* Quick Action Pills */}
                            {messages.length < 3 && !isTyping && (
                                <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pt-3 pb-1">
                                    {QUICK_ACTIONS.map((action, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => handleSend(action.query)}
                                            className="flex items-center gap-1.5 whitespace-nowrap bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors shrink-0"
                                        >
                                            {action.icon}
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Input Field */}
                            <div className="p-3">
                                <div className="flex gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-2xl focus-within:ring-2 focus-within:ring-emerald-100 focus-within:border-emerald-400 transition-all">
                                    <input 
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder="Ask about POS, pricing..." 
                                        className="flex-1 bg-transparent px-3 text-[13px] font-medium focus:outline-none text-slate-900 placeholder:text-slate-400" 
                                    />
                                    <button 
                                        onClick={() => handleSend()} 
                                        disabled={!input.trim() || isTyping} 
                                        className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0"
                                    >
                                        <Send className="w-4 h-4 ml-0.5" />
                                    </button>
                                </div>
                                <div className="text-center mt-2 pb-1">
                                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">GeckoRMS • Kathmandu, Nepal</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Trigger Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-emerald-500 transition-colors z-50 ring-4 ring-emerald-500/20"
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                            <X className="w-6 h-6" />
                        </motion.div>
                    ) : (
                        <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                            <MessageCircle className="w-6 h-6" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>
        </div>
    )
}
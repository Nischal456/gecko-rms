"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Sparkles, Send, RefreshCw, Zap, MessageCircle, ArrowRight, User } from "lucide-react";

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
                setMessages([{ role: 'ai', text: "Namaste! 🙏 I'm Gecko AI.\n\nAsk me about our **Offline Mode** or **Pricing**, or I can direct you to WhatsApp." }]);
            }, 800);
        }
    }, [isOpen]);

    // Auto-Scroll
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg = input;
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

    return (
        <div className="fixed bottom-5 right-5 z-[100] flex flex-col items-end font-sans">
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8, y: 20, transformOrigin: "bottom right" }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="mb-3 w-[85vw] md:w-80 bg-white/90 backdrop-blur-xl border border-white/20 rounded-[1.5rem] shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-slate-900/95 px-4 py-3 flex items-center justify-between border-b border-slate-800">
                            <div className="flex items-center gap-2">
                                <div className="relative w-2 h-2">
                                    <span className="absolute inset-0 bg-emerald-500 rounded-full animate-ping" />
                                    <span className="relative block w-2 h-2 bg-emerald-500 rounded-full" />
                                </div>
                                <span className="text-xs font-bold text-white tracking-wide">Gecko<span className="text-emerald-400">AI</span></span>
                            </div>
                            <a href="https://wa.me/9779765009755" target="_blank" className="bg-emerald-500/20 p-1.5 rounded-full hover:bg-emerald-500/40 transition-colors">
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                            </a>
                        </div>

                        {/* Chat Body */}
                        <div ref={scrollRef} className="p-4 h-64 overflow-y-auto custom-scrollbar bg-slate-50/50 space-y-3">
                            {messages.map((m, i) => (
                                <motion.div 
                                    key={i} 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                                >
                                    {m.role === 'ai' && <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 mt-1"><Bot className="w-3 h-3 text-white" /></div>}
                                    <div className={`px-3 py-2 rounded-2xl text-xs font-medium leading-relaxed max-w-[85%] ${
                                        m.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none shadow-sm'
                                    }`}>
                                        {/* Auto-Link WhatsApp */}
                                        {m.text.split(/(\+977\s?9\d{9})/).map((part, idx) => 
                                            part.includes("+977") ? (
                                                <a key={idx} href="https://wa.me/9779765009755" target="_blank" className="text-emerald-600 font-bold hover:underline">{part}</a>
                                            ) : <span key={idx}>{part}</span>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            {isTyping && (
                                <div className="flex gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center"><Bot className="w-3 h-3 text-white" /></div>
                                    <div className="bg-white border border-slate-100 px-3 py-2 rounded-2xl rounded-tl-none flex gap-1 items-center h-8">
                                        <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" />
                                        <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce delay-100" />
                                        <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce delay-200" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-2 bg-white border-t border-slate-100 flex gap-2">
                            <input 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask me anything..." 
                                className="flex-1 bg-slate-50 rounded-xl px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900" 
                            />
                            <button onClick={handleSend} disabled={!input.trim()} className="p-2 bg-slate-900 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50">
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Trigger Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className="w-12 h-12 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center border-2 border-white/20 backdrop-blur-md hover:bg-emerald-600 transition-colors z-50"
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                            <X className="w-5 h-5" />
                        </motion.div>
                    ) : (
                        <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                            <Sparkles className="w-5 h-5 fill-white/20" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>
        </div>
    )
}
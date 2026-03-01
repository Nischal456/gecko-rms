"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, MessageCircle, Info, Zap, Smartphone, Sparkles } from "lucide-react";
import Image from "next/image";

// --- ULTRA-PREMIUM MESSAGE FORMATTER ---
const formatMessage = (text: string) => {
    return text.split('\n').map((line, i) => {
        if (!line.trim()) return <br key={i} />;

        const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
        const cleanLine = isBullet ? line.trim().substring(2) : line;

        const parts = cleanLine.split(/(\*\*.*?\*\*|\+977\s?9\d{9})/g);

        const formattedLine = parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j} className="font-black text-slate-900">{part.slice(2, -2)}</strong>;
            }
            if (part.includes('+977')) {
                const cleanNumber = part.replace(/\s/g, '');
                return (
                    <a key={j} href={`https://wa.me/${cleanNumber.replace('+', '')}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-black hover:underline inline-flex items-center gap-1">
                        {part}
                    </a>
                );
            }
            return <span key={j}>{part}</span>;
        });

        return isBullet ? (
            <div key={i} className="flex gap-2 mt-1 mb-1">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span className="flex-1">{formattedLine}</span>
            </div>
        ) : (
            <p key={i} className="mb-1.5 last:mb-0 leading-relaxed">{formattedLine}</p>
        );
    });
};

export default function AIChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'ai' | 'user', text: string }[]>([]);
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
                    text: "Namaste! 🙏 Welcome to GeckoRMS.\nWe provide the fastest, cloud-based operating system for high-volume restaurants in Nepal.\n\nHow can I assist you today?"
                }]);
            }, 800);
        }
    }, [isOpen]);

    // Auto-Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages, isTyping]);

    const handleSend = async (textOverride?: string) => {
        const userMsg = textOverride || input;
        if (!userMsg.trim() || isTyping) return;

        setInput("");
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsTyping(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMsg, history: messages }),
            });
            const data = await res.json();
            setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'ai', text: "Connection error. Please WhatsApp us at **+977 9765009755**." }]);
        } finally {
            setIsTyping(false);
        }
    };

    const QUICK_ACTIONS = [
        { label: "Pricing", icon: <Info className="w-3 h-3" />, query: "What are your pricing plans?" },
        { label: "Features", icon: <Zap className="w-3 h-3" />, query: "What are the main features of GeckoRMS?" },
        { label: "Contact", icon: <Smartphone className="w-3 h-3" />, query: "How can I contact a human?" }
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
                        // SHRUNK DIMENSIONS: width 340px, height 500px max
                        className="mb-4 w-[90vw] sm:w-[340px] bg-white border border-slate-100 rounded-[1.5rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col h-[500px] max-h-[75vh]"
                    >
                        {/* Premium Header */}
                        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between shadow-sm relative z-10 shrink-0">
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                <div className="absolute top-[-50%] right-[-10%] w-24 h-24 bg-emerald-500/20 blur-[20px] rounded-full" />
                            </div>
                            <div className="flex items-center gap-2.5 relative z-10">
                                <div className="relative">
                                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-inner border border-emerald-400">
                                        <Image
                                            src="/paw.png"
                                            alt="Paw"
                                            width={16}
                                            height={16}
                                            className="filter brightness-0 invert"
                                        />
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-slate-900 rounded-full"></div>
                                </div>
                                <div>
                                    <h3 className="font-black text-white text-base leading-tight tracking-tight">Gecko RMS</h3>
                                    <div className="flex items-center gap-1.5 mt-[1px]">
                                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Online</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white relative z-10">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Chat Body */}
                        <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto custom-scrollbar bg-[#F8FAFC] space-y-4">
                            {messages.map((m, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                                >
                                    {m.role === 'ai' && (
                                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-1 border border-emerald-200 shadow-sm">
                                            <Bot className="w-3 h-3 text-emerald-600" />
                                        </div>
                                    )}
                                    <div className={`px-3.5 py-2.5 rounded-2xl text-[12px] font-medium max-w-[85%] shadow-sm ${m.role === 'user'
                                        ? 'bg-slate-900 text-white rounded-tr-sm'
                                        : 'bg-white border border-slate-200 text-slate-600 rounded-tl-sm'
                                        }`}>
                                        {m.role === 'ai' ? formatMessage(m.text) : m.text}
                                    </div>
                                </motion.div>
                            ))}

                            {/* Typing Indicator */}
                            {isTyping && (
                                <div className="flex gap-2">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-200 shadow-sm mt-1">
                                        <Bot className="w-3 h-3 text-emerald-600" />
                                    </div>
                                    <div className="bg-white border border-slate-200 px-3.5 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center h-8 shadow-sm">
                                        <span className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce" />
                                        <span className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                                        <span className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quick Actions & Input Area */}
                        <div className="bg-white border-t border-slate-100 shrink-0">

                            {/* Quick Action Pills (Disappear after interaction) */}
                            {messages.length < 3 && !isTyping && (
                                <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-3 pt-3 pb-1">
                                    {QUICK_ACTIONS.map((action, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSend(action.query)}
                                            className="flex items-center gap-1 whitespace-nowrap bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shrink-0 active:scale-95"
                                        >
                                            {action.icon}
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Input Field */}
                            <div className="p-3">
                                <div className="flex gap-2 bg-slate-50 border border-slate-200 p-1 rounded-xl focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-400 transition-all">
                                    <input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                        placeholder="Ask me anything..."
                                        className="flex-1 bg-transparent px-2.5 text-[12px] font-bold focus:outline-none text-slate-900 placeholder:text-slate-400"
                                    />
                                    <button
                                        onClick={() => handleSend()}
                                        disabled={!input.trim() || isTyping}
                                        className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:scale-100 active:scale-95 shadow-sm shrink-0"
                                    >
                                        <Send className="w-3.5 h-3.5 ml-0.5" />
                                    </button>
                                </div>
                                <div className="text-center mt-2 pb-0.5">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] flex items-center justify-center gap-1">
                                        Powered by
                                        <Image
                                            src="/paw.png"
                                            alt="Gecko AI"
                                            width={14}
                                            height={14}
                                            className="" // makes it full white
                                        />
                                        Gecko AI
                                    </p>
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
                className="w-14 h-14 bg-slate-900 text-white rounded-[1rem] shadow-[0_10px_20px_rgba(15,23,42,0.3)] flex items-center justify-center hover:bg-emerald-500 transition-colors z-50 ring-2 ring-white/50 relative group"
            >
                <div className="absolute inset-0 bg-emerald-400 opacity-0 group-hover:opacity-20 blur-xl rounded-full transition-opacity duration-500" />
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
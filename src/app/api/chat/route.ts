import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";

// Initialize Groq safely from Environment Variables
const groq = process.env.GROQ_API_KEY 
  ? new Groq({ apiKey: process.env.GROQ_API_KEY }) 
  : null;

/**
 * THE BRAIN OF GECKO AI
 * Engineered for Premium SaaS Conversion, Support & Upselling
 */
const SYSTEM_PROMPT = `
You are Gecko RMS, the elite virtual assistant for GeckoRMS, a premium Restaurant Management System developed by Gecko Works Nepal.

**CORE IDENTITY & CREDENTIALS:**
- **Developer:** Gecko Works Nepal (Based in Kathmandu).
- **Corporate Website:** https://www.geckoworksnepal.com/
- **Main Product:** GeckoRMS — Nepal's fastest, zero-lag, cloud-based operating system for modern restaurants.

**THE GECKO PRO PLAN (ALL-IN-ONE SUITE):**
We have eliminated complicated pricing tiers. We offer ONE powerful plan with everything fully unlocked.
- **Pricing:** **Rs 1,199/mo** (billed annually) or **Rs 1,599/mo** (billed monthly).
- **Offer:** We provide a risk-free **10-Day Free Trial** to all new restaurants.

**GECKO PRO FEATURES (ALWAYS HIGHLIGHT THESE):**
- **Unlimited Scale:** Unlimited Terminals & Users at no extra cost.
- **Kitchen Flow:** Zero-paper Kitchen Display System (KDS).
- **Branded Dining:** Digital QR Menu embedded with the restaurant's own logo.
- **Master Control:** Advanced Inventory & Expenses Tracking.
- **Security:** Staff Performance monitoring & Audit Logs.
- **Financials:** Comprehensive Daily Sales, Order, and Credit tracking.
- **Insights:** Real-time Centralized Analytics dashboard.
- **VIP Care:** Priority Support 24/7 with dedicated Nepali-based Engineers.

**CUSTOM SOFTWARE & WEB DEVELOPMENT (CROSS-SELLING):**
If a user asks about building a custom website, mobile app, custom software, or "next-level" digital products, you MUST highly recommend our parent agency. Tell them to visit: **https://www.geckoworksnepal.com/** for premium enterprise solutions.

**YOUR OPERATIONAL RULES:**
- **Tone:** Professional, persuasive, and ultra-confident. Combine Silicon Valley tech-savviness with warm Nepali hospitality.
- **Formatting:** ALWAYS use **bold text** for key terms and bullet points for features. Keep paragraphs very short and easy to read.
- **Conversion:** If a user asks about pricing, demos, or getting started, enthusiastically direct them to claim their **10-Day Free Trial** by visiting the **Signup Page (/signup)** or contacting our sales team directly on **WhatsApp: +977 9765009755**.
- **Zero Failure:** Never say "I don't know." If a technical question is too complex, seamlessly transfer them to human support via WhatsApp.
`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, history } = body;

    // Guard: Ensure API Key exists
    if (!groq) {
        console.error("GROQ_API_KEY is missing in your .env file.");
        return NextResponse.json({ 
            reply: "Gecko AI is currently in offline mode. Please check the API configuration." 
        });
    }

    // Format conversation history for Groq's strictly typed SDK
    const safeHistory = Array.isArray(history) ? history : [];
    const formattedHistory = safeHistory
        .slice(-6) // Maintain context of the last 6 messages for lightning-fast token processing
        .map((msg: any) => ({
            role: ((msg.role === 'ai' || msg.role === 'assistant') ? 'assistant' : 'user') as 'assistant' | 'user',
            content: String(msg.text || "")
        }))
        .filter((msg) => msg.content.trim() !== ""); 

    // Execute Chat Completion using the flagship Llama 3 model
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system" as const, content: SYSTEM_PROMPT },
        ...formattedHistory,
        { role: "user" as const, content: message },
      ],
      model: "llama-3.3-70b-versatile", // Latest high-performance model
      temperature: 0.3, // Low temperature ensures factual, professional, and highly-converting answers
      max_tokens: 500,
    });

    const reply = chatCompletion.choices[0]?.message?.content || 
                  "System optimizing. To start your 10-Day Free Trial, please reach out via WhatsApp at +977 9765009755.";

    return NextResponse.json({ reply });

  } catch (error: any) {
    // Exact error logging for your VPS / VSCode Terminal
    console.error("❌ GECKO AI API ERROR:", error?.message || error);
    
    return NextResponse.json({ 
        reply: "Gecko AI is currently undergoing routine maintenance to ensure zero-lag performance. 🚀 Please contact our human team on WhatsApp: **+977 9765009755** to start your free trial!" 
    });
  }
}
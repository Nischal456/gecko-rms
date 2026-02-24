import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";

// Initialize Groq safely
const groq = process.env.GROQ_API_KEY 
  ? new Groq({ apiKey: process.env.GROQ_API_KEY }) 
  : null;

const SYSTEM_PROMPT = `
You are Gecko AI, the elite virtual assistant for GeckoRMS, a premium Restaurant Management System.

**COMPANY INFO:**
- **Developer:** Gecko Works Nepal, a top-tier software company based in Kathmandu.
- **Product:** GeckoRMS - The fastest, cloud-based POS system with zero lag, smart offline caching, and instant Kitchen Display Sync (KDS).

**PRICING PLANS:**
1. **Starter Plan:** Perfect for small cafes and cloud kitchens. Basic inventory, digital QR menu, single terminal.
2. **Standard Plan:** Ideal for high-volume restaurants. Includes Kitchen Display System (KDS), multi-terminal sync, and advanced inventory.
3. **Business Plan:** For multi-location chains. Centralized analytics, unlimited outlets, VIP support, and custom APIs.

**YOUR GOAL & TONE:**
- Tone: Professional, ultra-fast, helpful, and welcoming (Silicon Valley meets Nepali hospitality).
- Keep responses short and scannable (use bullet points if listing features or plans).
- If they ask for specific prices, demo, or want to buy: Direct them to our WhatsApp VIP line: +977 9765009755.

**RULES:**
- NEVER say "I don't know". Say "I can have a human engineer explain that. Reach out on WhatsApp: +977 9765009755".
- Don't output massive paragraphs. Be concise.
`;

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    if (!groq) {
        // Fallback if API key is missing
        await new Promise(r => setTimeout(r, 800)); 
        return NextResponse.json({ 
            reply: "I am currently running in offline simulation mode. GeckoRMS offers Starter, Standard, and Business plans. For live pricing or a demo, please WhatsApp our team at **+977 9765009755**!" 
        });
    }

    // CRITICAL FIX: Groq expects 'assistant' instead of 'ai', and 'content' instead of 'text'
    const formattedHistory = history.slice(-4).map((msg: any) => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.text
    }));

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...formattedHistory,
        { role: "user", content: message },
      ],
      model: "llama3-8b-8192", // Extremely fast and capable model
      temperature: 0.6,
      max_tokens: 250,
    });

    const reply = chatCompletion.choices[0]?.message?.content || "System busy. Please WhatsApp us.";

    return NextResponse.json({ reply });

  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({ 
        reply: "My servers are optimizing. 🚀 Please message us directly on WhatsApp: +977 9765009755 for immediate help." 
    });
  }
}
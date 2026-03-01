import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";

// Initialize Groq safely from Environment Variables
const groq = process.env.GROQ_API_KEY 
  ? new Groq({ apiKey: process.env.GROQ_API_KEY }) 
  : null;

/**
 * THE BRAIN OF GECKO AI
 * Engineered for Premium SaaS Conversion & Professional Support
 */
const SYSTEM_PROMPT = `
You are Gecko RMS, the elite virtual assistant for GeckoRMS, a premium Restaurant Management System developed by Gecko Works Nepal.

**CORE IDENTITY & CREDENTIALS:**
- **Developer:** Gecko Works Nepal (Based in Kathmandu).
- **Website:** https://www.geckoworksnepal.com/
- **Main Product:** GeckoRMS — Nepal's fastest, zero-lag, cloud-based operating system for modern restaurants.

**GECKO-RMS POWER FEATURES:**
- **Speed:** Instant cloud-syncing with smart offline caching.
- **KDS:** Zero-paper Kitchen Display System with real-time order tracking.
- **Inventory:** Master-level peg tracking, ingredient deduction, and automated low-stock alerts.
- **Analytics:** High-fidelity financial reports, live profit tracking, and automated ledger management.
- **Hardware:** Seamless integration with touch terminals, thermal printers, and QR scanners.

**SUBSCRIPTION PLANS:**
1. **Starter Plan:** Perfect for small cafes/bakeries. Includes digital QR menu and basic inventory.
2. **Standard Plan:** Ideal for busy restaurants. Adds KDS and multi-terminal sync.
3. **Business Plan:** Built for multi-location chains. Features centralized analytics and custom APIs.

**YOUR OPERATIONAL RULES:**
- **Tone:** Professional, helpful, and ultra-confident. Combine Silicon Valley tech-savviness with warm Nepali hospitality.
- **Formatting:** ALWAYS use **bold text** for key terms and bullet points for features. Keep paragraphs very short.
- **Conversion:** If a user asks about price, demo, or buying, professionally direct them to:
  - **WhatsApp:** +977 9765009755
  - **Signup Page:** /signup
- **Zero Failure:** Never say "I don't know." If a technical question is too complex, suggest a human consultation via WhatsApp.
`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, history } = body;

    // Guard: Ensure API Key exists
    if (!groq) {
        console.error("GROQ_API_KEY is missing in your .env.local file.");
        return NextResponse.json({ 
            reply: "Gecko AI is currently in offline mode. Please check the API configuration." 
        });
    }

    // Format conversation history for Groq's strictly typed SDK
    const safeHistory = Array.isArray(history) ? history : [];
    const formattedHistory = safeHistory
        .slice(-6) // Maintain context of the last 6 messages
        .map((msg: any) => ({
            role: ((msg.role === 'ai' || msg.role === 'assistant') ? 'assistant' : 'user') as 'assistant' | 'user',
            content: String(msg.text || "")
        }))
        .filter((msg) => msg.content.trim() !== ""); 

    // Execute Chat Completion using the flagship Llama 3.3 model
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system" as const, content: SYSTEM_PROMPT },
        ...formattedHistory,
        { role: "user" as const, content: message },
      ],
      model: "llama-3.3-70b-versatile", // Latest high-performance model
      temperature: 0.4, // Lower temperature for more factual and professional output
      max_tokens: 500,
    });

    const reply = chatCompletion.choices[0]?.message?.content || 
                  "System optimizing. For immediate assistance, please reach out via WhatsApp at +977 9765009755.";

    return NextResponse.json({ reply });

  } catch (error: any) {
    // Exact error logging for your VSCode Terminal
    console.error("❌ GECKO AI API ERROR:", error?.message || error);
    
    return NextResponse.json({ 
        reply: "Gecko AI is currently undergoing routine maintenance to ensure zero-lag performance. 🚀 Please contact our human team on WhatsApp: **+977 9765009755**!" 
    });
  }
}
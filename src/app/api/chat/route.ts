import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";

// Initialize Groq safely from Environment Variables
const groq = process.env.GROQ_API_KEY 
  ? new Groq({ apiKey: process.env.GROQ_API_KEY }) 
  : null;

/**
 * THE BRAIN OF GECKO AI
 * Engineered for Ultra-Clean, Fast, Human-like Conversational Support
 */
const SYSTEM_PROMPT = `
You are Gecko AI, the official assistant for Gecko RMS — Nepal's fastest, zero-lag Restaurant Management System by Gecko Works Nepal.

CRITICAL FORMATTING RULES:
- NEVER output Markdown tables (| Plan | Price |).
- NEVER output HTML tags (like <br> or <div>).
- NEVER output Markdown headings (like #, ##, ###, ####).
- Keep ALL replies CONCISE, SHORT, and warm (2 to 4 sentences max).
- Use simple bullet points only if listing 2-3 key features.

KNOWLEDGE SUMMARY:
- All-in-One Pro Plan: Rs 1,499/month.
- Free Trial: 15-Day Risk-Free Trial available on /signup.
- Annual Plan: 3 Months Extra FREE (16 months total) + Rs 0 Security Deposit.
- Features: Unlimited terminals, KDS kitchen display, QR menus, inventory & live sales analytics.
- Support / Sales: WhatsApp at +977 9765009755 or email rms@geckoworksnepal.com.
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

    // Execute Chat Completion using Groq active model with fallback
    let chatCompletion;
    try {
      chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system" as const, content: SYSTEM_PROMPT },
          ...formattedHistory,
          { role: "user" as const, content: message },
        ],
        model: "openai/gpt-oss-120b",
        temperature: 0.3,
        max_tokens: 500,
      });
    } catch (modelErr: any) {
      console.warn("Groq primary model failed, falling back to openai/gpt-oss-20b:", modelErr?.message);
      chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system" as const, content: SYSTEM_PROMPT },
          ...formattedHistory,
          { role: "user" as const, content: message },
        ],
        model: "openai/gpt-oss-20b",
        temperature: 0.3,
        max_tokens: 500,
      });
    }

    const reply = chatCompletion.choices[0]?.message?.content || 
                  "System optimizing. To start your 15-Day Free Trial, please reach out via WhatsApp at +977 9765009755.";

    return NextResponse.json({ reply });

  } catch (error: any) {
    // Exact error logging for your VPS / VSCode Terminal
    console.error("❌ GECKO AI API ERROR:", error?.message || error);
    
    return NextResponse.json({ 
        reply: "Gecko AI is currently undergoing routine maintenance to ensure zero-lag performance. 🚀 Please contact our human team on WhatsApp: **+977 9765009755** to start your free trial!" 
    });
  }
}
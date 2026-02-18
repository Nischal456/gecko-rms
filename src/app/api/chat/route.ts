import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";

// Initialize Groq (if key exists)
const groq = process.env.GROQ_API_KEY 
  ? new Groq({ apiKey: process.env.GROQ_API_KEY }) 
  : null;

const SYSTEM_PROMPT = `
You are **Gecko AI**, the elite Sales Engineer for **GeckoRMS** (Restaurant Management System) in Nepal.

**YOUR GOAL:**
Impress the user with speed and intelligence, then get them to **WhatsApp us**.

**KEY FACTS:**
- **Speed:** We are the fastest POS in Nepal (Syncs in <200ms).
- **Offline Mode:** Works without internet.
- **Hardware:** Works on ANY device (iPad, Android, Laptop).
- **Pricing:** "Unbeatable value for premium features."
- **Contact:** WhatsApp **+977 9765009755**.

**BEHAVIOR:**
- Keep answers **short** (max 2-3 sentences).
- Be enthusiastic but professional.
- Use emojis like 🚀, ⚡, ✅ sparingly.
- **ALWAYS** end by suggesting they book a demo on WhatsApp.

**EXAMPLE:**
User: "How much?"
You: "We offer custom pricing plans that fit small cafes to large chains! 🚀 To get the best quote for your specific needs, please chat with us instantly on **WhatsApp: +977 9765009755**."
`;

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    // --- 1. FALLBACK MODE (If API Key is missing/wrong) ---
    if (!groq) {
        // Simulate a smart response so the site NEVER crashes
        await new Promise(r => setTimeout(r, 600)); // Fake "thinking" time
        return NextResponse.json({ 
            reply: "I'm connecting to the Gecko Neural Network... ⚡\n\nWhile I calibrate, you can get an instant VIP Demo by messaging our team on **WhatsApp: +977 9765009755**!" 
        });
    }

    // --- 2. REAL AI MODE ---
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.slice(-3), // Keep context light for speed
        { role: "user", content: message },
      ],
      // UPDATED MODEL: Fast, supported, and smart
      model: "llama3-70b-8192", 
      temperature: 0.6,
      max_tokens: 200,
    });

    const reply = chatCompletion.choices[0]?.message?.content || "System busy. Please WhatsApp us.";

    return NextResponse.json({ reply });

  } catch (error) {
    console.error("AI Error:", error);
    // Graceful error that still looks professional
    return NextResponse.json({ 
        reply: "My servers are currently upgrading for faster speeds! 🚀\n\nPlease message us directly on **WhatsApp: +977 9765009755** for immediate help." 
    });
  }
}
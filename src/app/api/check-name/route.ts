import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, skipCheck } = body;

    // If skip check is enabled, allow immediately
    if (skipCheck) {
      return NextResponse.json({ allowed: true });
    }

    // Step 1: Local validation
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { allowed: false, reason: "Name is required." },
        { status: 400 }
      );
    }

    const trimmed = name.trim();

    if (trimmed.length === 0) {
      return NextResponse.json({
        allowed: false,
        reason: "Name cannot be blank.",
      });
    }

    if (trimmed.length > 8) {
      return NextResponse.json({
        allowed: false,
        reason: "Name must be 8 characters or fewer.",
      });
    }

    // Step 2 & 3: OpenAI checks
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Step 2: Moderation API
      const moderation = await openai.moderations.create({
        input: trimmed,
      });

      const result = moderation.results[0];
      if (result && result.flagged) {
        return NextResponse.json({
          allowed: false,
          reason: "Name was flagged as inappropriate.",
        });
      }

      // Step 3: GPT-4o-mini check
      const chat = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              'You are a content moderator. Respond with only "yes" or "no".',
          },
          {
            role: "user",
            content: `Is this name appropriate for a family-friendly public event? The name is: "${trimmed}"`,
          },
        ],
        max_tokens: 3,
        temperature: 0,
      });

      const answer = chat.choices[0]?.message?.content?.trim().toLowerCase();

      if (answer === "no") {
        return NextResponse.json({
          allowed: false,
          reason: "Name is not appropriate for a family-friendly event.",
        });
      }

      return NextResponse.json({ allowed: true });
    } catch (apiError) {
      // If OpenAI API fails, allow the name through with a warning
      console.warn("OpenAI API error during name check, allowing name:", apiError);
      return NextResponse.json({
        allowed: true,
        warning: "Name check service unavailable, name allowed by default.",
      });
    }
  } catch (error) {
    console.error("Name check route error:", error);
    return NextResponse.json(
      { allowed: false, reason: "Internal server error." },
      { status: 500 }
    );
  }
}

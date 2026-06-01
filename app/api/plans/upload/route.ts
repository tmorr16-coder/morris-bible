import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const fileType = file.type;
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  // Build the message for Claude — handle PDF vs text/image
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let content: any[];

  if (fileType === "application/pdf") {
    content = [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      },
      {
        type: "text",
        text: `This is a Bible reading plan document. Please extract the day-by-day reading schedule from it.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "title": "Name of the plan",
  "description": "Brief description of the plan (1-2 sentences)",
  "duration_days": 365,
  "readings": [
    {
      "day": 1,
      "readings": ["Genesis 1", "Genesis 2"]
    },
    {
      "day": 2,
      "readings": ["Genesis 3", "Genesis 4"]
    }
  ]
}

Rules:
- Each reading entry should be in "Book Chapter" format (e.g. "John 3", "Psalms 23", "Genesis 1-2")
- If a day has a Psalm alongside another reading, include both
- Include ALL days from the plan — do not truncate
- If the document only shows part of the plan, extract what is visible
- duration_days should match the total number of days in the plan`,
      },
    ];
  } else if (fileType.startsWith("image/")) {
    content = [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: fileType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: base64,
        },
      },
      {
        type: "text",
        text: `This is an image of a Bible reading plan. Extract the day-by-day reading schedule.

Return ONLY valid JSON with this structure:
{
  "title": "Name of the plan",
  "description": "Brief description",
  "duration_days": 365,
  "readings": [
    { "day": 1, "readings": ["Genesis 1", "Genesis 2"] },
    { "day": 2, "readings": ["Genesis 3", "Genesis 4"] }
  ]
}

Use "Book Chapter" format for each reading (e.g. "John 3", "Psalms 23"). Include every day visible.`,
      },
    ];
  } else {
    // Plain text — decode and send directly
    const text = Buffer.from(bytes).toString("utf-8");
    content = [
      {
        type: "text",
        text: `Here is a Bible reading plan. Extract the day-by-day reading schedule.

PLAN CONTENT:
${text}

Return ONLY valid JSON with this structure:
{
  "title": "Name of the plan",
  "description": "Brief description",
  "duration_days": 365,
  "readings": [
    { "day": 1, "readings": ["Genesis 1", "Genesis 2"] },
    { "day": 2, "readings": ["Genesis 3", "Genesis 4"] }
  ]
}

Use "Book Chapter" format for each reading. Include every day.`,
      },
    ];
  }

  let planData: {
    title: string;
    description: string;
    duration_days: number;
    readings: { day: number; readings: string[] }[];
  };

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8192,
      messages: [{ role: "user", content }],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";
    // Strip any markdown code fences
    const jsonText = rawText.replace(/```json\n?|\n?```/g, "").trim();
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    planData = JSON.parse(jsonMatch[0]);
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to parse plan: ${err instanceof Error ? err.message : err}` },
      { status: 500 }
    );
  }

  // Save to bible.reading_plans
  const db = supabase;
  const { data: plan, error: dbErr } = await (db as any)
    .schema("bible")
    .from("reading_plans")
    .insert({
      user_id: user.id,
      title: planData.title ?? "Uploaded Reading Plan",
      description: planData.description ?? null,
      is_ai_generated: false,
      is_public: false,
      duration_days: planData.duration_days ?? planData.readings?.length ?? 365,
      readings: planData.readings ?? [],
    })
    .select("id")
    .single();

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  // Auto-enroll
  await (db as any).schema("bible").from("user_plans").upsert(
    { user_id: user.id, plan_id: plan.id },
    { onConflict: "user_id,plan_id" }
  );

  return NextResponse.json({
    planId: plan.id,
    title: planData.title,
    durationDays: planData.duration_days,
    daysExtracted: planData.readings?.length ?? 0,
  });
}

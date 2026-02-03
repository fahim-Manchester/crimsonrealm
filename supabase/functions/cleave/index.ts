import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAILY_AI_LIMIT = 10;

interface Entry {
  id: string;
  title?: string;
  name?: string;
  description?: string | null;
  category?: string | null;
  url?: string | null;
  status?: string | null;
  priority?: string | null;
  project_id?: string | null;
}

interface CleaveRequest {
  entries: Entry[];
  section: "resources" | "projects" | "tasks";
  numGroups?: number;
  luckyMode?: boolean;
  userId?: string;
}

async function checkUsageLimit(
  supabaseAdmin: any,
  userId: string
): Promise<{ allowed: boolean; count: number }> {
  // Get today's start (UTC midnight)
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  // Count requests for this user today
  const { count, error } = await supabaseAdmin
    .from("ai_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", todayStart.toISOString());

  if (error) {
    console.error("Usage check error:", error);
    // Allow on error to not block users due to tracking issues
    return { allowed: true, count: 0 };
  }

  const currentCount = count || 0;
  
  if (currentCount >= DAILY_AI_LIMIT) {
    return { allowed: false, count: currentCount };
  }

  return { allowed: true, count: currentCount };
}

async function logUsage(
  supabaseAdmin: any,
  userId: string
): Promise<void> {
  const { error } = await supabaseAdmin.from("ai_usage").insert({
    user_id: userId,
    action_type: "cleave",
  });

  if (error) {
    console.error("Failed to log usage:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    // Authenticate user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("JWT verification failed:", claimsError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract verified user ID from JWT claims
    const userId = claimsData.claims.sub as string;
    if (!userId) {
      console.error("No user ID in JWT claims");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Authenticated user: ${userId}`);

    const { entries, section, numGroups, luckyMode } = await req.json() as CleaveRequest;

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({ error: "No entries to categorize" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client for usage tracking
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check usage limit with verified user ID
    const { allowed, count } = await checkUsageLimit(supabaseAdmin, userId);
    
    if (!allowed) {
      console.log(`User ${userId} exceeded daily limit: ${count}/${DAILY_AI_LIMIT}`);
      return new Response(
        JSON.stringify({
          error: `Daily AI limit reached (${DAILY_AI_LIMIT}/day). Resets at midnight UTC.`,
          code: "DAILY_LIMIT_EXCEEDED",
          count,
          limit: DAILY_AI_LIMIT,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build entry descriptions for the AI
    const entryDescriptions = entries.map((entry, idx) => {
      const name = entry.title || entry.name || "Untitled";
      const parts = [`${idx + 1}. "${name}"`];
      if (entry.description) parts.push(`Description: ${entry.description}`);
      if (entry.category) parts.push(`Category: ${entry.category}`);
      if (entry.url) parts.push(`URL: ${entry.url}`);
      if (entry.status) parts.push(`Status: ${entry.status}`);
      if (entry.priority) parts.push(`Priority: ${entry.priority}`);
      return parts.join(" | ");
    }).join("\n");

    const sectionName = section === "resources" ? "resources/chronicles" : 
                        section === "projects" ? "projects/territories" : "tasks";

    let groupInstruction = "";
    if (luckyMode) {
      groupInstruction = "Choose the optimal number of groups that makes the most sense for organization (between 2-6 groups).";
    } else if (numGroups) {
      groupInstruction = `Create exactly ${numGroups} groups.`;
    } else {
      groupInstruction = "Create between 2-5 groups based on natural clustering.";
    }

    const systemPrompt = `You are an expert organizer. Your job is to categorize ${sectionName} into logical groups based on their themes, purposes, or characteristics.

Rules:
- ${groupInstruction}
- Each group must have a short, descriptive name (2-4 words max)
- Every entry must be assigned to exactly one group
- Consider: names, descriptions, categories, URLs, and any patterns
- Return ONLY valid JSON with no additional text`;

    const userPrompt = `Categorize these ${entries.length} ${sectionName} into groups:

${entryDescriptions}

Return JSON in this exact format:
{
  "groups": [
    {
      "name": "Group Name",
      "entryIds": [1, 2, 3]
    }
  ]
}

The entryIds should be the numbers (1-indexed) from the list above.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Parse the JSON from AI response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Map the 1-indexed entry numbers back to actual entry IDs
    const groupsWithIds = parsed.groups.map((group: { name: string; entryIds: number[] }) => ({
      name: group.name,
      entryIds: group.entryIds.map((idx: number) => entries[idx - 1]?.id).filter(Boolean),
    }));

    // Log usage after successful AI call (userId is always verified now)
    await logUsage(supabaseAdmin, userId);

    return new Response(
      JSON.stringify({ groups: groupsWithIds }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Cleave error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

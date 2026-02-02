import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  numGroups?: number; // If not provided, AI decides
  luckyMode?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entries, section, numGroups, luckyMode } = await req.json() as CleaveRequest;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({ error: "No entries to categorize" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

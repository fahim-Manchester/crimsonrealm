import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, tasks, projects } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "generate_name") {
      systemPrompt = `You are a creative naming assistant for a gothic-themed productivity app called "Realm". 
Generate epic, dramatic campaign names that sound like quests from a dark fantasy game.
Keep names short (2-5 words), dramatic, and memorable.
Only respond with the campaign name, nothing else.`;

      const taskList = Array.isArray(tasks) ? tasks.join(", ") : "";
      const projectList = Array.isArray(projects) ? projects.join(", ") : "";
      
      userPrompt = `Generate an epic campaign name for a quest involving:
${taskList ? `Tasks: ${taskList}` : ""}
${projectList ? `Territories/Projects: ${projectList}` : ""}

Respond with ONLY the campaign name.`;
    } else if (action === "guess_difficulty") {
      systemPrompt = `You are an AI assistant for a gothic-themed productivity app.
Analyze tasks and projects to estimate difficulty and time requirements.
Consider task count, complexity implied by names, and project scope.
Respond with JSON only: { "difficulty": "trivial|easy|medium|hard|legendary", "planned_hours": number }`;

      const taskData = JSON.stringify(tasks || []);
      const projectData = JSON.stringify(projects || []);
      
      userPrompt = `Analyze this campaign and estimate difficulty:
Tasks: ${taskData}
Projects: ${projectData}

Consider:
- Number of items
- Implied complexity from names
- Priority levels if available

Respond with JSON: { "difficulty": "trivial|easy|medium|hard|legendary", "planned_hours": number }`;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Campaign AI action: ${action}`);

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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI gateway request failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    console.log(`AI response: ${content}`);

    if (action === "generate_name") {
      return new Response(
        JSON.stringify({ name: content }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "guess_difficulty") {
      try {
        // Try to parse JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return new Response(
            JSON.stringify(parsed),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError);
      }
      // Fallback
      return new Response(
        JSON.stringify({ difficulty: "medium", planned_hours: 2 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Campaign AI error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

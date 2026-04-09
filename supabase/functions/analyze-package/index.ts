import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Strip data URL prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${base64Data}` },
                },
                {
                  type: "text",
                  text: `Analyze this image of a toilet paper package and/or price tag. Extract:
1. Price (number in ILS/shekels) 
2. Total number of rolls (number)
3. Sheets per roll (number)
4. Company/brand name (string)
5. Product name (string)

If any value is not visible or cannot be determined, return null for that field.
Return ONLY valid JSON in this exact format:
{"price": number|null, "rolls": number|null, "sheetsPerRoll": number|null, "companyName": string|null, "productName": string|null}`,
                },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_package_data",
                description: "Extract toilet paper package data from image",
                parameters: {
                  type: "object",
                  properties: {
                    price: { type: ["number", "null"], description: "Price in ILS" },
                    rolls: { type: ["number", "null"], description: "Total number of rolls" },
                    sheetsPerRoll: { type: ["number", "null"], description: "Sheets per roll" },
                    companyName: { type: ["string", "null"], description: "Brand/company name" },
                    productName: { type: ["string", "null"], description: "Product name" },
                  },
                  required: ["price", "rolls", "sheetsPerRoll", "companyName", "productName"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "extract_package_data" } },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    let extracted;
    if (toolCall?.function?.arguments) {
      extracted = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try to parse from content
      const content = result.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        extracted = { price: null, rolls: null, sheetsPerRoll: null, companyName: null, productName: null };
      }
    }

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-package error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

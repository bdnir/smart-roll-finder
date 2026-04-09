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
                  text: `Analyze the image to identify the main product category (e.g., tuna cans, pasta, rice, etc.). Identify all variants of this product in the image. For each variant, extract its brand name, product name, unique characteristics (e.g., 'in olive oil' vs 'in water'), weight in grams, and price in ILS (from the shelf label or the product itself). Return the category and an array of variants.`,
                },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_comparison_data",
                description:
                  "Extract product comparison data from a shelf image",
                parameters: {
                  type: "object",
                  properties: {
                    category: {
                      type: ["string", "null"],
                      description: "The main product category",
                    },
                    variants: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          brandName: {
                            type: ["string", "null"],
                            description: "Brand name",
                          },
                          productName: {
                            type: ["string", "null"],
                            description: "Product name",
                          },
                          characteristics: {
                            type: ["string", "null"],
                            description:
                              "Unique characteristics like flavor, type",
                          },
                          weight: {
                            type: ["number", "null"],
                            description: "Weight in grams",
                          },
                          price: {
                            type: ["number", "null"],
                            description: "Price in ILS",
                          },
                        },
                        required: [
                          "brandName",
                          "productName",
                          "characteristics",
                          "weight",
                          "price",
                        ],
                      },
                    },
                  },
                  required: ["category", "variants"],
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_comparison_data" },
          },
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
      const content = result.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        extracted = { category: null, variants: [] };
      }
    }

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-comparison error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

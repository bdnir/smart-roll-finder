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
    const { image, device_id } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (device_id) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const quotaRes = await fetch(
          `${SUPABASE_URL}/rest/v1/rpc/check_scan_quota`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ p_device_id: device_id, p_limit: 10 }),
          }
        );
        if (quotaRes.ok) {
          const allowed = await quotaRes.json();
          if (!allowed) {
            return new Response(
              JSON.stringify({ error: "מצטערים, עקב עומס שימוש השירות אינו זמין כרגע. השירות יתחדש מחר.", code: "QUOTA_EXCEEDED" }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }
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
                  text: `Analyze this product package image. Extract these GENERIC fields for ANY product type (toilet paper, tuna, diapers, wipes, beverages, snacks, etc.):

1. price: total price in ILS (number)
2. unitCount: total quantity for unit-price calculation. Use the most meaningful unit:
   - Toilet paper: total rolls
   - Tuna/canned food: drained weight in grams (משקל מסונן)
   - Diapers/wipes: total count of items
   - Beverages: total ml or liters
   - Snacks/dry goods: total weight in g
3. unitType: one of: "rolls", "units", "g", "kg", "ml", "l", "pack"
4. companyName: brand
5. productName: product name
6. sheetsPerRoll: ONLY for toilet paper / paper towels. Number of sheets (דפים/פסים/מלבנים) per single roll. Null for non-paper products.

If the package shows a promo like "3 ב-20", set price=20 and unitCount = single_unit_count * 3.

IMPORTANT: If the image is too blurry/dark to read, return {"error": "BLURRY_IMAGE"}.
If a value isn't visible, return null for it. Return raw numbers (no thousands separators).`,
                },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_package_data",
                description: "Extract generic product package data from image",
                parameters: {
                  type: "object",
                  properties: {
                    price: { type: ["number", "null"], description: "Total price in ILS" },
                    unitCount: { type: ["number", "null"], description: "Total quantity in unitType" },
                    unitType: {
                      type: ["string", "null"],
                      enum: ["rolls", "units", "g", "kg", "ml", "l", "pack", null],
                      description: "Unit of measurement",
                    },
                    companyName: { type: ["string", "null"], description: "Brand/company name" },
                    productName: { type: ["string", "null"], description: "Product name" },
                    error: { type: ["string", "null"], description: "Error code, e.g. BLURRY_IMAGE" },
                  },
                  required: ["price", "unitCount", "unitType", "companyName", "productName"],
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
          JSON.stringify({ error: "מצטערים, עקב עומס שימוש השירות אינו זמין כרגע. השירות יתחדש מחר.", code: "QUOTA_EXCEEDED" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "מצטערים, עקב עומס שימוש השירות אינו זמין כרגע. השירות יתחדש מחר.", code: "CREDITS_EXHAUSTED" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    let extracted: Record<string, unknown>;
    if (toolCall?.function?.arguments) {
      extracted = JSON.parse(toolCall.function.arguments);
    } else {
      const content = result.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      extracted = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : { price: null, unitCount: null, unitType: null, companyName: null, productName: null };
    }

    if (extracted.error === "BLURRY_IMAGE") {
      return new Response(
        JSON.stringify({ error: "התמונה לא ברורה, נסה לצלם מקרוב יותר ובתאורה טובה", code: "BLURRY_IMAGE" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    delete extracted.error;

    // Normalize: convert kg→g and l→ml for consistent per-unit comparisons
    if (extracted.unitType === "kg" && typeof extracted.unitCount === "number") {
      extracted.unitCount = extracted.unitCount * 1000;
      extracted.unitType = "g";
    }
    if (extracted.unitType === "l" && typeof extracted.unitCount === "number") {
      extracted.unitCount = extracted.unitCount * 1000;
      extracted.unitType = "ml";
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

// Edge function: วิเคราะห์ผลสุขภาพจากค่า VOCs + อาการ + ประวัติเก่า
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "ไม่ได้เข้าสู่ระบบ" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { voc_values = {}, symptoms = "" } = await req.json();

    // ดึงประวัติเก่า 10 รายการล่าสุด
    const { data: history } = await supabase
      .from("health_records")
      .select("voc_values, symptoms, risk_level, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    const trendContext = (history ?? []).map((h, i) => {
      const d = new Date(h.created_at).toLocaleDateString("th-TH");
      return `(${i + 1}) ${d} • ระดับ ${h.risk_level} • VOCs: ${JSON.stringify(h.voc_values)} • อาการ: ${h.symptoms ?? "-"}`;
    }).join("\n");

    const systemPrompt = `คุณคือ "Onco-Voice Expert" ผู้เชี่ยวชาญด้านมะเร็งวิทยาทางเดินหายใจที่อธิบายเรื่องยากให้คนทั่วไปเข้าใจง่าย ใช้ภาษาไทยที่เป็นมิตร ไม่ใช้ศัพท์แพทย์ยาก

[เกณฑ์อ้างอิงจากงานวิจัย — ใช้เป็นเกณฑ์หลัก]
• ค่าปกติ (Baseline) สำหรับอากาศในอาคาร (ppb):
  - Benzene < 5, Toluene < 260, Formaldehyde < 80, Acetone < 1000
• ค่าเสี่ยง (Elevated) — สัมพันธ์กับเซลล์ผิดปกติในระบบทางเดินหายใจ:
  - Benzene > 10 ppb หรือ Formaldehyde > 100 ppb (IARC จัดเป็นสารก่อมะเร็งกลุ่ม 1)
  - Pentane, Toluene, Hexanal, Isoprene, 2-Butanone, 1-Propanol สูงผิดปกติ → biomarker ของมะเร็งปอด (Metabolites 2019; Cancer Pathogenesis 2025)
• ความสัมพันธ์กับพฤติกรรม:
  - บุหรี่/บุหรี่ไฟฟ้า → Benzene, Formaldehyde, 2-Butanone สูง
  - ทำงานในโรงงาน/ทาสี → Toluene สูง
  - บ้านในพื้นที่ภาคเหนือ/ระบายอากาศไม่ดี → ก๊าซเรดอนสูง (เพิ่มความเสี่ยงมะเร็งปอด 26-28% ในภาคเหนือไทย)
• อาการเตือน: ไอเรื้อรัง > 3 สัปดาห์, ไอเป็นเลือด, น้ำหนักลด, แน่นหน้าอก, หายใจไม่อิ่ม → ส่งสัญญาณเสี่ยง

[เกณฑ์การจัดระดับ]
- Low: ค่า VOCs ทั้งหมดอยู่ในเกณฑ์ baseline และไม่มีอาการชัดเจน
- Medium: VOC ใด ๆ เกินเกณฑ์เล็กน้อย หรือมีอาการที่น่าสนใจ 1-2 อย่าง
- High: VOC สำคัญ (Benzene/Formaldehyde) เกินเกณฑ์มาก หรือมีอาการเตือนหลายอย่างร่วมกัน

[การวิเคราะห์แนวโน้ม]
เปรียบเทียบค่าปัจจุบันกับประวัติย้อนหลัง — ถ้า VOC สำคัญลดลง = improving, เพิ่มขึ้น = worsening, ใกล้เคียง = stable, ไม่มีประวัติ = unknown

ตอบเป็น JSON เท่านั้นตามรูปแบบนี้ (ภาษาไทยทั้งหมด):
{
  "risk_level": "Low" | "Medium" | "High",
  "summary": "สรุปผลปัจจุบัน 2-4 ประโยค ภาษาชาวบ้าน",
  "explanation": "อธิบายว่าค่า VOCs แต่ละตัวและอาการหมายความว่าอย่างไร อ้างเกณฑ์ baseline/elevated",
  "recommendations": ["คำแนะนำสั้น ๆ ที่ทำได้จริง", "..."],
  "research_insight": "ความรู้จากงานวิจัย VOCs/มะเร็งปอดที่เกี่ยวข้องกับผลครั้งนี้ อธิบายเข้าใจง่าย",
  "trend": "เปรียบเทียบค่าปัจจุบันกับประวัติเก่า อธิบายว่าดีขึ้น/แย่ลงตรงไหน",
  "trend_direction": "improving" | "stable" | "worsening" | "unknown",
  "disclaimer": "ผลนี้เป็นเพียงการคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัยทางการแพทย์ หากมีอาการผิดปกติ ควรพบแพทย์เพื่อตรวจเพิ่มเติม"
}`;

    const userPrompt = `ค่า VOCs ที่วัดได้ตอนนี้ (ppb): ${JSON.stringify(voc_values)}
อาการที่ผู้ใช้แจ้ง: ${symptoms || "ไม่มี"}

ประวัติการตรวจที่ผ่านมา:
${trendContext || "ยังไม่มีประวัติ"}

โปรดวิเคราะห์และตอบเป็น JSON ตามรูปแบบที่กำหนด`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "ใช้งานเกินจำกัด กรุณาลองใหม่อีกครั้ง" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "เครดิต AI หมด กรุณาเติมเครดิต" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "เรียก AI ไม่สำเร็จ" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiJson = await aiResp.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(content); } catch { parsed = { risk_level: "Low", summary: content }; }

    const risk_level = ["Low", "Medium", "High"].includes(parsed.risk_level) ? parsed.risk_level : "Low";

    const { data: inserted, error: insertErr } = await supabase
      .from("health_records")
      .insert({
        user_id: user.id,
        voc_values,
        symptoms,
        ai_analysis: JSON.stringify(parsed),
        risk_level,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("insert err", insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ record: inserted, analysis: parsed, history: history ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiskGauge } from "@/components/RiskGauge";
import { recommendationsFor, riskLevel, riskLevelLabel } from "@/lib/risk";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, ArrowLeft, RefreshCcw, Loader2, Activity, Radio } from "lucide-react";
import { SpeakButton } from "@/components/SpeakButton";
import { SpeakableText } from "@/components/SpeakableText";

const SMOKING_LABEL: Record<string, string> = {
  never: "ไม่เคยสูบ", former: "เคยสูบ", current: "สูบอยู่",
};
const QUIT_LABEL: Record<string, string> = {
  lt1: "<1 ปี", "1-5": "1–5 ปี", "5-10": "5–10 ปี", gt10: ">10 ปี",
};
const HAZARD_LABEL: Record<string, string> = {
  mining: "เหมืองแร่", construction: "ก่อสร้าง", industrial: "โรงงาน",
  metals: "นิกเกิล/โครเมียม", asbestos: "แร่ใยหิน",
  pm25: "PM2.5 สูง", ventilation: "อากาศไม่ถ่ายเท", secondhand: "ควันมือสอง",
  radon: "ก๊าซเรดอน", northern: "ภาคเหนือฤดูหมอกควัน",
  tb: "วัณโรค", emphysema: "ถุงลมโป่งพอง", copd: "COPD", fibrosis: "พังผืดที่ปอด",
  silicosis: "Silicosis", sarcoidosis: "Sarcoidosis",
};

const Result = () => {
  const { id } = useParams();
  const [row, setRow] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from("assessments").select("*").eq("id", id).maybeSingle()
      .then(({ data }) => setRow(data));
  }, [id]);

  if (!row) return <AppShell><div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AppShell>;

  const total = row.score as number;
  const staticScore = (row.static_score as number) ?? total;
  const dynamicScore = (row.dynamic_score as number) ?? 0;
  const level = riskLevel(total);
  const b = row.behavior_data ?? {};
  const env = row.environment_data ?? {};
  const rec = recommendationsFor(total, b.smokingStatus);
  const breakdown: { label: string; points: number }[] = env.breakdown ?? [];

  const factor = (vals?: string[]) =>
    (vals ?? []).map((v) => HAZARD_LABEL[v] ?? v).join(", ") || "—";

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto animate-fade-up">
        <Link to="/history" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> กลับไปหน้าประวัติ
        </Link>

        <div className="mt-4 p-4 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 flex items-start gap-3">
          <span className="text-2xl shrink-0" aria-hidden>⚠️</span>
          <div className="flex-1">
            <p className="text-sm sm:text-base font-medium leading-relaxed">
              ผลนี้เป็นเพียง <strong>การคัดกรองเบื้องต้น</strong> ไม่ใช่การวินิจฉัยทางการแพทย์
              หากต้องการประเมินอย่างละเอียด <strong>กรุณาปรึกษาแพทย์ผู้เชี่ยวชาญ</strong>
            </p>
          </div>
          <SpeakButton
            size="icon"
            variant="ghost"
            label="ฟังคำเตือน"
            text="ผลนี้เป็นเพียงการคัดกรองเบื้องต้น. ไม่ใช่การวินิจฉัยทางการแพทย์. หากต้องการประเมินอย่างละเอียด, กรุณาปรึกษาแพทย์ผู้เชี่ยวชาญ."
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          <Card className="p-8 gradient-card border-border/50 shadow-elegant flex flex-col items-center justify-center">
            <RiskGauge score={total} />
            <div className="mt-6 grid grid-cols-2 gap-4 w-full text-center">
              <div className="p-3 rounded-lg bg-secondary/60">
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Activity className="h-3 w-3" /> Static</div>
                <div className="font-display font-bold text-2xl tabular-nums">{staticScore}</div>
              </div>
              <div className="p-3 rounded-lg bg-secondary/60">
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Radio className="h-3 w-3" /> Dynamic</div>
                <div className="font-display font-bold text-2xl tabular-nums">{dynamicScore}</div>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              ประเมินเมื่อ {new Date(row.created_at).toLocaleDateString("th-TH")}
            </p>
          </Card>

          <Card className={`p-8 border-0 text-white shadow-elegant ${
            level === "Low" ? "gradient-low" : level === "Medium" ? "gradient-moderate" : "gradient-high"
          }`}>
            <SpeakableText
              hint
              className="block"
              text={`ระดับความเสี่ยงมะเร็งปอด ${riskLevelLabel(level)}. ผลการวิเคราะห์: ${rec.headline}. คำแนะนำ: ${rec.items.join(". ")}`}
            >
              <div className="text-xs uppercase tracking-widest opacity-80">ระดับความเสี่ยงมะเร็งปอด</div>
              <h2 className="font-display text-3xl font-bold mt-1">{riskLevelLabel(level)}</h2>
              <p className="mt-3 text-white/90 text-balance">{rec.headline}</p>
              <div className="mt-6">
                <div className="text-xs uppercase tracking-widest opacity-80 mb-3">คำแนะนำ (คลิกเพื่อฟัง)</div>
                <div className="space-y-3">
                  {rec.items.map((it) => (
                    <div key={it} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
                      <p className="text-sm text-white/95">{it}</p>
                    </div>
                  ))}
                </div>
              </div>
            </SpeakableText>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <Card className="p-6 gradient-card border-border/50 shadow-soft">
            <h3 className="font-display font-bold text-lg">สรุปข้อมูลที่ประเมิน</h3>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">อายุ / เพศ</dt>
                <dd className="font-medium">{b.age} ปี / {b.gender === "male" ? "ชาย" : "หญิง"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">การสูบบุหรี่</dt>
                <dd className="font-medium">
                  {SMOKING_LABEL[b.smokingStatus] ?? "—"}
                  {b.smokingStatus === "former" && b.timeSinceQuitting && ` · เลิก ${QUIT_LABEL[b.timeSinceQuitting]}`}
                </dd>
              </div>
              {(b.smokingStatus === "current" || b.smokingStatus === "former") && (
                <div className="col-span-2">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Pack-years</dt>
                  <dd className="font-mono font-semibold">{(env.packYears ?? 0).toFixed(1)}</dd>
                </div>
              )}
              <div className="col-span-2">
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">บุหรี่ไฟฟ้า / กัญชา</dt>
                <dd className="font-medium">
                  {b.eCigarettes ? "บุหรี่ไฟฟ้า" : ""}{b.eCigarettes && b.marijuana ? ", " : ""}{b.marijuana ? "กัญชา" : ""}
                  {!b.eCigarettes && !b.marijuana && "ไม่มี"}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">อาชีพเสี่ยง</dt>
                <dd className="font-medium">{factor(b.occupationalHazards)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">สิ่งแวดล้อมเสี่ยง</dt>
                <dd className="font-medium">{factor(b.environmentalHazards)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">ประวัติโรคปอด</dt>
                <dd className="font-medium">{factor(b.lungDiseases)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">ประวัติครอบครัว</dt>
                <dd className="font-medium">{b.familyHistory ? "มีญาติเป็นมะเร็งปอด <65 ปี" : "ไม่มี"}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-6 gradient-card border-border/50 shadow-soft">
            <h3 className="font-display font-bold text-lg">รายละเอียดคะแนน (Static)</h3>
            {breakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-3">ไม่มีปัจจัยเสี่ยงเด่น</p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm">
                {breakdown.map((b) => (
                  <li key={b.label} className="flex items-center justify-between gap-3 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <span>{b.label}</span>
                    <span className="font-mono font-semibold">+{b.points}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground mt-4">
              Dynamic Score (จาก raw sensor: VOCs, gas concentration) จะถูกเพิ่มเมื่อมีการเชื่อมต่ออุปกรณ์
            </p>
          </Card>
        </div>

        {(() => {
          const insights = [
            "บุหรี่และบุหรี่ไฟฟ้าเป็นปัจจัยเสี่ยงอันดับ 1 — พบในผู้ป่วยมะเร็งปอด 80–90%",
            "กัญชามีสารก่อมะเร็งมากกว่าบุหรี่ประมาณ 2 เท่า — ยิ่งสูบยิ่งเสี่ยง",
            "ฝุ่น PM2.5 และก๊าซเรดอนทำให้ปอดอักเสบเรื้อรัง สะสมเป็นมะเร็งระยะยาว",
            "แร่ใยหิน (Asbestos) เพิ่มความเสี่ยง 5 เท่า และสูงถึง 90 เท่าหากสูบบุหรี่ร่วมด้วย",
            "หากมีอาการ ไอเรื้อรังเกิน 3 สัปดาห์ ไอเป็นเลือด เสียงแหบ น้ำหนักลด — ควรพบแพทย์ทันที",
          ];
          const speakText = "คำแนะนำจากงานวิจัย. " + insights.join(". ") + ".";
          return (
            <Card className="mt-6 p-6 gradient-card border-border/50 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display font-bold text-lg">คำแนะนำจากงานวิจัย</h3>
                <SpeakButton size="sm" variant="outline" label="ฟังคำแนะนำ" text={speakText} />
              </div>
              <ul className="mt-4 space-y-3">
                {insights.map((it, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm sm:text-base leading-relaxed">
                    <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })()}

        <div className="mt-8 flex justify-center">
          <Link to="/assessment">
            <Button className="gradient-hero text-white border-0 shadow-glow h-11 px-6">
              <RefreshCcw className="h-4 w-4 mr-2" /> ประเมินอีกครั้ง
            </Button>
          </Link>
        </div>

        <Card className="mt-6 p-5 border-border/50 bg-secondary/40">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">อ้างอิงทางวิชาการ</div>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            น้ำหนักความเสี่ยงในระบบอ้างอิงจาก: Enguthaiwat N. <em>Lung Cancer Landscape in Thailand: Unraveling Trends, Risks, and Urgent Interventions for Thai Teenagers.</em>
            International Journal of Scientific Research and Engineering Development, Vol. 7 Issue 2, Mar–Apr 2024.
            ปัจจัยหลัก ได้แก่ การสูบบุหรี่ (80–90% ของผู้ป่วย), กัญชา, บุหรี่ไฟฟ้า, แร่ใยหิน, ก๊าซเรดอน, โรคปอดเรื้อรัง, ประวัติครอบครัว, และ PM2.5
          </p>
        </Card>
      </div>
    </AppShell>
  );
};

export default Result;
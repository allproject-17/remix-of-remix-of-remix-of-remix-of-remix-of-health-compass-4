import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiskGauge } from "@/components/RiskGauge";
import { RESEARCH_DOCUMENTS } from "@/lib/research";
import { recommendationsFor, riskLevel, riskLevelLabel } from "@/lib/risk";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, ArrowLeft, Loader2, Activity, Radio, RefreshCcw } from "lucide-react";
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
  const [aiData, setAiData] = useState<{ aiSummary: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from("assessments").select("*").eq("id", id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setRow(data);
          return;
        }
        const stored = localStorage.getItem("assessment_snapshots");
        if (!stored) return;
        try {
          const parsed = JSON.parse(stored) as Record<string, any>;
          if (parsed[id]) setRow(parsed[id]);
        } catch {
          // ignore malformed storage
        }
      });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const stored = localStorage.getItem("assessment_ai_results");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as Record<string, { aiSummary: string }>;
      if (parsed[id]) setAiData(parsed[id]);
    } catch {
      // ignore malformed storage
    }
  }, [id]);

  if (!row) return <AppShell><div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AppShell>;

  const total = (row.score as number) ?? 0;
  const integratedLevel = riskLevel(total);
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

        <div className="grid gap-6 mt-4">
          <Card className="p-8 gradient-card border-border/50 shadow-elegant">
            <div className="flex flex-col items-center text-center gap-4">
              <RiskGauge score={total} />
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">คะแนนรวมความเสี่ยง</div>
                <div className="text-5xl font-display font-bold tabular-nums">{total}</div>
                <div className="text-sm text-muted-foreground">คะแนนเดียวจากแบบสอบถามและเซ็นเซอร์ทั้งหมด</div>
              </div>
            </div>
            <div className="mt-8">
              <div className="relative h-4 overflow-hidden rounded-full bg-slate-200">
                <div className="absolute inset-y-0 left-0 w-[35%] bg-emerald-300" />
                <div className="absolute inset-y-0 left-[35%] w-[30%] bg-amber-300" />
                <div className="absolute inset-y-0 left-[65%] right-0 bg-red-300" />
                <div
                  className="absolute top-[-8px] h-5 w-5 rounded-full border-2 border-white bg-slate-900 shadow-lg"
                  style={{ left: `calc(${Math.min(100, total)}% - 10px)` }}
                />
              </div>
              <div className="mt-3 flex justify-between text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                <span className="text-emerald-700">ต่ำ</span>
                <span className="text-amber-700">ปานกลาง</span>
                <span className="text-red-700">สูง</span>
              </div>
            </div>
            <div className="mt-6 text-left">
              <div className="text-sm font-semibold text-foreground">{riskLevelLabel(integratedLevel)}</div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                {row.raw_sensor_data?.sensors ? (
                  (() => {
                    const abnormal = Object.entries(row.raw_sensor_data.sensors as Record<string, number>)
                      .filter(([, value]) => value > 4000)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3)
                      .map(([key]) => key);
                    const sensorPart = abnormal.length > 0
                      ? `ระบบพบค่าเซ็นเซอร์ ${abnormal.join(", ")} สูงผิดปกติ` 
                      : `ค่าจากเซ็นเซอร์ยังอยู่ในช่วงปกติหรือกลาง`;
                    const smokingPart = b.smokingStatus === "current"
                      ? "และยังมีประวัติสูบบุหรี่/บุหรี่ไฟฟ้าอยู่"
                      : b.smokingStatus === "former"
                      ? "และเคยสูบบุหรี่มาก่อน"
                      : "และไม่มีประวัติสูบบุหรี่";
                    return `คะแนนรวมของคุณอยู่ที่ ${total} จาก 100. ${sensorPart} ${smokingPart}. หากคุณมีอาการไอเรื้อรัง, ไอเป็นเลือด หรือเหนื่อยง่าย ควรไปพบแพทย์ทันที.`;
                  })()
                ) : (
                  `คะแนนรวมของคุณอยู่ที่ ${total} จาก 100. ระบบใช้ข้อมูลแบบสอบถามเป็นหลัก ควรปรึกษาแพทย์เพื่อการตรวจที่ละเอียดขึ้น.`
                )}
              </p>
            </div>
          </Card>

          <Card className={`p-8 border-0 text-white shadow-elegant ${
            integratedLevel === "Low" ? "gradient-low" : integratedLevel === "Medium" ? "gradient-moderate" : "gradient-high"
          }`}>
            <SpeakableText
              hint
              className="block"
              text={`ระดับความเสี่ยงมะเร็งปอด ${riskLevelLabel(integratedLevel)}. ผลการวิเคราะห์: ${rec.headline}. คำแนะนำ: ${rec.items.join(". ")}`}
            >
              <div className="text-xs uppercase tracking-widest opacity-80">ระดับความเสี่ยงมะเร็งปอด</div>
              <h2 className="font-display text-3xl font-bold mt-1">{riskLevelLabel(integratedLevel)}</h2>
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
            <h3 className="font-display font-bold text-lg">เหตุผลของคะแนนรวม</h3>
            <p className="mt-3 text-sm leading-relaxed text-foreground/90">
              คะแนนรวมนี้คำนวณจากพฤติกรรมตัวคุณและการอ่านค่าจากเซ็นเซอร์ หากมีค่าเซ็นเซอร์สูงผิดปกติ ร่างกายจะต้องได้รับการตรวจเพิ่มเติม.
            </p>
            <div className="mt-4 space-y-3">
              {breakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">ไม่มีปัจจัยเสี่ยงเด่นจากแบบสอบถาม</p>
              ) : (
                breakdown.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 border-b border-border/50 pb-2">
                    <span className="text-sm">{item.label}</span>
                    <span className="font-mono font-semibold">+{item.points}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <Card className="mt-6 p-6 border-border/50 bg-secondary/40">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">อ้างอิงจากงานวิจัย 8 เรื่อง</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {RESEARCH_DOCUMENTS.map((doc) => (
              <div key={doc.id} className="rounded-xl bg-white p-3 border border-border">
                <p className="text-sm font-semibold">{doc.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{doc.tags.join(", ")}</p>
              </div>
            ))}
          </div>
        </Card>

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
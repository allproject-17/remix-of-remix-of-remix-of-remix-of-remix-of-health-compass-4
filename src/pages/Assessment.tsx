import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, Loader2, Cigarette, Stethoscope, Factory, User2,
} from "lucide-react";
import {
  LungAssessmentInput, OCCUPATIONAL_HAZARDS, ENVIRONMENTAL_HAZARDS,
  LUNG_DISEASES, QUIT_WINDOWS, calculateStaticRisk, totalRisk, riskLevel, riskLevelLabel,
  EMPTY_SENSOR_DATA, calculateDynamicRisk,
} from "@/lib/risk";
import { SENSORS, randomizeSensors } from "@/lib/sensors";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SpeakButton } from "@/components/SpeakButton";

const LabelRow = ({ children, speak }: { children: import("react").ReactNode; speak: string }) => (
  <div className="flex items-center gap-2">
    <Label className="text-base font-semibold">{children}</Label>
    <SpeakButton text={speak} size="icon" variant="ghost" label="ฟัง" />
  </div>
);

const getSensorLevel = (value: number) => {
  if (value >= 4500) return "high";
  if (value >= 3000) return "moderate";
  return "low";
};

const getSensorBackground = (level: "low" | "moderate" | "high") => {
  if (level === "high") return "bg-rose-100/90 border-rose-200";
  if (level === "moderate") return "bg-amber-100/90 border-amber-200";
  return "bg-emerald-100/90 border-emerald-200";
};

const initial: LungAssessmentInput = {
  age: 40,
  gender: "male",
  smokingStatus: "never",
  cigarettesPerDay: 0, yearsSmoked: 0, timeSinceQuitting: "lt1",
  eCigarettes: false, marijuana: false,
  occupationalHazards: [], environmentalHazards: [],
  lungDiseases: [], familyHistory: false,
};

const STEPS = [
  { n: 1, title: "ข้อมูลพื้นฐาน", icon: User2 },
  { n: 2, title: "การใช้สารเสพติด", icon: Cigarette },
  { n: 3, title: "สิ่งแวดล้อม & อาชีพ", icon: Factory },
  { n: 4, title: "ประวัติการแพทย์", icon: Stethoscope },
];

type Phase = "aiIntro" | "aiLoading" | "questionnaire";

type AiResult = {
  aiScore: number;
  aiSummary: string;
};

function MultiCheckGrid({
  options, values, onToggle,
}: {
  options: readonly { v: string; l: string }[];
  values: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="grid gap-2">
      {options.map((o) => {
        const checked = values.includes(o.v);
        return (
          <Label key={o.v}
            className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-smooth ${
              checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
            }`}>
            <Checkbox checked={checked} onCheckedChange={() => onToggle(o.v)} className="mt-0.5" />
            <span className="text-base font-medium leading-relaxed flex-1">{o.l}</span>
            <SpeakButton text={o.l} size="icon" variant="ghost" label="ฟัง" />
          </Label>
        );
      })}
    </div>
  );
}

const Assessment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("aiIntro");
  const [mockAi, setMockAi] = useState<AiResult | null>(null);
  const [wizardPage, setWizardPage] = useState(1);
  const [step, setStep] = useState(1);
  const [d, setD] = useState<LungAssessmentInput>(initial);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof LungAssessmentInput>(k: K, v: LungAssessmentInput[K]) =>
    setD((p) => ({ ...p, [k]: v }));
  const toggleIn = (k: "occupationalHazards" | "environmentalHazards" | "lungDiseases", v: string) =>
    setD((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }));

  const { score: staticScore, packYears, breakdown } = useMemo(() => calculateStaticRisk(d), [d]);
  const [sensorData, setSensorData] = useState<Record<string, number> | null>(null);
  const [dynamicScore, setDynamicScore] = useState(0);
  const [analysisTimestamp, setAnalysisTimestamp] = useState<string>("");
  const total = totalRisk(staticScore, dynamicScore);
  const level = riskLevel(total);

  const stepValid = (() => {
    if (step === 1) return d.age >= 1 && d.age <= 120 && (d.gender === "male" || d.gender === "female");
    return true;
  })();

  const randomizeVOCs = () => {
    setPhase("aiLoading");
    setTimeout(() => {
      const aiScore = Math.round(20 + Math.random() * 60);
      const aiSummary = aiScore <= 35
        ? "AI วิเคราะห์เบื้องต้นพบความเสี่ยงต่ำ"
        : aiScore <= 65
        ? "AI วิเคราะห์เบื้องต้นพบความเสี่ยงปานกลาง"
        : "AI วิเคราะห์เบื้องต้นพบความเสี่ยงสูง";
      const mode = aiScore > 45 ? "high" : "healthy";
      const s = randomizeSensors(mode);
      setSensorData(s);
      const dyn = calculateDynamicRisk(s, keySensorIds, d.environmentalHazards, d.smokingStatus);
      setDynamicScore(dyn);
      setMockAi({ aiScore, aiSummary });
      setAnalysisTimestamp(new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }));
      setPhase("questionnaire");
    }, 1700);
  };

  const save = async () => {
    if (!user) return;
    if (!mockAi) {
      toast.error("กรุณาเริ่ม AI Analysis ก่อนส่งแบบประเมิน");
      return;
    }

    setSaving(true);
    await supabase.from("profiles").update({ age: d.age, gender: d.gender }).eq("user_id", user.id);
    const { data, error } = await supabase.from("assessments").insert({
      user_id: user.id,
      score: total,
      static_score: staticScore,
      dynamic_score: dynamicScore,
      status: level,
      behavior_data: d as any,
      environment_data: { breakdown, packYears } as any,
      raw_sensor_data: sensorData ? { sensors: sensorData, captured_at: new Date().toISOString() } : EMPTY_SENSOR_DATA,
    }).select("id").single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    const stored = JSON.parse(localStorage.getItem("assessment_ai_results") || "{}") as Record<string, AiResult>;
    stored[data.id] = mockAi;
    localStorage.setItem("assessment_ai_results", JSON.stringify(stored));

    toast.success("บันทึกผลการคัดกรองเรียบร้อย");
    navigate(`/result/${data.id}`);
  };

  const keySensorIds = SENSORS.filter((s) => s.isKey).map((s) => s.id);
  const TOP_VOCS = SENSORS;
  const analysisStatusText = phase === "aiLoading"
    ? "กำลังประมวลผล..."
    : analysisTimestamp
      ? `อัปเดตล่าสุด ${analysisTimestamp}`
      : "กรุณากดสุ่มค่าเพื่อเริ่มต้นจำลองระบบวิเคราะห์ลมหายใจ";

  const progress = (step / STEPS.length) * 100;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto animate-fade-up">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600/10 px-4 py-2 text-sm font-semibold text-indigo-950">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
              VitalGuard x Onco-Voice
            </div>
            <h1 className="mt-5 text-3xl md:text-4xl font-bold text-slate-950">การประเมินสุขภาพและวิเคราะห์ความเสี่ยงด้วย AI</h1>
            <p className="mt-3 text-slate-500 max-w-2xl mx-auto">ระบบจำลองตรวจวัดสารบ่งชี้ทางชีวภาพ (VOCs) ในลมหายใจ อ้างอิงตามฐานข้อมูลวิจัยโรคมะเร็งปอด</p>
          </div>

          <div className="grid grid-cols-1 gap-8 items-start">
            {wizardPage === 1 ? (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4 mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-3 h-3 bg-indigo-600 rounded-full" />
                      ส่วนที่ 1: การจำลองสัญญาณชีวภาพ (VOCs)
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5" id="update-time">{analysisStatusText}</p>
                  </div>
                  <Button onClick={randomizeVOCs} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm">
                    🚀 เริ่มสุ่มค่า AI Analysis
                  </Button>
                </div>

                {phase === "aiLoading" ? (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
                    <p className="mt-4 text-slate-600">กำลังจำลอง VOCs และจัดทำรายงาน AI...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" id="vocs-grid-container">
                    {sensorData ? TOP_VOCS.map((s) => {
                      const value = sensorData[s.id];
                      const level = getSensorLevel(value);
                      return (
                        <div key={s.id} className={`rounded-2xl border border-slate-200 p-2 ${level === "high" ? "bg-rose-50" : level === "moderate" ? "bg-amber-50" : "bg-emerald-50"} flex flex-col gap-2`}>
                          <span className="text-xs text-slate-600 font-medium leading-tight">{s.label}</span>
                          <span className="text-lg font-semibold text-slate-900">{value}</span>
                          <span className={`text-xs font-semibold ${level === "high" ? "text-rose-600" : level === "moderate" ? "text-amber-600" : "text-emerald-600"}`}>
                            {level}
                          </span>
                        </div>
                      );
                    }) : (
                    <div className="col-span-2 md:col-span-3 lg:col-span-6 text-center py-20 text-slate-400 text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      กดปุ่ม "เริ่มสุ่มค่า AI Analysis" ด้านบน เพื่อจำลองค่า 26 สารบ่งชี้ VOCs สำหรับการประเมินความเสี่ยงมะเร็งปอด
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 flex items-center justify-end">
                  <Button disabled={!mockAi} onClick={() => setWizardPage(2)} className="h-11 px-6 bg-indigo-600 text-white">
                    ถัดไป <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            ) : wizardPage === 2 ? (
              <div id="questionnaire-section" className="bg-slate-100 rounded-3xl p-6 border border-slate-200 transition-all duration-500 relative">
                <div className="mb-4">
                  <Button variant="ghost" onClick={() => setWizardPage(1)}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> ย้อนกลับไป VOCs
                  </Button>
                </div>
                {/* ปลดล็อกแบบสอบถามถาวร: ไม่มี overlay ล็อก */}

                <div className="relative">
                  <div className="flex items-start justify-between mb-6 gap-2">
                    <div className="flex items-center space-x-3">
                      <div className="bg-indigo-100 text-indigo-700 p-2.5 rounded-xl font-bold">📋</div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900">ส่วนที่ 2: แบบสอบถามความเสี่ยง</h2>
                        <p className="text-xs text-slate-400">พฤติกรรม ประวัติ และการรับมลพิษ</p>
                      </div>
                    </div>
                    <SpeakButton text="กรุณากดสุ่มค่า VOCs ทางด้านซ้ายเพื่อปลดล็อกแบบสอบถามและวิเคราะห์ความเสี่ยงต่อมะเร็งปอด." size="icon" variant="ghost" label="ฟังเสียงช่วยอ่าน" />
                  </div>

                  {phase === "questionnaire" && (
                    <>
                      <div className="mt-6 p-4 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 flex items-start gap-3">
                        <span className="text-2xl shrink-0">⚠️</span>
                        <div className="flex-1">
                          <p className="text-sm sm:text-base font-medium leading-relaxed">
                            ระบบนี้รวมการวิเคราะห์ AI จำลองกับแบบสอบถามสุขภาพ เพื่อให้มุมมองความเสี่ยงที่ครอบคลุมมากขึ้น
                          </p>
                        </div>
                      </div>

                      <div className="mt-6">
                        <Progress value={progress} className="h-2" />
                        <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                          {STEPS.map((s) => (
                            <div key={s.n} className={`flex items-center gap-1.5 ${s.n === step ? "text-primary font-semibold" : s.n < step ? "text-foreground" : "text-muted-foreground"}`}>
                              <s.icon className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">{s.title}</span>
                              <span className="sm:hidden">{s.n}/4</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Card className="mt-6 p-6 sm:p-8 gradient-card border-border/50 shadow-soft">
                        {step === 1 && (
                          <div className="space-y-6">
                            <h2 className="font-display text-xl font-bold">ข้อมูลพื้นฐาน</h2>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label htmlFor="age" className="text-base font-semibold">อายุ (ปี)</Label>
                                <SpeakButton size="icon" variant="ghost" label="ฟัง" text="กรุณากรอกอายุของคุณเป็นปี." />
                              </div>
                              <Input id="age" type="number" min={1} max={120} value={d.age}
                                onChange={(e) => set("age", Number(e.target.value))} className="h-12 text-base max-w-[180px]" />
                            </div>
                            <div className="space-y-2">
                              <LabelRow speak="กรุณาเลือกเพศของคุณ. ชาย หรือ หญิง.">เพศ</LabelRow>
                              <RadioGroup value={d.gender} onValueChange={(v) => set("gender", v as any)}
                                className="grid grid-cols-2 gap-2 max-w-md">
                                {[{ v: "male", l: "ชาย" }, { v: "female", l: "หญิง" }].map((o) => (
                                  <Label key={o.v} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-smooth ${
                                    d.gender === o.v ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                                  }`}>
                                    <RadioGroupItem value={o.v} />
                                    <span className="text-sm font-medium">{o.l}</span>
                                  </Label>
                                ))}
                              </RadioGroup>
                            </div>
                          </div>
                        )}

                        {step === 2 && (
                          <div className="space-y-6">
                            <h2 className="font-display text-xl font-bold">การใช้สารเสพติด</h2>
                            <div className="space-y-2">
                              <LabelRow speak="คุณสูบบุหรี่หรือไม่. ไม่เคยสูบ, เคยสูบแล้วเลิก, หรือสูบอยู่ในปัจจุบัน.">สถานะการสูบบุหรี่</LabelRow>
                              <RadioGroup value={d.smokingStatus} onValueChange={(v) => set("smokingStatus", v as any)}
                                className="grid sm:grid-cols-3 gap-2">
                                {[
                                  { v: "never", l: "ไม่เคยสูบ" },
                                  { v: "former", l: "เคยสูบ (เลิกแล้ว)" },
                                  { v: "current", l: "สูบอยู่ในปัจจุบัน" },
                                ].map((o) => (
                                  <Label key={o.v} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-smooth ${
                                    d.smokingStatus === o.v ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                                  }`}>
                                    <RadioGroupItem value={o.v} />
                                    <span className="text-sm font-medium">{o.l}</span>
                                  </Label>
                                ))}
                              </RadioGroup>
                            </div>

                            {(d.smokingStatus === "current" || d.smokingStatus === "former") && (
                              <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="cpd">จำนวนมวนต่อวัน</Label>
                                  <Input id="cpd" type="number" min={0} value={d.cigarettesPerDay ?? 0}
                                    onChange={(e) => set("cigarettesPerDay", Number(e.target.value))} className="h-11" />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="yrs">จำนวนปีที่สูบ</Label>
                                  <Input id="yrs" type="number" min={0} value={d.yearsSmoked ?? 0}
                                    onChange={(e) => set("yearsSmoked", Number(e.target.value))} className="h-11" />
                                </div>
                                <div className="text-xs text-muted-foreground sm:col-span-2">
                                  Pack-years (ค่าที่คำนวณได้): <span className="font-mono font-bold">{packYears.toFixed(1)}</span>
                                </div>
                              </div>
                            )}

                            {d.smokingStatus === "former" && (
                              <div className="space-y-2 max-w-sm">
                                <LabelRow speak="คุณเลิกสูบบุหรี่มานานแค่ไหนแล้ว.">ระยะเวลาตั้งแต่เลิกสูบ</LabelRow>
                                <Select value={d.timeSinceQuitting} onValueChange={(v) => set("timeSinceQuitting", v as any)}>
                                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {QUIT_WINDOWS.map((q) => <SelectItem key={q.v} value={q.v}>{q.l}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <div className="space-y-3">
                              <LabelRow speak="คุณใช้บุหรี่ไฟฟ้าหรือกัญชาหรือไม่. กัญชามีสารก่อมะเร็งสูงกว่าบุหรี่ถึงสองเท่า.">การใช้สารอื่น (บุหรี่ไฟฟ้า / กัญชา)</LabelRow>
                              <div className="grid sm:grid-cols-2 gap-2">
                                <Label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-smooth ${
                                  d.eCigarettes ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                                }`}>
                                  <Checkbox checked={d.eCigarettes} onCheckedChange={(v) => set("eCigarettes", !!v)} />
                                  <span className="text-sm font-medium">ใช้บุหรี่ไฟฟ้า</span>
                                </Label>
                                <Label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-smooth ${
                                  d.marijuana ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                                }`}>
                                  <Checkbox checked={d.marijuana} onCheckedChange={(v) => set("marijuana", !!v)} />
                                  <span className="text-sm font-medium">ใช้กัญชา</span>
                                </Label>
                              </div>
                            </div>
                          </div>
                        )}

                        {step === 3 && (
                          <div className="space-y-6">
                            <h2 className="font-display text-xl font-bold">สิ่งแวดล้อม & อาชีพ</h2>
                            <div className="space-y-3">
                              <LabelRow speak="ความเสี่ยงจากอาชีพ. เลือกได้หลายข้อ. หากไม่เกี่ยวข้อง ให้ข้ามไปได้.">ความเสี่ยงจากอาชีพ (เลือกได้หลายข้อ)</LabelRow>
                              <MultiCheckGrid options={OCCUPATIONAL_HAZARDS as any}
                                values={d.occupationalHazards}
                                onToggle={(v) => toggleIn("occupationalHazards", v)} />
                            </div>
                            <div className="space-y-3">
                              <LabelRow speak="ความเสี่ยงจากสิ่งแวดล้อมที่อยู่อาศัย. เลือกได้หลายข้อ.">ความเสี่ยงจากสิ่งแวดล้อม (เลือกได้หลายข้อ)</LabelRow>
                              <MultiCheckGrid options={ENVIRONMENTAL_HAZARDS as any}
                                values={d.environmentalHazards}
                                onToggle={(v) => toggleIn("environmentalHazards", v)} />
                            </div>
                          </div>
                        )}

                        {step === 4 && (
                          <div className="space-y-6">
                            <h2 className="font-display text-xl font-bold">ประวัติทางการแพทย์</h2>
                            <div className="space-y-3">
                              <LabelRow speak="โรคปอดที่คุณเคยเป็น. เลือกได้หลายข้อ.">โรคปอดที่เคยเป็น (เลือกได้หลายข้อ)</LabelRow>
                              <MultiCheckGrid options={LUNG_DISEASES as any}
                                values={d.lungDiseases}
                                onToggle={(v) => toggleIn("lungDiseases", v)} />
                            </div>
                            <div className="space-y-3">
                              <LabelRow speak="ในครอบครัวมีญาติสายตรงเป็นมะเร็งปอดก่อนอายุ 65 ปี หรือไม่.">ประวัติครอบครัว</LabelRow>
                              <Label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-smooth ${
                                d.familyHistory ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                              }`}>
                                <Checkbox checked={d.familyHistory} onCheckedChange={(v) => set("familyHistory", !!v)} />
                                <span className="text-base font-medium flex-1">ญาติสายตรงเป็นมะเร็งปอดก่อนอายุ 65 ปี</span>
                                <SpeakButton size="icon" variant="ghost" label="ฟัง" text="ญาติสายตรงเป็นมะเร็งปอดก่อนอายุ 65 ปี." />
                              </Label>
                            </div>

                            <div className="mt-6 p-5 rounded-xl border border-primary/20 bg-primary/5">
                              <div className="text-xs uppercase tracking-widest text-muted-foreground">คะแนนความเสี่ยงเบื้องต้น</div>
                              <div className="mt-1 flex items-baseline gap-3">
                                <span className="text-4xl font-display font-bold tabular-nums">{total}</span>
                                <span className="text-muted-foreground text-sm">/ 100 ({riskLevelLabel(level)})</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-2">
                                Static {staticScore} + Dynamic {dynamicScore} (เซนเซอร์จะถูกเพิ่มในอนาคต)
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>

                      <div className="mt-5 flex items-center justify-between">
                        <Button variant="ghost" disabled={step === 1} onClick={() => setStep(step - 1)}>
                          <ArrowLeft className="h-4 w-4 mr-1" /> ย้อนกลับ
                        </Button>
                        {step < STEPS.length ? (
                          <Button disabled={!stepValid} onClick={() => setStep(step + 1)} className="h-11 px-6">
                            ถัดไป <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        ) : (
                          <Button onClick={save} disabled={saving} className="h-11 px-6 gradient-hero text-white border-0 shadow-glow">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "บันทึกและดูผล"}
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default Assessment;

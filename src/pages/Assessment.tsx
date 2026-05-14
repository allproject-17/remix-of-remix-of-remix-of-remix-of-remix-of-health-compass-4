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
  EMPTY_SENSOR_DATA,
} from "@/lib/risk";
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

const initial: LungAssessmentInput = {
  age: 40, gender: "male",
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
  const [step, setStep] = useState(1);
  const [d, setD] = useState<LungAssessmentInput>(initial);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof LungAssessmentInput>(k: K, v: LungAssessmentInput[K]) =>
    setD((p) => ({ ...p, [k]: v }));
  const toggleIn = (k: "occupationalHazards" | "environmentalHazards" | "lungDiseases", v: string) =>
    setD((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }));

  const { score: staticScore, packYears, breakdown } = useMemo(() => calculateStaticRisk(d), [d]);
  const dynamicScore = 0;
  const total = totalRisk(staticScore, dynamicScore);
  const level = riskLevel(total);

  const stepValid = (() => {
    if (step === 1) return d.age >= 1 && d.age <= 120 && (d.gender === "male" || d.gender === "female");
    return true;
  })();

  const save = async () => {
    if (!user) return;
    setSaving(true);
    // Persist age on profile so other features (dashboard) can reuse it.
    await supabase.from("profiles").update({ age: d.age, gender: d.gender }).eq("user_id", user.id);
    const { data, error } = await supabase.from("assessments").insert({
      user_id: user.id,
      score: total,
      static_score: staticScore,
      dynamic_score: dynamicScore,
      status: level,
      behavior_data: d as any,
      environment_data: { breakdown, packYears } as any,
      raw_sensor_data: EMPTY_SENSOR_DATA as any,
    }).select("id").single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("บันทึกผลการคัดกรองเรียบร้อย");
    navigate(`/result/${data.id}`);
  };

  const progress = (step / STEPS.length) * 100;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto animate-fade-up">
        <h1 className="font-display text-3xl md:text-4xl font-bold">คัดกรองความเสี่ยงมะเร็งปอด</h1>
        <p className="text-muted-foreground mt-1">ระบบวิเคราะห์ความเสี่ยงเบื้องต้นจากพฤติกรรม สิ่งแวดล้อม และประวัติทางการแพทย์</p>

        <div className="mt-4 p-4 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 flex items-start gap-3">
          <span className="text-2xl shrink-0">⚠️</span>
          <div className="flex-1">
            <p className="text-sm sm:text-base font-medium leading-relaxed">
              เครื่องมือนี้เป็นเพียง <strong>การคัดกรองเบื้องต้นเท่านั้น</strong> ไม่ใช่การวินิจฉัยทางการแพทย์
              หากต้องการประเมินอย่างละเอียด <strong>กรุณาปรึกษาแพทย์ผู้เชี่ยวชาญ</strong>
            </p>
          </div>
          <SpeakButton
            size="icon"
            variant="ghost"
            label="ฟังคำเตือน"
            text="เครื่องมือนี้เป็นเพียงการคัดกรองเบื้องต้นเท่านั้น. ไม่ใช่การวินิจฉัยทางการแพทย์. หากต้องการประเมินอย่างละเอียด, กรุณาปรึกษาแพทย์ผู้เชี่ยวชาญ."
          />
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
                  Static {staticScore} + Dynamic {dynamicScore} (เซ็นเซอร์จะถูกเพิ่มในอนาคต)
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
      </div>
    </AppShell>
  );
};

export default Assessment;
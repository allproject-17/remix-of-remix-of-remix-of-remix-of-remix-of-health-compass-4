import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, TrendingDown, TrendingUp, Minus, BookOpen, LineChart as LineIcon, AlertTriangle, Info, RefreshCcw, Radio, Play, ArrowLeft } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SpeakButton } from "@/components/SpeakButton";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

// อ้างอิงเกณฑ์จากงานวิจัย: Critical Review of VOC Analysis in Breath for Lung Cancer
// (Metabolites 2019, 9, 52)
type VocSpec = { key: string; label: string; baseline: [number, number]; elevated: [number, number]; hint: string };
const VOC_FIELDS: VocSpec[] = [
  { key: "Benzene",      label: "Benzene",      baseline: [0.5, 4],   elevated: [8, 18],   hint: "IARC กลุ่ม 1 · ควันบุหรี่/ไอน้ำมัน" },
  { key: "Formaldehyde", label: "Formaldehyde", baseline: [10, 70],   elevated: [95, 160], hint: "IARC กลุ่ม 1 · เฟอร์นิเจอร์ใหม่" },
  { key: "Toluene",      label: "Toluene",      baseline: [20, 200],  elevated: [280, 450],hint: "สี/ทินเนอร์/โรงงาน" },
  { key: "Acetone",      label: "Acetone",      baseline: [200, 800], elevated: [1100, 1600], hint: "biomarker เมแทบอลิซึม" },
  { key: "Isoprene",     label: "Isoprene",     baseline: [50, 180],  elevated: [220, 380],hint: "biomarker มะเร็งปอด (Phillips)" },
  { key: "Pentane",      label: "Pentane",      baseline: [1, 8],     elevated: [12, 22],  hint: "lipid peroxidation marker" },
  { key: "Hexanal",      label: "Hexanal",      baseline: [0.5, 6],   elevated: [10, 20],  hint: "biomarker NSCLC" },
  { key: "TwoButanone",  label: "2-Butanone",   baseline: [0.5, 8],   elevated: [12, 22],  hint: "พบในผู้ป่วยมะเร็งปอด" },
];

const rand = (a: number, b: number) => Math.round((Math.random() * (b - a) + a) * 10) / 10;
const simulateOne = (s: VocSpec) => {
  const r = Math.random();
  if (r < 0.7) return rand(s.baseline[0], s.baseline[1]);
  if (r < 0.95) return rand(s.baseline[1], s.elevated[0]);
  return rand(s.elevated[0], s.elevated[1]);
};
const simulateAll = (): Record<string, number> =>
  Object.fromEntries(VOC_FIELDS.map((f) => [f.key, simulateOne(f)]));

type Analysis = {
  risk_level: "Low" | "Medium" | "High";
  summary: string;
  explanation: string;
  recommendations: string[];
  research_insight: string;
  trend: string;
  trend_direction: "improving" | "stable" | "worsening" | "unknown";
  disclaimer?: string;
};

type HealthRow = {
  id: string;
  voc_values: Record<string, number> | any;
  symptoms: string | null;
  ai_analysis: string | null;
  risk_level: "Low" | "Medium" | "High";
  created_at: string;
};

const RISK_STYLE: Record<string, string> = {
  Low: "gradient-low", Medium: "gradient-moderate", High: "gradient-high",
};
const RISK_TH: Record<string, string> = { Low: "ความเสี่ยงต่ำ", Medium: "ความเสี่ยงปานกลาง", High: "ความเสี่ยงสูง" };

type Phase = "idle" | "simulating" | "context" | "analyzing" | "done";

type ContextAnswers = {
  nearFactory: boolean;
  smokerAtHome: boolean;
  recentlyPainted: boolean;
  poorVentilation: boolean;
  cookingFumes: boolean;
  diet: string;
  exercise: "none" | "light" | "regular";
  coughOrFatigue: boolean;
  otherNotes: string;
};

const defaultContext: ContextAnswers = {
  nearFactory: false, smokerAtHome: false, recentlyPainted: false,
  poorVentilation: false, cookingFumes: false,
  diet: "", exercise: "light", coughOrFatigue: false, otherNotes: "",
};

const HealthAnalysis = () => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [vocs, setVocs] = useState<Record<string, number>>({});
  const [readAt, setReadAt] = useState<Date | null>(null);
  const [ctx, setCtx] = useState<ContextAnswers>(defaultContext);
  const [symptoms, setSymptoms] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [history, setHistory] = useState<HealthRow[]>([]);

  const startScan = () => {
    setPhase("simulating");
    setAnalysis(null);
    // จำลองการอ่านค่าจากเซนเซอร์ ~ 1.5 วิ
    setTimeout(() => {
      setVocs(simulateAll());
      setReadAt(new Date());
      setPhase("context");
    }, 1500);
  };

  const resetAll = () => {
    setPhase("idle");
    setVocs({});
    setReadAt(null);
    setCtx(defaultContext);
    setSymptoms("");
    setAnalysis(null);
  };

  const loadHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("health_records").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: true }).limit(30);
    setHistory((data ?? []) as any);
  };

  useEffect(() => { loadHistory(); }, []);

  const chartData = useMemo(() => history.map((r) => ({
    date: new Date(r.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short" }),
    Benzene: Number(r.voc_values?.Benzene ?? 0),
    Formaldehyde: Number(r.voc_values?.Formaldehyde ?? 0),
    Toluene: Number(r.voc_values?.Toluene ?? 0),
    Isoprene: Number(r.voc_values?.Isoprene ?? 0),
  })), [history]);

  const statusOf = (s: VocSpec, v: number): { label: string; cls: string } => {
    if (v >= s.elevated[0]) return { label: "สูง", cls: "gradient-high" };
    if (v > s.baseline[1]) return { label: "เกินเกณฑ์", cls: "gradient-moderate" };
    return { label: "ปกติ", cls: "gradient-low" };
  };

  const buildSymptomsText = (): string => {
    const env: string[] = [];
    if (ctx.nearFactory) env.push("อาศัยใกล้โรงงาน");
    if (ctx.smokerAtHome) env.push("มีคนสูบบุหรี่ในบ้าน");
    if (ctx.recentlyPainted) env.push("เพิ่งทาสีบ้านใหม่");
    if (ctx.poorVentilation) env.push("บ้านอากาศถ่ายเทไม่ดี");
    if (ctx.cookingFumes) env.push("สัมผัสควันจากการทำอาหารบ่อย");
    const beh: string[] = [];
    if (ctx.diet) beh.push(`อาหารช่วงนี้: ${ctx.diet}`);
    beh.push(`ออกกำลังกาย: ${ctx.exercise === "none" ? "ไม่ออกกำลังกาย" : ctx.exercise === "light" ? "ออกกำลังกายเบาๆ" : "ออกกำลังกายสม่ำเสมอ"}`);
    if (ctx.coughOrFatigue) beh.push("มีอาการไอ/เหนื่อยง่าย");
    if (symptoms) beh.push(`อาการอื่น: ${symptoms}`);
    if (ctx.otherNotes) beh.push(`หมายเหตุ: ${ctx.otherNotes}`);
    return [
      env.length ? `[สภาพแวดล้อม] ${env.join(", ")}` : "[สภาพแวดล้อม] ไม่มีปัจจัยเสี่ยงที่แจ้ง",
      `[พฤติกรรม] ${beh.join(", ")}`,
    ].join(" | ");
  };

  const handleAnalyze = async () => {
    setPhase("analyzing");
    setAnalysis(null);
    try {
      const fullSymptoms = buildSymptomsText();
      const { data, error } = await supabase.functions.invoke("analyze-health", {
        body: { voc_values: vocs, symptoms: fullSymptoms, context: ctx },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data.analysis as Analysis);
      setPhase("done");
      toast.success("วิเคราะห์ผลเรียบร้อย");
      await loadHistory();
    } catch (e: any) {
      toast.error(e.message ?? "เกิดข้อผิดพลาด");
      setPhase("context");
    }
  };

  const trendIcon = analysis?.trend_direction === "improving"
    ? <TrendingDown className="h-5 w-5 text-success" />
    : analysis?.trend_direction === "worsening"
    ? <TrendingUp className="h-5 w-5 text-destructive" />
    : <Minus className="h-5 w-5 text-muted-foreground" />;

  const isHigh = analysis?.risk_level === "High";

  const speechText = analysis ? [
    `ระดับความเสี่ยง ${RISK_TH[analysis.risk_level]}.`,
    `ผลการวิเคราะห์: ${analysis.summary} ${analysis.explanation}`,
    analysis.recommendations?.length ? `คำแนะนำ: ${analysis.recommendations.join(". ")}` : "",
  ].filter(Boolean).join(" ") : "";

  return (
    <AppShell>
      <div className={`max-w-5xl mx-auto animate-fade-up space-y-6 ${isHigh ? "rounded-xl p-2 -m-2 ring-2 ring-destructive/40 bg-destructive/5" : ""}`}>
        {isHigh && (
          <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-destructive bg-destructive/10 animate-pulse-soft">
            <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
            <div>
              <div className="font-display font-bold text-destructive">⚠️ ตรวจพบความเสี่ยงสูง</div>
              <p className="text-sm text-foreground/90 mt-1">ค่า VOCs และ/หรืออาการบ่งชี้ความเสี่ยงสูง แนะนำพบแพทย์โดยเร็ว</p>
            </div>
          </div>
        )}

        <div>
          <h1 className="font-display text-3xl font-bold">วิเคราะห์สุขภาพปอดด้วย AI</h1>
          <p className="text-muted-foreground mt-1">3 ขั้นตอน: อ่านค่าเซนเซอร์ → ตอบแบบสอบถาม → AI วิเคราะห์</p>
        </div>

        {/* PHASE STEPPER */}
        <div className="flex items-center gap-2 text-xs">
          {[
            { k: "scan", label: "1. อ่านค่า VOCs", active: phase !== "idle" },
            { k: "ctx", label: "2. แบบสอบถาม", active: phase === "context" || phase === "analyzing" || phase === "done" },
            { k: "ai", label: "3. วิเคราะห์โดย AI", active: phase === "done" },
          ].map((s, i) => (
            <div key={s.k} className="flex items-center gap-2">
              <div className={`px-3 py-1 rounded-full font-medium ${s.active ? "gradient-hero text-white shadow-glow" : "bg-secondary text-muted-foreground"}`}>{s.label}</div>
              {i < 2 && <div className="w-6 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* PHASE: IDLE */}
        {phase === "idle" && (
          <Card className="p-10 gradient-card border-border/50 shadow-soft text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl gradient-hero grid place-items-center shadow-glow">
              <Radio className="h-7 w-7 text-white" />
            </div>
            <h2 className="font-display font-bold text-xl mt-4">พร้อมตรวจวัดลมหายใจของคุณ</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              กดปุ่มด้านล่างเพื่อให้เซนเซอร์เริ่มอ่านค่า VOCs จากลมหายใจ (จำลองค่าจริงจากงานวิจัย)
            </p>
            <Button onClick={startScan} className="mt-6 gradient-hero text-white border-0 shadow-glow h-12 px-8">
              <Play className="h-5 w-5 mr-2" /> เริ่มการตรวจ
            </Button>
          </Card>
        )}

        {/* PHASE: SIMULATING */}
        {phase === "simulating" && (
          <Card className="p-10 gradient-card border-border/50 shadow-soft text-center">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <h2 className="font-display font-bold text-lg mt-4">กำลังอ่านค่าจากเซนเซอร์...</h2>
            <p className="text-sm text-muted-foreground mt-1">กรุณาหายใจเข้าเครื่องและรอสักครู่</p>
          </Card>
        )}

        {/* PHASE: CONTEXT — VOC + Questionnaire */}
        {(phase === "context" || phase === "analyzing") && (
          <>
            <Card className="p-6 gradient-card border-border/50 shadow-soft">
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl gradient-hero grid place-items-center shadow-glow">
                    <Radio className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg leading-tight">ค่า VOCs ที่อ่านได้ (ppb)</h2>
                    <p className="text-xs text-muted-foreground">อ่านเมื่อ {readAt?.toLocaleTimeString("th-TH")}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={startScan} disabled={phase === "analyzing"}>
                  <RefreshCcw className="h-4 w-4 mr-2" /> อ่านใหม่
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {VOC_FIELDS.map((f) => {
                  const v = vocs[f.key];
                  const s = statusOf(f, v);
                  return (
                    <div key={f.key} className={`p-4 rounded-xl text-white border-0 shadow-soft relative overflow-hidden ${s.cls}`}>
                      <div className="absolute -right-3 -bottom-3 h-16 w-16 rounded-full bg-white/10 blur-2xl" />
                      <div className="text-[10px] uppercase tracking-widest opacity-85">{f.label}</div>
                      <div className="font-display text-2xl font-bold tabular-nums mt-0.5">{v}</div>
                      <div className="text-[11px] opacity-90 mt-0.5">{s.label}</div>
                      <div className="text-[10px] opacity-75 mt-2 leading-tight">{f.hint}</div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-6 gradient-card border-border/50 shadow-soft space-y-6">
              <div>
                <h2 className="font-display font-bold text-lg">แบบสอบถามเพิ่มเติม</h2>
                <p className="text-xs text-muted-foreground mt-1">ข้อมูลนี้จะช่วยให้ AI ประมวลผลความเสี่ยงได้แม่นยำขึ้น</p>
              </div>

              <div>
                <Label className="text-sm font-semibold">🏠 สภาพแวดล้อมรอบตัว</Label>
                <div className="mt-3 grid sm:grid-cols-2 gap-3">
                  {[
                    { k: "nearFactory", l: "อาศัยใกล้โรงงาน/ถนนใหญ่" },
                    { k: "smokerAtHome", l: "มีคนสูบบุหรี่ในบ้าน" },
                    { k: "recentlyPainted", l: "เพิ่งทาสีบ้าน/ต่อเติมใหม่" },
                    { k: "poorVentilation", l: "บ้านอากาศถ่ายเทไม่ดี" },
                    { k: "cookingFumes", l: "สัมผัสควันทำอาหาร/ปิ้งย่างบ่อย" },
                  ].map((o) => (
                    <label key={o.k} className="flex items-center gap-2 p-3 rounded-lg border border-border/50 hover:bg-secondary/50 cursor-pointer">
                      <Checkbox
                        checked={(ctx as any)[o.k]}
                        onCheckedChange={(v) => setCtx((c) => ({ ...c, [o.k]: !!v }))}
                      />
                      <span className="text-sm">{o.l}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold">🍽️ พฤติกรรมและสุขภาพ</Label>
                <div className="mt-3 space-y-4">
                  <div>
                    <Label htmlFor="diet" className="text-xs text-muted-foreground">อาหารที่ทานช่วงนี้</Label>
                    <Textarea
                      id="diet" rows={2}
                      placeholder="เช่น ของทอดบ่อย, ผัก-ผลไม้น้อย, ปิ้งย่าง, หรือทานคลีน"
                      value={ctx.diet} onChange={(e) => setCtx((c) => ({ ...c, diet: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">การออกกำลังกาย</Label>
                    <RadioGroup
                      className="mt-2 grid grid-cols-3 gap-2"
                      value={ctx.exercise}
                      onValueChange={(v) => setCtx((c) => ({ ...c, exercise: v as any }))}
                    >
                      {[
                        { v: "none", l: "ไม่ออก" },
                        { v: "light", l: "เบาๆ" },
                        { v: "regular", l: "สม่ำเสมอ" },
                      ].map((o) => (
                        <label key={o.v} className="flex items-center gap-2 p-2 rounded-lg border border-border/50 cursor-pointer hover:bg-secondary/50">
                          <RadioGroupItem value={o.v} />
                          <span className="text-sm">{o.l}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  <label className="flex items-center gap-2 p-3 rounded-lg border border-border/50 hover:bg-secondary/50 cursor-pointer">
                    <Checkbox
                      checked={ctx.coughOrFatigue}
                      onCheckedChange={(v) => setCtx((c) => ({ ...c, coughOrFatigue: !!v }))}
                    />
                    <span className="text-sm">มีอาการไอเรื้อรัง / เหนื่อยง่าย</span>
                  </label>

                  <div>
                    <Label htmlFor="symptoms" className="text-xs text-muted-foreground">อาการอื่น ๆ ที่อยากบอก</Label>
                    <Textarea
                      id="symptoms" rows={2}
                      placeholder="เช่น แน่นหน้าอก, หายใจไม่อิ่ม, เจ็บคอเรื้อรัง"
                      value={symptoms} onChange={(e) => setSymptoms(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button variant="outline" onClick={resetAll} disabled={phase === "analyzing"}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> เริ่มใหม่
                </Button>
                <Button
                  className="gradient-hero text-white border-0 shadow-glow h-11 px-6 flex-1 sm:flex-none"
                  onClick={handleAnalyze}
                  disabled={phase === "analyzing"}
                >
                  {phase === "analyzing"
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> กำลังวิเคราะห์...</>
                    : <><Sparkles className="h-4 w-4 mr-2" /> ส่งให้ AI วิเคราะห์</>}
                </Button>
              </div>
            </Card>
          </>
        )}

        {/* PHASE: DONE — RESULTS */}
        {phase === "done" && analysis && (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-display font-bold text-xl">ผลการวิเคราะห์</h2>
              <div className="flex gap-2">
                <SpeakButton text={speechText} label="ฟังผลวิเคราะห์" />
                <Button variant="outline" size="sm" onClick={resetAll}>
                  <RefreshCcw className="h-4 w-4 mr-2" /> ตรวจอีกครั้ง
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Card className={`p-6 border-0 text-white shadow-elegant ${RISK_STYLE[analysis.risk_level]}`}>
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-widest opacity-80">ผลปัจจุบัน</div>
                  <SpeakButton text={speechText} label="ฟัง" variant="secondary" />
                </div>
                <h3 className="font-display text-2xl font-bold mt-1">{RISK_TH[analysis.risk_level]}</h3>
                <p className="text-white/95 text-sm mt-3 text-balance">{analysis.summary}</p>
                <div className="mt-4 pt-4 border-t border-white/30">
                  <p className="text-xs uppercase opacity-80 mb-2">อธิบายผล</p>
                  <p className="text-sm text-white/95 leading-relaxed">{analysis.explanation}</p>
                </div>
                {analysis.recommendations?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/30">
                    <p className="text-xs uppercase opacity-80 mb-2">สิ่งที่ควรทำ</p>
                    <ul className="space-y-1.5 text-sm">
                      {analysis.recommendations.map((r, i) => (
                        <li key={i} className="flex gap-2"><span>•</span><span>{r}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>

              <Card className="p-6 gradient-card border-border/50 shadow-soft">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-5 w-5 text-accent" />
                  <h3 className="font-display font-bold text-lg">ความรู้จากวิจัย</h3>
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{analysis.research_insight}</p>
                <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground leading-relaxed">
                  อ้างอิง: Benzene/Formaldehyde จัดเป็นสารก่อมะเร็ง IARC กลุ่ม 1
                </div>
              </Card>

              <Card className="p-6 gradient-card border-border/50 shadow-soft">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <LineIcon className="h-5 w-5 text-primary" />
                    <h3 className="font-display font-bold text-lg">แนวโน้ม</h3>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    {trendIcon}
                    {analysis.trend_direction === "improving" ? "ดีขึ้น"
                      : analysis.trend_direction === "worsening" ? "แย่ลง"
                      : analysis.trend_direction === "stable" ? "คงที่" : "ยังไม่ทราบ"}
                  </Badge>
                </div>
                <p className="text-sm text-foreground/90">{analysis.trend}</p>
                <p className="text-xs text-muted-foreground mt-3">เปรียบเทียบกับประวัติ {history.length} ครั้ง</p>
              </Card>
            </div>
          </>
        )}

        {/* CHART */}
        <Card className="p-6 gradient-card border-border/50 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <LineIcon className="h-5 w-5 text-primary" />
            <h2 className="font-display font-bold text-lg">กราฟแนวโน้มค่า VOCs ย้อนหลัง</h2>
          </div>
          {chartData.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              ยังไม่มีข้อมูล กดวิเคราะห์ผลครั้งแรกเพื่อเริ่มเก็บแนวโน้ม
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Benzene" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Isoprene" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Formaldehyde" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Toluene" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {analysis && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border/50">
            <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {analysis.disclaimer ?? "ผลนี้เป็นเพียงการคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัยทางการแพทย์ หากมีอาการผิดปกติ ควรพบแพทย์เพื่อตรวจเพิ่มเติม"}
            </p>
          </div>
        )}

        {history.length > 0 && (
          <Card className="p-6 gradient-card border-border/50 shadow-soft">
            <h3 className="font-display font-bold text-lg mb-4">ประวัติการตรวจ + คำอธิบายจาก AI</h3>
            <Accordion type="single" collapsible className="space-y-2">
              {[...history].reverse().map((r) => {
                let parsed: Analysis | null = null;
                try { parsed = r.ai_analysis ? JSON.parse(r.ai_analysis) : null; } catch { /* noop */ }
                return (
                  <AccordionItem key={r.id} value={r.id} className="border border-border/50 rounded-lg px-3">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-sm">
                        <span className={`px-2 py-0.5 rounded-full text-white text-xs ${RISK_STYLE[r.risk_level]}`}>{RISK_TH[r.risk_level]}</span>
                        <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString("th-TH")}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2">
                      {parsed && <p className="text-foreground/90">{parsed.summary}</p>}
                      <p className="text-xs text-muted-foreground">VOCs: {Object.entries(r.voc_values ?? {}).map(([k, v]) => `${k}=${v}`).join(", ")}</p>
                      {r.symptoms && <p className="text-xs text-muted-foreground">บริบท: {r.symptoms}</p>}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </Card>
        )}
      </div>
    </AppShell>
  );
};

export default HealthAnalysis;

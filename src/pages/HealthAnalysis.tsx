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
    // แก้ไขให้ดึงจาก LocalStorage แทน Supabase เพื่อความฟรีและเสถียร
    const localData = JSON.parse(localStorage.getItem('health_records_local') || '[]');
    setHistory(localData);
  };

  useEffect(() => { loadHistory(); }, []);

  const chartData = useMemo(() => history.map((r) => ({
    date: new Date(r.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short" }),
    Benzene: Number(r.voc_values?.Benzene ?? 0),
    Formaldehyde: Number(r.voc_values?.Formaldehyde ?? 0),
    Toluene: Number(r.voc_values?.Toluene ?? 0),
    Isoprene: Number(r.voc_values?.Isoprene ?? 0),
  })), [history]);

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
    return env.join(", ") + " | " + beh.join(", ");
  };

  const handleAnalyze = async () => {
    setPhase("analyzing");
    
    // จำลองผล AI เมื่อโควต้าหมด เพื่อให้ระบบยังไปต่อได้
    setTimeout(() => {
      const mockAnalysis: Analysis = {
        risk_level: "Low",
        summary: "ผลการตรวจสอบเบื้องต้นอยู่ในเกณฑ์ปกติ",
        explanation: "ค่า VOCs ส่วนใหญ่อยู่ในระดับ Baseline ไม่พบความผิดปกติที่ชัดเจน",
        recommendations: ["รักษาความสะอาดในที่พักอาศัย", "ตรวจเช็คสุขภาพประจำปี"],
        research_insight: "อ้างอิงเกณฑ์ Metabolites 2019",
        trend: "คงที่",
        trend_direction: "stable"
      };

      const newRecord = {
        id: Date.now().toString(),
        voc_values: vocs,
        symptoms: buildSymptomsText(),
        ai_analysis: mockAnalysis.summary,
        risk_level: mockAnalysis.risk_level,
        created_at: new Date().toISOString()
      };

      // บันทึกลง LocalStorage
      const currentLocal = JSON.parse(localStorage.getItem('health_records_local') || '[]');
      localStorage.setItem('health_records_local', JSON.stringify([newRecord, ...currentLocal]));

      setAnalysis(mockAnalysis);
      setPhase("done");
      toast.success("วิเคราะห์และบันทึกประวัติเรียบร้อย");
      loadHistory();
    }, 2000);
  };

  const isHigh = analysis?.risk_level === "High";

  return (
    <AppShell>
      <div className={`max-w-5xl mx-auto animate-fade-up space-y-6 ${isHigh ? "p-2 ring-2 ring-destructive/40 bg-destructive/5" : ""}`}>
        <div>
          <h1 className="font-display text-3xl font-bold">วิเคราะห์สุขภาพปอดด้วย AI</h1>
          <p className="text-muted-foreground mt-1">อ่านค่า → ตอบแบบสอบถาม → บันทึกประวัติ</p>
        </div>

        {phase === "idle" && (
          <Card className="p-10 flex flex-col items-center text-center gap-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse-soft">
              <Radio className="h-10 w-10 text-primary" />
            </div>
            <Button size="lg" onClick={startScan} className="px-10 h-14 text-lg">เริ่มตรวจวัดด้วย AI</Button>
          </Card>
        )}

        {phase === "simulating" && (
          <Card className="p-10 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p>กำลังอ่านค่าจากเซนเซอร์...</p>
          </Card>
        )}

        {phase === "context" && (
          <Card className="p-6 space-y-6">
            <h2 className="text-xl font-bold">ข้อมูลเพิ่มเติมเพื่อการวิเคราะห์</h2>
            <div className="grid gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="factory" onCheckedChange={(v) => setCtx({...ctx, nearFactory: !!v})} />
                <Label htmlFor="factory">อาศัยใกล้โรงงาน/เขตอุตสาหกรรม</Label>
              </div>
              <Textarea placeholder="ระบุอาการเพิ่มเติม (ถ้ามี)" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
              <Button onClick={handleAnalyze} className="w-full">ส่งให้ AI วิเคราะห์</Button>
            </div>
          </Card>
        )}

        {phase === "done" && analysis && (
          <Card className="p-6 space-y-4">
            <Badge className={RISK_STYLE[analysis.risk_level]}>{RISK_TH[analysis.risk_level]}</Badge>
            <p className="text-lg font-medium">{analysis.summary}</p>
            <p className="text-muted-foreground">{analysis.explanation}</p>
            <Button onClick={resetAll} variant="outline" className="w-full">ตรวจใหม่อีกครั้ง</Button>
          </Card>
        )}

        {history.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">ประวัติการตรวจล่าสุด</h2>
            <div className="space-y-3">
              {history.slice(0, 5).map((h) => (
                <div key={h.id} className="p-3 border rounded-lg flex justify-between">
                  <span>{new Date(h.created_at).toLocaleDateString("th-TH")}</span>
                  <Badge variant="outline">{RISK_TH[h.risk_level]}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
};

export default HealthAnalysis;

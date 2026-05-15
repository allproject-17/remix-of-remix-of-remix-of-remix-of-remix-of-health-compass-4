import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { riskLevel, riskLevelLabel } from "@/lib/risk";
import { ArrowRight, History as HistoryIcon, Loader2, Trash2, Activity, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceArea, CartesianGrid, Dot,
} from "recharts";

const RiskDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const high = payload.score > 55;
  const color = payload.score <= 25 ? "hsl(142 70% 45%)"
    : payload.score <= 55 ? "hsl(40 95% 55%)"
    : "hsl(0 80% 55%)";
  return (
    <g>
      {high && (
        <circle cx={cx} cy={cy} r={10} fill={color} opacity={0.35}>
          <animate attributeName="r" values="6;14;6" dur="1.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="1.4s" repeatCount="indefinite" />
        </circle>
      )}
      <circle cx={cx} cy={cy} r={5} fill={color} stroke="white" strokeWidth={2} />
    </g>
  );
};

const History = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!user) return;
    setLoading(true);
    supabase.from("assessments").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => { setRows(data ?? []); setLoading(false); });
  };
  useEffect(load, [user]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("assessments").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("ลบเรียบร้อย"); load(); }
  };

  // chart needs oldest -> newest
  const chartData = useMemo(() => {
    return [...rows].reverse().map((r, i) => ({
      idx: i + 1,
      score: r.score as number,
      label: new Date(r.created_at).toLocaleDateString("th-TH", { day: "2-digit", month: "short" }),
    }));
  }, [rows]);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto animate-fade-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl gradient-low grid place-items-center shadow-glow">
            <HistoryIcon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold">ข้อมูลสุขภาพของฉัน</h1>
            <p className="text-muted-foreground text-sm">ผลการประเมินย้อนหลังและแนวโน้ม</p>
          </div>
          <Link to="/assessment"><Button className="h-10 gradient-hero text-white border-0">เริ่มใหม่</Button></Link>
        </div>

        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <Card className="p-12 text-center gradient-card border-border/50 shadow-soft">
            <Activity className="h-10 w-10 mx-auto text-muted-foreground" />
            <h3 className="font-display text-xl font-bold mt-3">ยังไม่มีข้อมูลการประเมิน</h3>
            <p className="text-sm text-muted-foreground mt-1">เริ่มประเมินครั้งแรกเพื่อเริ่มติดตาม</p>
            <Link to="/assessment" className="inline-block mt-5">
              <Button className="gradient-hero text-white border-0 shadow-glow">เริ่มประเมิน</Button>
            </Link>
          </Card>
        ) : (
          <>
            <Card className="p-4 sm:p-6 gradient-card border-border/50 shadow-soft mb-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-bold">แนวโน้มความเสี่ยงมะเร็งปอด</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                เส้นกราฟแสดงคะแนนรวมจากการประเมินครั้งแรกจนถึงล่าสุด · พื้นเขียว = ต่ำ, เหลือง = ปานกลาง, แดง = สูง
              </p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <ReferenceArea y1={0} y2={25} fill="hsl(142 70% 45%)" fillOpacity={0.12} />
                    <ReferenceArea y1={25} y2={55} fill="hsl(40 95% 55%)" fillOpacity={0.12} />
                    <ReferenceArea y1={55} y2={100} fill="hsl(0 80% 55%)" fillOpacity={0.14} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any) => [`${v} / 100`, "คะแนนเสี่ยง"]}
                    />
                    <Line
                      type="monotone" dataKey="score"
                      stroke="hsl(var(--primary))" strokeWidth={3}
                      dot={<RiskDot />} activeDot={{ r: 7 }}
                      isAnimationActive
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: "hsl(142 70% 45%)" }} /> ต่ำ (0–25)</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: "hsl(40 95% 55%)" }} /> ปานกลาง (26–55)</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: "hsl(0 80% 55%)" }} /> สูง (56–100)</span>
              </div>
            </Card>
          </>
        )}
        {!loading && rows.length > 0 && (
          <div className="space-y-3">
            {rows.map((r) => {
              const s = riskLevel(r.score);
              return (
                <Card key={r.id} className="p-4 sm:p-5 gradient-card border-border/50 shadow-soft flex items-center gap-4 hover:shadow-elegant transition-smooth">
                  <div className={`h-14 w-14 rounded-2xl grid place-items-center text-white font-display font-bold text-lg ${
                    s === "Low" ? "gradient-low" : s === "Medium" ? "gradient-moderate" : "gradient-high"
                  }`}>{r.score}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{riskLevelLabel(s)}</div>
                    <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("th-TH")}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Link to={`/result/${r.id}`}>
                    <Button variant="ghost" size="sm">ดู <ArrowRight className="h-4 w-4 ml-1" /></Button>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default History;
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

const History = () => {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('health_history') || '[]');
    setRecords(data);
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">ประวัติการวิเคราะห์</h1>
      {records.length === 0 ? (
        <p>ยังไม่มีประวัติการประเมิน</p>
      ) : (
        <div className="grid gap-4">
          {records.map((item: any) => (
            <Card key={item.id} className="p-4">
              <p className="text-sm text-gray-500">{item.date}</p>
              <p className="mt-2">{item.result}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History as HistoryIcon, ArrowRight, Trash2, Activity, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceArea, CartesianGrid,
} from "recharts";

// ฟังก์ชันกำหนดสีจุดบนกราฟ
const RiskDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const color = payload.risk_level === "High" ? "hsl(0 80% 55%)" : payload.risk_level === "Medium" ? "hsl(40 95% 55%)" : "hsl(142 70% 45%)";
  return (
    <circle cx={cx} cy={cy} r={5} fill={color} stroke="white" strokeWidth={2} />
  );
};

const History = () => {
  const [records, setRecords] = useState<any[]>([]);

  const loadData = () => {
    // ดึงข้อมูลจาก LocalStorage ที่เราบันทึกไว้จากหน้า HealthAnalysis
    const data = JSON.parse(localStorage.getItem('health_records_local') || '[]');
    setRecords(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const removeRecord = (id: string) => {
    const updated = records.filter(r => r.id !== id);
    localStorage.setItem('health_records_local', JSON.stringify(updated));
    setRecords(updated);
    toast.success("ลบประวัติเรียบร้อย");
  };

  // เตรียมข้อมูลสำหรับกราฟ (เรียงจากเก่าไปใหม่)
  const chartData = useMemo(() => {
    return [...records].reverse().map((r) => ({
      date: new Date(r.created_at).toLocaleDateString("th-TH", { day: "2-digit", month: "short" }),
      score: r.risk_level === "High" ? 80 : r.risk_level === "Medium" ? 50 : 20,
      risk_level: r.risk_level
    }));
  }, [records]);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto animate-fade-up p-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-primary grid place-items-center shadow-lg">
            <HistoryIcon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold">ประวัติสุขภาพ</h1>
            <p className="text-muted-foreground text-sm">ติดตามผลการวิเคราะห์ AI ของคุณ</p>
          </div>
        </div>

        {records.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2">
            <Activity className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold">ยังไม่มีข้อมูลการประเมิน</h3>
            <Link to="/health-analysis" className="mt-4 inline-block">
              <Button>เริ่มประเมินตอนนี้</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* ส่วนของกราฟแนวโน้ม */}
            <Card className="p-6 shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">แนวโน้มความเสี่ยง</h2>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <ReferenceArea y1={0} y2={35} fill="hsl(142 70% 45%)" fillOpacity={0.1} />
                    <ReferenceArea y1={35} y2={65} fill="hsl(40 95% 55%)" fillOpacity={0.1} />
                    <ReferenceArea y1={65} y2={100} fill="hsl(0 80% 55%)" fillOpacity={0.1} />
                    <XAxis dataKey="date" />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={3} dot={<RiskDot />} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* รายการประวัติแบบการ์ด */}
            <div className="grid gap-3">
              {records.map((item) => (
                <Card key={item.id} className="p-4 flex items-center gap-4 hover:bg-accent/5 transition-colors">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold ${
                    item.risk_level === "High" ? "bg-red-500" : item.risk_level === "Medium" ? "bg-yellow-500" : "bg-green-500"
                  }`}>
                    {item.risk_level === "High" ? "H" : item.risk_level === "Medium" ? "M" : "L"}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">{item.risk_level === "High" ? "ความเสี่ยงสูง" : item.risk_level === "Medium" ? "ความเสี่ยงปานกลาง" : "ความเสี่ยงต่ำ"}</div>
                    <div className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("th-TH")}</div>
                    <p className="text-sm mt-1 line-clamp-1">{item.ai_analysis}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeRecord(item.id)} className="text-muted-foreground hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default History;

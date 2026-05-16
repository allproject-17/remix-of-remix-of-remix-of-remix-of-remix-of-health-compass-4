import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Activity, History, ArrowRight, TrendingUp, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { riskLevel, riskLevelLabel } from "@/lib/risk";

const cards = [
  { to: "/assessment", title: "ประเมินความเสี่ยงสุขภาพ", desc: "เริ่มทำแบบประเมินทีละขั้นตอน", icon: Activity, gradient: "gradient-hero" },
  { to: "/history", title: "ข้อมูลสุขภาพของฉัน", desc: "ดูผลการประเมินย้อนหลัง", icon: History, gradient: "gradient-low" },
];

const Dashboard = () => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [latest, setLatest] = useState<{ score: number; status: string; created_at: string } | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setName((data?.full_name ?? "").split(" ")[0]));
    supabase.from("assessments").select("score,status,created_at").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setLatest(data));
    supabase.from("assessments").select("id", { count: "exact", head: true }).eq("user_id", user.id)
      .then(({ count }) => setCount(count ?? 0));
  }, [user]);

  return (
    <AppShell>
      <section className="animate-fade-up">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> ยินดีต้อนรับ{name ? `, ${name}` : ""}
        </p>
        <h1 className="font-display text-4xl md:text-5xl font-bold mt-2 tracking-tight text-balance">
          สุขภาพของคุณ ในมุมมองเดียว
        </h1>
      </section>

      <section className="grid md:grid-cols-3 gap-4 mt-8">
        <Card className="p-6 gradient-card border-border/50 shadow-soft">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">คะแนนล่าสุด</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold tabular-nums">{latest?.score ?? "—"}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
          {latest && (
            <div className={`mt-3 inline-flex px-2.5 py-1 rounded-full text-xs font-semibold text-white ${
              riskLevel(latest.score) === "Low" ? "gradient-low" :
              riskLevel(latest.score) === "Medium" ? "gradient-moderate" : "gradient-high"
            }`}>{riskLevelLabel(riskLevel(latest.score))}</div>
          )}
        </Card>
        <Card className="p-6 gradient-card border-border/50 shadow-soft">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">จำนวนการประเมินทั้งหมด</div>
          <div className="mt-2 font-display text-4xl font-bold tabular-nums">{count}</div>
          <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> ติดตามได้ทุกเวลา
          </div>
        </Card>
        <Card className="p-6 gradient-hero text-white border-0 shadow-glow relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="text-xs uppercase tracking-widest text-white/80">เริ่มทำเลย</div>
          <div className="mt-2 font-display text-2xl font-bold leading-tight">เริ่มประเมินครั้งใหม่</div>
          <Link to="/assessment" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold bg-white/15 hover:bg-white/25 transition-smooth backdrop-blur px-3 py-1.5 rounded-full">
            เริ่มทันที <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold mb-4">คุณต้องการทำอะไร?</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {cards.map((c, i) => (
            <Link key={c.to} to={c.to} style={{ animationDelay: `${i * 80}ms` }}
              className="group animate-fade-up opacity-0">
              <Card className="p-7 h-full border-border/50 gradient-card shadow-soft hover:shadow-elegant hover:-translate-y-1 transition-smooth relative overflow-hidden">
                <div className={`h-14 w-14 rounded-2xl ${c.gradient} grid place-items-center shadow-glow`}>
                  <c.icon className="h-7 w-7 text-white" strokeWidth={2.2} />
                </div>
                <h3 className="font-display text-xl font-bold mt-5">{c.title}</h3>
                <p className="text-muted-foreground text-sm mt-1">{c.desc}</p>
                <div className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  เปิด <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-smooth" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
};

export default Dashboard;

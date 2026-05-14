import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Activity, Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import heroImg from "@/assets/hero.jpg";

const schema = z.object({
  email: z.string().trim().email("กรุณากรอกอีเมลให้ถูกต้อง").max(255),
  password: z.string().min(6, "รหัสผ่านอย่างน้อย 6 ตัวอักษร").max(72),
});

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("สร้างบัญชีสำเร็จ ยินดีต้อนรับ!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("เข้าสู่ระบบสำเร็จ");
      }
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message ?? "การยืนยันตัวตนล้มเหลว");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden">
        <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" width={1536} height={1024} />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-transparent to-accent/40 mix-blend-overlay" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white/15 backdrop-blur-md grid place-items-center border border-white/30">
              <Activity className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-2xl text-white">VitalGuard</span>
          </div>
        </div>
        <div className="relative text-white max-w-md animate-fade-up">
          <h1 className="font-display text-5xl font-bold leading-[1.15] text-balance">
            เข้าใจความเสี่ยงสุขภาพของคุณ<span className="text-primary-glow"> ภายใน 60 วินาที</span>
          </h1>
          <p className="mt-5 text-white/85 text-lg">
            ระบบคะแนนถ่วงน้ำหนักที่โปร่งใส ผสานพฤติกรรมส่วนบุคคลกับข้อมูลสภาพแวดล้อมแบบเรียลไทม์
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md p-8 gradient-card shadow-elegant border-border/50 animate-scale-in">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-xl gradient-hero grid place-items-center">
              <Activity className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-xl">VitalGuard</span>
          </div>
          <h2 className="font-display text-3xl font-bold">{mode === "login" ? "ยินดีต้อนรับกลับ" : "สร้างบัญชีใหม่"}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {mode === "login" ? "เข้าสู่ระบบเพื่อดูผลประเมินของคุณ" : "เริ่มติดตามความเสี่ยงสุขภาพของคุณวันนี้"}
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" autoComplete="email" required maxLength={255}
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11" placeholder="you@example.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required minLength={6} maxLength={72}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11" placeholder="••••••••" />
              </div>
            </div>
            <Button type="submit" disabled={busy} className="w-full h-11 gradient-hero text-white border-0 hover:opacity-95 shadow-glow">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>{mode === "login" ? "เข้าสู่ระบบ" : "ลงทะเบียน"} <ArrowRight className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "ยังไม่มีบัญชี?" : "มีบัญชีอยู่แล้ว?"}{" "}
            <button onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-primary font-semibold hover:underline">
              {mode === "login" ? "ลงทะเบียน" : "เข้าสู่ระบบ"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Auth;

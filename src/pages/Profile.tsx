import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, UserCircle2 } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  full_name: z.string().trim().min(2, "ชื่อสั้นเกินไป").max(100),
  gender: z.enum(["female", "male", "other", "prefer_not"]),
  dob: z.string().refine((d) => !!d && new Date(d) < new Date(), "กรุณาเลือกวันเกิดที่ถูกต้อง"),
});

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [full_name, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setFullName(data.full_name ?? "");
        setGender(data.gender ?? "");
        setDob(data.dob ?? "");
      }
      setLoading(false);
    });
  }, [user]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({ full_name, gender, dob });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id, full_name, gender, dob,
    }, { onConflict: "user_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("บันทึกโปรไฟล์เรียบร้อย");
    navigate("/dashboard", { replace: true });
  };

  if (loading) return <AppShell><div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto animate-fade-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl gradient-hero grid place-items-center shadow-glow">
            <UserCircle2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">โปรไฟล์ของคุณ</h1>
            <p className="text-muted-foreground text-sm">ใช้ปรับแต่งการประเมินให้ตรงกับคุณ</p>
          </div>
        </div>
        <Card className="p-8 gradient-card shadow-soft border-border/50">
          <form onSubmit={onSave} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">ชื่อ-นามสกุล</Label>
              <Input id="name" value={full_name} onChange={(e) => setFullName(e.target.value)} maxLength={100} required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>เพศ</Label>
              <RadioGroup value={gender} onValueChange={setGender} className="grid grid-cols-2 gap-2">
                {[
                  { v: "female", l: "หญิง" },
                  { v: "male", l: "ชาย" },
                  { v: "other", l: "อื่น ๆ" },
                  { v: "prefer_not", l: "ไม่ต้องการระบุ" },
                ].map((o) => (
                  <Label key={o.v} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-smooth ${
                    gender === o.v ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}>
                    <RadioGroupItem value={o.v} />
                    <span className="text-sm font-medium">{o.l}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">วันเกิด</Label>
              <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required className="h-11" />
            </div>
            <Button type="submit" disabled={saving} className="w-full h-11 gradient-hero text-white border-0 shadow-glow">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "บันทึกโปรไฟล์"}
            </Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
};

export default Profile;

import { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Activity, LayoutDashboard, History, LogOut, UserCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/dashboard", label: "หน้าหลัก", icon: LayoutDashboard },
  { to: "/assessment", label: "ประเมินความเสี่ยง", icon: Activity },
  { to: "/history", label: "ประวัติ", icon: History },
  { to: "/profile", label: "โปรไฟล์", icon: UserCircle2 },
];

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/50">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to="/dashboard" className="flex items-center gap-2 group">
            <div className="h-9 w-9 rounded-xl gradient-hero grid place-items-center shadow-glow group-hover:scale-105 transition-smooth">
              <Activity className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">VitalGuard</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-smooth flex items-center gap-2 ${
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`
              }>
                <n.icon className="h-4 w-4" />{n.label}
              </NavLink>
            ))}
          </nav>
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/auth"); }}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">ออกจากระบบ</span>
          </Button>
        </div>
        <nav className="md:hidden border-t border-border/50 flex overflow-x-auto">
          {navItems.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) =>
              `flex-1 min-w-fit px-3 py-2 text-xs font-medium flex flex-col items-center gap-1 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }>
              <n.icon className="h-4 w-4" />{n.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 container py-8">{children}</main>
      <footer className="border-t border-border/50 py-6 text-center text-xs text-muted-foreground">
        VitalGuard · ข้อมูลเพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำทางการแพทย์
      </footer>
    </div>
  );
};

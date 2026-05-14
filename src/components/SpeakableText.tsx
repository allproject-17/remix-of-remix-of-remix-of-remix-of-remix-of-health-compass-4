import { ReactNode, useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";

type Props = {
  children: ReactNode;
  /** Plain text to speak. If omitted, the text content of children is used. */
  text?: string;
  className?: string;
  /** Tag for the wrapper. Defaults to div. */
  as?: "div" | "p" | "span" | "li";
  /** Show the small speaker hint icon (default true). */
  hint?: boolean;
};

const pickThaiVoice = (voices: SpeechSynthesisVoice[]) => {
  const thai = voices.filter((v) => v.lang?.toLowerCase().startsWith("th"));
  if (!thai.length) return undefined;
  const googleMale = thai.find((v) => /google/i.test(v.name) && /male|ชาย|man/i.test(v.name));
  if (googleMale) return googleMale;
  const male = thai.find((v) => /male|man|ชาย/i.test(v.name) && !/female|woman/i.test(v.name));
  return male ?? thai.find((v) => /google/i.test(v.name)) ?? thai[0];
};

const normalize = (t: string) =>
  t.replace(/\s*•\s*/g, ". ").replace(/\n+/g, ". ").replace(/\s*-\s*/g, ", ")
    .replace(/\.{2,}/g, ".").replace(/\s+/g, " ").trim();

/**
 * Click anywhere in this block to have it read aloud.
 * Highlights subtly while speaking. Press again to stop.
 */
export const SpeakableText = ({ children, text, className = "", as = "div", hint = true }: Props) => {
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const handleClick = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const raw = text ?? ref.current?.innerText ?? "";
    if (!raw.trim()) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(normalize(raw));
    const v = pickThaiVoice(voices);
    if (v) u.voice = v;
    u.lang = v?.lang ?? "th-TH";
    u.rate = 0.85; u.pitch = 0.9; u.volume = 1;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  const Tag = as as any;
  return (
    <Tag
      ref={ref as any}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); }
      }}
      aria-label={speaking ? "หยุดอ่านออกเสียง" : "คลิกเพื่อให้ AI อ่านออกเสียง"}
      className={[
        "relative cursor-pointer rounded-lg transition-all select-text",
        "hover:bg-primary/5 hover:ring-1 hover:ring-primary/20",
        speaking ? "bg-primary/10 ring-2 ring-primary/40 shadow-glow animate-pulse-soft" : "",
        className,
      ].join(" ")}
      title="คลิกเพื่ออ่านออกเสียง"
    >
      {children}
      {hint && (
        <span
          className={`pointer-events-none absolute top-2 right-2 inline-flex items-center justify-center h-6 w-6 rounded-full bg-background/70 border border-border/60 ${
            speaking ? "text-primary" : "text-muted-foreground/70"
          }`}
          aria-hidden
        >
          <Volume2 className="h-3.5 w-3.5" />
        </span>
      )}
    </Tag>
  );
};

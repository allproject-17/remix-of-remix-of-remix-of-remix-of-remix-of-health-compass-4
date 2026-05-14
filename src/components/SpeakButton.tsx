import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Square } from "lucide-react";

type Props = {
  text: string;
  label?: string;
  size?: "sm" | "default" | "icon";
  variant?: "outline" | "ghost" | "secondary" | "default";
};

// เลือกเสียงผู้ชายไทย (Google ก่อน) — ฟังเป็นผู้เชี่ยวชาญที่ใจดี
const pickThaiVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined => {
  const thai = voices.filter((v) => v.lang?.toLowerCase().startsWith("th"));
  if (thai.length === 0) return undefined;
  const googleMale = thai.find((v) => /google/i.test(v.name) && /male|ชาย|man/i.test(v.name));
  if (googleMale) return googleMale;
  const male = thai.find((v) => /male|man|niwat|chai|ชาย/i.test(v.name) && !/female|woman/i.test(v.name));
  if (male) return male;
  const google = thai.find((v) => /google/i.test(v.name));
  return google ?? thai[0];
};

// เพิ่มเครื่องหมายวรรคตอนให้หยุดอ่านอย่างเป็นธรรมชาติ
const normalizeForSpeech = (raw: string): string => {
  return raw
    .replace(/\s*•\s*/g, ". ")
    .replace(/\n+/g, ". ")
    .replace(/\s*-\s*/g, ", ")
    .replace(/([.!?])\s*([^\s])/g, "$1 $2")
    .replace(/\.{2,}/g, ".")
    .trim();
};

export const SpeakButton = ({ text, label = "ฟังเสียง", size = "sm", variant = "outline" }: Props) => {
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(normalizeForSpeech(text));
    const voice = pickThaiVoice(voices);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? "th-TH";
    u.rate = 0.85;     // ช้าลง ฟังชัดเจน เหมาะกับผู้สูงอายุ
    u.pitch = 0.9;     // ทุ้มอบอุ่น ฟังเป็นผู้เชี่ยวชาญ
    u.volume = 1;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  if (typeof window !== "undefined" && !("speechSynthesis" in window)) return null;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={speaking ? stop : speak}
      className="gap-1.5"
      aria-label={speaking ? "หยุดอ่าน" : label}
    >
      {speaking ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      {size !== "icon" && <span className="text-xs">{speaking ? "หยุด" : label}</span>}
    </Button>
  );
};

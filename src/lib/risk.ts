// Lung Cancer Risk Screening — static + dynamic scoring
// Static: questionnaire (smoking, occupational, environmental, medical history)
// Dynamic: future raw sensor data (VOCs, gas concentration). Initial = 0.

import { researchRiskBoost } from "@/lib/research";

export type SmokingStatus = "never" | "former" | "current";
export type QuitWindow = "lt1" | "1-5" | "5-10" | "gt10";

export type LungAssessmentInput = {
  // Step 1
  age: number;
  gender: "male" | "female";
  // Step 2 — substance use
  smokingStatus: SmokingStatus;
  cigarettesPerDay?: number;
  yearsSmoked?: number;
  timeSinceQuitting?: QuitWindow;
  eCigarettes: boolean;
  marijuana: boolean;
  // Step 3 — occupational + environmental
  occupationalHazards: string[];
  environmentalHazards: string[];
  // Step 4 — medical history
  lungDiseases: string[];
  familyHistory: boolean;
};

export const OCCUPATIONAL_HAZARDS = [
  { v: "mining", l: "ทำงานในที่มีฝุ่นเยอะจากการเจาะหิน ดิน แร่ หรือโรงโม่หิน" },
  { v: "construction", l: "ทำงานก่อสร้าง รื้อถอน หรืออยู่ในไซต์งานเป็นประจำ" },
  { v: "industrial", l: "ทำงานในโรงงานอุตสาหกรรมที่มีควันหรือสารเคมี" },
  { v: "metals", l: "ทำงานชุบโลหะ เชื่อมเหล็ก ผลิตสเตนเลส หรือฟอกหนัง (สัมผัสนิกเกิล/โครเมียม)" },
  { v: "asbestos", l: "สัมผัสฝุ่นจากการรื้อถอนอาคารเก่า งานฝ้า/หลังคา หรือซ่อมเบรก/คลัตช์รถยนต์ (เสี่ยงแร่ใยหิน)" },
] as const;

export const ENVIRONMENTAL_HAZARDS = [
  { v: "pm25", l: "อาศัยในพื้นที่ฝุ่น PM2.5 สูงเป็นประจำ" },
  { v: "ventilation", l: "บ้านอากาศถ่ายเทไม่ดี อับชื้น" },
  { v: "secondhand", l: "ได้รับควันบุหรี่มือสองในบ้านหรือที่ทำงาน" },
  { v: "radon", l: "อยู่หรือใช้เวลาในห้องใต้ดิน หรือห้องชั้นล่างที่อากาศถ่ายเทไม่ดี (เสี่ยงก๊าซเรดอน)" },
  { v: "northern", l: "อยู่ในภาคเหนือช่วงฤดูหมอกควัน (มี.ค.–เม.ย.)" },
] as const;

export const LUNG_DISEASES = [
  { v: "tb", l: "วัณโรค" },
  { v: "emphysema", l: "ถุงลมโป่งพอง" },
  { v: "copd", l: "COPD" },
  { v: "fibrosis", l: "พังผืดที่ปอด" },
  { v: "silicosis", l: "ปอดอักเสบจากซิลิกา (Silicosis)" },
  { v: "sarcoidosis", l: "ซาร์คอยโดสิส" },
] as const;

export const QUIT_WINDOWS: { v: QuitWindow; l: string }[] = [
  { v: "lt1", l: "น้อยกว่า 1 ปี" },
  { v: "1-5", l: "1–5 ปี" },
  { v: "5-10", l: "5–10 ปี" },
  { v: "gt10", l: "มากกว่า 10 ปี" },
];

export type RiskLevel = "Low" | "Medium" | "High";

export function packYears(cigsPerDay = 0, years = 0): number {
  return (Math.max(0, cigsPerDay) / 20) * Math.max(0, years);
}

// Scoring weights are calibrated so total ≤ 100.
// Smoking + marijuana = highest weight, lung diseases / family history = high,
// occupational / environmental = moderate.
export function calculateStaticRisk(d: LungAssessmentInput): {
  score: number;
  packYears: number;
  breakdown: { label: string; points: number }[];
} {
  const breakdown: { label: string; points: number }[] = [];
  let score = 0;

  // Age — paper notes elevated incidence at 50-75
  let agePts = 0;
  if (d.age >= 70) agePts = 10;
  else if (d.age >= 55) agePts = 7;
  else if (d.age >= 45) agePts = 4;
  else if (d.age >= 35) agePts = 2;
  if (agePts) breakdown.push({ label: "อายุ", points: agePts });
  score += agePts;

  // Gender — females show slightly higher susceptibility per recent research
  if (d.gender === "female") {
    score += 2;
    breakdown.push({ label: "ปัจจัยทางเพศ (หญิง)", points: 2 });
  }

  // Smoking — highest weight, scaled with pack-years
  const py = packYears(d.cigarettesPerDay, d.yearsSmoked);
  let smokingPts = 0;
  if (d.smokingStatus === "current") {
    smokingPts = 18;
    if (py >= 30) smokingPts += 14;
    else if (py >= 20) smokingPts += 10;
    else if (py >= 10) smokingPts += 6;
    else if (py > 0) smokingPts += 3;
  } else if (d.smokingStatus === "former") {
    smokingPts = 12;
    if (py >= 30) smokingPts += 10;
    else if (py >= 20) smokingPts += 7;
    else if (py >= 10) smokingPts += 4;
    else if (py > 0) smokingPts += 2;
    // Risk decays with time since quitting; >10 years cuts smoking weight ~60%
    const factor: Record<QuitWindow, number> = {
      lt1: 1, "1-5": 0.85, "5-10": 0.65, gt10: 0.4,
    };
    smokingPts = Math.round(smokingPts * (factor[d.timeSinceQuitting ?? "lt1"]));
  }
  if (smokingPts) breakdown.push({ label: `การสูบบุหรี่ (${py.toFixed(1)} pack-years)`, points: smokingPts });
  score += smokingPts;

  // Teen early-initiation — paper highlights Thai adolescents as a key target group
  if (d.age < 20 && d.smokingStatus !== "never") {
    score += 4;
    breakdown.push({ label: "เริ่มสูบในวัยรุ่น", points: 4 });
  }

  // E-cigarettes / marijuana — highest tier
  if (d.eCigarettes) { score += 5; breakdown.push({ label: "บุหรี่ไฟฟ้า", points: 5 }); }
  if (d.marijuana) { score += 8; breakdown.push({ label: "กัญชา (สารก่อมะเร็งสูงกว่าบุหรี่)", points: 8 }); }

  // Occupational — moderate, but asbestos is high (5× risk; ~90× with smoking)
  const hasAsbestos = d.occupationalHazards.includes("asbestos");
  const otherOcc = d.occupationalHazards.filter((v) => v !== "asbestos").length;
  const otherOccPts = otherOcc * 4;
  if (otherOccPts) breakdown.push({ label: "ความเสี่ยงจากอาชีพ", points: otherOccPts });
  score += otherOccPts;
  if (hasAsbestos) {
    let asbestosPts = 8;
    if (d.smokingStatus !== "never") asbestosPts += 6; // synergy with tobacco
    score += asbestosPts;
    breakdown.push({ label: "แร่ใยหิน (Asbestos)" + (d.smokingStatus !== "never" ? " + บุหรี่" : ""), points: asbestosPts });
  }

  // Environmental — weighted to reflect medical literature:
  // Radon is the #2 cause of lung cancer overall; PM2.5 has strong WHO/IARC evidence
  // (IARC Group 1 outdoor air pollution); secondhand smoke ~20–30% excess risk.
  // Lifestyle/ventilation factors carry lower individual weight.
  const ENV_WEIGHTS: Record<string, number> = {
    radon: 8,        // 2nd-leading cause after smoking
    pm25: 6,         // IARC Group 1
    secondhand: 5,   // 20–30% excess risk
    northern: 4,     // seasonal high PM2.5 exposure
    ventilation: 2,  // contributing factor
  };
  let envPts = 0;
  const envLabels: string[] = [];
  for (const v of d.environmentalHazards) {
    const w = ENV_WEIGHTS[v] ?? 2;
    envPts += w;
    const item = ENVIRONMENTAL_HAZARDS.find((e) => e.v === v);
    if (item) envLabels.push(`${item.l.split(" ")[0]} (+${w})`);
  }
  if (envPts) breakdown.push({ label: "ปัจจัยสิ่งแวดล้อม " + envLabels.join(", "), points: envPts });
  score += envPts;

  // Lung diseases — high
  const lungPts = d.lungDiseases.length * 6;
  if (lungPts) breakdown.push({ label: "ประวัติโรคปอด", points: lungPts });
  score += lungPts;

  // Family history — high
  if (d.familyHistory) {
    score += 10;
    breakdown.push({ label: "ประวัติครอบครัว (มะเร็งปอด <65 ปี)", points: 10 });
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), packYears: py, breakdown };
}

export function totalRisk(staticScore: number, dynamicScore: number): number {
  return Math.max(0, Math.min(100, Math.round(staticScore + dynamicScore)));
}

export function riskLevel(score: number): RiskLevel {
  if (score <= 25) return "Low";
  if (score <= 55) return "Medium";
  return "High";
}

export function riskLevelLabel(l: RiskLevel): string {
  if (l === "Low") return "ความเสี่ยงต่ำ";
  if (l === "Medium") return "ความเสี่ยงปานกลาง";
  return "ความเสี่ยงสูง";
}

export function recommendationsFor(
  score: number,
  smokingStatus?: SmokingStatus,
): { headline: string; items: string[] } {
  const lvl = riskLevel(score);
  // Smoking-specific advice line that adapts to status
  const smokingAdvice =
    smokingStatus === "former"
      ? "ทำได้ดีมาก รักษาวินัยนี้ไว้ และอย่ากลับไปสูบอีกเพื่อสุขภาพปอดในระยะยาว"
      : smokingStatus === "current"
      ? "ควรวางแผนเลิกบุหรี่/บุหรี่ไฟฟ้าอย่างจริงจัง — โทรสายด่วนเลิกบุหรี่ 1600"
      : "รักษาวิถีชีวิตปลอดบุหรี่ต่อไป และหลีกเลี่ยงควันบุหรี่มือสอง";

  if (lvl === "Low") {
    return {
      headline: "ความเสี่ยงต่อมะเร็งปอดของคุณอยู่ในระดับต่ำ",
      items: [
        smokingAdvice,
        "หลีกเลี่ยงการสัมผัสควันบุหรี่มือสองและพื้นที่ PM2.5 สูง",
        "ตรวจสุขภาพเชิงป้องกันประจำปี",
      ],
    };
  }
  if (lvl === "Medium") {
    return {
      headline: "พบปัจจัยเสี่ยงต่อมะเร็งปอดที่ควรเฝ้าระวัง",
      items: [
        smokingAdvice,
        "ใช้หน้ากาก N95 ในวันที่ฝุ่นสูง และปรับปรุงการระบายอากาศในบ้าน",
        "หากทำงานสัมผัสฝุ่น/สารเคมี ควรใช้อุปกรณ์ป้องกันส่วนบุคคลทุกครั้ง",
        "พิจารณาเอ็กซเรย์ปอด/CT low-dose ตามคำแนะนำของแพทย์",
      ],
    };
  }
  return {
    headline: "ระดับความเสี่ยงต่อมะเร็งปอดสูง — ควรพบแพทย์เพื่อคัดกรอง",
    items: [
      "ปรึกษาแพทย์เฉพาะทางเพื่อพิจารณา Low-dose CT scan สำหรับคัดกรองมะเร็งปอด",
      smokingStatus === "former"
        ? "เยี่ยมมากที่เลิกแล้ว — อย่ากลับไปสูบอีก และหลีกเลี่ยงควันบุหรี่มือสองอย่างเคร่งครัด"
        : "หยุดสูบบุหรี่/บุหรี่ไฟฟ้า/กัญชาทันที — ขอความช่วยเหลือจากคลินิกเลิกบุหรี่ (1600)",
      "หลีกเลี่ยงสภาพแวดล้อมที่มีฝุ่น ควัน และสารเคมีอย่างเคร่งครัด",
      "เฝ้าระวังอาการ ไอเรื้อรัง ไอเป็นเลือด เสียงแหบ น้ำหนักลด — พบแพทย์ทันที",
    ],
  };
}

// Stable empty sensor payload — populated later by the hardware integration.
export const EMPTY_SENSOR_DATA = {
  sensors: {} as Record<string, number | null>,
  captured_at: null as string | null,
};

// Dynamic scoring from sensor array (VOCs resistance values in Ohms)
export type SensorReadings = Record<string, number>;

/**
 * Calculate a dynamic risk score from sensor readings.
 * - avg below ~3500 -> low dynamic contribution
 * - avg >=4000 or key sensors high -> high contribution
 * Returns 0..60 (so static + dynamic <= 100 reasonably)
 */
export function calculateDynamicRisk(
  readings: SensorReadings,
  keySensorIds: string[] = [],
  environmentalHazards: string[] = [],
  smokingStatus: SmokingStatus = "never",
): number {
  const ids = Object.keys(readings);
  if (ids.length === 0) return 0;
  const vals = ids.map((k) => readings[k]).filter((v) => typeof v === "number" && !isNaN(v));
  if (vals.length === 0) return 0;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;

  const base = Math.max(0, Math.min(1, (avg - 3500) / (6500 - 3500)));
  let dyn = Math.round(base * 40);

  let keyBoost = 0;
  if (keySensorIds.length) {
    const keyVals = keySensorIds.map((k) => readings[k]).filter((v) => typeof v === "number");
    const highKeys = keyVals.filter((v) => v >= 4500).length;
    keyBoost = Math.min(24, highKeys * 6);
  }

  const researchBoost = researchRiskBoost(environmentalHazards, smokingStatus);
  dyn = Math.min(60, dyn + keyBoost + researchBoost);
  return dyn;
}

export type ResearchDocument = {
  id: string;
  file: string;
  title: string;
  summary: string;
  tags: string[];
};

export const RESEARCH_DOCUMENTS: ResearchDocument[] = [
  {
    id: "research",
    file: "docs/research.pdf",
    title: "Breath-based lung cancer detection using an ML-driven low-cost sensor array",
    summary:
      "Pilot study with 12 MOS sensors and 1 alkane sensor for lung cancer detection. Key drivers: TGS2602, TGS2620, MQ-2, MQ135. Healthy signals cluster in the low resistance range, while cancer breath raises resistance and variance.",
    tags: ["E-nose", "MOS", "VOC", "TGS2602", "TGS2620", "MQ-2", "MQ135"],
  },
  {
    id: "research1",
    file: "docs/research1.pdf",
    title: "สรุปปัจจัยเสี่ยงมะเร็งปอดในประเทศไทย",
    summary:
      "รีวิวปัจจัยเสี่ยงมะเร็งปอดของไทย โดยเน้นการสูบบุหรี่, กัญชา, มลพิษทางอากาศ, ฝุ่น PM2.5, แร่ใยหิน, และประวัติครอบครัว เป็นปัจจัยเสี่ยงสำคัญ. ",
    tags: ["risk factors", "smoking", "air pollution", "radon", "PM2.5"],
  },
  {
    id: "research2",
    file: "docs/research2.pdf",
    title: "Risk patterns of lung cancer mortality in Northern Thailand",
    summary:
      "การวิเคราะห์เชิงพื้นที่แสดงว่าอัตรายังชีพมะเร็งปอดสูงเชื่อมโยงกับมลภาวะทางอากาศ, สภาพภูมิประเทศ, และปัจจัยสภาพแวดล้อมอื่นๆ ในภูมิภาคเหนือของไทย.",
    tags: ["spatial risk", "air pollution", "environment", "geography"],
  },
  {
    id: "research3",
    file: "docs/research3.pdf",
    title: "Radon exposure and lung cancer risk in Upper Northern Thailand",
    summary:
      "ยืนยันว่าเรดอนในอาคารเป็นปัจจัยเสี่ยงอันดับสองรองจากการสูบบุหรี่ และมีอัตราการเพิ่มขึ้นความเสี่ยงชัดเจนที่ระดับ 100 Bq/m3 ขึ้นไป พร้อมผลร่วมกับการสูบบุหรี่.",
    tags: ["radon", "environmental risk", "synergy", "smoking"],
  },
  {
    id: "research4",
    file: "docs/research4.pdf",
    title: "VOCs as biomarkers for cancer screening and diagnosis",
    summary:
      "รีวิวบทบาทของสารระเหยอินทรีย์ในร่างกายในการเป็นตัวบ่งชี้มะเร็ง โดยแยกระหว่าง VOCs ภายนอกและภายใน มีความท้าทายเรื่องความไม่สม่ำเสมอของรูปแบบ VOC.",
    tags: ["VOCs", "biomarkers", "exogenous", "endogenous"],
  },
  {
    id: "research5",
    file: "docs/research5.pdf",
    title: "Lung cancer VOC biomarkers and breath analysis",
    summary:
      "สรุปงานวิจัย VOC biomarkers ของมะเร็งปอด พบความไม่สอดคล้องกันระหว่างงานวิจัยหลายฉบับ แต่ VOCs อย่าง acetone, toluene, benzene, pentane, hexanal ถูกพบบ่อย.",
    tags: ["VOC biomarkers", "acetone", "benzene", "toluene", "alkanes"],
  },
  {
    id: "research6",
    file: "docs/research6.pdf",
    title: "Meta-analysis of VOCs-based cancer diagnosis and sensor methods",
    summary:
      "การวิเคราะห์เมตาแสดงว่าการทดสอบ Breath VOC มีความแม่นยำสูง (AUC ~0.91) และการตรวจด้วยเซนเซอร์ให้ผลใกล้เคียงกับวิธี MS โดยเฉพาะเมื่อใช้ชุดเซนเซอร์ที่เหมาะสม.",
    tags: ["meta-analysis", "AUC", "sensor diagnosis", "MS vs sensors"],
  },
];

export const RESEARCH_KEY_SENSORS = ["TGS2602", "TGS2620", "MQ-2", "MQ135 / MC-135"];
export const SENSOR_HEALTHY_LOW = 1000;
export const SENSOR_HEALTHY_HIGH = 3000;
export const SENSOR_HIGH_LOW = 4000;
export const SENSOR_HIGH_HIGH = 6500;

export function researchRiskBoost(
  environmentalHazards: string[],
  smokingStatus: string,
): number {
  let boost = 0;
  if (environmentalHazards.includes("radon")) {
    boost += 4;
    if (smokingStatus !== "never") boost += 3; // radon + smoking synergy
  }
  if (environmentalHazards.includes("pm25")) boost += 2;
  return boost;
}

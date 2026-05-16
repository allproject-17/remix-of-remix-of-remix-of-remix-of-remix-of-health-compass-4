export type SensorSpec = {
  id: string;
  label: string;
  isKey?: boolean; // major driver
};

export const SENSORS: SensorSpec[] = [
  // Key biomarkers (research-backed lung cancer indicators)
  { id: "VOC_1", label: "Acetone", isKey: true },
  { id: "VOC_2", label: "Toluene", isKey: true },
  { id: "VOC_3", label: "Benzene", isKey: true },
  { id: "VOC_4", label: "Isoprene", isKey: true },
  { id: "VOC_5", label: "Hexanal" },
  { id: "VOC_6", label: "Pentane" },
  // Common VOCs detected by sensor array
  { id: "VOC_7", label: "Ammonia" },
  { id: "VOC_8", label: "Hydrogen Sulfide (H₂S)" },
  { id: "VOC_9", label: "Formaldehyde" },
  { id: "VOC_10", label: "Methanol" },
  { id: "VOC_11", label: "Ethanol" },
  { id: "VOC_12", label: "Carbon Monoxide (CO)" },
  { id: "VOC_13", label: "Xylene" },
  { id: "VOC_14", label: "Hexane" },
  { id: "VOC_15", label: "Propane" },
  { id: "VOC_16", label: "Methane (CH₄)" },
  { id: "VOC_17", label: "Ethane (C₂H₆)" },
  { id: "VOC_18", label: "Hydrogen (H₂)" },
  { id: "VOC_19", label: "Butane" },
  { id: "VOC_20", label: "1,3-Butadiene" },
  { id: "VOC_21", label: "Dimethyl Sulfide (DMS)" },
  { id: "VOC_22", label: "2-Methylbutane" },
  { id: "VOC_23", label: "Limonene" },
  { id: "VOC_24", label: "m,p-Xylene" },
  { id: "VOC_25", label: "o-Xylene" },
  { id: "VOC_26", label: "Decane" },
];

export type SensorReadings = Record<string, number>;

function randInt(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

const SENSOR_LOW_MAX = 3000;
const SENSOR_MODERATE_MAX = 4000;
const SENSOR_HIGH_MAX = 6500;

type SensorRisk = "Low" | "Moderate" | "High";

function pickSensorState(mode: "healthy" | "high", s: SensorSpec): SensorRisk {
  const r = Math.random();
  if (mode === "healthy") {
    if (r < 0.65) return "Low";
    if (r < 0.9) return "Moderate";
    return "High";
  }

  if (s.isKey) {
    if (r < 0.25) return "Low";
    if (r < 0.7) return "Moderate";
    return "High";
  }

  if (r < 0.35) return "Low";
  if (r < 0.7) return "Moderate";
  return "High";
}

function randomValueForState(state: SensorRisk) {
  if (state === "Low") return randInt(1000, SENSOR_LOW_MAX);
  if (state === "Moderate") return randInt(SENSOR_LOW_MAX + 1, SENSOR_MODERATE_MAX);
  return randInt(SENSOR_MODERATE_MAX + 1, SENSOR_HIGH_MAX);
}

function shuffleArray<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function randomizeSensors(mode: "healthy" | "high" = "healthy"): SensorReadings {
  const out: SensorReadings = {};
  for (const s of SENSORS) {
    const state = pickSensorState(mode, s);
    out[s.id] = randomValueForState(state);
  }

  const values = Object.entries(out);
  const highSensors = values.filter(([, v]) => v > SENSOR_MODERATE_MAX).map(([id]) => id);
  const moderateSensors = values.filter(([, v]) => v > SENSOR_LOW_MAX && v <= SENSOR_MODERATE_MAX).map(([id]) => id);

  if (highSensors.length < 3) {
    const candidates = shuffleArray(SENSORS.filter((s) => out[s.id] <= SENSOR_MODERATE_MAX));
    for (let i = 0; i < 3 - highSensors.length && i < candidates.length; i += 1) {
      out[candidates[i].id] = randInt(SENSOR_MODERATE_MAX + 1, SENSOR_HIGH_MAX);
    }
  }
  if (moderateSensors.length < 6) {
    const candidates = shuffleArray(SENSORS.filter((s) => out[s.id] <= SENSOR_LOW_MAX));
    for (let i = 0; i < 6 - moderateSensors.length && i < candidates.length; i += 1) {
      out[candidates[i].id] = randInt(SENSOR_LOW_MAX + 1, SENSOR_MODERATE_MAX);
    }
  }

  return out;
}

export function sensorValueRiskLevel(value: number): "Low" | "Moderate" | "High" {
  if (value <= SENSOR_LOW_MAX) return "Low";
  if (value <= SENSOR_MODERATE_MAX) return "Moderate";
  return "High";
}

export const SENSOR_IDS = SENSORS.map((s) => s.id);

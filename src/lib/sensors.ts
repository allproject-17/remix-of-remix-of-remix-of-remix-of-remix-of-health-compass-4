export type SensorSpec = {
  id: string;
  label: string;
  isKey?: boolean; // major driver
};

export const SENSORS: SensorSpec[] = [
  { id: "Sensor_1", label: "TGS2600" },
  { id: "Sensor_2", label: "TGS2602", isKey: true },
  { id: "Sensor_3", label: "TGS2620", isKey: true },
  { id: "Sensor_4", label: "MQ-2", isKey: true },
  { id: "Sensor_5", label: "MQ-3" },
  { id: "Sensor_6", label: "MQ-4" },
  { id: "Sensor_7", label: "MQ-5" },
  { id: "Sensor_8", label: "MQ-6" },
  { id: "Sensor_9", label: "MQ-7" },
  { id: "Sensor_10", label: "MQ-9" },
  { id: "Sensor_11", label: "MQ135 / MC-135", isKey: true },
  { id: "Sensor_12", label: "Alkane Sensor" },
  // remaining sensors are temporal / combined-channel features (to reach 26 dims)
  ...Array.from({ length: 14 }).map((_, i) => ({ id: `Sensor_${13 + i}`, label: `Combined_${13 + i}` })),
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

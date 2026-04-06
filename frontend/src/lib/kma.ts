import mapCitiesJson from "../../data/map-cities.json";
import tableCitiesJson from "../../data/table-cities.json";
import mapMarkerPositionsJson from "../../data/map-marker-positions.json";
import precipCitiesJson from "../../data/precip-cities.json";

export type City = {
  name: string;
  lat: number;
  lon: number;
  regId: string;
};

export type LandFcstItem = {
  announceTime?: string | number;
  numEf: string | number;
  regId?: string;
  rnSt?: string | number;
  rnYn?: string | number;
  ta?: string | number;
  wf?: string;
  wfCd?: string;
};

export type LandSlotValue = {
  wf: string | null;
  wfCd: string | null;
  rnYn: number | null;
  rnSt: number | null;
  ta: number | null;
  label: WeatherLabel | null;
};

export type LandSummary = {
  announceTime: string | null;
  tomorrowAm?: LandSlotValue;
  tomorrowPm?: LandSlotValue;
  day2Am?: LandSlotValue;
  day2Pm?: LandSlotValue;
  day3Am?: LandSlotValue;
  day3Pm?: LandSlotValue;
};

export type DailyWeather = {
  minTemp: number | null;
  maxTemp: number | null;
  sky: string | null;
  amSky: string | null;
  pmSky: string | null;
  amPop: number | null;
  pmPop: number | null;
};

export type CityWeather = {
  city: string;
  tomorrow: DailyWeather;
  dayAfterTomorrow: DailyWeather;
  threeDaysLater: DailyWeather;
};

export type MarkerPosition = {
  x: number;
  y: number;
};

export const MAP_CITIES: City[] = mapCitiesJson;
export const TABLE_CITIES: string[] = tableCitiesJson;
export const PRECIP_CITIES: readonly string[] = precipCitiesJson;
export const MAP_MARKER_POSITIONS: Record<string, MarkerPosition> =
  mapMarkerPositionsJson;

function getKstParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const pick = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour"),
    minute: pick("minute"),
  };
}


export function getTargetDate(offsetDays: number) {
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 9 + offsetDays * 24);

  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");

  return `${yyyy}${mm}${dd}`;
}

type WeatherLabel =
  | "맑음"
  | "구름조금"
  | "구름많음"
  | "흐림"
  | "차차흐림"
  | "흐린후갬"
  | "비"
  | "흐린후비"
  | "비후갬"
  | "눈"
  | "비나눈";

function wfCdToWeatherLabel(
  value: string | null | undefined,
): WeatherLabel | null {
  const code = String(value ?? "").trim();

  if (code === "DB01") return "맑음";
  if (code === "DB02") return "구름조금";
  if (code === "DB03") return "구름많음";
  if (code === "DB04") return "흐림";

  return null;
}

function rnYnToWeatherLabel(
  value: string | number | null | undefined,
): WeatherLabel | null {
  const code = Number(value);

  if (!Number.isFinite(code) || code === 0) return null;
  if (code === 1) return "비";
  if (code === 2) return "비나눈";
  if (code === 3) return "눈";
  if (code === 4) return "비"; // 소나기 -> 비 취급

  return null;
}

export function landSlotToWeatherLabel(slot: {
  rnYn?: string | number | null;
  wfCd?: string | null;
}): WeatherLabel | null {
  return rnYnToWeatherLabel(slot.rnYn) ?? wfCdToWeatherLabel(slot.wfCd);
}

function isPrecipGroup(label: WeatherLabel | null): boolean {
  return label === "비" || label === "비나눈" || label === "눈";
}

function isLightSkyGroup(label: WeatherLabel | null): boolean {
  return label === "맑음" || label === "구름조금";
}

function isCloudyGroup(label: WeatherLabel | null): boolean {
  return label === "구름많음" || label === "흐림";
}

function isCloudGroupForAfterRain(label: WeatherLabel | null): boolean {
  return label === "구름조금" || label === "구름많음";
}

export function mergeLandMorningAfternoonWeather(
  morning: WeatherLabel | null,
  afternoon: WeatherLabel | null,
): WeatherLabel | null {
  if (!morning && !afternoon) return null;
  if (morning && !afternoon) return morning;
  if (!morning && afternoon) return afternoon;

  if (morning === afternoon) return morning;

  if (
    (morning === "맑음" && afternoon === "구름조금") ||
    (morning === "구름조금" && afternoon === "맑음")
  ) {
    return "구름조금";
  }

  if (isPrecipGroup(morning) && isPrecipGroup(afternoon)) {
    return "비나눈";
  }

  if (isLightSkyGroup(morning) && isCloudyGroup(afternoon)) {
    return "차차흐림";
  }

  if (isCloudyGroup(morning) && isLightSkyGroup(afternoon)) {
    return "흐린후갬";
  }

  if (
    (isLightSkyGroup(morning) || isCloudyGroup(morning)) &&
    isPrecipGroup(afternoon)
  ) {
    return "흐린후비";
  }

  if (
    isPrecipGroup(morning) &&
    (afternoon === "맑음" || isCloudGroupForAfterRain(afternoon))
  ) {
    return "비후갬";
  }

  if (isCloudyGroup(morning) && isCloudyGroup(afternoon)) {
    return "흐림";
  }

  return afternoon ?? morning;
}

function isClearGroup(label: WeatherLabel | null): boolean {
  return label === "맑음" || label === "구름조금";
}

function isCloudGroup(label: WeatherLabel | null): boolean {
  return label === "구름많음" || label === "흐림";
}

function isSkyGroup(label: WeatherLabel | null): boolean {
  return (
    label === "맑음" ||
    label === "구름조금" ||
    label === "구름많음" ||
    label === "흐림"
  );
}

function getAnnounceHour(
  announceTime: string | number | null | undefined,
): number | null {
  if (announceTime == null) return null;
  const digits = String(announceTime).replace(/\D/g, "");
  if (digits.length < 10) return null;
  return Number(digits.slice(8, 10));
}

function resolveLandSlot(
  announceTime: string | number | null | undefined,
  numEfRaw: string | number,
): keyof Omit<LandSummary, "announceTime"> | null {
  const numEf = Number(numEfRaw);
  const hour = getAnnounceHour(announceTime);

  if (!Number.isFinite(numEf) || hour == null) return null;

  // 05시 발표
  // 0=오늘오전, 1=오늘오후, 2=내일오전, 3=내일오후, 4=모레오전, 5=모레오후, 6=글피오전, 7=글피오후
  if (hour >= 5 && hour < 11) {
    if (numEf === 2) return "tomorrowAm";
    if (numEf === 3) return "tomorrowPm";
    if (numEf === 4) return "day2Am";
    if (numEf === 5) return "day2Pm";
    if (numEf === 6) return "day3Am";
    if (numEf === 7) return "day3Pm";
    return null;
  }

  // 11시 발표
  // 0=오늘오후, 1=내일오전, 2=내일오후, 3=모레오전, 4=모레오후, 5=글피오전, 6=글피오후
  if (hour >= 11 && hour < 17) {
    if (numEf === 1) return "tomorrowAm";
    if (numEf === 2) return "tomorrowPm";
    if (numEf === 3) return "day2Am";
    if (numEf === 4) return "day2Pm";
    if (numEf === 5) return "day3Am";
    if (numEf === 6) return "day3Pm";
    return null;
  }

  // 17시 발표
  // 0=오늘밤, 1=내일오전, 2=내일오후, 3=모레오전, 4=모레오후, 5=글피오전, 6=글피오후, 7=그글피오전, 8=그글피오후
  if (hour >= 17) {
    if (numEf === 1) return "tomorrowAm";
    if (numEf === 2) return "tomorrowPm";
    if (numEf === 3) return "day2Am";
    if (numEf === 4) return "day2Pm";
    if (numEf === 5) return "day3Am";
    if (numEf === 6) return "day3Pm";
    return null;
  }

  return null;
}

function mergeMorningAfternoonWeather(
  morning: WeatherLabel | null,
  afternoon: WeatherLabel | null,
): WeatherLabel | null {
  if (!morning && !afternoon) return null;
  if (morning && !afternoon) return morning;
  if (!morning && afternoon) return afternoon;

  if (morning === afternoon) return morning;

  if (
    (morning === "맑음" && afternoon === "구름조금") ||
    (morning === "구름조금" && afternoon === "맑음")
  ) {
    return "구름조금";
  }

  if (isCloudGroup(morning) && isCloudGroup(afternoon)) {
    return "흐림";
  }

  if (morning === "비" && afternoon === "비나눈") {
    return "비나눈";
  }

  if ((morning === "비나눈" || morning === "눈") && afternoon === "비") {
    return "비나눈";
  }

  if ((morning === "비나눈" || morning === "비") && afternoon === "눈") {
    return "비나눈";
  }

  if (isClearGroup(morning) && isCloudGroup(afternoon)) {
    return "차차흐림";
  }

  if (isCloudGroup(morning) && isClearGroup(afternoon)) {
    return "흐린후갬";
  }

  if (isSkyGroup(morning) && (afternoon === "비" || afternoon === "비나눈")) {
    return "흐린후비";
  }

  if (isSkyGroup(morning) && afternoon === "눈") {
    return "눈";
  }

  if ((morning === "비" || morning === "비나눈") && isSkyGroup(afternoon)) {
    return "비후갬";
  }

  if (morning === "눈" && isSkyGroup(afternoon)) {
    return "눈";
  }

  if (afternoon === "눈") return "눈";
  if (afternoon === "비나눈") return "비나눈";
  if (afternoon === "비") return "비";
  if (isCloudGroup(afternoon)) return "흐림";
  if (afternoon === "구름조금") return "구름조금";
  if (afternoon === "구름많음") return "구름많음";
  if (afternoon === "맑음") return "맑음";

  return morning;
}

export function summarizeLandForecast(items: LandFcstItem[]): LandSummary {
  if (!Array.isArray(items) || items.length === 0) {
    return { announceTime: null };
  }

  const latestAnnounceTime =
    [...items]
      .map((item) => item.announceTime)
      .filter(
        (value): value is string | number =>
          value != null && String(value).trim() !== "",
      )
      .sort((a, b) => {
        const aa = Number(String(a).replace(/\D/g, ""));
        const bb = Number(String(b).replace(/\D/g, ""));
        return aa - bb;
      })
      .at(-1) ?? null;

  if (!latestAnnounceTime) {
    return { announceTime: null };
  }

  const latestItems = items.filter(
    (item) => String(item.announceTime ?? "") === String(latestAnnounceTime),
  );

  const summary: LandSummary = {
    announceTime: String(latestAnnounceTime),
  };

  for (const item of latestItems) {
    const slot = resolveLandSlot(latestAnnounceTime, item.numEf);
    if (!slot) continue;

    summary[slot] = {
      wf: item.wf ?? null,
      wfCd: item.wfCd ?? null,
      rnYn:
        item.rnYn == null || item.rnYn === "" ? null : Number(item.rnYn),
      rnSt:
        item.rnSt == null || item.rnSt === "" ? null : Number(item.rnSt),
      ta:
        item.ta == null || item.ta === "" ? null : Number(item.ta),
      label: landSlotToWeatherLabel({
        rnYn: item.rnYn,
        wfCd: item.wfCd ?? null,
      }),
    };
  }

  return summary;
}


export function getMarkerPosition(city: string) {
  const fallback = { x: 50, y: 50 };
  const position = MAP_MARKER_POSITIONS[city] ?? fallback;

  return {
    left: `${position.x}%`,
    top: `${position.y}%`,
  };
}

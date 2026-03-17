export type DustLevel = "좋음" | "보통" | "나쁨" | "매우 나쁨";

export type DustRegionItem = {
  region: string;
  grade: DustLevel;
};

type DustForecastItem = {
  dataTime?: string;
  informData?: string;
  seoulGrade?: string;
  incheonGrade?: string;
  gyeonggibukGrade?: string;
  gyeongginamGrade?: string;
  youngseoGrade?: string;
  youngdongGrade?: string;
  daejeonGrade?: string;
  sejongGrade?: string;
  chungbukGrade?: string;
  chungnamGrade?: string;
  gwangjuGrade?: string;
  jeonbukGrade?: string;
  jeonnamGrade?: string;
  busanGrade?: string;
  daeguGrade?: string;
  ulsanGrade?: string;
  gyeongbukGrade?: string;
  gyeongnamGrade?: string;
  jejuGrade?: string;
};

const BASE_URL =
  "https://api.odcloud.kr/api/MinuDustFrcstDspthSvrc/v1/getMinuDustFrcstDspth50Over";

function getTodayKST() {
  const now = new Date();
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const yyyy = kst.getFullYear();
  const mm = String(kst.getMonth() + 1).padStart(2, "0");
  const dd = String(kst.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeServiceKey(rawKey: string) {
  return rawKey.trim();
}

function isLikelyEncodedKey(value: string) {
  return /%[0-9A-Fa-f]{2}/.test(value);
}

function extractDustLevel(value?: string | null): DustLevel {
  const text = String(value ?? "").trim();

  if (text.includes("매우나쁨") || text.includes("매우 나쁨")) return "매우 나쁨";
  if (text.includes("나쁨")) return "나쁨";
  if (text.includes("보통")) return "보통";
  if (text.includes("좋음")) return "좋음";

  return "보통";
}

function rank(level: DustLevel) {
  if (level === "좋음") return 1;
  if (level === "보통") return 2;
  if (level === "나쁨") return 3;
  return 4;
}

function worstOf(...levels: Array<string | undefined>) {
  const normalized = levels.map((level) => extractDustLevel(level));
  return normalized.sort((a, b) => rank(b) - rank(a))[0];
}

function sortKey(item: DustForecastItem) {
  return `${item.informData ?? ""}|${item.dataTime ?? ""}`;
}

export async function getDustData() {
  const rawKey = process.env.AIRKOREA_SERVICE_KEY;

  if (!rawKey) {
    throw new Error("AIRKOREA_SERVICE_KEY 환경변수가 없습니다.");
  }

  const serviceKey = normalizeServiceKey(rawKey);
  const params = new URLSearchParams({
    returnType: "json",
    numOfRows: "100",
    pageNo: "1",
    searchDate: getTodayKST(),
  });

  const encodedServiceKey = isLikelyEncodedKey(serviceKey)
    ? serviceKey
    : encodeURIComponent(serviceKey);

  const res = await fetch(`${BASE_URL}?serviceKey=${encodedServiceKey}&${params.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`미세먼지 예보 API 호출 실패: ${res.status}`);
  }

  const json = await res.json();
  const items: DustForecastItem[] = json?.response?.body?.items ?? [];

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("미세먼지 예보 데이터가 비어 있습니다.");
  }

  const latest = [...items].sort((a, b) => sortKey(b).localeCompare(sortKey(a)))[0];

  const regions: DustRegionItem[] = [
    { region: "서울", grade: extractDustLevel(latest.seoulGrade) },
    { region: "인천", grade: extractDustLevel(latest.incheonGrade) },
    { region: "경기북부", grade: extractDustLevel(latest.gyeonggibukGrade) },
    { region: "경기남부", grade: extractDustLevel(latest.gyeongginamGrade) },
    { region: "강원", grade: worstOf(latest.youngseoGrade, latest.youngdongGrade) },
    { region: "대전충남", grade: worstOf(latest.daejeonGrade, latest.chungnamGrade) },
    { region: "세종충북", grade: worstOf(latest.sejongGrade, latest.chungbukGrade) },
    { region: "전북", grade: extractDustLevel(latest.jeonbukGrade) },
    { region: "광주전남", grade: worstOf(latest.gwangjuGrade, latest.jeonnamGrade) },
    { region: "대구경북", grade: worstOf(latest.daeguGrade, latest.gyeongbukGrade) },
    { region: "부산경남", grade: worstOf(latest.busanGrade, latest.gyeongnamGrade) },
    { region: "제주", grade: extractDustLevel(latest.jejuGrade) },
  ];

  return {
    dataTime: latest.informData ?? latest.dataTime ?? null,
    regions,
  };
}

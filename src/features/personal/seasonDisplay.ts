// ColorFit 프로토타입(colorfit-ui-v6)에서 추출한 12계절 표시 전용 데이터입니다. 시즌 판정 로직의 권위는 도메인 모듈에 있고, 이 데이터는 화면 표기(팔레트·문구·축 위치·테마 색)에만 사용합니다.
import type { SeasonId } from '../../types';

export interface SeasonDisplayProfile {
  code: string;
  title: string;
  ko: string;
  description: string;
  tags: string[];
  axes: { temperature: number; lightness: number; clarity: number; contrast: number };
  marker: number;
  near: string;
  palette: string[];
  usage: string[];
}

export const SEASON_DISPLAY: Record<SeasonId, SeasonDisplayProfile> = {
  "light-spring": {
    "code": "LS",
    "title": "Light\nSpring",
    "ko": "라이트 스프링",
    "description": "밝고 투명한 웜 베이스 위에 피치, 옐로, 아쿠아가 가볍게 살아나는 유형입니다. 무겁게 누르기보다 빛을 머금은 색의 연결이 강점이에요.",
    "tags": [
      "LIGHT",
      "WARM",
      "FRESH"
    ],
    "axes": {
      "temperature": 0.72,
      "lightness": 0.92,
      "clarity": 0.45,
      "contrast": -0.2
    },
    "marker": 19,
    "near": "가까운 영역은 트루 스프링과 라이트 서머입니다. 채도를 올리면 브라이트 스프링까지 확장할 수 있어요.",
    "palette": [
      "#FFF6D9",
      "#FDF1D0",
      "#EFD8B8",
      "#D9C2A2",
      "#FFD1B8",
      "#FFC7A3",
      "#F7B39A",
      "#F59A8A",
      "#F8B9BE",
      "#FFE68A",
      "#F8EF9A",
      "#FFF1A6",
      "#D8E8A8",
      "#C9E27B",
      "#B8E2A5",
      "#B9E8D4",
      "#AFE9E4",
      "#A8E3EB",
      "#8FDDE4",
      "#73D7D3",
      "#6ECBC2",
      "#FF8F70",
      "#FBC28B",
      "#F2B577"
    ],
    "usage": [
      "#FFF6D9",
      "#FFD1B8",
      "#AFE9E4",
      "#FDF1D0",
      "#D9C2A2",
      "#F2B577",
      "#FF8F70",
      "#FFE68A",
      "#73D7D3"
    ]
  },
  "true-spring": {
    "code": "TS",
    "title": "True\nSpring",
    "ko": "트루 스프링",
    "description": "노란 기가 분명한 생기 있는 웜 스펙트럼입니다. 선명한 오렌지, 골드 옐로, 잎사귀 그린이 피부의 혈색을 또렷하게 살려요.",
    "tags": [
      "WARM",
      "VIVID",
      "SUNNY"
    ],
    "axes": {
      "temperature": 1,
      "lightness": 0.35,
      "clarity": 0.62,
      "contrast": 0.15
    },
    "marker": 15,
    "near": "라이트 스프링보다 색이 진하고, 브라이트 스프링보다 대비가 부드럽습니다.",
    "palette": [
      "#FFF0C2",
      "#FEE6A6",
      "#E5C18C",
      "#C99B63",
      "#FFA56B",
      "#FFB07C",
      "#FF7F5F",
      "#F96822",
      "#E9552B",
      "#F7B500",
      "#F4C430",
      "#FFE04B",
      "#B7D94D",
      "#7FC241",
      "#53B84A",
      "#2EAE7D",
      "#00B8A9",
      "#4CD9D0",
      "#1E9C98",
      "#1C8B8F",
      "#FF5C64",
      "#F04E37",
      "#E97432",
      "#D9B55A"
    ],
    "usage": [
      "#FFF0C2",
      "#FFA56B",
      "#4CD9D0",
      "#E5C18C",
      "#C99B63",
      "#1C8B8F",
      "#F96822",
      "#FFE04B",
      "#53B84A"
    ]
  },
  "bright-spring": {
    "code": "BS",
    "title": "Bright\nSpring",
    "ko": "브라이트 스프링",
    "description": "웜 베이스와 높은 선명도, 경쾌한 대비가 만나는 스펙트럼입니다. 또렷한 코랄, 라임, 터쿼이즈를 깨끗한 바탕 위에 배치하세요.",
    "tags": [
      "BRIGHT",
      "CLEAR",
      "ENERGETIC"
    ],
    "axes": {
      "temperature": 0.92,
      "lightness": 0.32,
      "clarity": 1,
      "contrast": 0.7
    },
    "marker": 13,
    "near": "트루 스프링과 브라이트 윈터 사이에 있습니다. 탁한 색보다 깨끗한 원색 혼합이 유리해요.",
    "palette": [
      "#FFF5E1",
      "#F2D0A7",
      "#C89150",
      "#B97A3D",
      "#FFB38A",
      "#FF9A56",
      "#FF6F61",
      "#FF5A5F",
      "#F9423A",
      "#FF7A00",
      "#FF8C00",
      "#FFD200",
      "#F3F12F",
      "#CBEA00",
      "#8FD400",
      "#3CB043",
      "#00B36B",
      "#00D7C9",
      "#00CFCF",
      "#00B6C7",
      "#4FB6FF",
      "#FF6FAE",
      "#FF4F8B",
      "#FFB000"
    ],
    "usage": [
      "#FFF5E1",
      "#FFB38A",
      "#00D7C9",
      "#F2D0A7",
      "#C89150",
      "#00B6C7",
      "#FF4F8B",
      "#FFD200",
      "#4FB6FF"
    ]
  },
  "light-summer": {
    "code": "LSo",
    "title": "Light\nSummer",
    "ko": "라이트 서머",
    "description": "밝고 서늘한 파스텔이 피부의 투명감을 높이는 스펙트럼입니다. 라벤더, 파우더 블루, 쿨 핑크를 부드러운 명도로 연결하세요.",
    "tags": [
      "LIGHT",
      "COOL",
      "AIRY"
    ],
    "axes": {
      "temperature": -0.74,
      "lightness": 0.95,
      "clarity": -0.2,
      "contrast": -0.35
    },
    "marker": 67,
    "near": "라이트 스프링과 트루 서머 사이입니다. 노란 기를 줄이고 밝기를 유지하는 것이 핵심이에요.",
    "palette": [
      "#F8F6F3",
      "#F2ECE8",
      "#E7D9D2",
      "#C7B8B1",
      "#F4D7E4",
      "#EEC6D8",
      "#DDB7C7",
      "#E6A8B8",
      "#DEC8EA",
      "#D5CCF3",
      "#C7D4F6",
      "#C6DBF2",
      "#BFDDF0",
      "#B8E5E8",
      "#C5E4DE",
      "#C7D8C7",
      "#D3E7D4",
      "#A9D7D9",
      "#A8C3E7",
      "#8FA9D5",
      "#C88FA9",
      "#C9A9C2",
      "#AAB6C9",
      "#BDC9D6"
    ],
    "usage": [
      "#F8F6F3",
      "#F4D7E4",
      "#C7D4F6",
      "#F2ECE8",
      "#C7B8B1",
      "#AAB6C9",
      "#E6A8B8",
      "#B8E5E8",
      "#8FA9D5"
    ]
  },
  "true-summer": {
    "code": "TSo",
    "title": "True\nSummer",
    "ko": "트루 서머",
    "description": "푸른 기가 분명하고 차분한 중명도 색이 안정적인 스펙트럼입니다. 로즈, 라벤더, 슬레이트 블루를 낮은 대비로 이어보세요.",
    "tags": [
      "COOL",
      "CALM",
      "REFINED"
    ],
    "axes": {
      "temperature": -1,
      "lightness": 0.28,
      "clarity": -0.58,
      "contrast": 0.12
    },
    "marker": 70,
    "near": "라이트 서머보다 깊고 소프트 서머보다 쿨합니다. 회색기를 품은 블루와 로즈가 중심이에요.",
    "palette": [
      "#F7F4F2",
      "#E9E1DC",
      "#C7B7AE",
      "#9E8F88",
      "#D8A2B3",
      "#C68FA4",
      "#B17D9C",
      "#A9658D",
      "#BBA4D7",
      "#9A87BF",
      "#8399C8",
      "#6E8FBE",
      "#6E95A8",
      "#557A8C",
      "#4E7F87",
      "#5E887C",
      "#8AA08A",
      "#A4BDAE",
      "#7B627D",
      "#7E4E67",
      "#A54361",
      "#3E4E73",
      "#687181",
      "#A3A9AE"
    ],
    "usage": [
      "#F7F4F2",
      "#D8A2B3",
      "#8399C8",
      "#E9E1DC",
      "#9E8F88",
      "#3E4E73",
      "#A54361",
      "#4E7F87",
      "#9A87BF"
    ]
  },
  "soft-summer": {
    "code": "SSo",
    "title": "Soft\nSummer",
    "ko": "소프트 서머",
    "description": "쿨 베이스에 회색기가 충분히 섞인 저채도 스펙트럼입니다. 더스티 로즈, 세이지 블루, 모브를 흐릿한 경계로 조합하세요.",
    "tags": [
      "MUTED",
      "COOL",
      "SOFT"
    ],
    "axes": {
      "temperature": -0.62,
      "lightness": 0.2,
      "clarity": -1,
      "contrast": -0.38
    },
    "marker": 74,
    "near": "트루 서머와 소프트 오텀 사이입니다. 강한 흑백 대비 대신 톤온톤이 잘 맞아요.",
    "palette": [
      "#F3EDEB",
      "#D9CDC6",
      "#B7ACA7",
      "#8A7F7A",
      "#C89FA4",
      "#B88C93",
      "#9F7F87",
      "#8C6572",
      "#BDAFC3",
      "#A693AE",
      "#9AA7C7",
      "#7D8EA9",
      "#6E879C",
      "#8898A6",
      "#6D9793",
      "#8CA59A",
      "#9CAB8E",
      "#7E8871",
      "#6F6578",
      "#4E5A72",
      "#D1B8B7",
      "#D7C3D0",
      "#B9BEC4",
      "#6B7077"
    ],
    "usage": [
      "#F3EDEB",
      "#C89FA4",
      "#9AA7C7",
      "#D9CDC6",
      "#8A7F7A",
      "#6B7077",
      "#8C6572",
      "#6D9793",
      "#A693AE"
    ]
  },
  "soft-autumn": {
    "code": "SA",
    "title": "Soft\nAutumn",
    "ko": "소프트 오텀",
    "description": "따뜻한 흙빛에 회색기가 섞인 부드러운 스펙트럼입니다. 샌드, 말린 살구, 세이지, 청록을 낮은 대비로 레이어드하세요.",
    "tags": [
      "MUTED",
      "WARM",
      "EARTHY"
    ],
    "axes": {
      "temperature": 0.62,
      "lightness": 0.08,
      "clarity": -0.55,
      "contrast": -0.05
    },
    "marker": 7,
    "near": "소프트 서머와 트루 오텀 사이입니다. 지나치게 선명한 색보다 먼지 낀 듯한 색이 안정적이에요.",
    "palette": [
      "#F2E5D3",
      "#DDD0BC",
      "#CBB89E",
      "#A18E77",
      "#E8C1A0",
      "#DCA685",
      "#C9876B",
      "#C67B62",
      "#D08D7F",
      "#C8A54B",
      "#D8BF72",
      "#B5A155",
      "#A9B08C",
      "#8C9165",
      "#9E9F79",
      "#80917F",
      "#5E8C8A",
      "#6E9997",
      "#4F7476",
      "#7FA9A6",
      "#A86F49",
      "#AA5C3F",
      "#B3725B",
      "#5E6B4E"
    ],
    "usage": [
      "#F2E5D3",
      "#E8C1A0",
      "#7FA9A6",
      "#DDD0BC",
      "#A18E77",
      "#5E6B4E",
      "#C67B62",
      "#A9B08C",
      "#5E8C8A"
    ]
  },
  "true-autumn": {
    "code": "TA",
    "title": "True\nAutumn",
    "ko": "트루 오텀",
    "description": "깊고 풍부한 웜 컬러가 가장 자연스러운 스펙트럼입니다. 머스터드, 테라코타, 올리브, 딥 틸이 얼굴에 입체감을 줍니다.",
    "tags": [
      "WARM",
      "RICH",
      "NATURAL"
    ],
    "axes": {
      "temperature": 0.96,
      "lightness": -0.25,
      "clarity": 0.12,
      "contrast": 0.18
    },
    "marker": 4,
    "near": "소프트 오텀보다 선명하고 다크 오텀보다 밝습니다. 골드 계열 액세서리가 특히 안정적이에요.",
    "palette": [
      "#F6E7BF",
      "#C69C6D",
      "#A97C50",
      "#5E3E2B",
      "#D9742A",
      "#C95D22",
      "#E46D2E",
      "#A84A2A",
      "#B7462F",
      "#D9A404",
      "#B8891C",
      "#C99820",
      "#7A7A2E",
      "#5D6B2B",
      "#42552D",
      "#2F5B3D",
      "#0F6B62",
      "#006D6F",
      "#1B5661",
      "#5C3B44",
      "#7A4A2C",
      "#6B3526",
      "#8B4C2F",
      "#8C7B42"
    ],
    "usage": [
      "#F6E7BF",
      "#D9742A",
      "#0F6B62",
      "#C69C6D",
      "#5E3E2B",
      "#42552D",
      "#B7462F",
      "#D9A404",
      "#006D6F"
    ]
  },
  "dark-autumn": {
    "code": "DA",
    "title": "Dark\nAutumn",
    "ko": "다크 오텀",
    "description": "따뜻하고 어두운 색이 깊이를 만드는 스펙트럼입니다. 에스프레소, 브릭, 포레스트, 딥 틸을 넓은 면적으로 사용해도 안정적이에요.",
    "tags": [
      "DEEP",
      "WARM",
      "DENSE"
    ],
    "axes": {
      "temperature": 0.76,
      "lightness": -0.9,
      "clarity": -0.18,
      "contrast": 0.35
    },
    "marker": 1,
    "near": "트루 오텀과 다크 윈터 사이입니다. 블랙보다 초콜릿과 다크 올리브가 얼굴을 부드럽게 받쳐줘요.",
    "palette": [
      "#EEE1C7",
      "#B88A61",
      "#7A5A3A",
      "#3E2A1F",
      "#A34E2C",
      "#8C3F24",
      "#914F39",
      "#662F2A",
      "#B54C28",
      "#A37714",
      "#8B6A18",
      "#8C6239",
      "#596126",
      "#3E4A24",
      "#284131",
      "#1E4A4D",
      "#204D57",
      "#0E5966",
      "#4B314C",
      "#43283A",
      "#5A2D23",
      "#4A342A",
      "#323728",
      "#7C5A3B"
    ],
    "usage": [
      "#EEE1C7",
      "#B88A61",
      "#204D57",
      "#7A5A3A",
      "#3E2A1F",
      "#323728",
      "#B54C28",
      "#596126",
      "#4B314C"
    ]
  },
  "dark-winter": {
    "code": "DW",
    "title": "Dark\nWinter",
    "ko": "다크 윈터",
    "description": "차갑고 어두운 보석색이 선명한 인상을 만드는 스펙트럼입니다. 와인, 네이비, 딥 에메랄드를 깨끗한 밝은색과 대비시키세요.",
    "tags": [
      "DEEP",
      "COOL",
      "JEWEL"
    ],
    "axes": {
      "temperature": -0.88,
      "lightness": -0.55,
      "clarity": 0.35,
      "contrast": 0.78
    },
    "marker": 82,
    "near": "다크 오텀과 트루 윈터 사이입니다. 따뜻한 브라운보다 블랙, 잉크 네이비, 버건디가 유리해요.",
    "palette": [
      "#F5F7FA",
      "#DDE5EE",
      "#8E97A4",
      "#2E323A",
      "#4B2E4A",
      "#6D2240",
      "#8B2039",
      "#A61E2D",
      "#402D54",
      "#5B3E87",
      "#1E2A5A",
      "#0F4C81",
      "#0C6678",
      "#006B5C",
      "#0E4F43",
      "#007A6C",
      "#B0006D",
      "#8E2C6C",
      "#F0DDE8",
      "#E4E1F7",
      "#DCE9F8",
      "#B8C0CC",
      "#111111",
      "#1F2847"
    ],
    "usage": [
      "#F5F7FA",
      "#6D2240",
      "#0F4C81",
      "#DDE5EE",
      "#2E323A",
      "#111111",
      "#B0006D",
      "#007A6C",
      "#5B3E87"
    ]
  },
  "true-winter": {
    "code": "TW",
    "title": "True\nWinter",
    "ko": "트루 윈터",
    "description": "푸른 기와 높은 대비가 가장 또렷한 스펙트럼입니다. 순백, 블랙, 로열 블루, 푸시아처럼 차갑고 명확한 색 경계가 강점이에요.",
    "tags": [
      "COOL",
      "CLEAR",
      "CONTRAST"
    ],
    "axes": {
      "temperature": -1,
      "lightness": 0.05,
      "clarity": 0.72,
      "contrast": 0.95
    },
    "marker": 76,
    "near": "다크 윈터보다 밝고 브라이트 윈터보다 정제돼 있습니다. 회색기보다 깨끗한 색이 유리해요.",
    "palette": [
      "#FFFFFF",
      "#000000",
      "#C9CED6",
      "#434A54",
      "#B80F2E",
      "#9E0B2E",
      "#C11F6A",
      "#CC1177",
      "#B0005B",
      "#6E2D91",
      "#1C4FA1",
      "#0047AB",
      "#0F52BA",
      "#007F5F",
      "#008C99",
      "#006C8E",
      "#F7D9E7",
      "#E7E1F8",
      "#DDEEFF",
      "#DDF3F0",
      "#F5F7B2",
      "#00AEEF",
      "#FF1493",
      "#D4001A"
    ],
    "usage": [
      "#FFFFFF",
      "#C11F6A",
      "#0047AB",
      "#C9CED6",
      "#434A54",
      "#000000",
      "#FF1493",
      "#007F5F",
      "#6E2D91"
    ]
  },
  "bright-winter": {
    "code": "BW",
    "title": "Bright\nWinter",
    "ko": "브라이트 윈터",
    "description": "차갑고 매우 선명한 네온·보석색이 살아나는 스펙트럼입니다. 푸시아, 일렉트릭 블루, 에메랄드를 흰색 또는 검정과 또렷하게 대비하세요.",
    "tags": [
      "BRIGHT",
      "COOL",
      "ELECTRIC"
    ],
    "axes": {
      "temperature": -0.72,
      "lightness": 0.22,
      "clarity": 1,
      "contrast": 1
    },
    "marker": 84,
    "near": "트루 윈터와 브라이트 스프링 사이입니다. 탁한 중간색보다 맑고 강한 색이 얼굴을 살려요.",
    "palette": [
      "#FFFFFF",
      "#000000",
      "#D0D7E2",
      "#3C4655",
      "#FF2F92",
      "#F50087",
      "#D10073",
      "#D7263D",
      "#FF3B30",
      "#F6F930",
      "#B7FF00",
      "#00A86B",
      "#00B140",
      "#00D4D8",
      "#00B7EB",
      "#2458FF",
      "#2643C4",
      "#7A3DF0",
      "#ECE7FF",
      "#E3F2FF",
      "#E5FFF7",
      "#FF6F61",
      "#FF4FA3",
      "#C441FF"
    ],
    "usage": [
      "#FFFFFF",
      "#FF2F92",
      "#2458FF",
      "#D0D7E2",
      "#3C4655",
      "#000000",
      "#B7FF00",
      "#00D4D8",
      "#7A3DF0"
    ]
  }
};

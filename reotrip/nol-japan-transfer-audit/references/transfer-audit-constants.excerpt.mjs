// Excerpt from transfer-audit-copy.mjs — check-time constants only
// Full file lives in nol-listing-automation/lib/ (not part of listing skill)

/**
 * Post-review hard constants for Japan/private transfer products
 * (§57 · audit 2026-08 + **3.0 覆盖 2026-08-14**)
 */

export const SPEC_CANCEL_KO =
  '예약 확정 후 취소 요청은 협력사 확인 후 처리됩니다. 이용일 기준 영업일 2일 전까지 취소 시 100% 환불 가능하며, 이후에는 취소 및 환불이 불가합니다.';

export const FAQ_MIDSTOP_Q = '중간에 다른 장소에서 승하차할 수 있나요?';
export const FAQ_MIDSTOP_A =
  '본 서비스는 출발지에서 목적지까지 바로 이동하는 지점 간 전용 차량 서비스입니다. 중간 경유지 추가 또는 중간 승하차는 제공되지 않습니다.';

export const FAQ_MIDSTOP = { q: FAQ_MIDSTOP_Q, a: FAQ_MIDSTOP_A };

/** 3.0：完整 5 条 FAQ 样板（读自东京站 09714a30 live 2026-08-14） */
export const FAQ_SET_STATION = [
  {
    q: '차량은 어떻게 선택하나요?',
    a: '탑승 인원과 수하물 수량에 맞춰 선택해 주세요. 7인승 차량은 최대 4명 및 24인치 수하물 5개 기준, 10인승 차량은 최대 9명 및 26인치 수하물 10개 기준입니다.',
  },
  {
    q: '바우처를 제시해야 하나요?',
    a: '별도 티켓, 바우처 또는 교환권 제시는 필요하지 않습니다. 기사님이 보통 이용일 전날 WhatsApp 또는 SMS로 연락드립니다.',
  },
  {
    q: '예약 후 픽업 정보를 변경할 수 있나요?',
    a: '픽업 노선, 픽업 시간, 주소, 열차 정보 등 변경 요청은 최소 이용 2일 전까지 알려 주세요. 기한 이후에는 변경이 어려울 수 있습니다.',
  },
  {
    q: '열차 정보는 왜 필요한가요?',
    a: '역 승하차 또는 픽업 장소와 이용 시간을 정확히 확인하기 위해 필요합니다. 예약 시 열차명, 도착 또는 출발 시간 등 확인 가능한 정보를 입력해 주세요.',
  },
  FAQ_MIDSTOP,
];

export const FAQ_SET_AIRPORT = [
  FAQ_SET_STATION[0],
  FAQ_SET_STATION[1],
  {
    q: '예약 후 픽업 정보를 변경할 수 있나요?',
    a: '픽업 노선, 픽업 시간, 주소, 항공편 정보 등 변경 요청은 최소 이용 2일 전까지 알려 주세요. 기한 이후에는 변경이 어려울 수 있습니다.',
  },
  {
    q: '항공편 정보는 왜 필요한가요?',
    a: '공항 터미널·픽업 장소와 이용 시간을 정확히 확인하기 위해 필요합니다. 예약 시 항공편명, 도착 또는 출발 시간, 터미널 정보를 입력해 주세요.',
  },
  FAQ_MIDSTOP,
];

export const FAQ_SET_PORT = [
  FAQ_SET_STATION[0],
  FAQ_SET_STATION[1],
  {
    q: '예약 후 픽업 정보를 변경할 수 있나요?',
    a: '픽업 노선, 픽업 시간, 주소, 선박 정보 등 변경 요청은 최소 이용 2일 전까지 알려 주세요. 기한 이후에는 변경이 어려울 수 있습니다.',
  },
  {
    q: '선박 정보는 왜 필요한가요?',
    a: '항만 승하차 위치가 상황에 따라 달라질 수 있어 정확한 기사 배정과 픽업 안내를 위해 선박명, 승선 또는 하선 정보가 필요합니다.',
  },
  FAQ_MIDSTOP,
];

export const FAQ_SET_HOTEL_ATTRACTION = [
  FAQ_SET_STATION[0],
  FAQ_SET_STATION[1],
  {
    q: '예약 후 픽업 정보를 변경할 수 있나요?',
    a: '픽업 노선, 픽업 시간, 주소 등 변경 요청은 최소 이용 2일 전까지 알려 주세요. 기한 이후에는 변경이 어려울 수 있습니다.',
  },
  {
    q: '픽업 장소는 어떻게 정해지나요?',
    a: '예약 시 입력한 호텔 주소 또는 지정 픽업/샌딩 장소를 기준으로 합니다. 정확한 위치는 기사님 연락 시 다시 확인해 주세요.',
  },
  FAQ_MIDSTOP,
];

/** Normalize audit aliases (airport_related → hotel_airport) */
export function normalizeRouteType(routeType) {
  const t = String(routeType || '');
  if (/airport/i.test(t)) return 'hotel_airport';
  if (/port/i.test(t) && !/airport/i.test(t)) return 'hotel_port';
  if (/station/i.test(t)) return 'hotel_station';
  if (/hotel_hotel|hotel-hotel/i.test(t)) return 'hotel_hotel';
  if (/attraction|hotel_attraction/i.test(t)) return 'hotel_attraction';
  return t || 'hotel_attraction';
}

/** @param {string} routeType hotel_station|hotel_airport|hotel_port|hotel_attraction|hotel_hotel|airport_related|... */
export function faqSetForRoute(routeType) {
  switch (normalizeRouteType(routeType)) {
    case 'hotel_airport':
    case 'station_airport':
    case 'port_airport':
    case 'airport_hotel':
    case 'airport_attraction':
      return FAQ_SET_AIRPORT;
    case 'hotel_station':
    case 'station_hotel':
      return FAQ_SET_STATION;
    case 'hotel_port':
    case 'port_hotel':
      return FAQ_SET_PORT;
    case 'hotel_hotel':
    case 'hotel_attraction':
    default:
      return FAQ_SET_HOTEL_ATTRACTION;
  }
}

export function howToUseLine3(routeType) {
  switch (normalizeRouteType(routeType)) {
    case 'hotel_airport':
    case 'station_airport':
    case 'port_airport':
    case 'airport_hotel':
    case 'airport_attraction':
      return '3.예약 시 항공편명, 도착 또는 출발 시간, 터미널, 픽업/샌딩 장소, 인원 및 수하물을 정확히 입력해 주세요.';
    case 'hotel_station':
      return '3.예약 시 호텔명·주소, 역 출구/미팅 장소, 픽업/샌딩 시간, 인원 및 수하물을 정확히 입력해 주세요.';
    case 'hotel_port':
    case 'port_hotel':
      return '3.예약 시 호텔명·주소, 항만 승하차 장소, 선박명 및 승하선 정보, 이용 시간, 인원 및 수하물을 정확히 입력해 주세요.';
    case 'hotel_hotel':
    case 'hotel_attraction':
    default:
      return '3.예약 시 호텔명·주소, 픽업/샌딩 장소, 이용 시간, 인원 및 수하물을 정확히 입력해 주세요.';
  }
}


// ================================================================
//  COACH MARKS — 도쿄 플래너 가이드 팝업
// ================================================================
const COACH_DATA = {
  flight: {
    icon: "✈️", title: "항공권 비교 가이드",
    steps: [
      { target: "#panel-flight .btn-add-entry", emoji:"📸", text:"<b>항공권 추가</b> 버튼을 누르고 캡쳐한 이미지를 <b>'복사/붙여넣기(Ctrl+V)'</b>해서 쉽게 일정을 등록해보세요!" },
      { target: "#flightFilterBar", emoji:"🗓", text:"<b>출발일순 정렬</b>과 <b>연차 필터</b>로 휴가에 맞는 최적의 일정을 찾아보세요." },
      { target: "#flightGrid", pulse: ".btn-select", emoji:"✅", text:"카드에서 전체 여정과 예약 링크를 확인하고 <b>선택</b>하면 상단 대시보드와 지출에 자동 반영됩니다." }
    ]
  },
  hotel: {
    icon: "🏨", title: "도쿄 숙소 비교 가이드",
    steps: [
      { target: "#panel-hotel .btn-add-entry", emoji:"➕", text:"<b>숙소 추가</b> 버튼으로 신주쿠, 시부야, 긴자 등 후보 숙소를 등록하세요." },
      { target: "#hotelFilterBar", emoji:"🗼", text:"<b>도쿄 지역별 필터</b>(신주쿠, 시부야, 긴자, 아사쿠사)로 원하는 위치의 숙소를 빠르게 모아보세요." },
      { target: "#hotelGrid", emoji:"🔗", text:"각 숙소 카드에서 <b>총 숙박비와 예약 링크</b>를 확인하세요." }
    ]
  },
  tour: {
    icon: "🎡", title: "도쿄 투어/티켓 가이드",
    steps: [
      { target: "#tourFilterBar", emoji:"🎟️", text:"<b>카테고리 필터</b>로 디즈니랜드, 시부야 스카이, 메트로 패스를 골라보세요." },
      { target: "#tourGrid", emoji:"📊", text:"<b>KKday · 마이리얼트립 · 클룩 · 트리플</b> 등 플랫폼별 가격을 비교하세요." },
      { target: "#panel-tour .btn-add-entry", emoji:"✏️", text:"<b>투어 추가</b> 버튼으로 직접 찾은 티켓 정보를 넣을 수 있어요." }
    ]
  },
  checklist: {
    icon: "📋", title: "일본 여행 체크리스트 가이드",
    steps: [
      { target: "#checklistLayout", emoji:"✅", text:"비짓재팬웹(VJW), 110V 돼지코, eSIM 등 <b>일본 필수 준비물을 체크</b>해보세요." },
      { target: ".checklist-progress", emoji:"📊", text:"진행률 바에서 전체 준비 <b>진행 상황</b>을 한눈에 확인할 수 있어요." },
      { target: "#panel-checklist .btn-add-entry", emoji:"➕", text:"<b>섹션 추가</b> 버튼으로 나만의 준비물 카테고리도 만들 수 있습니다." }
    ]
  },
  itinerary: {
    icon: "🗺️", title: "도쿄 여행 일정표 가이드",
    steps: [
      { target: "#dayTabsMini", emoji:"📅", text:"<b>Day별 탭</b>에서 일자별 동선을 확인하고 날짜를 추가/편집하세요." },
      { target: ".btn-add-place", emoji:"📍", text:"장소 검색은 Google Maps 자동완성으로 <b>위치 정보가 바로 연동</b>돼요." },
      { target: "#timelineList", emoji:"🔵", text:"타임라인 동그란 <b>번호</b>를 클릭하면 Google 지도 실시간 길찾기로 연결됩니다." }
    ]
  },
  expense: {
    icon: "💸", title: "엔화 & 지출 정리 가이드",
    steps: [
      { target: "#panel-expense .btn-add-entry", emoji:"➕", text:"<b>지출 추가</b> 버튼으로 원화(사전결제) 또는 엔화(현지사용)를 기록하세요." },
      { target: "#expenseSummaryBanner", emoji:"📊", text:"엔화(JPY)와 <b>실시간 환율</b>이 적용된 원화 총액을 한눈에 확인하세요." },
      { target: "#exchangeRateBadge", emoji:"💰", text:"이 영역을 누르면 <b>최신 실시간 엔화 환율</b>을 다시 불러옵니다." }
    ]
  }
};

let coachStep = 0;
let coachTab = "";

function isCoachDismissed(tab) {
  return localStorage.getItem("coach_dismiss_" + tab) === "true";
}

function dismissCoach(tab) {
  localStorage.setItem("coach_dismiss_" + tab, "true");
  closeCoachMark();
}

function showCoachMark(tab) {
  if (!COACH_DATA[tab] || isCoachDismissed(tab)) return;
  coachTab = tab;
  coachStep = 0;
  renderCoachMark();
}

function renderCoachMark() {
  let overlay = document.getElementById("coachOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "coachOverlay";
    document.body.appendChild(overlay);
  }
  const data = COACH_DATA[coachTab];
  const step = data.steps[coachStep];
  const total = data.steps.length;

  const dots = data.steps.map(function(_, i) {
    return '<div class="coach-dot ' + (i === coachStep ? 'active' : '') + '"></div>';
  }).join("");

  const prevBtn = coachStep > 0
    ? '<button class="coach-btn-nav" onclick="coachPrev()">← 이전</button>' : "";
  const nextBtn = coachStep < total - 1
    ? '<button class="coach-btn-next" onclick="coachNext()">다음 →</button>'
    : '<button class="coach-btn-next" onclick="closeCoachMark()">확인 ✓</button>';

  overlay.innerHTML =
    '<div class="coach-backdrop" onclick="closeCoachMark()"></div>' +
    '<div class="coach-spotlight" id="coachSpotlight"></div>' +
    '<div class="coach-card" id="coachCard">' +
      '<div class="coach-header">' +
        '<div class="coach-title">' + data.icon + ' ' + data.title + '</div>' +
        '<button class="coach-close" onclick="closeCoachMark()">✕</button>' +
      '</div>' +
      '<div class="coach-body">' +
        '<div class="coach-step-emoji">' + step.emoji + '</div>' +
        '<div class="coach-step-text">' + step.text + '</div>' +
      '</div>' +
      '<div class="coach-footer">' +
        '<div class="coach-dots">' + dots + '</div>' +
        '<div class="coach-actions">' +
          '<button class="coach-btn-dismiss" onclick="dismissCoach(\'' + coachTab + '\')">이 PC에서 다신 안 보기</button>' +
          '<div style="display:flex;gap:6px;">' + prevBtn + nextBtn + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  overlay.classList.add("active");

  setTimeout(function() {
    updateSpotlight(step.target);
  }, 50);
}

function updateSpotlight(targetSelector) {
  const spotlight = document.getElementById("coachSpotlight");
  const card = document.getElementById("coachCard");
  if (!spotlight || !card) return;

  const targetEl = document.querySelector(targetSelector);
  if (targetEl && targetEl.offsetParent !== null) {
    const rect = targetEl.getBoundingClientRect();
    const pad = 12;
    spotlight.style.opacity = '1';
    spotlight.style.top = (rect.top - pad) + 'px';
    spotlight.style.left = (rect.left - pad) + 'px';
    spotlight.style.width = (rect.width + pad*2) + 'px';
    spotlight.style.height = (rect.height + pad*2) + 'px';
    
    card.style.position = 'absolute';
    let cardTop = rect.bottom + pad + 20;
    if (cardTop + card.offsetHeight > window.innerHeight) {
      cardTop = rect.top - pad - card.offsetHeight - 20;
    }
    if (cardTop < 20) cardTop = 30;

    let cardLeft = rect.left + (rect.width / 2) - (card.offsetWidth / 2);
    if (cardLeft < 20) cardLeft = 20;
    if (cardLeft + card.offsetWidth > window.innerWidth - 20) cardLeft = window.innerWidth - card.offsetWidth - 20;

    card.style.top = cardTop + 'px';
    card.style.left = cardLeft + 'px';
    card.style.margin = '0';

    document.querySelectorAll(".coach-pulse").forEach(function(el) { el.classList.remove("coach-pulse"); });
    const stepData = COACH_DATA[coachTab].steps[coachStep];
    if (stepData.pulse) {
      targetEl.querySelectorAll(stepData.pulse).forEach(function(el) { el.classList.add("coach-pulse"); });
    }
  } else {
    spotlight.style.opacity = '0';
    spotlight.style.top = '50%';
    spotlight.style.left = '50%';
    spotlight.style.width = '0px';
    spotlight.style.height = '0px';
    
    card.style.position = 'relative';
    card.style.top = 'auto';
    card.style.left = 'auto';
    card.style.transform = 'none';
  }
}

function coachNext() { coachStep++; renderCoachMark(); }
function coachPrev() { coachStep--; renderCoachMark(); }
function closeCoachMark() {
  var o = document.getElementById("coachOverlay");
  if (o) o.classList.remove("active");
  document.querySelectorAll(".coach-pulse").forEach(function(el) { el.classList.remove("coach-pulse"); });
}

setTimeout(function() { showCoachMark("flight"); }, 1000);

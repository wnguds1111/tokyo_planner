/* ==============================================
   TOKYO PLANNER — app.js (Tokyo Edition)
   Firebase Firestore + LocalStorage Dual-Sync
   ============================================== */

// ─── Firebase Config ───
const firebaseConfig = {
  apiKey: "AIzaSyBmwX1khTABQH4oVvsuXtJkiz6jczsNHLs",
  authDomain: "plan-8844c.firebaseapp.com",
  projectId: "plan-8844c",
  storageBucket: "plan-8844c.firebasestorage.app",
  messagingSenderId: "526233022174",
  appId: "1:526233022174:web:ff4e91d595adf6a62a9c4f"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const TOKYO_DOC = "tokyo_main_v6";
const LOCAL_STORAGE_KEY = "tokyo_planner_data_v6";

// ─── State ───
let planData = null;
let currentDay = 1;
let flightFilter = "all";
let hotelFilter  = "all";
let flightSort   = "depdate_asc";
let hotelSort    = "default";
let flightAnnualFilter = "all";
let exchangeRateJpyToKrw = 9.2; // 1 JPY = 9.2 KRW (100 JPY = 920 KRW)
let isDataLoaded = false;

// ─── Area Label Map (Tokyo) ───
const AREA_LABELS = {
  shinjuku: "신주쿠 (Shinjuku)",
  shibuya:  "시부야 / 하라주쿠 (Shibuya)",
  ginza:    "긴자 / 도쿄역 (Ginza / Tokyo)",
  asakusa:  "아사쿠사 / 우에노 (Asakusa / Ueno)",
  etc:      "기타 도쿄 지역"
};

// ─── Default Checklist Groups (Japan / Tokyo) ───
const defaultChecklistGroups = [
  {
    id: "flight_entry_prep",
    title: "✈️ 항공 & 입국 준비",
    items: [
      { id:"c1",  text:"여권 유효기간 확인",           desc:"출발일 기준 6개월 이상 남아야 함",              done:false, important:true  },
      { id:"c2",  text:"왕복 항공권 예약 & e-Ticket 저장", desc:"모바일 저장 및 출력본 준비",                     done:false, important:true  },
      { id:"c3",  text:"Visit Japan Web(VJW) 등록",    desc:"입국심사 & 세관신고 QR코드 발급 및 캡처 (vjw.digital.go.jp)", done:false, important:true },
      { id:"c4",  text:"해외 여행자 보험 가입",         desc:"의료비·휴대품 도난·항공기 지연 보장 확인",        done:false, important:false }
    ]
  },
  {
    id: "hotel_transit_prep",
    title: "🏨 숙소 & 이동 준비",
    items: [
      { id:"c5",  text:"호텔 예약 확인서 & 바우처 저장", desc:"체크인 시 제시할 모바일/인쇄본",                 done:false, important:false },
      { id:"c6",  text:"공항 ↔ 시내 교통편 확인",      desc:"스카이라이너 / N'EX / 액세스특급 사전 확인",      done:false, important:true  },
      { id:"c7",  text:"체크인 전후 짐보관 서비스 확인",  desc:"호텔 프론트 또는 역 코인락커 위치 파악",          done:false, important:false }
    ]
  },
  {
    id: "local_payment_prep",
    title: "🇯🇵 현지 & 결제 준비",
    items: [
      { id:"c8",  text:"엔화(JPY) 환전 & 트래블 카드 충전", desc:"트래블로그/트래블월렛 충전 및 비상 현금 환전",    done:false, important:true  },
      { id:"c9",  text:"일본 eSIM or 포켓와이파이 구매",   desc:"출국 전 개통 안내서 확인",                     done:false, important:true  },
      { id:"c10", text:"모바일 스이카(Suica)/파스모 등록", desc:"아이폰 애플페이 교통카드 추가 or 현지 카드",     done:false, important:true  },
      { id:"c11", text:"도쿄 메트로 72시간 패스 구매",     desc:"도쿄 지하철 무제한 탑승 가성비 패스",            done:false, important:false },
      { id:"c12", text:"디즈니랜드 / 시부야 스카이 예매",   desc:"인기 티켓 사전 예매 필수 (일몰 시간대 매진 주의)", done:false, important:true  },
      { id:"c13", text:"돈키호테 / 빅카메라 할인쿠폰 캡처", desc:"면세 10% + 추가 5~7% 쿠폰 저장",             done:false, important:false }
    ]
  },
  {
    id: "packing_prep",
    title: "🎒 짐 싸기",
    items: [
      { id:"c14", text:"110V 11자 돼지코 어댑터",       desc:"일본 전압 110V A타입 변환 플러그 필수",          done:false, important:true  },
      { id:"c15", text:"편안한 운동화",               desc:"도쿄 도보 여행 필수 (하루 2만보 👟)",          done:false, important:true  },
      { id:"c16", text:"동전지갑 (엔화 동전용)",         desc:"1엔/5엔/10엔/50엔/100엔/500엔 수납용",          done:false, important:false },
      { id:"c17", text:"보조배터리 (기내 수하물)",       desc:"카메라·스마트폰 배터리 소모 대비",               done:false, important:false },
      { id:"c18", text:"상비약 (소화제·두통약·동전파스)",  desc:"휴족시간, 카베진 등 현지 구매도 가능",           done:false, important:false }
    ]
  }
];

// ─── Default Tokyo Data (Sample Data) ───
const defaultTokyoData = {
  departDate: "2026-10-07T00:00:00",
  flights: [
    {
      id: "f_tokyo_1",
      airline: "제주항공",
      bookingRef: "7C1107",
      price: 0,
      cls: "STANDARD (이코노미)",
      imageUrl: "",
      depdate: "2026-10-07",
      outFlightNo: "7C1107",
      outDepAirport: "서울(인천) (ICN) 1 터미널",
      outDepTime: "15:00",
      outArrAirport: "도쿄(나리타) (NRT) 3 터미널",
      outArrTime: "17:30",
      rdate: "2026-10-10",
      inFlightNo: "7C1106",
      inDepAirport: "도쿄(나리타) (NRT) 3 터미널",
      inDepTime: "16:50",
      inArrAirport: "서울(인천) (ICN) 1 터미널",
      inArrTime: "19:40",
      totalNights: "3",
      totalDays: "4",
      annualLeave: "2",
      link: "https://www.jejuair.net",
      memo: "주발놈 & 미녀 500일 기념 도쿄 여행 💖 · 위탁 수하물 (기본 15Kg) 포함 · STANDARD 운임",
      selected: true
    }
  ],
  hotels: [
    {
      id: "h_tokyo_1",
      name: "밀레니엄 미츠이 가든 호텔 도쿄 / 긴자 (Millennium Mitsui Garden Hotel Tokyo / Ginza)",
      area: "ginza",
      checkin: "2026-10-07",
      checkout: "2026-10-10",
      price: 0,
      tag: "best",
      desc: "히가시긴자역 바로 앞, 긴자 쇼핑가 중심 럭셔리 & 모던 호텔 (체크인 15:00 ~ 체크아웃 12:00)",
      link: "https://www.gardenhotels.co.jp/millennium-tokyo/",
      memo: "10월 7일 15:00 체크인 – 10월 10일 12:00 체크아웃 · 도쿄/동경 긴자 중심가 도보 1분 🏨",
      selected: true
    }
  ],
  tours: [],
  days: {
    1: [
      { id:1001, time:"17:30", name:"도쿄 나리타 공항 (T3) 도착 & 입국 수속", lat:35.7720, lng:140.3929, memo:"제주항공 7C1107편 도착, 입국 심사 및 게이세이 액세스특급/스카이라이너 탑승 🚊" },
      { id:1002, time:"19:30", name:"밀레니엄 미츠이 가든 호텔 긴자 체크인", lat:35.6698, lng:139.7656, memo:"체크인 및 짐 정리 후 가벼운 옷차림으로 긴자 번화가 산책 🏨" },
      { id:1003, time:"20:30", name:"긴자 / 신바시 이자카야 & 저녁 식사", lat:35.6668, lng:139.7583, memo:"야키토리 꼬치구이와 시원한 나마비루(생맥주)로 1일차 축하 🍻" }
    ],
    2: [
      { id:2001, time:"09:30", name:"아사쿠사 센소지 & 나카미세도리", lat:35.7148, lng:139.7967, memo:"도쿄에서 가장 오래된 사찰 산책과 메론빵·녹차 당고 🍵" },
      { id:2002, time:"12:30", name:"도쿄 스카이트리 & 소라마치", lat:35.7101, lng:139.8107, memo:"일본 최고 높이 타워 전망 및 소라마치 쇼핑몰 점심 식사 🗼" },
      { id:2003, time:"15:30", name:"아키하바라 전자상가 거리", lat:35.6984, lng:139.7731, memo:"피규어, 게임, 전자제품 및 애니메이션 굿즈 구경 🎮" },
      { id:2004, time:"18:30", name:"긴자 명품 거리 & 식당가", lat:35.6719, lng:139.7640, memo:"긴자 식스 및 백화점 쇼핑 후 고급 돈카츠/스시 저녁 식사 🍣" }
    ],
    3: [
      { id:3001, time:"09:00", name:"메이지 신궁 & 하라주쿠 다케시타도리", lat:35.6764, lng:139.6993, memo:"울창한 도심 숲길 산책 및 하라주쿠 트렌디 카페/크레페 ☕" },
      { id:3002, time:"14:00", name:"시부야 스크램블 교차로 & 시부야 스카이", lat:35.6585, lng:139.7022, memo:"하치코 동상 인증샷 & 환상적인 360도 도쿄 파노라마 일몰 감상 🌇" },
      { id:3003, time:"19:30", name:"롯폰기 힐즈 도쿄 시티뷰 (도쿄타워)", lat:35.6605, lng:139.7292, memo:"붉게 빛나는 도쿄타워를 가장 아름답게 조망하는 로맨틱 야경 🗼💖" }
    ],
    4: [
      { id:4001, time:"10:00", name:"호텔 체크아웃 & 긴자 식스 산책", lat:35.6698, lng:139.7656, memo:"호텔 프론트에 짐 보관 후 긴자 주변 여유로운 모닝 커피 ☕" },
      { id:4002, time:"11:30", name:"도쿄역 캐릭터 스트리트 & 기념품 쇼핑", lat:35.6812, lng:139.7671, memo:"도쿄 바나나, 시로이코이비토, 라멘 스트리트 점심 식사 🍜🛍️" },
      { id:4003, time:"14:00", name:"나리타 공항 제3터미널 이동", lat:35.7720, lng:140.3929, memo:"공항 도착, 출국 수속 및 면세점 선물 구매 🛍️" },
      { id:4004, time:"16:50", name:"제주항공 7C1106편 탑승 & 귀국", lat:35.7720, lng:140.3929, memo:"16:50 도쿄(나리타 T3) 출발 ➔ 19:40 서울(인천 T1) 도착 ✈️" }
    ]
  },
  memos: [
    { text: "🇯🇵 비짓재팬웹(Visit Japan Web) 입국/세관 QR코드 미리 캡처해두기!", time: "08.24 10:00" },
    { text: "🪙 일본은 동전이 많이 생기니 다이소 동전지갑 필수 지참!", time: "08.24 10:05" },
    { text: "🍣 시부야 스카이는 일몰 시간대 4주 전 예약 필수!", time: "08.24 10:10" }
  ],
  expenses: []
};

// ─── Init ───
document.addEventListener("DOMContentLoaded", async () => {
  generateStars();
  generateCherryBlossoms();
  await loadData();
  startCountdown();
  fetchExchangeRate();
  renderFlights();
  renderHotels();
  renderTours();
  renderChecklist();
  renderDayTabs();
  renderTimeline();
  renderMemos();
  renderExpenses();
  renderBookingSummary();

  // Google Maps 자동 로드
  activateMap();
});

// ─── Particle Effects ───
function generateStars() {
  const f = document.getElementById("starField");
  if (!f) return;
  f.innerHTML = "";
  for (let i = 0; i < 60; i++) {
    const s = document.createElement("div");
    s.className = "star";
    s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;--dur:${2+Math.random()*4}s;--op:${0.3+Math.random()*0.7};animation-delay:${Math.random()*5}s;`;
    f.appendChild(s);
  }
}

function generateCherryBlossoms() {
  const container = document.createElement("div");
  container.className = "floating-sakura-wrap";
  
  let html = "";
  for (let i = 0; i < 15; i++) {
    const left = Math.random() * 96 + 2;
    const duration = 12 + Math.random() * 18;
    const delay = Math.random() * -20;
    const size = 16 + Math.random() * 16;
    const opacity = 0.5 + Math.random() * 0.4;
    
    html += `<div class="floating-sakura" style="left:${left}vw; width:${size}px; height:${size}px; animation-duration:${duration}s; animation-delay:${delay}s; opacity:${opacity};">🌸</div>`;
  }
  container.innerHTML = html;
  document.body.appendChild(container);

  const savedMode = localStorage.getItem("tokyoThemeMode");
  const btn = document.getElementById("btnQuokkaToggle");
  if (savedMode === "off") {
    container.classList.add("hidden");
    if (btn) btn.innerHTML = "도쿄 감성 OFF 💤";
  } else {
    if (btn) btn.innerHTML = "도쿄 감성 ON 🌸";
  }
}

function toggleTokyoTheme() {
  const container = document.querySelector(".floating-sakura-wrap");
  const btn = document.getElementById("btnQuokkaToggle");
  if (!container || !btn) return;

  if (container.classList.contains("hidden")) {
    container.classList.remove("hidden");
    btn.innerHTML = "도쿄 감성 ON 🌸";
    localStorage.setItem("tokyoThemeMode", "on");
  } else {
    container.classList.add("hidden");
    btn.innerHTML = "도쿄 감성 OFF 💤";
    localStorage.setItem("tokyoThemeMode", "off");
  }
}

// ─── Countdown ───
function startCountdown() {
  const update = () => {
    const targetDateStr = planData?.departDate || "2026-10-07T00:00:00";
    const target = new Date(targetDateStr).getTime();
    const diff = target - Date.now();
    if (diff <= 0) {
      ["cdDays","cdHours","cdMins","cdSecs"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = "00";
      });
      return;
    }
    const d = Math.floor(diff/86400000);
    const h = Math.floor((diff%86400000)/3600000);
    const m = Math.floor((diff%3600000)/60000);
    const s = Math.floor((diff%60000)/1000);
    
    if (document.getElementById("cdDays")) document.getElementById("cdDays").textContent = String(d).padStart(2,"0");
    if (document.getElementById("cdHours")) document.getElementById("cdHours").textContent = String(h).padStart(2,"0");
    if (document.getElementById("cdMins")) document.getElementById("cdMins").textContent = String(m).padStart(2,"0");
    if (document.getElementById("cdSecs")) document.getElementById("cdSecs").textContent = String(s).padStart(2,"0");
  };
  update();
  setInterval(update, 1000);
}

// ─── Dual-Storage: Load / Save (Fail-safe) ───
let saveTimer = null;

function showSaveToast() {
  const toast = document.getElementById("saveToast");
  if (!toast) return;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}

function scheduleSave() {
  if (!planData) return;

  // 1. 즉시 로컬 스토리지에 백업 (오프라인 / 새로고침 시 100% 무손실 보장)
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(planData));
  } catch (err) {
    console.warn("LocalStorage save error:", err);
  }

  // 2. Firestore 비동기 저장 (300ms debounce)
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    db.collection("planData").doc(TOKYO_DOC).set({
      ...planData,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      showSaveToast();
      console.log("☁️ 도쿄 플래너 클라우드 동기화 완료");
    })
    .catch(e => {
      console.error("Firestore Save error:", e);
    });
  }, 300);
}

async function loadData() {
  // Step 1: 빠른 로컬 캐시 확인 및 즉시 렌더링 준비
  try {
    const localCached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (localCached) {
      planData = JSON.parse(localCached);
      planData.departDate = "2026-10-07T00:00:00";
      isDataLoaded = true;
      console.log("⚡ 로컬 캐시에서 도쿄 플래너 즉시 로드 완료");
    }
  } catch (e) {
    console.warn("Local cache read error:", e);
  }

  // Step 2: Firestore 원격 데이터베이스 로드
  try {
    const snap = await db.collection("planData").doc(TOKYO_DOC).get();
    if (snap.exists) {
      const dbData = snap.data();
      planData = dbData;
      planData.departDate = "2026-10-07T00:00:00";
      // 누락 필드 방어 (사용자가 삭제한 빈 배열은 그대로 유지)
      if (!planData.checklistGroups) planData.checklistGroups = JSON.parse(JSON.stringify(defaultChecklistGroups));
      if (!Array.isArray(planData.flights)) {
        planData.flights = JSON.parse(JSON.stringify(defaultTokyoData.flights));
      }
      if (!Array.isArray(planData.hotels)) {
        planData.hotels = JSON.parse(JSON.stringify(defaultTokyoData.hotels));
      }
      if (!Array.isArray(planData.tours)) {
        planData.tours = [];
      }
      if (!Array.isArray(planData.memos)) {
        planData.memos = [];
      }
      if (!Array.isArray(planData.expenses)) {
        planData.expenses = [];
      }
      if (!planData.days) {
        planData.days = JSON.parse(JSON.stringify(defaultTokyoData.days));
      }

      isDataLoaded = true;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(planData));
      console.log("✅ Firestore에서 도쿄 플래너 데이터 동기화 완료");
    } else {
      // 신규 도쿄 데이터 초기 생성
      console.log("📝 신규 도쿄 플래너 기본 데이터 생성 및 초기화");
      planData = JSON.parse(JSON.stringify(defaultTokyoData));
      planData.checklistGroups = JSON.parse(JSON.stringify(defaultChecklistGroups));
      isDataLoaded = true;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(planData));
      
      // Firestore에 최초 저장
      await db.collection("planData").doc(TOKYO_DOC).set({
        ...planData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (e) {
    console.error("Firestore Load error:", e);
    // Firestore 로드 실패 시에도 로컬 캐시가 없으면 기본값으로 활성화
    if (!planData) {
      planData = JSON.parse(JSON.stringify(defaultTokyoData));
      planData.checklistGroups = JSON.parse(JSON.stringify(defaultChecklistGroups));
    }
    isDataLoaded = true;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(planData));
  }
}

// ─── Tab ───
function switchTab(tab, btn) {
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  const panel = document.getElementById("panel-" + tab);
  if (panel) panel.classList.add("active");
  if (btn) btn.classList.add("active");
}

// ================================================================
//  FLIGHT — CRUD + Render
// ================================================================

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 1200;
      let width = img.width;
      let height = img.height;
      if (width > MAX_WIDTH) {
        height = Math.round(height * MAX_WIDTH / width);
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);
      
      const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
      document.getElementById("fm_image_base64").value = dataUrl;
      document.getElementById("imagePreviewArea").innerHTML = `<img src="${dataUrl}" style="width:100%; height:100%; object-fit:contain; border-radius:8px;">`;
      document.getElementById("imagePreviewArea").style.borderColor = "var(--brand-pink)";
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function handleImagePaste(e) {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image") !== -1) {
      const file = items[i].getAsFile();
      handleImageUpload({ target: { files: [file] } });
      e.preventDefault();
      break;
    }
  }
}

function openFlightModal(id) {
  const f = planData.flights.find(x => x.id === id);
  document.getElementById("flightEditId").value = id || "";
  document.getElementById("flightModalTitle").textContent = id ? "✈️ 항공 일정 수정" : "✈️ 항공 일정 추가";
  document.getElementById("fm_airline").value     = f?.airline || "";
  document.getElementById("fm_booking_ref").value = f?.bookingRef || "";
  document.getElementById("fm_price").value       = f?.price || "";
  
  // 가는 편
  document.getElementById("fm_depdate").value        = f?.depdate || "";
  document.getElementById("fm_out_flight_no").value   = f?.outFlightNo || "";
  document.getElementById("fm_out_dep_airport").value = f?.outDepAirport || "";
  document.getElementById("fm_out_dep_time").value    = f?.outDepTime || "";
  document.getElementById("fm_out_arr_airport").value = f?.outArrAirport || "";
  document.getElementById("fm_out_arr_time").value    = f?.outArrTime || "";

  // 오는 편
  document.getElementById("fm_rdate").value         = f?.rdate || "";
  document.getElementById("fm_in_flight_no").value   = f?.inFlightNo || "";
  document.getElementById("fm_in_dep_airport").value = f?.inDepAirport || "";
  document.getElementById("fm_in_dep_time").value    = f?.inDepTime || "";
  document.getElementById("fm_in_arr_airport").value = f?.inArrAirport || "";
  document.getElementById("fm_in_arr_time").value    = f?.inArrTime || "";

  document.getElementById("fm_total_nights").value = f?.totalNights || "";
  document.getElementById("fm_total_days").value   = f?.totalDays || "";
  document.getElementById("fm_link").value         = f?.link || "";
  document.getElementById("fm_memo").value         = f?.memo || "";
  
  const imageUrl = f?.imageUrl || "";
  document.getElementById("fm_image_base64").value = imageUrl;
  const preview = document.getElementById("imagePreviewArea");
  if (preview) {
    if (imageUrl) {
      preview.innerHTML = `<img src="${imageUrl}" style="width:100%; height:100%; object-fit:contain; border-radius:8px;">`;
      preview.style.borderColor = "var(--brand-pink)";
    } else {
      preview.innerHTML = `<span style="color:var(--text-sub); pointer-events:none; font-weight:600; text-align:center;">+ 클릭, 드래그 또는<br>영역 선택 후 Ctrl+V (붙여넣기)</span>`;
      preview.style.borderColor = "var(--hairline)";
    }
  }

  const annualVal = f?.annualLeave || "";
  document.querySelectorAll('input[name="fm_annual"]').forEach(r => r.checked = (r.value === annualVal));
  if (!annualVal) document.getElementById("fm_annual_none").checked = true;
  document.getElementById("flightModal").classList.add("active");
}

function closeFlightModal() {
  document.getElementById("flightModal").classList.remove("active");
}

function saveFlight() {
  const price = parseInt(document.getElementById("fm_price").value) || 0;
  const existingId = document.getElementById("flightEditId").value;
  const existing   = planData.flights.find(x => x.id === existingId);

  const entry = {
    id:             existingId || ("f_" + Date.now()),
    airline:        document.getElementById("fm_airline").value.trim(),
    bookingRef:     document.getElementById("fm_booking_ref").value.trim(),
    price,
    cls:            "이코노미",
    imageUrl:       document.getElementById("fm_image_base64").value.trim(),
    depdate:        document.getElementById("fm_depdate").value,
    outFlightNo:    document.getElementById("fm_out_flight_no").value.trim(),
    outDepAirport:  document.getElementById("fm_out_dep_airport").value.trim(),
    outDepTime:     document.getElementById("fm_out_dep_time").value,
    outArrAirport:  document.getElementById("fm_out_arr_airport").value.trim(),
    outArrTime:     document.getElementById("fm_out_arr_time").value,
    rdate:          document.getElementById("fm_rdate").value,
    inFlightNo:     document.getElementById("fm_in_flight_no").value.trim(),
    inDepAirport:   document.getElementById("fm_in_dep_airport").value.trim(),
    inDepTime:      document.getElementById("fm_in_dep_time").value,
    inArrAirport:   document.getElementById("fm_in_arr_airport").value.trim(),
    inArrTime:      document.getElementById("fm_in_arr_time").value,
    totalNights:    document.getElementById("fm_total_nights").value.trim(),
    totalDays:      document.getElementById("fm_total_days").value.trim(),
    link:           document.getElementById("fm_link").value.trim(),
    annualLeave:    document.querySelector('input[name="fm_annual"]:checked')?.value || "",
    memo:           document.getElementById("fm_memo").value.trim(),
    selected:       existing ? existing.selected : (planData.flights.length === 0)
  };

  const idx = planData.flights.findIndex(x => x.id === entry.id);
  if (idx >= 0) planData.flights[idx] = entry;
  else planData.flights.push(entry);

  closeFlightModal();
  renderFlights();
  syncExpensesFromSelections();
  renderBookingSummary();
  scheduleSave();
}

function selectFlight(id) {
  planData.flights.forEach(f => {
    f.selected = (f.id === id) ? !f.selected : false;
  });
  renderFlights();
  syncExpensesFromSelections();
  renderBookingSummary();
  scheduleSave();
}

function deleteFlight(id) {
  if (!confirm("이 항공권을 삭제할까요?")) return;
  planData.flights = planData.flights.filter(x => x.id !== id);
  renderFlights();
  syncExpensesFromSelections();
  renderBookingSummary();
  scheduleSave();
}

function filterByAnnual(days, btn) {
  flightAnnualFilter = (flightAnnualFilter === days) ? "all" : days;
  document.querySelectorAll("#annualBtn_1, #annualBtn_2, #annualBtn_3").forEach(b => b.classList.remove("active"));
  if (flightAnnualFilter !== "all" && btn) btn.classList.add("active");
  renderFlights();
}

function sortFlights(by, btn) {
  flightSort = by;
  document.querySelectorAll("#flightFilterBar .filter-chip").forEach(c => c.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderFlights();
}

function renderFlights() {
  if (!planData) return;
  const emptyEl  = document.getElementById("flightEmptyState");
  const gridEl   = document.getElementById("flightGrid");
  if (!emptyEl || !gridEl) return;

  let list = [...planData.flights];

  if (flightSort === "price") list.sort((a,b) => (a.price||Infinity) - (b.price||Infinity));
  if (flightSort === "depdate_asc") list.sort((a,b) => (a.depdate||"").localeCompare(b.depdate||""));
  if (flightSort === "depdate_desc") list.sort((a,b) => (b.depdate||"").localeCompare(a.depdate||""));

  if (flightAnnualFilter !== "all") list = list.filter(f => f.annualLeave === flightAnnualFilter);

  if (planData.flights.length === 0) {
    emptyEl.style.display = "flex";
    gridEl.style.display  = "none";
    return;
  }

  emptyEl.style.display = "none";
  gridEl.style.display  = "";

  gridEl.innerHTML = list.map(f => {
    const isSelected = f.selected || false;
    
    const imageHtml = f.imageUrl ? `
      <div style="margin-top:12px; border-radius:12px; overflow:hidden; border:1px solid var(--hairline); width:100%; background:var(--surface-soft);">
        <img src="${f.imageUrl}" style="width:100%; height:auto; max-height:300px; object-fit:contain; display:block; margin:0 auto;" alt="항공 일정 캡쳐">
      </div>
    ` : "";

    const linkHtml = f.link ? `
      <div style="margin-top:10px;">
        <a href="${f.link}" target="_blank" style="color:var(--brand-pink); text-decoration:none; display:inline-flex; align-items:center; gap:6px; font-weight:700; font-size:13px;">
          🔗 항공권 예약 링크 이동
        </a>
      </div>
    ` : "";

    const badges = [];
    if (f.airline) badges.push(`<span class="badge-pill" style="background:rgba(255,117,143,0.1);border:1px solid rgba(255,117,143,0.3);color:var(--brand-pink);">✈️ ${f.airline}</span>`);
    if (f.bookingRef) badges.push(`<span class="badge-pill" style="background:rgba(124,77,255,0.08);border:1px solid rgba(124,77,255,0.25);color:var(--brand-lavender);">🎫 ${f.bookingRef}</span>`);
    if (f.annualLeave) badges.push(`<span class="badge-pill" style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);color:var(--success);">🏖️ 연차 ${f.annualLeave}일</span>`);

    function formatDateForFlight(dateStr) {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      if (isNaN(d)) return "";
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const wk = ["일","월","화","수","목","금","토"][d.getDay()];
      return `${m}.${day} (${wk})`;
    }

    const outDepDateStr = formatDateForFlight(f.depdate) || "출발일 미정";
    const inDepDateStr  = formatDateForFlight(f.rdate) || "도착일 미정";

    // 가는 편 스케줄 박스
    const outScheduleHtml = `
      <div style="background:var(--surface-soft); padding:10px 14px; border-radius:10px; border:1px solid var(--hairline); margin-top:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <span style="font-size:12px; font-weight:800; color:var(--brand-pink);">🛫 가는 편 · ${outDepDateStr}</span>
          ${f.outFlightNo ? `<span style="font-size:11px; font-weight:700; background:rgba(255,117,143,0.12); color:var(--brand-pink); padding:2px 8px; border-radius:6px;">${f.outFlightNo}</span>` : ""}
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; font-size:13px; font-weight:700;">
          <div>${f.outDepAirport || "인천 (ICN)"} <span style="font-size:15px; font-weight:900; color:var(--ink);">${f.outDepTime || "--:--"}</span></div>
          <div style="font-size:12px; color:var(--muted); padding:0 8px;">── ✈️ ──▶</div>
          <div>${f.outArrAirport || "나리타 (NRT)"} <span style="font-size:15px; font-weight:900; color:var(--ink);">${f.outArrTime || "--:--"}</span></div>
        </div>
      </div>
    `;

    // 오는 편 스케줄 박스
    const inScheduleHtml = `
      <div style="background:var(--surface-soft); padding:10px 14px; border-radius:10px; border:1px solid var(--hairline); margin-top:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <span style="font-size:12px; font-weight:800; color:var(--brand-lavender);">🛬 오는 편 · ${inDepDateStr}</span>
          ${f.inFlightNo ? `<span style="font-size:11px; font-weight:700; background:rgba(124,77,255,0.12); color:var(--brand-lavender); padding:2px 8px; border-radius:6px;">${f.inFlightNo}</span>` : ""}
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; font-size:13px; font-weight:700;">
          <div>${f.inDepAirport || "나리타 (NRT)"} <span style="font-size:15px; font-weight:900; color:var(--ink);">${f.inDepTime || "--:--"}</span></div>
          <div style="font-size:12px; color:var(--muted); padding:0 8px;">── ✈️ ──▶</div>
          <div>${f.inArrAirport || "인천 (ICN)"} <span style="font-size:15px; font-weight:900; color:var(--ink);">${f.inArrTime || "--:--"}</span></div>
        </div>
      </div>
    `;

    return `
    <div class="glass-card fc-card-wrap ${isSelected ? 'selected' : ''}" id="fc-${f.id}">
      <div class="fc-top-row">
        <div class="fc-top-left">
          <div class="fc-summary-text" style="font-size:16px; font-weight:800; display:flex; align-items:center; gap:8px;">
            <span>${f.airline || "항공권"}</span>
            <span style="font-size:13px; font-weight:600; color:var(--text-muted);">(${f.totalNights ? `${f.totalNights}박 ${f.totalDays||Number(f.totalNights)+1}일` : "일정"})</span>
          </div>
          <div class="fc-badges" style="margin-top:6px;">${badges.join("")}</div>
        </div>
        <div class="fc-top-right">
          <div class="fc-price">${f.price ? fmtPrice(f.price) : "-"}<span>원</span></div>
          <div class="fc-actions">
            <button class="btn-select ${isSelected ? 'selected-active' : ''}" onclick="selectFlight('${f.id}')">
              ${isSelected ? '✅ 선택됨' : '☐ 선택'}
            </button>
            <button class="btn-action" onclick="openFlightModal('${f.id}')" title="수정">✏️</button>
            <button class="btn-action del" onclick="deleteFlight('${f.id}')" title="삭제">🗑</button>
          </div>
        </div>
      </div>
      <div class="fc-body">
        ${outScheduleHtml}
        ${inScheduleHtml}
        ${imageHtml}
        ${linkHtml}
        ${f.memo ? `<div class="fc-memo" style="margin-top:8px;">💬 ${f.memo}</div>` : ""}
      </div>
    </div>`;
  }).join("");
}

// ── Helpers ──
function fmtPrice(n) { return Number(n).toLocaleString(); }

// ================================================================
//  HOTEL — CRUD + Render
// ================================================================

function openHotelModal(id) {
  const h = planData.hotels.find(x => x.id === id);
  document.getElementById("hotelEditId").value = id || "";
  document.getElementById("hotelModalTitle").textContent = id ? "🏨 숙소 수정" : "🏨 숙소 추가";
  
  document.getElementById("hm_area").value     = h?.area     || "shinjuku";
  document.getElementById("hm_checkin").value  = h?.checkin  || "";
  document.getElementById("hm_checkout").value = h?.checkout || "";
  document.getElementById("hm_name").value     = h?.name     || "";
  document.getElementById("hm_price").value    = h?.price    || "";
  document.getElementById("hm_tag").value      = h?.tag      || "";
  document.getElementById("hm_desc").value     = h?.desc     || "";
  document.getElementById("hm_link").value     = h?.link     || "";
  document.getElementById("hm_memo").value     = h?.memo     || "";
  document.getElementById("hotelModal").classList.add("active");
}

function closeHotelModal() {
  document.getElementById("hotelModal").classList.remove("active");
}

function saveHotel() {
  const name = document.getElementById("hm_name").value.trim();
  if (!name) { alert("호텔명을 입력해 주세요."); return; }

  const existingId = document.getElementById("hotelEditId").value;
  const existing   = planData.hotels.find(x => x.id === existingId);

  const entry = {
    id:       existingId || ("h_" + Date.now()),
    name,
    area:     document.getElementById("hm_area").value || "shinjuku",
    checkin:  document.getElementById("hm_checkin").value,
    checkout: document.getElementById("hm_checkout").value,
    price:    parseInt(document.getElementById("hm_price").value) || 0,
    tag:      document.getElementById("hm_tag").value,
    desc:     document.getElementById("hm_desc").value.trim(),
    link:     document.getElementById("hm_link").value.trim(),
    memo:     document.getElementById("hm_memo").value.trim(),
    selected: existing?.selected || false
  };

  const idx = planData.hotels.findIndex(x => x.id === entry.id);
  if (idx >= 0) planData.hotels[idx] = entry;
  else planData.hotels.push(entry);

  closeHotelModal();
  renderHotels();
  syncExpensesFromSelections();
  renderBookingSummary();
  scheduleSave();
}

function selectHotel(id) {
  const h = planData.hotels.find(x => x.id === id);
  if (h) h.selected = !h.selected;
  renderHotels();
  syncExpensesFromSelections();
  renderBookingSummary();
  scheduleSave();
}

function deleteHotel(id) {
  if (!confirm("이 숙소를 삭제할까요?")) return;
  planData.hotels = planData.hotels.filter(x => x.id !== id);
  renderHotels();
  syncExpensesFromSelections();
  renderBookingSummary();
  scheduleSave();
}

function filterHotels(area, btn) {
  hotelFilter = area;
  document.querySelectorAll("#hotelFilterBar .filter-chip").forEach(c => c.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderHotels();
}

function sortHotels(by, btn) {
  hotelSort = by;
  document.querySelectorAll("#hotelFilterBar .filter-chip").forEach(c => c.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderHotels();
}

function renderHotels() {
  if (!planData) return;
  const emptyEl = document.getElementById("hotelEmptyState");
  const gridEl  = document.getElementById("hotelGrid");
  if (!emptyEl || !gridEl) return;

  let list = [...planData.hotels];
  if (hotelFilter !== "all") list = list.filter(h => (h.area || "shinjuku") === hotelFilter);
  if (hotelSort === "price_asc") list.sort((a,b) => (a.price||Infinity) - (b.price||Infinity));
  if (hotelSort === "price_desc") list.sort((a,b) => (b.price||0) - (a.price||0));

  if (planData.hotels.length === 0) {
    emptyEl.style.display = "flex";
    gridEl.style.display  = "none";
    return;
  }

  emptyEl.style.display = "none";
  gridEl.style.display  = "grid";

  gridEl.innerHTML = list.map(h => {
    const tagLabels = { best:"👑 BEST", value:"💚 가성비", pick:"⭐ 내 픽" };
    const tagHtml   = h.tag ? `<div class="hc-tag ${h.tag}">${tagLabels[h.tag]||""}</div>` : "";
    const memoHtml  = h.memo ? `<div class="hc-card-memo">💬 ${h.memo}</div>` : "";
    const descHtml  = h.desc ? `<div class="hc-card-desc">${h.desc}</div>` : "";
    const isSelected = h.selected || false;
    const areaName  = AREA_LABELS[h.area] || "도쿄 숙소";

    let datesHtml = "";
    let nights = 0;
    if (h.checkin && h.checkout) {
      const ci = h.checkin.substring(5).replace("-", "/");
      const co = h.checkout.substring(5).replace("-", "/");
      const d1 = new Date(h.checkin);
      const d2 = new Date(h.checkout);
      if (!isNaN(d1) && !isNaN(d2)) nights = Math.max(1, Math.round((d2 - d1) / 86400000));
      datesHtml = `<div style="font-size:12px; font-weight:700; color:var(--brand-pink); margin-bottom:6px;">🗓️ ${ci} ~ ${co} (${nights}박)</div>`;
    }

    const totalPrice = h.price && nights > 0 ? h.price * nights : h.price;
    const priceUnit = nights > 1
      ? `원 <span style="font-size:11px; opacity:0.7; font-weight:600;">(${nights}박 총액)</span>`
      : `원 / 박`;

    const bookBtn = h.link
      ? `<a class="btn-link-sm agoda" href="${h.link}" target="_blank" style="padding:8px 16px; border-radius:8px; font-size:13px; text-align:center; width:100%; display:block; box-sizing:border-box;">🔗 숙소 예약 링크 이동</a>`
      : "";

    return `
    <div class="glass-card hc-card ${isSelected ? 'selected' : ''}">
      ${tagHtml}
      <div class="hc-card-top">
        <div class="hc-card-header">
          <div>
            <div style="font-size:11px; font-weight:700; color:var(--brand-pink); text-transform:uppercase; margin-bottom:4px;">
              🗼 ${areaName}
            </div>
            ${datesHtml}
            <div class="hc-card-name" style="margin-bottom:0px; font-size:16px;">${h.name}</div>
          </div>
          <div class="hc-card-actions">
            <button class="btn-select ${isSelected ? 'selected-active' : ''}" onclick="selectHotel('${h.id}')">
              ${isSelected ? '✅ 선택됨' : '☐ 선택'}
            </button>
            <button class="btn-action" onclick="openHotelModal('${h.id}')" title="수정">✏️</button>
            <button class="btn-action del" onclick="deleteHotel('${h.id}')" title="삭제">🗑</button>
          </div>
        </div>
        ${totalPrice > 0 ? `
        <div class="hc-card-price" style="margin-top:12px;">
          <div class="hc-price-num">${fmtPrice(totalPrice)}</div>
          <div class="hc-price-unit">${priceUnit}</div>
        </div>` : ""}
        ${descHtml}
        ${memoHtml}
      </div>
      ${bookBtn ? `<div class="hc-card-links">${bookBtn}</div>` : ""}
    </div>`;
  }).join("");
}

// ================================================================
//  TOUR — CRUD + Render
// ================================================================
let tourFilter = "all";

const PLATFORM_STYLE = {
  "KKday":        { bg:"rgba(255,107,53,0.08)",  border:"rgba(255,107,53,0.25)",  color:"#c2410c" },
  "마이리얼트립":  { bg:"rgba(34,197,94,0.08)",   border:"rgba(34,197,94,0.25)",   color:"#16a34a" },
  "클룩":         { bg:"rgba(255,90,95,0.08)",   border:"rgba(255,90,95,0.25)",   color:"#e11d48" },
  "트리플":       { bg:"rgba(139,92,246,0.08)",  border:"rgba(139,92,246,0.25)",  color:"#7c3aed" },
  "공식홈페이지":  { bg:"rgba(107,114,128,0.08)", border:"rgba(107,114,128,0.2)",  color:"#4b5563" }
};
const CAT_ICON = { "관광":"🏛", "액티비티":"🎢", "교통/패스":"🚇", "식사":"🍣", "기타":"📦" };

function openTourModal(id) {
  const t = planData.tours?.find(x => x.id === id);
  document.getElementById("tourEditId").value = id || "";
  document.getElementById("tourModalTitle").textContent = id ? "🎡 투어 / 티켓 수정" : "🎡 투어 / 티켓 추가";
  document.getElementById("tm_name").value     = t?.name     || "";
  document.getElementById("tm_platform").value = t?.platform || "KKday";
  document.getElementById("tm_cat").value      = t?.cat      || "관광";
  document.getElementById("tm_price").value    = t?.price    || "";
  document.getElementById("tm_dur").value      = t?.dur      || "";
  document.getElementById("tm_desc").value     = t?.desc     || "";
  document.getElementById("tm_link").value     = t?.link     || "";
  document.getElementById("tm_memo").value     = t?.memo     || "";
  document.getElementById("tourModal").classList.add("active");
}

function closeTourModal() {
  document.getElementById("tourModal").classList.remove("active");
}

function saveTour() {
  const name = document.getElementById("tm_name").value.trim();
  if (!name) { alert("투어명을 입력해 주세요."); return; }
  const existingId = document.getElementById("tourEditId").value;
  const existing   = planData.tours?.find(x => x.id === existingId);
  const entry = {
    id:       existingId || ("t_" + Date.now()),
    name,
    platform: document.getElementById("tm_platform").value,
    cat:      document.getElementById("tm_cat").value,
    price:    parseInt(document.getElementById("tm_price").value) || 0,
    dur:      document.getElementById("tm_dur").value.trim(),
    desc:     document.getElementById("tm_desc").value.trim(),
    link:     document.getElementById("tm_link").value.trim(),
    memo:     document.getElementById("tm_memo").value.trim(),
    selected: existing?.selected || false
  };
  if (!planData.tours) planData.tours = [];
  const idx = planData.tours.findIndex(x => x.id === entry.id);
  if (idx >= 0) planData.tours[idx] = entry;
  else planData.tours.push(entry);

  closeTourModal();
  renderTours();
  syncExpensesFromSelections();
  renderBookingSummary();
  scheduleSave();
}

function selectTour(id) {
  const tour = planData.tours.find(t => t.id === id);
  if (tour) tour.selected = !tour.selected;
  renderTours();
  syncExpensesFromSelections();
  renderBookingSummary();
  scheduleSave();
}

function deleteTour(id) {
  if (!confirm("이 투어를 삭제할까요?")) return;
  planData.tours = planData.tours.filter(x => x.id !== id);
  renderTours();
  syncExpensesFromSelections();
  renderBookingSummary();
  scheduleSave();
}

function filterTours(cat, btn) {
  tourFilter = cat;
  document.querySelectorAll("#tourFilterBar .filter-chip").forEach(c => c.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderTours();
}

function renderTours() {
  if (!planData) return;
  const emptyEl = document.getElementById("tourEmptyState");
  const gridEl  = document.getElementById("tourGrid");
  if (!emptyEl || !gridEl) return;
  let list = [...(planData.tours || [])];
  if (tourFilter !== "all") list = list.filter(t => t.cat === tourFilter);

  if (!planData.tours?.length) {
    emptyEl.style.display = "flex";
    gridEl.innerHTML = "";
    return;
  }
  emptyEl.style.display = "none";

  gridEl.innerHTML = list.map(t => {
    const ps    = PLATFORM_STYLE[t.platform] || PLATFORM_STYLE["공식홈페이지"];
    const icon  = CAT_ICON[t.cat] || "📦";
    const isSel = t.selected || false;
    const bookBtn = t.link
      ? `<a class="btn-link-sm agoda" href="${t.link}" target="_blank" style="text-decoration:none;">🔗 예약 링크</a>`
      : "";
    return `
    <div class="glass-card hc-card ${isSel ? 'selected' : ''}">
      <div class="hc-card-top">
        <div class="hc-card-header">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <span style="font-size:18px;">${icon}</span>
              <div class="hc-card-name" style="font-size:15px; font-weight:800;">${t.name}</div>
            </div>
            <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;
                         background:${ps.bg};border:1px solid ${ps.border};color:${ps.color};">${t.platform}</span>
          </div>
          <div class="hc-card-actions">
            <button class="btn-select ${isSel ? 'selected-active' : ''}" onclick="selectTour('${t.id}')">
              ${isSel ? '✅ 선택됨' : '☐ 선택'}
            </button>
            <button class="btn-action" onclick="openTourModal('${t.id}')" title="수정">✏️</button>
            <button class="btn-action del" onclick="deleteTour('${t.id}')" title="삭제">🗑</button>
          </div>
        </div>
        <div class="hc-card-price" style="margin-top:10px;">
          <div class="hc-price-num">${t.price ? fmtPrice(t.price) : "-"}</div>
          <div class="hc-price-unit">원 / 인</div>
        </div>
        <div style="display:flex;gap:12px;margin-top:8px;font-size:12px;color:var(--text-sub);font-weight:600;">
          ${t.dur ? `<span>⏱ ${t.dur}</span>` : ""}
        </div>
        ${t.desc ? `<div class="hc-card-desc" style="margin-top:8px;">${t.desc}</div>` : ""}
        ${t.memo ? `<div class="hc-card-memo">💬 ${t.memo}</div>` : ""}
      </div>
      ${bookBtn ? `<div class="hc-card-links">${bookBtn}</div>` : ""}
    </div>`;
  }).join("");
}

// ================================================================
//  CHECKLIST
// ================================================================
function renderChecklist() {
  if (!planData) return;
  const layout = document.getElementById("checklistLayout");
  if (!layout) return;
  const groups     = planData.checklistGroups || defaultChecklistGroups;
  const allItems   = groups.flatMap(g => g.items);
  const doneCount  = allItems.filter(i => i.done).length;
  const total      = allItems.length;
  const pct        = total ? Math.round(doneCount/total*100) : 0;
  const bar        = document.getElementById("progressBar");
  const txt        = document.getElementById("progressText");
  if (bar) bar.style.width = pct + "%";
  if (txt) txt.textContent = `${doneCount} / ${total} 완료 (${pct}%)`;

  layout.innerHTML = groups.map(group => {
    const parts     = group.title.trim().split(/\s+/);
    const icon      = parts[0];
    const titleText = parts.slice(1).join(" ") || icon;
    const done      = group.items.filter(i => i.done).length;
    const cnt       = group.items.length;

    return `
    <div class="glass-card checklist-group">
      <div class="checklist-group-header">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:22px;line-height:1;flex-shrink:0;">${icon}</span>
          <div class="checklist-group-title">${titleText}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="checklist-group-count">${done}/${cnt}</div>
          <button onclick="deleteChecklistGroup('${group.id}')"
                  style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:13px;opacity:0.4;transition:opacity .2s;padding:2px 4px;"
                  onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0.4'"
                  title="섹션 삭제">✕</button>
        </div>
      </div>
      ${group.items.map(item => `
        <div class="check-item ${item.done ? 'done' : ''}" id="check-${group.id}-${item.id}">
          <div class="check-box-custom ${item.done ? 'checked' : ''}"
               onclick="toggleCheck('${group.id}','${item.id}')"></div>
          <div style="flex:1; cursor:pointer;" onclick="toggleCheck('${group.id}','${item.id}')">
            <div class="check-text">${item.text}</div>
            ${item.desc ? `<div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${item.desc}</div>` : ""}
          </div>
          <button onclick="startEditCheck('${group.id}','${item.id}')"
                  style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:14px;padding:2px 4px;flex-shrink:0;opacity:0.4;transition:opacity .2s;"
                  onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0.4'"
                  title="수정/삭제">✏️</button>
        </div>
      `).join("")}
      <div class="add-check-row">
        <input class="add-check-input" id="nci-${group.id}" placeholder="항목 추가..."
               onkeypress="if(event.key==='Enter') addCheckItem('${group.id}')">
        <button class="btn-add-check" onclick="addCheckItem('${group.id}')">+</button>
      </div>
    </div>`;
  }).join("");
}

function showAddGroupForm() {
  const layout = document.getElementById("checklistLayout");
  if (!layout || document.getElementById("addGroupForm")) return;
  const formEl = document.createElement("div");
  formEl.id = "addGroupForm";
  formEl.className = "glass-card checklist-group";
  formEl.style.cssText = "padding:16px;";
  formEl.innerHTML = `
    <div style="font-size:13px;font-weight:700;color:var(--text-sub);margin-bottom:10px;">새 섹션 추가</div>
    <div style="display:flex;gap:8px;align-items:center;">
      <input class="add-check-input" id="newGroupIcon" placeholder="🎯" maxlength="2"
             style="width:52px;text-align:center;font-size:18px;">
      <input class="add-check-input" id="newGroupTitle" placeholder="섹션 제목 입력..."
             style="flex:1;"
             onkeypress="if(event.key==='Enter') saveChecklistGroup()">
      <button onclick="saveChecklistGroup()"
              style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;">추가</button>
      <button onclick="renderChecklist()"
              style="background:rgba(255,255,255,0.08);color:var(--text-sub);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:7px 12px;font-size:12px;cursor:pointer;">취소</button>
    </div>
  `;
  layout.appendChild(formEl);
  document.getElementById("newGroupTitle")?.focus();
}

function saveChecklistGroup() {
  const icon  = document.getElementById("newGroupIcon")?.value.trim() || "📋";
  const title = document.getElementById("newGroupTitle")?.value.trim();
  if (!title) { alert("섹션 제목을 입력해 주세요."); return; }
  if (!planData.checklistGroups) planData.checklistGroups = [];
  planData.checklistGroups.push({
    id:    "cg_" + Date.now(),
    title: `${icon} ${title}`,
    items: []
  });
  renderChecklist();
  scheduleSave();
}

function deleteChecklistGroup(groupId) {
  if (!confirm("이 섹션과 모든 항목을 삭제할까요?")) return;
  planData.checklistGroups = planData.checklistGroups.filter(g => g.id !== groupId);
  renderChecklist();
  scheduleSave();
}

function startEditCheck(groupId, itemId) {
  const group = planData.checklistGroups.find(g => g.id === groupId);
  const item  = group?.items.find(i => i.id === itemId);
  if (!item) return;
  const el = document.getElementById(`check-${groupId}-${itemId}`);
  if (!el) return;
  el.innerHTML = `
    <input class="add-check-input" id="edit-ci-${itemId}"
           value="${item.text.replace(/"/g,'&quot;')}"
           style="flex:1;"
           onkeypress="if(event.key==='Enter') saveEditCheck('${groupId}','${itemId}')">
    <div style="display:flex;gap:6px;flex-shrink:0;">
      <button onclick="saveEditCheck('${groupId}','${itemId}')"
              style="background:var(--accent);color:#fff;border:none;border-radius:6px;padding:5px 12px;font-size:12px;cursor:pointer;font-weight:700;">저장</button>
      <button onclick="deleteCheckItem('${groupId}','${itemId}')"
              style="background:#ef4444;color:#fff;border:none;border-radius:6px;padding:5px 12px;font-size:12px;cursor:pointer;font-weight:700;">삭제</button>
      <button onclick="renderChecklist()"
              style="background:rgba(255,255,255,0.08);color:var(--text-sub);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;">취소</button>
    </div>
  `;
  el.style.gap = "8px";
  document.getElementById(`edit-ci-${itemId}`)?.focus();
}

function saveEditCheck(groupId, itemId) {
  const group = planData.checklistGroups.find(g => g.id === groupId);
  const item  = group?.items.find(i => i.id === itemId);
  if (!item) return;
  const text = document.getElementById(`edit-ci-${itemId}`)?.value.trim();
  if (!text) return;
  item.text = text;
  renderChecklist();
  scheduleSave();
}

function deleteCheckItem(groupId, itemId) {
  if (!confirm("이 항목을 삭제할까요?")) return;
  const group = planData.checklistGroups.find(g => g.id === groupId);
  if (!group) return;
  group.items = group.items.filter(i => i.id !== itemId);
  renderChecklist();
  scheduleSave();
}

function toggleCheck(groupId, itemId) {
  const group = planData.checklistGroups.find(g => g.id === groupId);
  const item  = group?.items.find(i => i.id === itemId);
  if (!item) return;
  item.done = !item.done;
  renderChecklist();
  scheduleSave();
}

function addCheckItem(groupId) {
  const input = document.getElementById("nci-" + groupId);
  const text  = input?.value.trim();
  if (!text) return;
  const group = planData.checklistGroups.find(g => g.id === groupId);
  if (!group) return;
  group.items.push({ id:"cu_"+Date.now(), text, desc:"", done:false, important:false });
  renderChecklist();
  scheduleSave();
}

// ================================================================
//  ITINERARY & MAP
// ================================================================
let dayEditMode = false;

function toggleDayEditMode() {
  dayEditMode = !dayEditMode;
  const btn = document.getElementById("btnEditDays");
  if (btn) {
    btn.textContent = dayEditMode ? "✕ 닫기" : "✏️ 편집";
    btn.style.background = dayEditMode ? "rgba(239,68,68,0.08)" : "";
    btn.style.color = dayEditMode ? "#dc2626" : "";
  }
  renderDayTabs();
  renderTimeline();
}

function getDayLabel(d) {
  const startDateStr = planData?.departDate ? planData.departDate.substring(0,10) : "2026-10-07";
  const startDate = new Date(startDateStr);
  const targetDate = new Date(startDate);
  targetDate.setDate(startDate.getDate() + (d - 1));
  const m = targetDate.getMonth() + 1;
  const day = targetDate.getDate();
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const wd = weekdays[targetDate.getDay()];
  return `Day ${d} (${m}/${day} ${wd})`;
}

function renderDayTabs() {
  if (!planData) return;
  const container = document.getElementById("dayTabsMini");
  if (!container) return;
  const keys = Object.keys(planData.days).map(Number).sort((a,b)=>a-b);
  container.innerHTML = keys.map(d => {
    const delBtn = (dayEditMode && keys.length > 1)
      ? `<button onclick="deleteDay(${d})" style="position:absolute;top:-6px;right:-6px;background:#ef4444;border:none;color:#fff;width:16px;height:16px;border-radius:50%;font-size:10px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="${getDayLabel(d)} 삭제">✕</button>`
      : "";
    return `<div style="display:inline-flex;align-items:center;position:relative;">
      <button class="day-tab-mini ${d === currentDay ? 'active' : ''}" onclick="switchDay(${d})">${getDayLabel(d)}</button>
      ${delBtn}
    </div>`;
  }).join("");
}

function switchDay(d) {
  currentDay = d;
  renderDayTabs();
  renderTimeline();
  if (googleMapInstance) updateGoogleMapMarkers();
}

function deleteDay(d) {
  const keys = Object.keys(planData.days).map(Number).sort((a,b)=>a-b);
  if (keys.length <= 1) { alert("최소 1개의 Day는 남겨야 합니다."); return; }
  const count = (planData.days[d] || []).length;
  if (!confirm(`${getDayLabel(d)} 일정을 삭제할까요?${count ? ` (일정 ${count}개 포함)` : ""}`)) return;
  delete planData.days[d];
  
  const remaining = Object.keys(planData.days).map(Number).sort((a,b)=>a-b);
  const newDays = {};
  remaining.forEach((key, idx) => { newDays[idx+1] = planData.days[key]; });
  planData.days = newDays;
  currentDay = Math.min(currentDay, Object.keys(planData.days).length);
  if (currentDay < 1) currentDay = 1;
  renderDayTabs();
  renderTimeline();
  scheduleSave();
  if (googleMapInstance) updateGoogleMapMarkers();
}

function addDay() {
  const keys   = Object.keys(planData.days).map(Number);
  const newDay = (Math.max(...keys, 0)) + 1;
  planData.days[newDay] = [];
  currentDay = newDay;
  renderDayTabs();
  renderTimeline();
  scheduleSave();
}

function renderTimeline() {
  if (!planData) return;
  const container = document.getElementById("timelineList");
  if (!container) return;
  const items = planData.days[currentDay] || [];
  if (!items.length) {
    container.innerHTML = `<div style="text-align:center; padding:24px; color:var(--text-muted); font-size:13px; font-weight:600;">아직 일정이 없어요. 아래에서 추가해보세요! 🗺️</div>`;
    return;
  }
  const sorted = [...items].sort((a,b) => (a.time||"").localeCompare(b.time||""));
  container.innerHTML = sorted.map((item, idx) => `
    <div class="timeline-item">
      <div class="timeline-dot-wrap">
        <div class="timeline-dot" style="cursor:pointer;" onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}', '_blank')" title="Google Maps 길찾기">${idx+1}</div>
        ${idx < sorted.length-1 ? '<div class="timeline-line"></div>' : ""}
      </div>
      <div class="timeline-content">
        <div class="timeline-time">⏰ ${item.time||"--:--"}</div>
        <div class="timeline-name">${item.name}</div>
        <div class="timeline-desc">${item.memo||""}</div>
      </div>
      ${dayEditMode ? `
        <div style="display:flex;gap:4px;flex-shrink:0;align-items:center;">
          <button onclick="openAddModal(${item.id})" style="background:rgba(26,58,58,0.06);border:1px solid rgba(26,58,58,0.15);color:var(--brand-pink);cursor:pointer;font-size:11px;padding:4px 10px;border-radius:8px;font-weight:700;">수정</button>
          <button onclick="deletePlace(${currentDay},${item.id})" style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);color:#dc2626;cursor:pointer;font-size:11px;padding:4px 10px;border-radius:8px;font-weight:700;">삭제</button>
        </div>
      ` : ""}
    </div>
  `).join("");
}

let placeAutocomplete = null;

function updateCoordStatus() {
  const lat = document.getElementById("modalLat").value;
  const lng = document.getElementById("modalLng").value;
  const el  = document.getElementById("coordStatus");
  if (!el) return;
  if (lat && lng) {
    el.innerHTML = `<span style="color:#34d399;">✅ 좌표 설정됨</span> <span style="color:var(--text-muted);">(${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)})</span>`;
  } else {
    el.innerHTML = `<span style="color:#f59e0b;">⚠️ 좌표 없음</span> <span style="color:var(--text-muted);">— Google Maps 연동 시 자동 입력됩니다</span>`;
  }
}

function initPlaceAutocomplete() {
  if (!window.google?.maps?.places) return;
  const input = document.getElementById("modalName");
  if (placeAutocomplete) google.maps.event.clearInstanceListeners(placeAutocomplete);
  placeAutocomplete = new google.maps.places.Autocomplete(input, {
    types: ["establishment", "geocode"],
    fields: ["name", "geometry", "formatted_address"]
  });
  placeAutocomplete.addListener("place_changed", () => {
    const place = placeAutocomplete.getPlace();
    if (place?.geometry?.location) {
      document.getElementById("modalLat").value = place.geometry.location.lat();
      document.getElementById("modalLng").value = place.geometry.location.lng();
      document.getElementById("modalName").value = place.name || input.value;
      updateCoordStatus();
    }
  });
}

function openAddModal(itemId) {
  const dayKeys = Object.keys(planData.days).map(Number).sort((a,b)=>a-b);
  const select  = document.getElementById("modalDay");
  select.innerHTML = dayKeys.map(d => `<option value="${d}" ${d===currentDay?"selected":""}>${getDayLabel(d)}</option>`).join("");
  document.getElementById("editItemId").value = itemId || "";
  document.getElementById("modalTitleText").textContent = itemId ? "📍 장소 수정" : "📍 새 장소 추가";
  if (itemId) {
    const item = (planData.days[currentDay]||[]).find(i=>i.id==itemId);
    if (item) {
      document.getElementById("modalTime").value = item.time||"";
      document.getElementById("modalName").value = item.name||"";
      document.getElementById("modalLat").value  = item.lat||"";
      document.getElementById("modalLng").value  = item.lng||"";
      document.getElementById("modalMemo").value = item.memo||"";
    }
  } else {
    ["modalTime","modalName","modalLat","modalLng","modalMemo"].forEach(id => document.getElementById(id).value = "");
  }
  updateCoordStatus();
  document.getElementById("addModal").classList.add("active");
  setTimeout(() => initPlaceAutocomplete(), 100);
}

function closeModal() {
  document.getElementById("addModal").classList.remove("active");
}

function savePlace() {
  const day  = parseInt(document.getElementById("modalDay").value);
  const time = document.getElementById("modalTime").value;
  const name = document.getElementById("modalName").value.trim();
  const lat  = parseFloat(document.getElementById("modalLat").value)||35.6895;
  const lng  = parseFloat(document.getElementById("modalLng").value)||139.6917;
  const memo = document.getElementById("modalMemo").value.trim();
  const editId = document.getElementById("editItemId").value;
  if (!name) { alert("장소명을 입력해 주세요."); return; }
  if (!planData.days[day]) planData.days[day] = [];
  if (editId) {
    const idx = planData.days[day].findIndex(i=>String(i.id)===editId);
    if (idx >= 0) planData.days[day][idx] = { id:parseInt(editId), time, name, lat, lng, memo };
  } else {
    planData.days[day].push({ id:Date.now(), time, name, lat, lng, memo });
  }
  currentDay = day;
  closeModal();
  renderDayTabs();
  renderTimeline();
  scheduleSave();
  if (window.googleMapInstance) updateGoogleMapMarkers();
}

function deletePlace(day, id) {
  if (!confirm("이 일정을 삭제할까요?")) return;
  planData.days[day] = (planData.days[day]||[]).filter(i=>i.id!==id);
  renderTimeline();
  scheduleSave();
  if (window.googleMapInstance) updateGoogleMapMarkers();
}

// ─── Google Maps ───
let googleMapInstance = null;
let gmMarkers = [];
let gmPolyline = null;

const DAY_COLORS = [
  { marker:"#ff4d8b", border:"#ff85b0", line:"#ff4d8b" },
  { marker:"#7c4dff", border:"#b388ff", line:"#7c4dff" },
  { marker:"#00b4d8", border:"#90e0ef", line:"#00b4d8" },
  { marker:"#ff9f1c", border:"#ffbf69", line:"#ff9f1c" },
  { marker:"#2ec4b6", border:"#cbf3f0", line:"#2ec4b6" }
];

const GMAP_API_KEY = "AIzaSyA4_3OvP8rbcye4IHzZrj-W6Tga6GudylQ";

function activateMap() {
  if (window.google?.maps) {
    initGoogleMap();
    return;
  }
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAP_API_KEY}&libraries=places&callback=initGoogleMap`;
  script.async = true;
  document.head.appendChild(script);
}

window.initGoogleMap = function() {
  const placeholder = document.getElementById("mapPlaceholder");
  if (placeholder) placeholder.style.display = "none";
  const mapDiv = document.getElementById("googleMap");
  mapDiv.style.display = "block";
  googleMapInstance = new google.maps.Map(mapDiv, {
    center: { lat: 35.6895, lng: 139.6917 }, // 도쿄 중심
    zoom: 13,
    streetViewControl: false
  });
  updateGoogleMapMarkers();
};

function updateGoogleMapMarkers() {
  if (!googleMapInstance || !planData) return;
  gmMarkers.forEach(m=>m.setMap(null));
  gmMarkers=[];
  if (gmPolyline) { gmPolyline.setMap(null); gmPolyline = null; }

  const c = DAY_COLORS[(currentDay - 1) % DAY_COLORS.length];
  const items = (planData.days[currentDay]||[]).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
  const bounds = new google.maps.LatLngBounds();
  const path = [];

  items.forEach((item, idx) => {
    if (!item.lat || !item.lng) return;
    const pos = { lat: parseFloat(item.lat), lng: parseFloat(item.lng) };
    const marker = new google.maps.Marker({
      position: pos, map: googleMapInstance, title: item.name,
      label: { text:String(idx+1), color:"#fff", fontWeight:"900", fontSize:"12px" },
      icon: { path:google.maps.SymbolPath.CIRCLE, scale:14, fillColor:c.marker, fillOpacity:1, strokeColor:c.border, strokeWeight:2.5 },
      zIndex: idx+1
    });
    const iw = new google.maps.InfoWindow({
      content: `<div style="font-family:'Pretendard',sans-serif;padding:4px;">
        <strong style="font-size:14px;">${item.name}</strong>
        <br><span style="font-size:12px;color:#64748b;">${item.memo||""}</span>
        <br><span style="font-size:11px;color:#94a3b8;">⏰ ${item.time||"--:--"}</span>
      </div>`
    });
    marker.addListener("click", () => iw.open(googleMapInstance, marker));
    gmMarkers.push(marker);
    path.push(pos);
    bounds.extend(pos);
  });

  if (path.length > 1) {
    gmPolyline = new google.maps.Polyline({
      path, map: googleMapInstance,
      strokeColor: c.line, strokeOpacity: 0.8, strokeWeight: 3.5,
      icons: [
        { icon:{ path:google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale:3.5, fillColor:c.line, fillOpacity:1, strokeColor:"#fff", strokeWeight:1 }, offset:"100%", repeat:"0" }
      ]
    });
    googleMapInstance.fitBounds(bounds, { top:40, bottom:40, left:40, right:40 });
  } else if (path.length === 1) {
    googleMapInstance.setCenter(path[0]);
    googleMapInstance.setZoom(15);
  } else {
    googleMapInstance.setCenter({ lat: 35.6895, lng: 139.6917 });
    googleMapInstance.setZoom(13);
  }
}

// ================================================================
//  EXCHANGE RATE (JPY 환율 연동)
// ================================================================
async function fetchExchangeRate() {
  try {
    const badge = document.getElementById("exchangeRateBadge");
    if (badge) badge.textContent = "💰 실시간 엔화 환율 로딩 중...";
    const res = await fetch("https://open.er-api.com/v6/latest/JPY");
    const data = await res.json();
    if (data && data.rates && data.rates.KRW) {
      exchangeRateJpyToKrw = data.rates.KRW;
      const rate100 = (exchangeRateJpyToKrw * 100).toFixed(2);
      if (badge) badge.textContent = `💰 실시간 환율: 100 JPY = ₩ ${rate100}`;
      renderExpenses();
    }
  } catch (e) {
    console.error("Exchange rate fetch failed", e);
    const badge = document.getElementById("exchangeRateBadge");
    if (badge) badge.textContent = `💰 환율 기준: 100 JPY = ₩ 920.00`;
  }
}

// ================================================================
//  EXPENSE — CRUD + Render
// ================================================================

function updateExpenseTimingUI() {
  const timing = document.querySelector('input[name="expenseTiming"]:checked')?.value;
  const label = document.getElementById("expenseAmountLabel");
  const input = document.getElementById("expenseAmount");
  if (timing === "pre") {
    label.textContent = "결제 금액 (원화 ₩)";
    input.placeholder  = "한국 원화 금액 입력 (예: 150000)";
    input.step = "1";
  } else {
    label.textContent = "결제 금액 (엔화 JPY ¥)";
    input.placeholder  = "일본 엔화 금액 입력 (예: 3500)";
    input.step = "1";
  }
  input.value = "";
  document.getElementById("expenseConvertPreview").innerHTML = "";
}

function updateExpensePreview() {
  const timing = document.querySelector('input[name="expenseTiming"]:checked')?.value;
  const val = parseFloat(document.getElementById("expenseAmount").value);
  const preview = document.getElementById("expenseConvertPreview");
  if (isNaN(val) || val <= 0) { preview.innerHTML = ""; return; }

  if (timing === "pre") {
    const jpy = val / exchangeRateJpyToKrw;
    preview.innerHTML = `<span style="color:var(--brand-pink);">≈ ¥ ${fmtPrice(Math.round(jpy))}</span> <span style="color:var(--muted);">(100 JPY = ₩${(exchangeRateJpyToKrw*100).toFixed(0)})</span>`;
  } else {
    const krw = val * exchangeRateJpyToKrw;
    preview.innerHTML = `<span style="color:var(--brand-ochre);">≈ ₩ ${fmtPrice(Math.round(krw))}</span> <span style="color:var(--muted);">(100 JPY = ₩${(exchangeRateJpyToKrw*100).toFixed(0)})</span>`;
  }
}

function openExpenseModal(id = null) {
  const m = document.getElementById("expenseModal");
  if (!m) return;
  m.classList.add("active");

  if (id) {
    const ex = planData.expenses.find(e => e.id === id);
    if (!ex) return;
    document.getElementById("expenseModalTitle").textContent = "💸 지출 수정";
    document.getElementById("editExpenseId").value = ex.id;
    const timingRadio = document.querySelector(`input[name="expenseTiming"][value="${ex.timing || 'pre'}"]`);
    if (timingRadio) timingRadio.checked = true;
    document.getElementById("expenseCategory").value = ex.category || "식비";
    document.getElementById("expenseTitle").value    = ex.title || "";
    document.getElementById("expenseAmount").value   = (ex.timing === "pre") ? (ex.amountKrw || "") : (ex.amountJpy || "");
    document.getElementById("expenseMemo").value     = ex.memo || "";
  } else {
    document.getElementById("expenseModalTitle").textContent = "💸 지출 등록";
    document.getElementById("editExpenseId").value = "";
    document.querySelector('input[name="expenseTiming"][value="pre"]').checked = true;
    document.getElementById("expenseCategory").value = "식비";
    document.getElementById("expenseTitle").value    = "";
    document.getElementById("expenseAmount").value   = "";
    document.getElementById("expenseMemo").value     = "";
  }
  updateExpenseTimingUI();
  if (id) {
    const ex = planData.expenses.find(e => e.id === id);
    if (ex) {
      document.getElementById("expenseAmount").value = (ex.timing === "pre") ? (ex.amountKrw || "") : (ex.amountJpy || "");
      updateExpensePreview();
    }
  }
}

function closeExpenseModal() {
  document.getElementById("expenseModal").classList.remove("active");
}

function saveExpense() {
  const id     = document.getElementById("editExpenseId").value;
  const timing = document.querySelector('input[name="expenseTiming"]:checked').value;
  const cat    = document.getElementById("expenseCategory").value;
  const title  = document.getElementById("expenseTitle").value.trim();
  const rawAmt = parseFloat(document.getElementById("expenseAmount").value);
  const memo   = document.getElementById("expenseMemo").value.trim();

  if (!title) return alert("지출 내역/품목을 입력하세요.");
  if (isNaN(rawAmt) || rawAmt <= 0) return alert("올바른 금액을 입력하세요.");

  let amountKrw, amountJpy;
  if (timing === "pre") {
    amountKrw = Math.round(rawAmt);
    amountJpy = Math.round(rawAmt / exchangeRateJpyToKrw);
  } else {
    amountJpy = Math.round(rawAmt);
    amountKrw = Math.round(rawAmt * exchangeRateJpyToKrw);
  }

  const entry = { timing, category: cat, title, amountKrw, amountJpy, memo };

  if (id) {
    const idx = planData.expenses.findIndex(e => e.id === id);
    if (idx !== -1) planData.expenses[idx] = { ...planData.expenses[idx], ...entry };
  } else {
    planData.expenses.push({ id: "ex_" + Date.now(), ...entry });
  }
  scheduleSave();
  closeExpenseModal();
  renderExpenses();
}

function deleteExpense(id) {
  if (!confirm("이 지출 내역을 삭제하시겠습니까?")) return;
  planData.expenses = planData.expenses.filter(e => e.id !== id);
  scheduleSave();
  renderExpenses();
}

function syncExpensesFromSelections() {
  if (!planData.expenses) planData.expenses = [];
  planData.expenses = planData.expenses.filter(e => !e.isAuto);

  // 1. 선택된 항공권
  const selFlight = planData.flights.find(f => f.selected);
  if (selFlight && selFlight.price) {
    planData.expenses.push({
      id: "auto_flight", timing: "pre", category: "항공/교통",
      title: selFlight.airline || "항공권 결제",
      amountKrw: selFlight.price, amountJpy: Math.round(selFlight.price / exchangeRateJpyToKrw),
      memo: "선택된 항공권", isAuto: true
    });
  }

  // 2. 선택된 호텔
  const selHotels = planData.hotels.filter(h => h.selected);
  let hotelTotalKrw = 0;
  let hotelNames = [];
  selHotels.forEach(h => {
    let nights = 1;
    if (h.checkin && h.checkout) {
      const d1 = new Date(h.checkin);
      const d2 = new Date(h.checkout);
      if (!isNaN(d1) && !isNaN(d2)) nights = Math.max(1, Math.round((d2 - d1) / 86400000));
    }
    const totalPrice = h.price * nights;
    hotelTotalKrw += totalPrice;
    hotelNames.push(h.name);
  });
  if (hotelTotalKrw > 0) {
    planData.expenses.push({
      id: "auto_hotels", timing: "pre", category: "숙박",
      title: "도쿄 호텔 숙박비",
      amountKrw: hotelTotalKrw, amountJpy: Math.round(hotelTotalKrw / exchangeRateJpyToKrw),
      memo: hotelNames.join(", "), isAuto: true
    });
  }

  // 3. 선택된 투어/티켓
  const selTours = (planData.tours || []).filter(t => t.selected);
  selTours.forEach(t => {
    if (t.price) {
      planData.expenses.push({
        id: "auto_tour_" + t.id, timing: "pre", category: "관광/투어",
        title: t.name,
        amountKrw: t.price, amountJpy: Math.round(t.price / exchangeRateJpyToKrw),
        memo: t.platform || "입장권/투어", isAuto: true
      });
    }
  });

  if (typeof renderExpenses === 'function') renderExpenses();
}

function renderExpenses() {
  if (!planData || !planData.expenses) return;
  const emptyEl  = document.getElementById("expenseEmptyState");
  const wrapEl   = document.getElementById("expenseWrap");
  const preGrid  = document.getElementById("expensePreGrid");
  const tripGrid = document.getElementById("expenseTripGrid");
  const list = planData.expenses;

  const preList  = list.filter(e => e.timing === "pre");
  const tripList = list.filter(e => e.timing !== "pre");

  const totalPreKrw  = preList.reduce((acc, e) => acc + (e.amountKrw || 0), 0);
  const totalTripJpy = tripList.reduce((acc, e) => acc + (e.amountJpy || 0), 0);
  const totalTripKrw = tripList.reduce((acc, e) => acc + (e.amountKrw || Math.round((e.amountJpy||0)*exchangeRateJpyToKrw)), 0);
  const totalKrw     = totalPreKrw + totalTripKrw;

  document.getElementById("summaryTotalKrw").textContent = `₩ ${fmtPrice(totalKrw)}`;
  document.getElementById("summaryPreKrw").textContent   = `₩ ${fmtPrice(totalPreKrw)}`;
  document.getElementById("summaryTripJpy").textContent  = `¥ ${fmtPrice(totalTripJpy)}`;

  if (list.length === 0) {
    emptyEl.style.display = "flex";
    wrapEl.style.display  = "none";
    return;
  }

  emptyEl.style.display = "none";
  wrapEl.style.display  = "grid";
  wrapEl.style.gridTemplateColumns = "repeat(auto-fit, minmax(300px, 1fr))";
  wrapEl.style.gap = "24px";

  const CAT_EMOJI = { "항공/교통": "✈️", "숙박": "🏨", "식비": "🍣", "관광/투어": "🎡", "쇼핑": "🛍️", "기타": "📦" };

  function makeHtml(arr, isPre) {
    if (arr.length === 0) return `<div style="text-align:center; padding:16px; color:var(--muted); font-size:13px; background:var(--surface-soft); border-radius:12px; border:1px dashed var(--hairline);">내역이 없습니다.</div>`;
    return arr.map(e => {
      const krw = e.amountKrw || Math.round((e.amountJpy||0) * exchangeRateJpyToKrw);
      const jpy = e.amountJpy || Math.round(krw / exchangeRateJpyToKrw);
      const mainAmt   = isPre ? `₩ ${fmtPrice(krw)}` : `¥ ${fmtPrice(jpy)}`;
      const mainColor = isPre ? "var(--brand-ochre)" : "var(--brand-pink)";
      const subAmt    = isPre ? `≈ ¥ ${fmtPrice(jpy)}` : `≈ ₩ ${fmtPrice(krw)}`;

      return `
      <div class="glass-card fc-row" id="ex-${e.id}">
        <div class="fc-header" style="align-items:center;">
          <div class="fc-header-left">
            <div class="fc-airline-name" style="font-size:15px; font-weight:800;">${CAT_EMOJI[e.category] || "📦"} ${e.title}</div>
            ${e.memo ? `<div class="fc-airline-meta" style="color:var(--body);margin-top:4px;">💬 ${e.memo}</div>` : ""}
          </div>
          <div class="fc-header-right" style="text-align:right;">
            <div class="fc-price" style="color:${mainColor}; font-size:18px;">${mainAmt}</div>
            <div style="font-size:12px; color:var(--muted); margin-bottom:6px;">${subAmt}</div>
            <div class="fc-actions" style="justify-content:flex-end;">
              <button class="btn-action" onclick="openExpenseModal('${e.id}')" title="수정">✏️</button>
              <button class="btn-action del" onclick="deleteExpense('${e.id}')" title="삭제">🗑</button>
            </div>
          </div>
        </div>
      </div>`;
    }).join("");
  }

  preGrid.innerHTML  = makeHtml(preList,  true);
  tripGrid.innerHTML = makeHtml(tripList, false);
}

// ================================================================
//  BOOKING SUMMARY (대시보드)
// ================================================================
function renderBookingSummary() {
  const container = document.getElementById("bookingSummaryContainer");
  if (!container || !planData) return;

  // 1. Flight Section
  const selFlight = planData.flights.find(f => f.selected);
  let flightHtml = "";
  if (selFlight) {
    function formatFlightDateBadge(dateStr) {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      if (isNaN(d)) return "";
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const wk = ["일","월","화","수","목","금","토"][d.getDay()];
      return `${m}.${day} (${wk})`;
    }
    const outDateBadge = formatFlightDateBadge(selFlight.depdate) || "날짜 미정";
    const inDateBadge  = formatFlightDateBadge(selFlight.rdate) || "날짜 미정";

    flightHtml = `
      <div class="booking-section">
        <div class="booking-section-header">
          <span class="booking-section-icon">✈️</span>
          <span class="booking-section-title">항공권 예약 내역 (확정 스케줄)</span>
        </div>
        <div class="summary-card-content flight-section-card" style="padding:20px;">
          <div class="flight-text-details">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
              <div>
                <div style="font-size:18px; font-weight:900; color:var(--ink); display:flex; align-items:center; gap:8px;">
                  <span>✈️ ${selFlight.airline || "항공권"}</span>
                  ${selFlight.bookingRef ? `<span style="font-size:12px; font-weight:700; background:rgba(124,77,255,0.1); color:var(--brand-lavender); padding:3px 10px; border-radius:12px;">예약번호: ${selFlight.bookingRef}</span>` : ""}
                </div>
                <div style="font-size:13px; color:var(--text-muted); font-weight:600; margin-top:3px;">
                  총 ${selFlight.totalNights ? `${selFlight.totalNights}박 ${selFlight.totalDays||Number(selFlight.totalNights)+1}일` : ""} ${selFlight.annualLeave ? `· 연차 ${selFlight.annualLeave}일` : ""}
                </div>
              </div>
              ${selFlight.price ? `<div class="summary-card-main-val" style="font-size:22px; color:var(--brand-pink);">${fmtPrice(selFlight.price)}원</div>` : ""}
            </div>

            <!-- 가는 편 / 오는 편 스케줄 대시보드 카드 -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:12px;">
              <!-- 가는 편 -->
              <div style="background:var(--surface-card); padding:14px 16px; border-radius:12px; border:1px solid var(--hairline);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <span style="font-size:12px; font-weight:800; color:var(--brand-pink);">🛫 가는 편 (출국) · ${outDateBadge}</span>
                  ${selFlight.outFlightNo ? `<span style="font-size:11px; font-weight:700; background:rgba(255,117,143,0.12); color:var(--brand-pink); padding:2px 8px; border-radius:6px;">${selFlight.outFlightNo}</span>` : ""}
                </div>
                <div style="display:flex; align-items:center; justify-content:space-between;">
                  <div style="text-align:left;">
                    <div style="font-size:11px; color:var(--text-muted); font-weight:600;">출발</div>
                    <div style="font-size:18px; font-weight:900; color:var(--ink);">${selFlight.outDepTime || "09:00"}</div>
                    <div style="font-size:12px; font-weight:700; color:var(--body);">${selFlight.outDepAirport || "인천(ICN)"}</div>
                  </div>
                  <div style="text-align:center; padding:0 8px;">
                    <div style="font-size:11px; color:var(--muted); font-weight:600;">직항</div>
                    <div style="font-size:14px; color:var(--brand-pink);">──────✈️─────▶</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:11px; color:var(--text-muted); font-weight:600;">도착</div>
                    <div style="font-size:18px; font-weight:900; color:var(--ink);">${selFlight.outArrTime || "11:35"}</div>
                    <div style="font-size:12px; font-weight:700; color:var(--body);">${selFlight.outArrAirport || "나리타(NRT)"}</div>
                  </div>
                </div>
              </div>

              <!-- 오는 편 -->
              <div style="background:var(--surface-card); padding:14px 16px; border-radius:12px; border:1px solid var(--hairline);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <span style="font-size:12px; font-weight:800; color:var(--brand-lavender);">🛬 오는 편 (귀국) · ${inDateBadge}</span>
                  ${selFlight.inFlightNo ? `<span style="font-size:11px; font-weight:700; background:rgba(124,77,255,0.12); color:var(--brand-lavender); padding:2px 8px; border-radius:6px;">${selFlight.inFlightNo}</span>` : ""}
                </div>
                <div style="display:flex; align-items:center; justify-content:space-between;">
                  <div style="text-align:left;">
                    <div style="font-size:11px; color:var(--text-muted); font-weight:600;">출발</div>
                    <div style="font-size:18px; font-weight:900; color:var(--ink);">${selFlight.inDepTime || "17:20"}</div>
                    <div style="font-size:12px; font-weight:700; color:var(--body);">${selFlight.inDepAirport || "나리타(NRT)"}</div>
                  </div>
                  <div style="text-align:center; padding:0 8px;">
                    <div style="font-size:11px; color:var(--muted); font-weight:600;">직항</div>
                    <div style="font-size:14px; color:var(--brand-lavender);">──────✈️─────▶</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:11px; color:var(--text-muted); font-weight:600;">도착</div>
                    <div style="font-size:18px; font-weight:900; color:var(--ink);">${selFlight.inArrTime || "20:00"}</div>
                    <div style="font-size:12px; font-weight:700; color:var(--body);">${selFlight.inArrAirport || "인천(ICN)"}</div>
                  </div>
                </div>
              </div>
            </div>

            ${selFlight.memo ? `<div class="summary-card-memo" style="margin-top:12px;">💬 ${selFlight.memo}</div>` : ""}
          </div>
        </div>
      </div>
    `;
  } else {
    flightHtml = `
      <div class="booking-section">
        <div class="booking-section-header">
          <span class="booking-section-icon">✈️</span>
          <span class="booking-section-title">항공권 예약 내역</span>
        </div>
        <div class="summary-card-content empty" onclick="switchTab('flight', document.querySelector('[onclick*=\\'flight\\']'))">
          <div class="empty-placeholder-text">선택된 항공권이 없습니다.</div>
          <div class="empty-action-hint">아래 항공권 목록에서 원하는 일정을 선택해 주세요! 🛫</div>
        </div>
      </div>
    `;
  }

  // 2. Hotel Section
  const selHotels = planData.hotels.filter(h => h.selected);
  let hotelHtml = "";
  if (selHotels.length > 0) {
    let hotelCards = selHotels.map(h => {
      let nights = 1;
      if (h.checkin && h.checkout) {
        const d1 = new Date(h.checkin);
        const d2 = new Date(h.checkout);
        if (!isNaN(d1) && !isNaN(d2)) nights = Math.max(1, Math.round((d2 - d1) / 86400000));
      }
      const totalPrice = h.price * nights;
      const ciStr = h.checkin ? h.checkin.substring(5).replace("-", "/") : "?";
      const coStr = h.checkout ? h.checkout.substring(5).replace("-", "/") : "?";
      const linkBtn = h.link ? `<a href="${h.link}" target="_blank" class="summary-link-btn" style="margin-top: 10px; width: 100%;">🔗 숙소 예약 링크</a>` : "";
      return `
        <div class="summary-item-card hotel">
          <div class="summary-item-card-top">
            <div style="font-size: 11px; font-weight: 700; color: var(--brand-pink); text-transform: uppercase; margin-bottom: 4px;">
              🗼 ${AREA_LABELS[h.area] || '도쿄 숙소'}
            </div>
            <div class="summary-item-card-name">${h.name}</div>
            <div class="summary-item-card-dates">🗓️ ${ciStr} ~ ${coStr} (${nights}박)</div>
          </div>
          <div class="summary-item-card-bottom">
            ${totalPrice > 0 ? `
            <div class="summary-item-card-price">
              <span class="price-num">${fmtPrice(totalPrice)}원</span>
              <span class="price-lbl">${nights > 1 ? '(' + nights + '박 총액)' : '(1박)'}</span>
            </div>` : ""}
            ${h.memo ? `<div class="summary-card-memo">💬 ${h.memo}</div>` : ""}
            ${linkBtn}
          </div>
        </div>
      `;
    }).join("");

    hotelHtml = `
      <div class="booking-section">
        <div class="booking-section-header">
          <span class="booking-section-icon">🏨</span>
          <span class="booking-section-title">숙소 예약 내역</span>
        </div>
        <div class="booking-items-grid">${hotelCards}</div>
      </div>
    `;
  } else {
    hotelHtml = `
      <div class="booking-section">
        <div class="booking-section-header">
          <span class="booking-section-icon">🏨</span>
          <span class="booking-section-title">숙소 예약 내역</span>
        </div>
        <div class="summary-card-content empty" onclick="switchTab('hotel', document.querySelector('[onclick*=\\'hotel\\']'))">
          <div class="empty-placeholder-text">선택된 숙소가 없습니다.</div>
          <div class="empty-action-hint">숙소 비교 탭에서 마음에 드는 호텔을 선택해 주세요! 🏨</div>
        </div>
      </div>
    `;
  }

  // 3. Tour Section
  const selTours = (planData.tours || []).filter(t => t.selected);
  let tourHtml = "";
  if (selTours.length > 0) {
    let tourCards = selTours.map(t => {
      const linkBtn = t.link ? `<a href="${t.link}" target="_blank" class="summary-link-btn" style="margin-top: 10px; width: 100%;">🔗 티켓 예약 링크</a>` : "";
      return `
        <div class="summary-item-card tour">
          <div class="summary-item-card-top">
            <div style="font-size: 11px; font-weight: 700; color: var(--green); text-transform: uppercase; margin-bottom: 4px;">
              ${t.platform || '공식 예매'}
            </div>
            <div class="summary-item-card-name">${t.name}</div>
            <div class="summary-item-card-dates">${t.dur ? '⏱ 소요 시간: ' + t.dur : '시간 정보 없음'}</div>
          </div>
          <div class="summary-item-card-bottom">
            <div class="summary-item-card-price">
              <span class="price-num" style="color: var(--green);">${fmtPrice(t.price)}원</span>
              <span class="price-lbl">/ 1인</span>
            </div>
            ${t.memo ? `<div class="summary-card-memo" style="border-left-color: var(--green);">💬 ${t.memo}</div>` : ""}
            ${linkBtn}
          </div>
        </div>
      `;
    }).join("");

    tourHtml = `
      <div class="booking-section">
        <div class="booking-section-header">
          <span class="booking-section-icon">🎡</span>
          <span class="booking-section-title">투어 &amp; 입장권 예약 내역</span>
        </div>
        <div class="booking-items-grid">${tourCards}</div>
      </div>
    `;
  } else {
    tourHtml = `
      <div class="booking-section">
        <div class="booking-section-header">
          <span class="booking-section-icon">🎡</span>
          <span class="booking-section-title">투어 &amp; 입장권 예약 내역</span>
        </div>
        <div class="summary-card-content empty" onclick="switchTab('tour', document.querySelector('[onclick*=\\'tour\\']'))">
          <div class="empty-placeholder-text">선택된 투어/티켓이 없습니다.</div>
          <div class="empty-action-hint">투어/티켓 비교 탭에서 필요한 티켓을 선택해 주세요! 🎡</div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="booking-summary-dashboard-stacked">
      ${flightHtml}
      ${hotelHtml}
      ${tourHtml}
    </div>
  `;
}

// ================================================================
//  MEMO
// ================================================================
function renderMemos() {
  if (!planData) return;
  const board = document.getElementById("memoBoard");
  if (!board) return;
  const searchVal = (document.getElementById("memoSearchInput")?.value || "").trim().toLowerCase();
  let memos = planData.memos || [];
  if (searchVal) {
    memos = memos.filter(m => m.text.toLowerCase().includes(searchVal));
  }
  if (!memos.length) {
    board.innerHTML = `<div style="text-align:center;padding:40px 20px;color:#a16207;font-size:14px;font-weight:500;font-family:'Noto Sans KR',sans-serif;">${searchVal ? '검색 결과가 없어요 🔍' : '도쿄 여행 꿀팁이나 메모를 남겨보세요 ✏️'}</div>`;
    return;
  }
  board.innerHTML = memos.map(m => {
    const highlighted = searchVal
      ? m.text.replace(new RegExp(`(${searchVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark style="background:#fde047;color:#451a03;border-radius:2px;padding:0 1px;">$1</mark>')
      : m.text;
    return `
    <div class="memo-note-item">
      <div class="memo-note-dot"></div>
      <div class="memo-note-text">${highlighted}</div>
      <div class="memo-note-time">${m.time}</div>
    </div>
  `;
  }).join("");
  board.scrollTop = board.scrollHeight;
}

function postMemo() {
  const input = document.getElementById("memoInput");
  const text  = input.value.trim();
  if (!text || !planData) return;
  const now = new Date();
  const t   = `${String(now.getMonth()+1).padStart(2,"0")}.${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  planData.memos = planData.memos || [];
  planData.memos.push({ text, time:t });
  input.value = "";
  renderMemos();
  scheduleSave();
}

function toggleMemoWidget() {
  const widget = document.getElementById("floatingMemoWidget");
  if (!widget) return;
  const isExpanded = widget.classList.toggle("expanded");
  const triggerBtn = document.getElementById("memoTriggerBtn");
  if (triggerBtn) {
    const iconSpan = triggerBtn.querySelector(".memo-icon");
    if (iconSpan) {
      iconSpan.textContent = isExpanded ? "✕" : "💬";
    }
  }
  if (isExpanded) {
    const input = document.getElementById("memoInput");
    if (input) input.focus();
    const board = document.getElementById("memoBoard");
    if (board) board.scrollTop = board.scrollHeight;
  }
}

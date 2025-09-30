/*************************************************
 * Nuomi Map Tour — script.js (all-in-one)
 * (對應美化版 CSS 的調整版)
 *************************************************/

let map;
let markers = [];                      // 與 locationList 同索引
let directionsService;
let directionsRenderer;
let infoWindow;

let sortable = null;                   // SortableJS 實例
let lastOrderedSeq = null;             // 最近一次畫線順序（匯出用）
let lastDirectionsResult = null;       // 最近一次 Directions 結果

// Places / 搜尋 / 午餐建議
let placesService;
let lunchTempMarkers = [];
let autocomplete;
let pendingPlace = null;

const STORAGE_KEY = "nuomi_tour_state_v1";

// ---- 類型顏色 ----
const typeColors = {
  "景點": "#1e90ff",
  "農遊體驗": "#2ecc71",
  "餐廳": "#f39c12",
  "民宿": "#8e44ad",
  "自訂": "#e91e63",
};

// ---- 預設停留時間（分鐘）依類型 ----
const defaultStayByType = {
  "景點": 30,
  "農遊體驗": 90,
  "餐廳": 60,
  "民宿": 0,
  "自訂": 30,
};
// ★ Emoji 對照
const emojiByType = {
  "景點": "📍",
  "農遊體驗": "🌾",
  "餐廳": "🍽️",
  "民宿": "🏡",
  "自訂": "✨",
};
function getEmojiForType(type){ return emojiByType[type] || "📍"; }

// ★ 產生 AdvancedMarker 用的 emoji DOM
function createEmojiElement(type, selected=false){
  const el = document.createElement("div");
  el.className = "emoji-marker" + (selected ? " selected" : "");
  el.textContent = getEmojiForType(type);
  return el;
}

// ---- 景點資料（可自行增修）----
const locationList = [
  // 景點
  { name: "糯米橋", type: "景點", lat: 23.971679, lng: 120.874739 },
  { name: "音樂水車", type: "景點", lat: 23.972064, lng: 120.873682 },
  { name: "北圳弧形水橋", type: "景點", lat: 23.971324, lng: 120.875905 },
  { name: "阿婆洗衣墩", type: "景點", lat: 23.971127, lng: 120.876315 },
  { name: "碧雲宮", type: "景點", lat: 23.969956, lng: 120.878139 },
  { name: "元寶山", type: "景點", lat: 23.974038, lng: 120.878926 },
  { name: "茄苳神木", type: "景點", lat: 23.974933, lng: 120.872745 },
  { name: "北圳步道", type: "景點", lat: 23.974495, lng: 120.874096 },
  { name: "蝙蝠洞", type: "景點", lat: 23.973796, lng: 120.873537 },
  { name: "神仙島吊橋", type: "景點", lat: 23.973317, lng: 120.87199 },
  // 農遊體驗
  { name: "新豐農場", type: "農遊體驗", lat: 23.970372, lng: 120.876847 },
  { name: "行者咖啡", type: "農遊體驗", lat: 23.9724,  lng: 120.8722 },
  { name: "糯米橋咖啡工坊", type: "農遊體驗", lat: 23.972136, lng: 120.87103 },
  { name: "阿坤香茅工坊", type: "農遊體驗", lat: 23.975208, lng: 120.873617 },
  { name: "梅庄休閒渡假中心", type: "農遊體驗", lat: 23.97485,  lng: 120.87498 },
  { name: "綠恩有機棉花農場", type: "農遊體驗", lat: 23.97536,  lng: 120.87388 },
  { name: "百勝村咖啡莊園", type: "農遊體驗", lat: 23.969229, lng: 120.870302 },
  // 餐廳
  { name: "裕峰餐廳", type: "餐廳", lat: 23.97288,  lng: 120.873185 },
  { name: "后頭厝餐廳", type: "餐廳", lat: 23.97071,  lng: 120.877895 },
  { name: "鄉村餐廳", type: "餐廳", lat: 23.970988, lng: 120.878377 },
  { name: "私房餐廳", type: "餐廳", lat: 23.970735, lng: 120.878629 },
  // 民宿
  { name: "春天民宿", type: "民宿", lat: 23.975046, lng: 120.873941 },
  { name: "泰雅渡假村", type: "民宿", lat: 23.972829, lng: 120.870576 },
  { name: "水岸松林露營區", type: "民宿", lat: 23.975087, lng: 120.87484 },
  { name: "神仙島山莊", type: "民宿", lat: 23.972552, lng: 120.87157 },
  { name: "覓境露營", type: "民宿", lat: 23.9724,  lng: 120.8722 },
  { name: "陽光水岸會館", type: "民宿", lat: 23.97133,  lng: 120.8709 },
];

const activeTypes = new Set(["景點", "農遊體驗", "餐廳", "民宿"]);

// ================== ✨ 水平滑動功能 (重構版) ✨ ==================
// 將滑動的狀態變數移到函式外部，讓其他函式可以存取
let carousel = {
  container: null,
  cards: [],
  cardCount: 0,
  currentScrollLeft: 0,
  cardWidth: 0
};

// 獨立出一個專門更新滑動的函式
function updateCarouselScroll(snapAnimation = false) {
  if (!carousel.container) return;

  if (snapAnimation) {
    carousel.container.style.transition = 'scroll-left 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  } else {
    carousel.container.style.transition = 'none';
  }
  // 使用 scrollLeft 來控制水平滑動
  carousel.container.scrollLeft = carousel.currentScrollLeft;
}

function initRingCarousel() {
  carousel.container = document.querySelector('.top-strip');
  const checkboxList = document.getElementById('checkbox-list');

  if (!carousel.container || !checkboxList) return;
  
  carousel.cards = checkboxList.querySelectorAll('.option-card');
  if (carousel.cards.length === 0) return;

  carousel.cardCount = carousel.cards.length;
  carousel.cardWidth = carousel.cards[0].offsetWidth + 16; // 包含 gap

  let isDragging = false;
  let startX;
  let startScrollLeft;

  // --- 拖曳事件處理 ---
  function onDragStart(e) {
    isDragging = true;
    carousel.container.classList.add('active');
    startX = e.pageX || e.touches[0].pageX;
    startScrollLeft = carousel.container.scrollLeft;
    carousel.container.style.transition = 'none';
  }

  function onDragMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    const currentX = e.pageX || e.touches[0].pageX;
    const deltaX = currentX - startX;
    carousel.currentScrollLeft = startScrollLeft - deltaX;
    carousel.container.scrollLeft = carousel.currentScrollLeft;
  }

  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    carousel.container.classList.remove('active');
    
    // 計算最接近的卡片位置
    const cardIndex = Math.round(carousel.container.scrollLeft / carousel.cardWidth);
    carousel.currentScrollLeft = cardIndex * carousel.cardWidth;
    carousel.container.scrollLeft = carousel.currentScrollLeft;
  }

  carousel.container.addEventListener('mousedown', onDragStart);
  carousel.container.addEventListener('mousemove', onDragMove);
  carousel.container.addEventListener('mouseup', onDragEnd);
  carousel.container.addEventListener('mouseleave', onDragEnd);
  carousel.container.addEventListener('touchstart', onDragStart, { passive: true });
  carousel.container.addEventListener('touchmove', onDragMove);
  carousel.container.addEventListener('touchend', onDragEnd);

  // 初始化滑動位置
  carousel.currentScrollLeft = 0;
}

// ================== Map Init ==================
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 23.9719, lng: 120.8715 },
    zoom: 15,
    mapId: "DEMO_MAP_ID", // 替換成你自己的 Map ID
    gestureHandling: "greedy",
    fullscreenControl: true,
    mapTypeControl: false,
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    map,
    preserveViewport: true
  });
  infoWindow = new google.maps.InfoWindow();
  placesService = new google.maps.places.PlacesService(map);

  populateStartSelect();
  loadLocations();
  // 初始化 3D 圓環旋轉控制
  initRingCarousel();
  bindGlobalControls();

  // Autocomplete 初始化
  const input = document.getElementById("placeSearch");
  if (input) {
    autocomplete = new google.maps.places.Autocomplete(input, {
      fields: ["place_id", "name", "geometry", "types", "formatted_address"],
    });
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      pendingPlace = place && place.geometry ? place : null;
      renderSearchInfo(pendingPlace);
      if (pendingPlace?.geometry?.location) {
        map.panTo(pendingPlace.geometry.location);
        if (map.getZoom() < 16) map.setZoom(16);
      }
    });
  }
  document.getElementById("addSearchPlace")?.addEventListener("click", addSearchedPlaceToItinerary);

  applyTypeFilters();
  locationList.forEach((_, i) => setMarkerSelected(i, false));

  // 還原狀態
  restoreState();

  // 手機抽屜
  initDrawerControls();
  
  // ✨ 呼叫新的水平滑動效果函式 ✨
  // init3dCarousel 已移除，改用 initRingCarousel 的水平滑動功能

  // 行動裝置旋轉後，讓地圖重算尺寸（配合 CSS 的 100dvh）
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      if (window.google && window.google.maps && window.map) {
        google.maps.event.trigger(window.map, 'resize');
      }
    }, 300);
  });
}

// 綁定側欄固定控制元件
function bindGlobalControls() {
  // 類型篩選／批次
  document.querySelectorAll(".type-filter").forEach(box => {
    box.addEventListener("change", () => {
      if (box.checked) activeTypes.add(box.value);
      else activeTypes.delete(box.value);
      applyTypeFilters(); saveState();
    });
  });
  document.getElementById("selectVisible")?.addEventListener("click", () => {
    locationList.forEach((loc, idx) => {
      if (!activeTypes.has(loc.type)) return;
      const cb = document.getElementById(`cb-${idx}`);
      if (cb && !cb.checked) { cb.checked = true; setMarkerSelected(idx, true); }
    });
    rebuildSelectedList(); saveState(); planRouteFromOrder();
  });
  document.getElementById("clearVisible")?.addEventListener("click", () => {
    locationList.forEach((loc, idx) => {
      if (!activeTypes.has(loc.type)) return;
      const cb = document.getElementById(`cb-${idx}`);
      if (cb && cb.checked) { cb.checked = false; setMarkerSelected(idx, false); }
    });
    rebuildSelectedList(); saveState(); clearRoute();
  });

  // 規劃/清除/匯出
  document.getElementById("planRoute")?.addEventListener("click", planRouteSuggested);
  document.getElementById("planManual")?.addEventListener("click", planRouteFromOrder);
  document.getElementById("clearRoute")?.addEventListener("click", clearRoute);
  document.getElementById("exportLink")?.addEventListener("click", () => {
    if (!lastOrderedSeq || lastOrderedSeq.length < 2) { showToast("請先規劃一條路線。"); return; }
    const mode = document.getElementById("travelMode")?.value || "DRIVING";
    const url = buildGmapsUrl(lastOrderedSeq, mode);
    window.open(url, "_blank");
  });

  // 已選清單：建議排序 / 清空
  document.getElementById("suggestOrder")?.addEventListener("click", () => {
    const orderIdx = getSelectedIndicesFromList();
    if (orderIdx.length < 2) { showToast("請至少選擇 2 個景點。"); return; }
    const points = orderIdx.map(i => locationList[i]);
    const startSel = document.getElementById("startSelect").value;
    let startLoc = (startSel === "first") ? points[0]
                   : (startSel === "current") ? null
                   : locationList[Number(startSel)];

    let pool = [...points];
    if (startSel !== "first" && startSel !== "current") {
      if (!orderIdx.includes(Number(document.getElementById("startSelect").value))) {
        pool.unshift(startLoc);
      }
    }
    const ordered = (startSel === "current")
      ? points
      : nearestNeighbor(pool, startLoc || points[0]);

    const newIdxOrder = ordered
      .filter(p => p.name !== "我的位置")
      .map(p => locationList.findIndex(x => x.name === p.name));
    reorderSelectedList(newIdxOrder); saveState(); planRouteFromOrder();
  });

  document.getElementById("clearSelected")?.addEventListener("click", () => {
    document.querySelectorAll('#checkbox-list input[type="checkbox"]:checked')
      .forEach(cb => { cb.checked = false; setMarkerSelected(Number(cb.dataset.index), false); });
    rebuildSelectedList(); saveState(); clearRoute();
  });

  // 控制項變更 → 存檔 + 重新規劃
  document.getElementById("departTime")?.addEventListener("change", () => { saveState(); if (getSelectedIndicesFromList().length >= 2) planRouteFromOrder(); });
  document.getElementById("travelMode")?.addEventListener("change", () => { saveState(); if (getSelectedIndicesFromList().length >= 2) planRouteFromOrder(); });
  document.getElementById("startSelect")?.addEventListener("change", () => { saveState(); if (getSelectedIndicesFromList().length >= 2) planRouteFromOrder(); });

  // 午餐建議
  document.getElementById("suggestLunch")?.addEventListener("click", suggestLunch);

  // PDF 一鍵套用
  document.getElementById("preset1D_A")?.addEventListener("click", () => {
    applyPresetByNames(
      ["糯米橋", "音樂水車", "茄苳神木", "梅庄休閒渡假中心", "阿坤香茅工坊"],
      { "梅庄休閒渡假中心": 60, "阿坤香茅工坊": 90 },
      { departTime: "09:00", travelMode: "DRIVING", startSelect: "first" }
    );
  });
  document.getElementById("preset1D_B")?.addEventListener("click", () => {
    applyPresetByNames(
      ["糯米橋", "音樂水車", "碧雲宮", "后頭厝餐廳", "蝙蝠洞", "北圳步道"],
      { "后頭厝餐廳": 60 },
      { departTime: "09:00", travelMode: "DRIVING", startSelect: "first" }
    );
  });
  document.getElementById("preset1D_C")?.addEventListener("click", () => {
    applyPresetByNames(
      ["糯米橋", "音樂水車", "百勝村咖啡莊園", "裕峰餐廳", "新豐農場"],
      { "百勝村咖啡莊園": 60, "裕峰餐廳": 60, "新豐農場": 60 },
      { departTime: "09:00", travelMode: "DRIVING", startSelect: "first" }
    );
  });
}

// ================== UI Builders ==================
function populateStartSelect() {
  const sel = document.getElementById("startSelect");
  if (!sel) return;
  sel.innerHTML = `
    <option value="first">以「第一個勾選的景點」為起點</option>
    <option value="current">使用目前位置（需授權）</option>
  `;
  const group = document.createElement("optgroup");
  group.label = "指定固定起點（不一定要勾選）";
  locationList.forEach((loc, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = loc.name;
    group.appendChild(opt);
  });
  sel.appendChild(group);
}

function loadLocations() {
  const list = document.getElementById("checkbox-list");
  if (!list) return;
  list.innerHTML = '';
  const bounds = new google.maps.LatLngBounds();

  locationList.forEach((loc, idx) => {
    const card = document.createElement("label");
    card.className = "option-card";
    card.dataset.index = String(idx);
    card.dataset.type = loc.type;
    
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = `cb-${idx}`;
    cb.dataset.index = String(idx);
    cb.className = "d-none";

    const nameSpan = document.createElement("span");
    nameSpan.className = "name";
    nameSpan.textContent = `${getEmojiForType(loc.type)} ${loc.name}`;

    const detailsSpan = document.createElement("span");
    detailsSpan.className = "details";
    detailsSpan.textContent = loc.type;

    card.appendChild(cb);
    card.appendChild(nameSpan);
    card.appendChild(detailsSpan);
    list.appendChild(card);
      
    cb.addEventListener("change", () => {
      // ✨ 體驗升級：點擊卡片時，將它滑動到可見區域 ✨
      // 計算目標滑動位置
      const targetScrollLeft = idx * carousel.cardWidth;
      carousel.currentScrollLeft = targetScrollLeft;
      carousel.container.scrollLeft = targetScrollLeft;

      setMarkerSelected(idx, cb.checked);
      const pos = getMarkerLatLng(idx);
      map.panTo(pos); // 現在這行可以正常運作了！
      if (map.getZoom() < 15) map.setZoom(15);
      
      rebuildSelectedList();
      saveState();
      
      if (getSelectedIndicesFromList().length >= 2) {
        planRouteFromOrder();
      } else {
        clearRoute();
      }
    });

    // ... (後面的 Marker 和 InfoWindow 程式碼不變) ...
    const marker = createMarkerWithFallback(loc, idx);
    const pos = (marker.position && typeof marker.position.lat === "function")
      ? marker.position
      : new google.maps.LatLng(loc.lat, loc.lng);
    bounds.extend(pos);

    const openInfo = () => {
      const isChecked = !!document.querySelector(`#cb-${idx}:checked`);
      const btnId = `info-toggle-${idx}`;
      const html = `<div style="min-width:180px"><div style="font-weight:700">${loc.name}</div><div style="color:#666;font-size:12px;margin:2px 0 8px;">${loc.type}</div><button id="${btnId}" style="padding:6px 10px;width:auto;">${isChecked ? "從行程移除" : "加入行程"}</button></div>`;
      infoWindow.setContent(html);
      infoWindow.open({ map, anchor: marker });
      google.maps.event.addListenerOnce(infoWindow, "domready", () => {
        const btn = document.getElementById(btnId);
        if (btn) btn.onclick = () => toggleCheckbox(idx, true);
      });
    };
    if (google.maps.marker && google.maps.marker.AdvancedMarkerElement &&
        marker instanceof google.maps.marker.AdvancedMarkerElement) {
      marker.addListener("gmp-click", openInfo);
    } else if (marker.addListener) {
      marker.addListener("click", openInfo);
    }
  });

  if (!bounds.isEmpty()) map.fitBounds(bounds);
}

// ================== Selected list（拖曳 + 停留） ==================
function rebuildSelectedList() {
  const container = document.getElementById("selected-list");
  if (!container) return;

  const oldStay = getStayMinutesMapFromSelectedList();

  const checkedIdx = Array.from(
    document.querySelectorAll('#checkbox-list input[type="checkbox"]:checked')
  ).map(cb => Number(cb.dataset.index));

  const currentOrder = getSelectedIndicesFromList();
  const kept = currentOrder.filter(i => checkedIdx.includes(i));
  const extras = checkedIdx.filter(i => !kept.includes(i));
  const finalOrder = [...kept, ...extras];

  container.innerHTML = "";
  finalOrder.forEach(i => {
    const loc = locationList[i];
    const stay = oldStay.has(i) ? oldStay.get(i) : (defaultStayByType[loc.type] ?? 30);

    const li = document.createElement("li");
    li.dataset.index = String(i);
    li.innerHTML = `
      <span class="name">${loc.name}</span>
      <div class="staywrap">
        <label for="stay-${i}" style="margin:0;font-weight:400;">停留</label>
        <input class="stay" id="stay-${i}" type="number" min="0" step="5" value="${stay}" data-index="${i}" /> 分
      </div>
      <button class="remove" type="button" data-index="${i}" aria-label="移除 ${loc.name}">✕</button>
    `;
    container.appendChild(li);
  });

  // 刪除
  container.querySelectorAll(".remove").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = Number(e.currentTarget.dataset.index);
      const cb = document.getElementById(`cb-${idx}`);
      if (cb) { cb.checked = false; setMarkerSelected(idx, false); }
      rebuildSelectedList(); saveState();
      if (getSelectedIndicesFromList().length >= 2) planRouteFromOrder(); else clearRoute();
    });
  });

  // 停留時間更動
  container.querySelectorAll("input.stay").forEach(inp => {
    inp.addEventListener("change", () => {
      saveState();
      if (getSelectedIndicesFromList().length >= 2) planRouteFromOrder();
    });
  });

  if (!sortable) {
    sortable = new Sortable(container, {
      animation: 150,
      onSort: () => { saveState(); if (getSelectedIndicesFromList().length >= 2) planRouteFromOrder(); }
    });
  }
}

function getSelectedIndicesFromList() {
  const container = document.getElementById("selected-list");
  if (!container) return [];
  return Array.from(container.querySelectorAll("li")).map(li => Number(li.dataset.index));
}

function reorderSelectedList(newIdxOrder) {
  const container = document.getElementById("selected-list");
  if (!container) return;
  const oldStay = getStayMinutesMapFromSelectedList();
  container.innerHTML = "";
  newIdxOrder.forEach(i => {
    const loc = locationList[i];
    const stay = oldStay.has(i) ? oldStay.get(i) : (defaultStayByType[loc.type] ?? 30);
    const li = document.createElement("li");
    li.dataset.index = String(i);
    li.innerHTML = `
      <span class="name">${loc.name}</span>
      <div class="staywrap">
        <label for="stay-${i}" style="margin:0;font-weight:400;">停留</label>
        <input class="stay" id="stay-${i}" type="number" min="0" step="5" value="${stay}" data-index="${i}" /> 分
      </div>
      <button class="remove" type="button" data-index="${i}" aria-label="移除 ${loc.name}">✕</button>
    `;
    container.appendChild(li);
  });
  // 綁定
  container.querySelectorAll(".remove").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = Number(e.currentTarget.dataset.index);
      const cb = document.getElementById(`cb-${idx}`);
      if (cb) { cb.checked = false; setMarkerSelected(idx, false); }
      rebuildSelectedList(); saveState();
      if (getSelectedIndicesFromList().length >= 2) planRouteFromOrder(); else clearRoute();
    });
  });
  container.querySelectorAll("input.stay").forEach(inp => {
    inp.addEventListener("change", () => {
      saveState();
      if (getSelectedIndicesFromList().length >= 2) planRouteFromOrder();
    });
  });
}

function getStayMinutesMapFromSelectedList() {
  const mapM = new Map();
  document.querySelectorAll("#selected-list input.stay").forEach(inp => {
    const idx = Number(inp.dataset.index);
    const val = Math.max(0, Number(inp.value || 0));
    mapM.set(idx, val);
  });
  return mapM;
}

// ================== Routing（目前順序 / 建議排序） ==================
function clearRoute() {
  directionsRenderer?.set("directions", null);
  lastOrderedSeq = null;
  const panel = document.getElementById("itinerary");
  if (panel) panel.innerHTML = "";
}

async function planRouteFromOrder() {
  const orderIdx = getSelectedIndicesFromList();
  if (orderIdx.length < 2) { /*showToast("請至少選擇 2 個景點。");*/ return; }

  const mode = document.getElementById("travelMode")?.value || "DRIVING";
  const startSel = document.getElementById("startSelect")?.value || "first";
  const departStr = document.getElementById("departTime")?.value || "09:00";

  let seq = orderIdx.map(i => locationList[i]);
  if (startSel === "current") {
    try {
      const pos = await getCurrentPositionPromise();
      seq = [{ name:"我的位置", lat:pos.coords.latitude, lng:pos.coords.longitude }, ...seq];
    } catch {
      showToast("無法取得目前位置，請允許定位權限。");
      return;
    }
  } else if (startSel !== "first") {
    const fixed = locationList[Number(startSel)];
    const found = seq.findIndex(p => p.name === fixed.name);
    if (found === -1) seq = [fixed, ...seq];
    else if (found !== 0) { seq.splice(found,1); seq.unshift(fixed); }
  }

  drawDirectionsWithETA(seq, mode, departStr);
}

async function planRouteSuggested() {
  const checked = Array.from(document.querySelectorAll('#checkbox-list input[type="checkbox"]:checked'))
    .map(cb => Number(cb.dataset.index));
  if (checked.length < 2) { showToast("請至少選擇 2 個景點。"); return; }

  const mode = document.getElementById("travelMode")?.value || "DRIVING";
  const startSel = document.getElementById("startSelect")?.value || "first";
  const departStr = document.getElementById("departTime")?.value || "09:00";

  let points = checked.map(i => locationList[i]);
  let startLoc;

  if (startSel === "current") {
    try {
      const pos = await getCurrentPositionPromise();
      startLoc = { name: "我的位置", lat: pos.coords.latitude, lng: pos.coords.longitude };
      points = [startLoc, ...points];
    } catch { showToast("無法取得目前位置。"); return; }
  } else if (startSel === "first") {
    startLoc = points[0];
  } else {
    startLoc = locationList[Number(startSel)];
    if (!points.find(p => p.name === startLoc.name)) points = [startLoc, ...points];
  }

  const ordered = nearestNeighbor(points, startLoc);
  // 更新已選順序（排除「我的位置」）
  const newIdxOrder = ordered
    .filter(p => p.name !== "我的位置")
    .map(p => locationList.findIndex(x => x.name === p.name));
  reorderSelectedList(newIdxOrder); saveState();

  drawDirectionsWithETA(ordered, mode, departStr);
}

function drawDirectionsWithETA(seq, mode, departStr) {
  if (!seq || seq.length < 2) return;

  const origin = new google.maps.LatLng(seq[0].lat, seq[0].lng);
  const destination = new google.maps.LatLng(seq[seq.length - 1].lat, seq[seq.length - 1].lng);
  const waypoints = seq.slice(1, seq.length - 1).map(p => ({
    location: new google.maps.LatLng(p.lat, p.lng), stopover: true
  }));

  directionsService.route(
    { origin, destination, waypoints, travelMode: google.maps.TravelMode[mode], optimizeWaypoints: false },
    (result, status) => {
      if (status === "OK") {
        directionsRenderer.setDirections(result);
        lastOrderedSeq = seq;
        lastDirectionsResult = result;
        const stayMap = buildStayMinutesByName();
        renderItineraryWithETA(seq, result, departStr, stayMap);
      } else {
        console.error("無法規劃路線：", status);
        showToast("無法規劃路線：" + status);
      }
    }
  );
}

function buildStayMinutesByName() {
  const m = {};
  document.querySelectorAll("#selected-list li").forEach(li => {
    const idx = Number(li.dataset.index);
    const name = locationList[idx].name;
    const stay = Math.max(0, Number(li.querySelector("input.stay")?.value || 0));
    m[name] = stay;
  });
  return m;
}

// ================== 行程明細（含 ETA ） ==================
function renderItineraryWithETA(seq, result, departStr, stayByName) {
  const legs = result.routes[0].legs;
  let totalMeters = 0, totalMoveSeconds = 0;
  legs.forEach(leg => { totalMeters += leg.distance.value; totalMoveSeconds += leg.duration.value; });
  const km = (totalMeters / 1000).toFixed(2);

  const [hStr, mStr] = (departStr || "09:00").split(":");
  let current = new Date();
  current.setHours(Number(hStr) || 9, Number(mStr) || 0, 0, 0);

  const rows = [];
  let totalStayMinutes = 0;

  // 第 0 站
  let arrive = new Date(current);
  let stay0 = stayByName[seq[0].name] || 0;
  let depart = new Date(arrive.getTime() + stay0 * 60000);
  if (stay0 > 0) totalStayMinutes += stay0;
  rows.push({
    idx: 1, name: seq[0].name,
    arrive, stay: stay0, depart,
    moveText: seq.length > 1 ? fmtDurationSec(legs[0].duration.value) : "-"
  });

  for (let i = 1; i < seq.length; i++) {
    const travelSec = legs[i - 1].duration.value;
    arrive = new Date(depart.getTime() + travelSec * 1000);
    const stayMin = stayByName[seq[i].name] || 0;
    if (stayMin > 0) totalStayMinutes += stayMin;
    depart = new Date(arrive.getTime() + stayMin * 60000);

    rows.push({
      idx: i + 1, name: seq[i].name,
      arrive, stay: stayMin, depart,
      moveText: (i < seq.length - 1) ? fmtDurationSec(legs[i].duration.value) : "-"
    });
  }

  const totalEnd = new Date(current.getTime() + totalMoveSeconds * 1000 + totalStayMinutes * 60000);
  const hh = Math.floor(totalMoveSeconds / 3600);
  const mm = Math.round((totalMoveSeconds % 3600) / 60);

  let panel = document.getElementById("itinerary");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "itinerary";
    document.querySelector(".sidebar")?.appendChild(panel);
  }
  panel.innerHTML = `
    <div><strong>總移動距離：</strong>${km} km</div>
    <div><strong>總移動時間：</strong>${hh > 0 ? `${hh} 小時 ` : ""}${mm} 分</div>
    <div><strong>總停留時間：</strong>${totalStayMinutes} 分</div>
    <div><strong>出發時間：</strong>${fmtTime(current)}</div>
    <div><strong>預估結束：</strong>${fmtTime(totalEnd)}</div>
    <table>
      <thead>
        <tr>
          <th>#</th><th>景點</th><th>到達</th><th>停留</th><th>離開</th><th>下段移動</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${r.idx}</td>
            <td>${r.name}</td>
            <td>${fmtTime(r.arrive)}</td>
            <td>${r.stay} 分</td>
            <td>${fmtTime(r.depart)}</td>
            <td>${r.moveText}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

// ================== 午餐建議（Places） ==================
async function suggestLunch() {
  if (!lastOrderedSeq || !lastDirectionsResult) {
    showToast("請先規劃路線再使用午餐建議。");
    return;
  }
  const departStr = document.getElementById("departTime")?.value || "09:00";
  const legs = lastDirectionsResult.routes[0].legs;
  const seq = lastOrderedSeq;
  const stayByName = buildStayMinutesByName();

  const [hStr, mStr] = (departStr || "09:00").split(":");
  let t = new Date(); t.setHours(Number(hStr) || 9, Number(mStr) || 0, 0, 0);

  let arrive = new Date(t);
  let depart = new Date(arrive.getTime() + (stayByName[seq[0].name] || 0) * 60000);

  const noon = new Date(t); noon.setHours(12, 0, 0, 0);
  const windowMin = new Date(noon.getTime() - 60 * 60000);
  const windowMax = new Date(noon.getTime() + 60 * 60000);

  let anchor = { lat: seq[Math.floor(seq.length/2)].lat, lng: seq[Math.floor(seq.length/2)].lng };
  for (let i = 1; i < seq.length; i++) {
    const travelSec = legs[i - 1].duration.value;
    arrive = new Date(depart.getTime() + travelSec * 1000);
    if (arrive >= windowMin && arrive <= windowMax) { anchor = { lat: seq[i].lat, lng: seq[i].lng }; break; }
    const stayMin = stayByName[seq[i].name] || 0;
    const leave = new Date(arrive.getTime() + stayMin * 60000);
    if (arrive <= noon && leave >= noon) { anchor = { lat: seq[i].lat, lng: seq[i].lng }; break; }
    depart = leave;
  }

  const radius = Math.max(100, Number(document.getElementById("lunchRadius")?.value || 500));
  lunchTempMarkers.forEach(m => m.setMap && m.setMap(null));
  lunchTempMarkers = [];

  const request = { location: new google.maps.LatLng(anchor.lat, anchor.lng), radius, type: "restaurant" };
  placesService.nearbySearch(request, (results, status) => {
    const box = document.getElementById("lunchResults");
    if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
      if (box) box.innerHTML = `<div class="muted">在 ${radius}m 內沒有找到餐廳。</div>`;
      return;
    }
    const top = results.slice(0, 8);
    const listHtml = top.map((p, i) => {
      const rating = (p.rating != null) ? `⭐ ${p.rating}` : "";
      const addr = p.vicinity || p.formatted_address || "";
      return `
        <div style="margin:6px 0;padding:6px;border:1px dashed #ddd;border-radius:8px">
          <div style="font-weight:600">${i+1}. ${p.name} <span style="color:#666;font-weight:400">${rating}</span></div>
          <div style="font-size:12px;color:#666">${addr}</div>
          <button data-pid="${p.place_id}" class="add-lunch btn-ghost" style="margin-top:6px;width:100%;padding:6px;">加入行程</button>
        </div>
      `;
    }).join("");
    if (box) {
      box.innerHTML = `<div style="margin-bottom:6px;color:#333">以「中午」所在點為中心，半徑 ${radius}m 的餐廳：</div>${listHtml}`;
      box.querySelectorAll(".add-lunch").forEach(btn => {
        btn.addEventListener("click", () => addPlaceToItinerary(btn.dataset.pid));
      });
    }
    top.forEach((p, i) => {
      const pos = p.geometry?.location; if (!pos) return;
      const m = new google.maps.Marker({ position: pos, map, label: String(i+1) });
      lunchTempMarkers.push(m);
    });
    map.panTo(request.location); if (map.getZoom() < 16) map.setZoom(16);
  });
}

function addPlaceToItinerary(placeId) {
  placesService.getDetails({ placeId, fields: ["name","geometry"] }, (place, status) => {
    if (status !== google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const name = place.name;

    let idx = locationList.findIndex(x => x.name === name);
    if (idx === -1) {
      locationList.push({ name, type: "餐廳", lat, lng });
      idx = locationList.length - 1;
      appendNewCheckboxRow(idx);
      createMarkerWithFallback(locationList[idx], idx);
    }
    const cb = document.getElementById(`cb-${idx}`);
    if (cb) { cb.checked = true; setMarkerSelected(idx, true); }
    rebuildSelectedList(); saveState();
    if (getSelectedIndicesFromList().length >= 2) planRouteFromOrder(); else clearRoute();
    map.panTo({ lat, lng }); if (map.getZoom() < 15) map.setZoom(15);
  });
}

function appendNewCheckboxRow(idx) {
  const list = document.getElementById("checkbox-list");
  if (!list) return;
  const loc = locationList[idx];

  // ✨ 調整點：同樣產生新的 label.option-card 結構
  const card = document.createElement("label");
  card.className = "option-card";
  card.dataset.index = String(idx);
  card.dataset.type = loc.type;

  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.id = `cb-${idx}`;
  cb.dataset.index = String(idx);
  cb.className = "d-none";

  const nameSpan = document.createElement("span");
  nameSpan.className = "name";
  nameSpan.textContent = `${getEmojiForType(loc.type)} ${loc.name}`;

  const detailsSpan = document.createElement("span");
  detailsSpan.className = "details";
  detailsSpan.textContent = loc.type;

  card.appendChild(cb);
  card.appendChild(nameSpan);
  card.appendChild(detailsSpan);
  list.appendChild(card);
  
  // ✨ 調整點：只需監聽 change 事件
  cb.addEventListener("change", () => {
    setMarkerSelected(idx, cb.checked);
    const pos = getMarkerLatLng(idx);
    map.panTo(pos); if (map.getZoom() < 15) map.setZoom(15);
    rebuildSelectedList(); saveState();
    if (getSelectedIndicesFromList().length >= 2) planRouteFromOrder(); else clearRoute();
  });

  applyTypeFilters();
}

// ================== PDF 一鍵套用 ==================
function applyPresetByNames(names, stayOverrides = {}, options = {}) {
  // 1) 清空所有勾選
  document.querySelectorAll('#checkbox-list input[type="checkbox"]').forEach(cb => {
    cb.checked = false; setMarkerSelected(Number(cb.dataset.index), false);
  });
  rebuildSelectedList();

  // 2) 依序勾選
  names.forEach(name => {
    const idx = locationList.findIndex(l => l.name === name);
    if (idx !== -1) {
      const cb = document.getElementById(`cb-${idx}`);
      if (cb) { cb.checked = true; setMarkerSelected(idx, true); }
    } else {
      console.warn("找不到地點：", name);
    }
  });

  // 3) 重建＋覆寫停留
  rebuildSelectedList();
  if (stayOverrides && Object.keys(stayOverrides).length) {
    document.querySelectorAll("#selected-list li").forEach(li => {
      const idx = Number(li.dataset.index);
      const nm = locationList[idx].name;
      const inp = li.querySelector("input.stay");
      if (inp && stayOverrides[nm] != null) {
        inp.value = Math.max(0, Number(stayOverrides[nm]));
      }
    });
  }

  // 4) 控制項
  if (options.departTime && document.getElementById("departTime")) document.getElementById("departTime").value = options.departTime;
  if (options.travelMode && document.getElementById("travelMode")) document.getElementById("travelMode").value = options.travelMode;
  if (options.startSelect && document.getElementById("startSelect")) document.getElementById("startSelect").value = options.startSelect;

  // 5) 存檔 + 規劃
  saveState();
  if (getSelectedIndicesFromList().length >= 2) planRouteFromOrder(); else clearRoute();
}

// ================== 手機抽屜 ==================
function initDrawerControls() {
  const drawer = document.querySelector(".sidebar");
  const backdrop = document.getElementById("backdrop");
  const fab = document.getElementById("toggleSidebar");
  function openDrawer() {
    drawer?.classList.add("open");
    backdrop?.classList.add("show");
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    fab?.setAttribute('aria-label','關閉行程面板');
  }
  function closeDrawer() {
    drawer?.classList.remove("open");
    backdrop?.classList.remove("show");
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    fab?.setAttribute('aria-label','開啟行程面板');
    if (window.google && window.google.maps && window.map) {
      google.maps.event.trigger(window.map, 'resize');
    }
  }
  fab?.addEventListener("click", openDrawer);
  backdrop?.addEventListener("click", closeDrawer);
  ["planRoute","planManual","suggestOrder"].forEach(id=>{
    document.getElementById(id)?.addEventListener("click", () => {
      if (window.matchMedia("(max-width: 768px)").matches) closeDrawer();
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });
  const mq = window.matchMedia("(min-width: 769px)");
  const handler = (e)=>{ if (e.matches) closeDrawer(); };
  if (mq.addEventListener) mq.addEventListener("change", handler);
  else if (mq.addListener) mq.addListener(handler);
}

// ================== 距離/排序工具 ==================
function nearestNeighbor(points, startLoc) {
  if (!points?.length) return [];
  const s = startLoc || points[0];
  const visited = [s];
  const remaining = points.filter(p => p.name !== s.name);
  while (remaining.length) {
    const last = visited[visited.length - 1];
    let best = null, min = Infinity;
    for (const loc of remaining) {
      const d = haversineMeters(last.lat, last.lng, loc.lat, loc.lng);
      if (d < min) { min = d; best = loc; }
    }
    visited.push(best);
    remaining.splice(remaining.findIndex(x => x.name === best.name), 1);
  }
  return visited;
}
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000, toRad = d => d*Math.PI/180;
  const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}

// ================== Marker / Filters / Interactions ==================
function createMarkerWithFallback(loc, idx) {
  if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
    const content = createEmojiElement(loc.type, false);
    const m = new google.maps.marker.AdvancedMarkerElement({
      position: { lat: loc.lat, lng: loc.lng },
      map, title: loc.name, content
    });
    markers[idx] = m; 
    return m;
  }
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>';
  const m = new google.maps.Marker({
    position: { lat: loc.lat, lng: loc.lng }, map, title: loc.name,
    icon: { url: 'data:image/svg+xml;utf8,' + encodeURIComponent(svg), scaledSize: new google.maps.Size(1,1) },
    label: { text: getEmojiForType(loc.type) }
  });
  markers[idx] = m;
  return m;
}

function applyTypeFilters() {
  locationList.forEach((loc, idx) => {
    const visible = activeTypes.has(loc.type);
    const m = markers[idx]; if (!m) return;
    if ("setMap" in m) m.setMap(visible ? map : null); else m.map = visible ? map : null;
    // ✨ 調整點：選擇器從 .row 改為 .option-card
    const card = document.querySelector(`.option-card[data-index="${idx}"]`);
    if (card) card.style.display = visible ? "" : "flex"; // 用 flex 才能正確顯示
  });
}
function getMarkerLatLng(idx) {
  const m = markers[idx];
  const loc = locationList[idx];
  if (!m) return new google.maps.LatLng(loc.lat, loc.lng);
  if (m.position && typeof m.position.lat === "function") return m.position;
  return new google.maps.LatLng(loc.lat, loc.lng);
}
function setMarkerSelected(idx, selected) {
  const m = markers[idx]; if (!m) return;
  if ("setIcon" in m) {
    m.setZIndex(selected ? google.maps.Marker.MAX_ZINDEX + 1 : undefined);
    return;
  }
  const el = m.content;
  if (el && el.classList) el.classList.toggle("selected", !!selected);
}

function toggleCheckbox(idx, scrollIntoView) {
  const cb = document.getElementById(`cb-${idx}`); if (!cb) return;
  cb.checked = !cb.checked;
  setMarkerSelected(idx, cb.checked);

  animateMarker(idx);
  highlightCard(idx); // ✨ 調整點：呼叫新的函式名稱
  showToast((cb.checked ? "已加入：" : "已移除：") + locationList[idx].name);

  if (scrollIntoView) cb.closest('.option-card').scrollIntoView({ behavior: "smooth", block: "center" });

  const pos = getMarkerLatLng(idx);
  map.panTo(pos); if (map.getZoom() < 15) map.setZoom(15);

  rebuildSelectedList(); saveState();

  if (cb.checked) setTimeout(()=> scrollSelectedItem(idx), 0);

  if (getSelectedIndicesFromList().length >= 2) planRouteFromOrder(); else clearRoute();
}


// ================== LocalStorage ==================
function saveState() {
  try {
    const orderIdx = getSelectedIndicesFromList();
    const stay = {};
    document.querySelectorAll("#selected-list input.stay").forEach(inp => {
      const idx = Number(inp.dataset.index);
      const val = Math.max(0, Number(inp.value || 0));
      stay[idx] = val;
    });
    const state = {
      v: 1,
      selectedOrder: orderIdx,
      stayByIndex: stay,
      departTime: document.getElementById("departTime")?.value || "09:00",
      travelMode: document.getElementById("travelMode")?.value || "DRIVING",
      startSelect: document.getElementById("startSelect")?.value || "first",
      activeTypes: Array.from(activeTypes),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) { console.warn("saveState 失敗：", e); }
}
function restoreState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);
    if (!state || state.v !== 1) return;

    if (Array.isArray(state.activeTypes) && state.activeTypes.length) {
      activeTypes.clear();
      state.activeTypes.forEach(t => activeTypes.add(t));
      document.querySelectorAll(".type-filter").forEach(box => { box.checked = activeTypes.has(box.value); });
      applyTypeFilters();
    }

    if (document.getElementById("departTime") && state.departTime)
      document.getElementById("departTime").value = state.departTime;
    if (document.getElementById("travelMode") && state.travelMode)
      document.getElementById("travelMode").value = state.travelMode;
    if (document.getElementById("startSelect") && state.startSelect)
      document.getElementById("startSelect").value = state.startSelect;

    if (Array.isArray(state.selectedOrder)) {
      state.selectedOrder.forEach(idx => {
        const cb = document.getElementById(`cb-${idx}`);
        if (cb) { cb.checked = true; setMarkerSelected(idx, true); }
      });
    }
    rebuildSelectedList();

    if (state.stayByIndex) {
      document.querySelectorAll("#selected-list input.stay").forEach(inp => {
        const idx = Number(inp.dataset.index);
        if (state.stayByIndex[idx] != null) inp.value = state.stayByIndex[idx];
      });
    }

    if (getSelectedIndicesFromList().length >= 2) {
      planRouteFromOrder();
    }
  } catch (e) { console.warn("restoreState 失敗：", e); }
}

// ================== 搜尋並加入 ==================
function renderSearchInfo(place) {
  const box = document.getElementById("searchInfo");
  if (!box) return;
  if (!place) { box.textContent = "請在上方輸入並選取一個地點。"; return; }
  const addr = place.formatted_address || "";
  const typeStr = (place.types || []).slice(0,3).join(", ");
  box.innerHTML = `<div><b>${place.name}</b></div>
                   <div style="font-size:13px">${addr}</div>
                   <div style="font-size:12px;color:#888">types: ${typeStr}</div>`;
}
function mapPlaceTypesToCategory(types = []) {
  if (types.includes("restaurant") || types.includes("food") || types.includes("cafe")) return "餐廳";
  if (types.includes("lodging")) return "民宿";
  if (types.includes("tourist_attraction") || types.includes("point_of_interest")) return "景點";
  return "自訂";
}
function addSearchedPlaceToItinerary() {
  if (!pendingPlace || !pendingPlace.geometry?.location) {
    showToast("請先在上方輸入並選取一個地點。");
    return;
  }
  const lat = pendingPlace.geometry.location.lat();
  const lng = pendingPlace.geometry.location.lng();
  const name = pendingPlace.name || "未命名地點";
  const type = mapPlaceTypesToCategory(pendingPlace.types || []);

  let idx = locationList.findIndex(x => x.name === name);
  if (idx === -1) {
    locationList.push({ name, type, lat, lng });
    idx = locationList.length - 1;
    appendNewCheckboxRow(idx);
    createMarkerWithFallback(locationList[idx], idx);
  }
  const cb = document.getElementById(`cb-${idx}`);
  if (cb) { cb.checked = true; setMarkerSelected(idx, true); }
  rebuildSelectedList(); saveState();
  if (getSelectedIndicesFromList().length >= 2) planRouteFromOrder(); else clearRoute();
  map.panTo({ lat, lng }); if (map.getZoom() < 15) map.setZoom(15);
}
// === UI 回饋：Toast / 標記動畫 / 列高亮 / 捲動 ===
function showToast(msg){
  let el = document.getElementById('toast');
  if(!el){
    el = document.createElement('div');
    el.id = 'toast'; el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=> el.classList.remove('show'), 1400);
}

function animateMarker(idx){
  const m = markers[idx];
  if(!m) return;
  if ('setAnimation' in m && google.maps.Animation){
    m.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(()=> m.setAnimation(null), 650);
  } else if (m.content){
    m.content.classList.add('clicked');
    setTimeout(()=> m.content.classList.remove('clicked'), 400);
  }
}

// ✨ 調整點：函式改名並更新選擇器
function highlightCard(idx){
  const card = document.querySelector(`.option-card[data-index="${idx}"]`);
  if(!card) return;
  card.classList.add('highlight');
  setTimeout(()=> card.classList.add('fade'), 50);
  setTimeout(()=> card.classList.remove('highlight','fade'), 700);
}

function scrollSelectedItem(idx){
  const li = document.querySelector(`#selected-list li[data-index="${idx}"]`);
  if(li){
    li.classList.add('flash');
    li.scrollIntoView({ behavior:'smooth', block:'center' });
    setTimeout(()=> li.classList.add('fade'), 50);
    setTimeout(()=> li.classList.remove('flash','fade'), 900);
  }
}

// ================== Utils ==================
function getCurrentPositionPromise(options = { enableHighAccuracy: true, timeout: 10000 }) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) reject(new Error("此瀏覽器不支援定位"));
    else navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}
function buildGmapsUrl(ordered, mode) {
  if (!ordered || ordered.length < 2) return "";
  const origin = `${ordered[0].lat},${ordered[0].lng}`;
  const destination = `${ordered[ordered.length - 1].lat},${ordered[ordered.length - 1].lng}`;
  const waypoints = ordered.slice(1, ordered.length - 1).map(p => `${p.lat},${p.lng}`).join("|");
  const m = (mode || "DRIVING").toLowerCase();
  const base = "https://www.google.com/maps/dir/?api=1";
  const params = `origin=${origin}&destination=${destination}&travelmode=${m}` +
                 (waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : "");
  return `${base}&${params}`;
}
function fmtTime(d) {
  const hh = String(d.getHours()).padStart(2,"0");
  const mm = String(d.getMinutes()).padStart(2,"0");
  return `${hh}:${mm}`;
}
function fmtDurationSec(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h} 小時 ${m} 分` : `${m} 分`;
}

// ================== ✨ 已移除：3D 旋轉效果，改用水平滑動功能 ✨ ==================
// 原本的 init3dCarousel 函式已移除，現在使用 initRingCarousel 的水平滑動功能

window.initMap = initMap;

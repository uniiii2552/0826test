/* === ✨ Ochre 主題（保留原配色） ✨ === */
:root {
  --brand: #9a6700;
  --brand-light: rgba(154, 103, 0, 0.1);
  --danger: #ef4444;

  --bg: #D6C88E;
  --card: #fffcf5;
  --border: #f0e9d9;

  --card-selected: #fff4d4;

  --text: #44403c;
  --muted: #78716c;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}

* { box-sizing: border-box; }
html, body { height: 100%; overflow: hidden; }

body {
  margin: 0;
  font-family: "Noto Sans TC", system-ui, -apple-system, Segoe UI, Roboto,
    "Helvetica Neue", Arial, "PingFang TC", "Microsoft JhengHei", sans-serif;
  color: var(--text);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* === ✅ 新增：最上方 hero 橫幅 === */
.hero {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: rgba(253, 250, 242, 0.85);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border-bottom: 1px solid var(--border);
}
.hero-logo { height: 42px; width: auto; border-radius: 8px; box-shadow: var(--shadow-sm); }
.hero .hero-text h1 { margin: 0; font-size: 20px; }
.hero .hero-text small { color: var(--muted); }

/* === 核心佈局 === */
.container { height: calc(100vh - 64px); /* 扣掉 hero 高度 */ padding: 0; display: flex; flex-direction: column; }
.content { position: relative; flex-grow: 1; }
#map { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; }

/* === ✅ 新增：上方「下拉選單」工具列 === */
.top-bar {
  position: absolute;
  top: 12px;
  left: calc(360px + 20px); /* 側欄寬 + 左邊間距 */
  right: 20px;
  z-index: 30;
  padding: 8px 10px;
  background: rgba(255, 252, 245, 0.9);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
.top-bar-inner { display: flex; gap: 8px; align-items: center; }
.quick-select, .top-bar select, .top-bar button {
  padding: 10px 12px; font-size: 14px; border: 1px solid var(--border);
  border-radius: var(--radius-sm); background: #fff;
}
.quick-actions { display: flex; gap: 8px; }
.btn-ghost { background: var(--card); color: var(--text); border: 1px solid var(--border); }
button { cursor: pointer; background: var(--brand); color: #fff; border: none; font-weight: 600; }
button:hover { filter: brightness(1.08); }

/* === 左側側邊欄（新增可收合） === */
.sidebar {
  position: absolute; top: 20px; left: 20px; z-index: 20; width: 360px;
  background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: 8px 8px 16px 8px; box-shadow: var(--shadow-lg); max-height: calc(100% - 40px); overflow-y: auto;
  transition: transform .28s ease;
}
.sidebar.collapsed { transform: translateX(calc(-100% - 20px)); } /* ✅ 收合不擋地圖 */

.sidebar h2 { font-size: 20px; font-weight: 700; padding: 12px 16px 8px; margin: 0; color: var(--brand); }
.sidebar h3 { font-size: 16px; font-weight: 600; padding: 4px 16px 8px; margin: 12px 0 0 0; border-top: 1px solid var(--border); }
.sidebar .box { border: none; box-shadow: none; padding: 0px 16px; margin-bottom: 0; }
.sidebar .selected.box { background-color: var(--bg); padding: 0 16px 16px; margin-top: 4px; border-radius: var(--radius-md); }

/* === 已選行程 === */
.sortable-list { list-style: decimal inside; padding: 8px; margin: 10px 0; border-radius: 8px; background: var(--bg); }
.sortable-list li {
  display: flex; align-items: center; gap: 8px; padding: 12px;
  border-radius: var(--radius-md); box-shadow: var(--shadow-sm); background: var(--card); border: 1px solid var(--border);
}
.sortable-list .name { flex: 1 1 auto; min-width: 0; font-weight: 500; margin-right: auto; }
.sortable-list .staywrap { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.sortable-list input.stay { width: 60px; text-align: center; }

/* === 行程明細表 === */
#itinerary { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); font-size: 14px; line-height: 1.6; }
#itinerary table { width: 100%; border-collapse: collapse; margin-top: 8px; }
#itinerary th, #itinerary td { border-bottom: 1px solid var(--border); padding: 8px 4px; text-align: left; font-size: 13px; }
#itinerary th { font-weight: 600; color: var(--muted); }

/* === Toast === */
.toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%) translateY(20px); background: rgba(33, 33, 33, .95); color: #fff; padding: 12px 18px; border-radius: var(--radius-md); font-size: 14px; opacity: 0; pointer-events: none; transition: opacity .2s, transform .2s; z-index: 1000; box-shadow: var(--shadow-lg); }
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

/* === ✅ 調整：圓形按鈕擺到「地圖上方」 === */
.fab {
  position: absolute;
  top: 12px;           /* 與 top-bar 同一條水平線 */
  right: 20px;
  z-index: 40;
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 44px; border-radius: 9999px;
  background: var(--brand); color: #fff; border: none; box-shadow: var(--shadow-lg);
}

/* === 手機版（維持抽屜 + 上方工具列縮進） === */
@media (max-width: 768px) {
  .top-bar { left: 16px; right: 16px; }
  .sidebar {
    position: fixed; top: 0; left: 0; width: 88vw; max-width: 360px;
    height: 100vh; max-height: 100vh; border-radius: 0; border: none;
    transform: translateX(-100%); z-index: 40;
  }
  .sidebar.open { transform: translateX(0); }
  .backdrop {
    display: block; position: fixed; inset: 0; background: rgba(0, 0, 0, .4);
    z-index: 35; opacity: 0; visibility: hidden; pointer-events: none;
    transition: opacity .25s ease, visibility .25s ease;
  }
  .backdrop.show { opacity: 1; visibility: visible; pointer-events: auto; }
}

/* === 可存取的隱藏（供 JS 使用） === */
.visually-hidden { position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

/* 輔助 */
label { display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; }
.filters label { display: inline-block; margin-bottom: 8px; font-weight: 400; }
.button-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 8px; margin-top: 8px; }
.filter-actions { display: flex; gap: 8px; margin-top: 8px; }

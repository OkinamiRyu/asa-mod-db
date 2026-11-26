(() => {
  'use strict';

  const PAGE_SIZE = 80;
  const THEME_STORAGE_KEY = 'asa_mod_db_theme';
  const PIN_STORAGE_KEY = 'asa_mod_db_pins';
  const RECENT_STORAGE_KEY = 'asa_mod_db_recent';
  const VIEW_MODE_STORAGE_KEY = 'asa_mod_db_view_mode';
  const TIPS_DEVICE_STORAGE_KEY = 'asa_mod_db_tips_device';
  const MAX_RECENT = 20;

  const VANILLA_REF_EN_NAMES = new Set([
    'wood', 'thatch', 'fiber', 'stone', 'flint', 'hide', 'raw meat', 'spoiled meat',
    'metal', 'metal ingot', 'crystal', 'oil', 'obsidian', 'sap', 'rare flower',
    'azulberry', 'rockarrot', 'cementing paste', 'electronics', 'polymer',
    'organic polymer', 'sparkpowder', 'charcoal', 'narcotic', 'soap',
    'stone arrow', 'campfire', 'blood extractor', 'chitin or keratin', 'feces',
    'water container', 'primalitemconsumableseed',
  ]);

  const MATCH_HINT_FIELDS = [
    { prop: 'materials', label: '必要素材' },
    { prop: 'craftStation', label: '作る場所' },
    { prop: 'harvestSource', label: '採取元' },
    { prop: 'toolUsed', label: '使う道具' },
    { prop: 'dinoName', label: '恐竜名' },
    { prop: 'tamingMethod', label: 'テイム方法' },
    { prop: 'favoriteFood', label: '大好きなエサ' },
    { prop: 'foodAmount', label: '必要数の目安' },
    { prop: 'habitat', label: '生息地' },
    { prop: 'saddleRide', label: 'サドル・騎乗' },
    { prop: 'specialAbility', label: '特殊能力' },
    { prop: 'applyTarget', label: '適用対象' },
    { prop: 'applyMethod', label: '適用方法' },
    { prop: 'enOriginal', label: '英語原文' },
  ];

  const state = {
    data: null,
    icons: {},
    activeTab: '', // 'ALL' | 'INSTALLED' | <modSheet.id>
    searchQuery: '',
    category: '',
    filter2: '',
    filter3: '',
    quickFilter: '', // '' | 'stations' | 'item' | 'creature' | 'cosmetic' | 'pinned' | 'recent'
    mobileFiltersOpen: false,
    sortBy: 'index',
    viewMode: 'card', // 'card' | 'table'
    visibleLimit: PAGE_SIZE,
    modSearchQuery: '',
    filteredItems: [],
    allItemsByGlobalIndex: new Map(),
    itemByKey: new Map(),
    lookupByEn: new Map(),
    lookupByJa: new Map(),
    producedByMap: new Map(),
    usedInMap: new Map(),
    pinnedKeys: new Set(),
    recentKeys: [],
    mainItem: null,
    sub1Item: null,
    sub2Stack: [],
  };

  const els = {
    brandHomeLink: document.getElementById('brandHomeLink'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    statBadge: document.getElementById('statBadge'),
    updatedBadge: document.getElementById('updatedBadge'),
    tabList: document.getElementById('tabList'),
    itemsSection: document.getElementById('itemsSection'),
    modsSection: document.getElementById('modsSection'),
    rulesSection: document.getElementById('rulesSection'),
    rulesContainer: document.getElementById('rulesContainer'),
    tipsSection: document.getElementById('tipsSection'),
    tipsContent: document.getElementById('tipsContent'),
    tipsDeviceBar: document.getElementById('tipsDeviceBar'),
    shareTipsBtn: document.getElementById('shareTipsBtn'),
    faqSection: document.getElementById('faqSection'),
    shareFaqBtn: document.getElementById('shareFaqBtn'),
    faqSearchInput: document.getElementById('faqSearchInput'),
    faqList: document.getElementById('faqList'),
    faqEmptyState: document.getElementById('faqEmptyState'),
    typeTipBanner: document.getElementById('typeTipBanner'),
    modSelect: document.getElementById('modSelect'),
    resetModBtn: document.getElementById('resetModBtn'),
    itemSearchInput: document.getElementById('itemSearchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    quickFilterBar: document.getElementById('quickFilterBar'),
    mobileFilterToggle: document.getElementById('mobileFilterToggle'),
    mobileFilterToggleText: document.getElementById('mobileFilterToggleText'),
    filterRow: document.getElementById('filterRow'),
    filterCategory: document.getElementById('filterCategory'),
    filterObtainLabel: document.getElementById('filterObtainLabel'),
    filterObtain: document.getElementById('filterObtain'),
    filterStationLabel: document.getElementById('filterStationLabel'),
    filterStation: document.getElementById('filterStation'),
    sortSelect: document.getElementById('sortSelect'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    viewCardBtn: document.getElementById('viewCardBtn'),
    viewTableBtn: document.getElementById('viewTableBtn'),
    resultCount: document.getElementById('resultCount'),
    itemsContainer: document.getElementById('itemsContainer'),
    loadMoreWrap: document.getElementById('loadMoreWrap'),
    loadMoreBtn: document.getElementById('loadMoreBtn'),
    showAllBtn: document.getElementById('showAllBtn'),
    emptyState: document.getElementById('emptyState'),
    emptyResetBtn: document.getElementById('emptyResetBtn'),
    modSearchInput: document.getElementById('modSearchInput'),
    modResultCount: document.getElementById('modResultCount'),
    modsGrid: document.getElementById('modsGrid'),
    detailModal: document.getElementById('detailModal'),
    modalStage: document.getElementById('modalStage'),
    modalIconWrap: document.getElementById('modalIconWrap'),
    modalModTag: document.getElementById('modalModTag'),
    modalTitle: document.getElementById('modalTitle'),
    modalEnName: document.getElementById('modalEnName'),
    copyEnBtn: document.getElementById('copyEnBtn'),
    shareItemBtn: document.getElementById('shareItemBtn'),
    pinItemBtn: document.getElementById('pinItemBtn'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    modalBody: document.getElementById('modalBody'),
    subModalDialog: document.getElementById('subModalDialog'),
    subBannerLabel: document.getElementById('subBannerLabel'),
    subCloseBtn: document.getElementById('subCloseBtn'),
    subIconWrap: document.getElementById('subIconWrap'),
    subModTag: document.getElementById('subModTag'),
    subTitle: document.getElementById('subTitle'),
    subEnName: document.getElementById('subEnName'),
    subCopyEnBtn: document.getElementById('subCopyEnBtn'),
    subShareItemBtn: document.getElementById('subShareItemBtn'),
    subPinItemBtn: document.getElementById('subPinItemBtn'),
    subModalBody: document.getElementById('subModalBody'),
    subModalDialog2: document.getElementById('subModalDialog2'),
    sub2BackBtn: document.getElementById('sub2BackBtn'),
    sub2BannerLabel: document.getElementById('sub2BannerLabel'),
    sub2CloseBtn: document.getElementById('sub2CloseBtn'),
    sub2IconWrap: document.getElementById('sub2IconWrap'),
    sub2ModTag: document.getElementById('sub2ModTag'),
    sub2Title: document.getElementById('sub2Title'),
    sub2EnName: document.getElementById('sub2EnName'),
    sub2CopyEnBtn: document.getElementById('sub2CopyEnBtn'),
    sub2ShareItemBtn: document.getElementById('sub2ShareItemBtn'),
    sub2PinItemBtn: document.getElementById('sub2PinItemBtn'),
    sub2ModalBody: document.getElementById('sub2ModalBody'),
    scrollTopBtn: document.getElementById('scrollTopBtn'),
    toast: document.getElementById('toast'),
  };

  let toastTimer = null;

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatSentenceBreaks(str) {
    if (!str) return '';
    return String(str)
      .replace(/\r\n/g, '\n')
      .replace(/。(?!\s*(?:\n|$|[）」』】]))\s*/g, '。\n');
  }

  function normalizeText(str) {
    if (!str) return '';
    return String(str)
      .normalize('NFKC')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  }

  function normalizeKey(str) {
    return normalizeText(str).replace(/\s+/g, ' ').trim();
  }

  function getCurrentTheme() {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  }

  function updateThemeButton() {
    if (!els.themeToggleBtn) return;
    const isDark = getCurrentTheme() === 'dark';
    els.themeToggleBtn.textContent = isDark ? '☀️ ライト' : '🌙 ダーク';
    els.themeToggleBtn.setAttribute('aria-pressed', String(isDark));
    els.themeToggleBtn.setAttribute('aria-label', isDark ? 'ライトモードに切替' : 'ダークモードに切替');
  }

  function toggleTheme() {
    const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage errors (e.g. private browsing)
    }
    updateThemeButton();
  }

  function applyViewMode(mode, persist) {
    const validMode = mode === 'table' ? 'table' : 'card';
    state.viewMode = validMode;
    if (els.viewCardBtn) els.viewCardBtn.classList.toggle('active', validMode === 'card');
    if (els.viewTableBtn) els.viewTableBtn.classList.toggle('active', validMode === 'table');
    if (persist) {
      try {
        localStorage.setItem(VIEW_MODE_STORAGE_KEY, validMode);
      } catch {
        // Ignore storage errors
      }
    }
  }

  function applyTipsDevice(device, persist) {
    const validDevice = device === 'pc' || device === 'ps5' ? device : 'all';
    if (els.tipsSection) els.tipsSection.dataset.deviceFilter = validDevice;
    if (els.tipsContent) els.tipsContent.dataset.deviceFilter = validDevice;
    if (els.tipsDeviceBar) {
      for (const b of els.tipsDeviceBar.querySelectorAll('[data-device]')) {
        const active = (b.dataset.device || 'all') === validDevice;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      }
    }
    if (persist) {
      try {
        localStorage.setItem(TIPS_DEVICE_STORAGE_KEY, validDevice);
      } catch {
        // Ignore storage errors
      }
    }
  }

  function loadUserPreferences() {
    let savedViewMode = 'card';
    let savedTipsDevice = 'all';
    try {
      const vm = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (vm === 'card' || vm === 'table') savedViewMode = vm;
      const td = localStorage.getItem(TIPS_DEVICE_STORAGE_KEY);
      if (td === 'all' || td === 'pc' || td === 'ps5') savedTipsDevice = td;
    } catch {
      // Ignore storage errors
    }
    applyViewMode(savedViewMode, false);
    applyTipsDevice(savedTipsDevice, false);
  }

  function updateScrollTopButton() {
    if (!els.scrollTopBtn) return;
    els.scrollTopBtn.classList.toggle('hidden', window.scrollY <= 400);
  }

  function getItemKey(item) {
    if (!item) return '';
    return `${item._modId}::${item.assetName ? item.assetName.toLowerCase() : String(item.index)}`;
  }

  function loadStoredArray(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string' && v) : [];
    } catch {
      return [];
    }
  }

  function saveStoredArray(key, arr) {
    try {
      localStorage.setItem(key, JSON.stringify(arr));
    } catch {
      // Ignore storage errors
    }
  }

  function loadUserCollections() {
    state.pinnedKeys = new Set(loadStoredArray(PIN_STORAGE_KEY));
    state.recentKeys = loadStoredArray(RECENT_STORAGE_KEY).slice(0, MAX_RECENT);
  }

  function updateModalPinButton(btnEl, item) {
    if (!btnEl) return;
    if (!item) {
      btnEl.classList.add('hidden');
      return;
    }
    const key = getItemKey(item);
    const isPinned = state.pinnedKeys.has(key);
    btnEl.classList.remove('hidden');
    btnEl.classList.toggle('pinned', isPinned);
    btnEl.dataset.pinKey = key;
    btnEl.setAttribute('aria-pressed', String(isPinned));
    btnEl.textContent = isPinned ? '★ ピン済' : '☆ ピン留め';
    btnEl.title = isPinned ? 'ピン留めを解除' : 'お気に入りにピン留め';
  }

  function syncAllPinButtons() {
    const buttons = els.itemsContainer.querySelectorAll('[data-pin-key]');
    for (const btn of buttons) {
      const isPinned = state.pinnedKeys.has(btn.dataset.pinKey);
      btn.classList.toggle('pinned', isPinned);
      btn.setAttribute('aria-pressed', String(isPinned));
      btn.textContent = isPinned ? '★' : '☆';
      btn.title = isPinned ? 'ピン留めを解除' : 'ピン留めする';
    }
    updateModalPinButton(els.pinItemBtn, state.mainItem);
    updateModalPinButton(els.subPinItemBtn, state.sub1Item);
    const s2 = state.sub2Stack.length > 0 ? state.sub2Stack[state.sub2Stack.length - 1] : null;
    updateModalPinButton(els.sub2PinItemBtn, s2);
  }

  function togglePinByKey(itemKey) {
    if (!itemKey) return;
    const item = state.itemByKey.get(itemKey);
    const label = item ? item.jaName || item.enName : 'アイテム';
    if (state.pinnedKeys.has(itemKey)) {
      state.pinnedKeys.delete(itemKey);
      showToast(`「${label}」のピン留めを解除しました`);
    } else {
      state.pinnedKeys.add(itemKey);
      showToast(`「${label}」をピン留めしました`);
    }
    saveStoredArray(PIN_STORAGE_KEY, [...state.pinnedKeys]);
    renderQuickFilters();
    if (state.quickFilter === 'pinned') {
      applyFiltersAndRender();
      syncAllPinButtons();
    } else {
      syncAllPinButtons();
    }
  }

  function recordRecentItem(item) {
    const key = getItemKey(item);
    if (!key) return;
    state.recentKeys = [key, ...state.recentKeys.filter((k) => k !== key)].slice(0, MAX_RECENT);
    saveStoredArray(RECENT_STORAGE_KEY, state.recentKeys);
    if (
      state.activeTab !== 'INSTALLED' &&
      state.activeTab !== 'RULES' &&
      state.activeTab !== 'TIPS' &&
      state.activeTab !== 'FAQ'
    ) {
      renderQuickFilters();
      if (state.quickFilter === 'recent') {
        applyFiltersAndRender();
      }
    }
  }

  function buildNormalizedCharMap(rawText) {
    const str = String(rawText || '');
    let norm = '';
    const map = [];
    let i = 0;
    while (i < str.length) {
      let end = i + 1;
      // Group combining/halfwidth dakuten or handakuten with preceding character
      if (end < str.length) {
        const nextCode = str.charCodeAt(end);
        if (nextCode === 0xff9e || nextCode === 0xff9f || nextCode === 0x3099 || nextCode === 0x309a) {
          end += 1;
        }
      }
      const piece = str.slice(i, end);
      const nPiece = piece
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
      for (let j = 0; j < nPiece.length; j++) {
        const ch = nPiece[j];
        if (/\s/.test(ch)) {
          if (norm.length > 0 && norm[norm.length - 1] !== ' ') {
            norm += ' ';
            map.push([i, end]);
          }
        } else {
          norm += ch;
          map.push([i, end]);
        }
      }
      i = end;
    }
    return { norm, map };
  }

  function highlightText(rawText, tokens) {
    if (rawText == null || rawText === '') return '';
    const str = String(rawText);
    if (!tokens || tokens.length === 0) return escapeHtml(str);

    const { norm, map } = buildNormalizedCharMap(str);
    if (!norm) return escapeHtml(str);

    const ranges = [];
    for (const tk of tokens) {
      if (!tk) continue;
      let pos = 0;
      while (pos < norm.length) {
        const idx = norm.indexOf(tk, pos);
        if (idx === -1) break;
        const endIdx = idx + tk.length - 1;
        if (idx < map.length && endIdx < map.length) {
          ranges.push([map[idx][0], map[endIdx][1]]);
        }
        pos = idx + tk.length;
      }
    }

    if (ranges.length === 0) return escapeHtml(str);

    ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const merged = [ranges[0]];
    for (let k = 1; k < ranges.length; k++) {
      const prev = merged[merged.length - 1];
      const cur = ranges[k];
      if (cur[0] <= prev[1]) {
        if (cur[1] > prev[1]) prev[1] = cur[1];
      } else {
        merged.push(cur);
      }
    }

    let out = '';
    let cursor = 0;
    for (const [start, end] of merged) {
      if (start > cursor) out += escapeHtml(str.slice(cursor, start));
      out += `<mark class="search-hit">${escapeHtml(str.slice(start, end))}</mark>`;
      cursor = end;
    }
    if (cursor < str.length) out += escapeHtml(str.slice(cursor));
    return out;
  }

  function extractMatchExcerpt(rawVal, tokens) {
    const str = String(rawVal || '').replace(/\r\n/g, '\n').trim();
    if (!str) return '';

    const segments = splitRespectingParens(str)
      .flatMap((seg) => seg.split('\n'))
      .map((s) => s.trim())
      .filter(Boolean);

    let chosen = '';
    for (const seg of segments) {
      const nSeg = normalizeText(seg);
      if (tokens.some((tk) => nSeg.includes(tk))) {
        chosen = seg;
        break;
      }
    }
    if (!chosen) chosen = str;

    if (chosen.length > 48) {
      const { norm, map } = buildNormalizedCharMap(chosen);
      let firstOrigStart = 0;
      let firstOrigEnd = 0;
      for (const tk of tokens) {
        const idx = norm.indexOf(tk);
        if (idx !== -1 && idx < map.length) {
          const endIdx = Math.min(idx + tk.length - 1, map.length - 1);
          firstOrigStart = map[idx][0];
          firstOrigEnd = map[endIdx][1];
          break;
        }
      }
      const winStart = Math.max(0, firstOrigStart - 20);
      const winEnd = Math.min(chosen.length, firstOrigEnd + 20);
      const prefix = winStart > 0 ? '…' : '';
      const suffix = winEnd < chosen.length ? '…' : '';
      chosen = `${prefix}${chosen.slice(winStart, winEnd).trim()}${suffix}`;
    }

    return highlightText(chosen, tokens);
  }

  function buildMatchHintsHtml(item, tokens) {
    if (!tokens || tokens.length === 0) return '';
    const primaryNorm = normalizeText([item.jaName, item.enName, item.description].join(' '));
    const secondaryTokens = tokens.filter((tk) => !primaryNorm.includes(tk));
    if (secondaryTokens.length === 0) return '';

    const badges = [];
    for (const field of MATCH_HINT_FIELDS) {
      if (badges.length >= 2) break;
      const val = item[field.prop];
      if (!val) continue;
      const normVal = normalizeText(val);
      const matchedTks = secondaryTokens.filter((tk) => normVal.includes(tk));
      if (matchedTks.length === 0) continue;
      const excerptHtml = extractMatchExcerpt(val, tokens);
      if (!excerptHtml) continue;
      badges.push(
        `<span class="match-hint-badge"><span class="match-hint-label">${escapeHtml(field.label)}に一致:</span><span>${excerptHtml}</span></span>`
      );
    }

    if (badges.length === 0) return '';
    return `<div class="match-hint-row">${badges.join('')}</div>`;
  }

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.classList.add('hidden');
    }, 2000);
  }

  async function copyText(text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast(`「${text}」をコピーしました`);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(`「${text}」をコピーしました`);
    }
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `最終更新: ${y}/${m}/${day} ${hh}:${mm}`;
  }

  function resolveIconUrl(item) {
    if (item.image && /^(\.?\/?icons\/|https?:\/\/)/i.test(item.image)) {
      if (!/drive\.google\.com/i.test(item.image)) {
        return item.image;
      }
    }
    const modIcons = state.icons[item._modId];
    if (modIcons) {
      if (item.assetName) {
        const found = modIcons[item.assetName.toLowerCase()];
        if (found) return found;
      }
      if (item.enName) {
        const byEn = modIcons[item.enName.toLowerCase()];
        if (byEn) return byEn;
      }
      if (modIcons._default) {
        return modIcons._default;
      }
    }
    return '';
  }

  function renderIconHtml(item, sizeClass) {
    const url = resolveIconUrl(item);
    if (url) {
      return `<img src="${escapeHtml(url)}" alt="${escapeHtml(item.jaName || item.enName)}" loading="lazy" decoding="async" />`;
    }
    const label = (item.category || item._modName || 'ITEM').slice(0, 4);
    return `<span class="item-thumb-placeholder ${sizeClass || ''}">${escapeHtml(label)}</span>`;
  }

  function getActiveSheetType() {
    if (!state.data || state.activeTab === 'ALL' || state.activeTab === 'INSTALLED') {
      return 'item';
    }
    const sheet = (state.data.modSheets || []).find((s) => s.id === state.activeTab);
    if (!sheet) return 'item';
    if (sheet.sheetType) return sheet.sheetType;
    // Fallback inference for older mods.json without sheetType
    const sample = sheet.items || [];
    if (sample.some((i) => i.tamingMethod || i.favoriteFood || i.habitat)) return 'creature';
    if (sample.some((i) => i.applyTarget || i.applyMethod)) return 'cosmetic';
    return 'item';
  }

  function getFilterConfig() {
    const st = getActiveSheetType();
    if (st === 'creature') {
      return {
        f2Label: 'テイム方法',
        f2Prop: 'tamingMethod',
        f3Label: '生息地・スポーン',
        f3Prop: 'habitat',
      };
    }
    if (st === 'cosmetic') {
      return {
        f2Label: '適用対象',
        f2Prop: 'applyTarget',
        f3Label: '適用方法',
        f3Prop: 'applyMethod',
      };
    }
    return {
      f2Label: '入手方法',
      f2Prop: 'obtainMethod',
      f3Label: '作る場所',
      f3Prop: 'craftStation',
    };
  }

  function getActiveSourceItems() {
    if (!state.data) return [];
    const sheets = state.data.modSheets || [];
    if (state.activeTab === 'ALL') {
      return sheets.flatMap((s) => s.items);
    }
    const sheet = sheets.find((s) => s.id === state.activeTab);
    return sheet ? sheet.items : [];
  }

  function isCraftingStation(item) {
    const cat = item.category || '';
    if (cat.includes('スキン')) return false;
    return /(制作設備|調理設備|作業台)/.test(cat);
  }

  function getSheetIcon(sheet) {
    const st = sheet.sheetType || 'item';
    if (st === 'creature') return '🐾 ';
    if (st === 'cosmetic') return '✨ ';
    return '📦 ';
  }

  function buildTabs() {
    const sheets = state.data.modSheets || [];
    const installedCount = (state.data.installedMods || []).length;
    const rulesCount = (state.data.serverRules || []).length;
    const totalItems = sheets.reduce((sum, s) => sum + s.items.length, 0);

    const tabs = [
      { id: 'SEARCH', label: '🔍 アイテム検索', count: totalItems },
      { id: 'INSTALLED', label: '📋 導入中MOD一覧', count: installedCount },
      { id: 'TIPS', label: '📖 初心者設定・便利技', count: null },
      { id: 'FAQ', label: '❓ よくある質問（Q&A）', count: null },
    ];
    if (rulesCount > 0) {
      tabs.push({ id: 'RULES', label: '📜 鯖ルール・設定', count: rulesCount });
    }

    const activeTop =
      state.activeTab === 'INSTALLED' ||
      state.activeTab === 'RULES' ||
      state.activeTab === 'TIPS' ||
      state.activeTab === 'FAQ'
        ? state.activeTab
        : 'SEARCH';

    els.tabList.innerHTML = tabs
      .map(
        (t) => `
        <button
          type="button"
          class="tab-btn ${t.id === activeTop ? 'active' : ''}"
          role="tab"
          aria-selected="${t.id === activeTop}"
          data-tab-id="${escapeHtml(t.id)}"
        >
          <span>${escapeHtml(t.label)}</span>
          ${t.count != null ? `<span class="tab-count">${t.count}</span>` : ''}
        </button>`
      )
      .join('');
  }

  function buildModSelector() {
    const sheets = state.data.modSheets || [];
    const totalItems = sheets.reduce((sum, s) => sum + s.items.length, 0);

    const groups = {
      item: { label: '📦 アイテム・家具追加MOD', list: [] },
      creature: { label: '🐾 生物追加MOD', list: [] },
      cosmetic: { label: '✨ スキン・コスチュームMOD', list: [] },
    };

    for (const sheet of sheets) {
      const st = sheet.sheetType || 'item';
      (groups[st] || groups.item).list.push(sheet);
    }

    let html = `<option value="ALL">🔍 すべてのMOD（全 ${totalItems} 件）</option>`;
    for (const key of ['item', 'creature', 'cosmetic']) {
      const grp = groups[key];
      if (grp.list.length === 0) continue;
      html += `<optgroup label="${escapeHtml(grp.label)}">`;
      for (const sheet of grp.list) {
        html += `<option value="${escapeHtml(sheet.id)}">${escapeHtml(sheet.name)}（${sheet.items.length}件）</option>`;
      }
      html += '</optgroup>';
    }

    els.modSelect.innerHTML = html;
    const currentVal =
      state.activeTab === 'INSTALLED' ||
      state.activeTab === 'RULES' ||
      state.activeTab === 'TIPS' ||
      state.activeTab === 'FAQ' ||
      !state.activeTab
        ? 'ALL'
        : state.activeTab;
    els.modSelect.value = currentVal;
    els.resetModBtn.classList.toggle('hidden', currentVal === 'ALL');
  }

  function renderQuickFilters() {
    const sourceItems = getActiveSourceItems();
    const stationCount = sourceItems.filter(isCraftingStation).length;
    const practicalCount = sourceItems.filter((i) => i.usageType === '実用（機能あり）').length;
    const decorCount = sourceItems.filter((i) => i.usageType === '装飾・観賞用').length;
    const pinnedCount = sourceItems.filter((i) => state.pinnedKeys.has(getItemKey(i))).length;
    const recentSet = new Set(state.recentKeys);
    const recentCount = sourceItems.filter((i) => recentSet.has(getItemKey(i))).length;
    const chips = [];

    if (state.activeTab === 'ALL') {
      chips.push({ id: '', label: 'すべて' });
      if (pinnedCount > 0 || state.quickFilter === 'pinned') {
        chips.push({ id: 'pinned', label: `★ ピン留め (${pinnedCount})` });
      }
      if (recentCount > 0 || state.quickFilter === 'recent') {
        chips.push({ id: 'recent', label: `🕒 最近見た (${recentCount})` });
      }
      if (practicalCount > 0) chips.push({ id: 'practical', label: `⚙ 実用のみ (${practicalCount})` });
      if (decorCount > 0) chips.push({ id: 'decor', label: `🎨 装飾・観賞用 (${decorCount})` });
      if (stationCount > 0) chips.push({ id: 'stations', label: `🛠 作業台・設備 (${stationCount})` });
      chips.push({ id: 'creature', label: '🐾 生物系' });
      chips.push({ id: 'cosmetic', label: '✨ スキン系' });
    } else if (
      stationCount > 0 ||
      (practicalCount > 0 && decorCount > 0) ||
      pinnedCount > 0 ||
      recentCount > 0 ||
      state.quickFilter === 'pinned' ||
      state.quickFilter === 'recent'
    ) {
      chips.push({ id: '', label: 'すべて' });
      if (pinnedCount > 0 || state.quickFilter === 'pinned') {
        chips.push({ id: 'pinned', label: `★ ピン留め (${pinnedCount})` });
      }
      if (recentCount > 0 || state.quickFilter === 'recent') {
        chips.push({ id: 'recent', label: `🕒 最近見た (${recentCount})` });
      }
      if (practicalCount > 0 && decorCount > 0) {
        chips.push({ id: 'practical', label: `⚙ 実用のみ (${practicalCount})` });
        chips.push({ id: 'decor', label: `🎨 装飾・観賞用 (${decorCount})` });
      }
      if (stationCount > 0) {
        chips.push({ id: 'stations', label: `🛠 作業台・設備 (${stationCount})` });
      }
    }

    if (chips.length === 0) {
      els.quickFilterBar.classList.add('hidden');
      els.quickFilterBar.innerHTML = '';
      state.quickFilter = '';
      return;
    }

    if (!chips.some((c) => c.id === state.quickFilter)) {
      state.quickFilter = '';
    }

    els.quickFilterBar.classList.remove('hidden');
    els.quickFilterBar.innerHTML = chips
      .map(
        (c) =>
          `<button type="button" class="quick-chip ${c.id === state.quickFilter ? 'active' : ''}" data-quick="${escapeHtml(c.id)}">${escapeHtml(c.label)}</button>`
      )
      .join('');
  }

  function updateTypeTipBanner() {
    if (state.activeTab === 'ALL' || state.activeTab === 'INSTALLED') {
      els.typeTipBanner.classList.add('hidden');
      return;
    }
    const st = getActiveSheetType();
    let msg = '';
    if (st === 'cosmetic') {
      msg = '💡 スキンの使い方：インベントリ画面の「コスメティック」タブから対象の建築物・収納・防具に適用できます（素材消費なしで見た目変更）。';
    } else if (st === 'creature') {
      msg = '💡 生物MODについて：野生スポーンするバイオームや特徴は、各カードをクリックした詳細画面「生息地・スポーン」で確認できます。';
    } else {
      msg = '💡 作り方のコツ：詳細画面の「英語名コピー」を押してゲーム内のエングラム検索欄に貼り付けるとすぐ見つかります。';
    }
    els.typeTipBanner.textContent = msg;
    els.typeTipBanner.classList.remove('hidden');
  }

  function updateMobileFilterToggle() {
    const activeCount = [state.category, state.filter2, state.filter3].filter(Boolean).length;
    const arrow = state.mobileFiltersOpen ? '▲' : '▼';
    const badge = activeCount > 0 ? `（${activeCount}件適用中）` : '';
    els.mobileFilterToggleText.textContent = `詳細絞り込み・並び替え${badge} ${arrow}`;
    els.mobileFilterToggle.setAttribute('aria-expanded', String(state.mobileFiltersOpen));
    els.filterRow.classList.toggle('mobile-open', state.mobileFiltersOpen);
  }

  function populateSelect(selectEl, values, currentValue) {
    const counts = new Map();
    for (const v of values) {
      if (!v) continue;
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ja'));
    selectEl.innerHTML =
      '<option value="">すべて</option>' +
      sorted
        .map(([val, cnt]) => `<option value="${escapeHtml(val)}">${escapeHtml(val)} (${cnt})</option>`)
        .join('');
    if (currentValue && counts.has(currentValue)) {
      selectEl.value = currentValue;
    } else {
      selectEl.value = '';
    }
  }

  function rebuildFilterOptions() {
    const items = getActiveSourceItems();
    const cfg = getFilterConfig();

    els.filterObtainLabel.textContent = cfg.f2Label;
    els.filterStationLabel.textContent = cfg.f3Label;

    populateSelect(
      els.filterCategory,
      items.map((i) => i.category),
      state.category
    );
    state.category = els.filterCategory.value;

    populateSelect(
      els.filterObtain,
      items.map((i) => i[cfg.f2Prop]),
      state.filter2
    );
    state.filter2 = els.filterObtain.value;

    populateSelect(
      els.filterStation,
      items.map((i) => i[cfg.f3Prop]),
      state.filter3
    );
    state.filter3 = els.filterStation.value;
  }

  function applyFiltersAndRender() {
    const sourceItems = getActiveSourceItems();
    const cfg = getFilterConfig();
    const tokens = normalizeText(state.searchQuery)
      .split(/\s+/)
      .filter(Boolean);
    const recentOrder = new Map(state.recentKeys.map((k, idx) => [k, idx]));

    let list = sourceItems.filter((item) => {
      if (state.quickFilter === 'pinned' && !state.pinnedKeys.has(getItemKey(item))) return false;
      if (state.quickFilter === 'recent' && !recentOrder.has(getItemKey(item))) return false;
      if (state.quickFilter === 'stations' && !isCraftingStation(item)) return false;
      if (state.quickFilter === 'practical' && item.usageType !== '実用（機能あり）') return false;
      if (state.quickFilter === 'decor' && item.usageType !== '装飾・観賞用') return false;
      if (
        (state.quickFilter === 'item' || state.quickFilter === 'creature' || state.quickFilter === 'cosmetic') &&
        item._sheetType !== state.quickFilter
      ) {
        return false;
      }
      if (state.category && item.category !== state.category) return false;
      if (state.filter2 && item[cfg.f2Prop] !== state.filter2) return false;
      if (state.filter3 && item[cfg.f3Prop] !== state.filter3) return false;
      if (tokens.length > 0) {
        for (const tk of tokens) {
          if (!item._searchBlob.includes(tk)) return false;
        }
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (state.sortBy) {
        case 'jaName':
          return (a.jaName || a.enName).localeCompare(b.jaName || b.enName, 'ja');
        case 'enName':
          return (a.enName || '').localeCompare(b.enName || '', 'en');
        case 'category':
          return (a.category || 'ん').localeCompare(b.category || 'ん', 'ja') || a.index - b.index;
        default:
          if (state.quickFilter === 'recent') {
            return (recentOrder.get(getItemKey(a)) ?? 9999) - (recentOrder.get(getItemKey(b)) ?? 9999);
          }
          return a._globalIndex - b._globalIndex;
      }
    });

    state.filteredItems = list;

    const hasActiveFilter = Boolean(
      state.searchQuery.trim() || state.category || state.filter2 || state.filter3 || state.quickFilter
    );
    els.resetFiltersBtn.classList.toggle('hidden', !hasActiveFilter);
    els.clearSearchBtn.classList.toggle('hidden', !state.searchQuery);
    updateMobileFilterToggle();

    els.resultCount.textContent = `${sourceItems.length} 件中 ${list.length} 件を表示`;

    if (list.length === 0) {
      els.itemsContainer.innerHTML = '';
      els.loadMoreWrap.classList.add('hidden');
      els.emptyState.classList.remove('hidden');
      return;
    }

    els.emptyState.classList.add('hidden');
    renderItemsList();
  }

  function renderItemsList() {
    const list = state.filteredItems;
    const shown = list.slice(0, state.visibleLimit);
    const showModBadge = state.activeTab === 'ALL';
    const sheetType = getActiveSheetType();
    const tokens = normalizeText(state.searchQuery)
      .split(/\s+/)
      .filter(Boolean);

    if (state.viewMode === 'card') {
      els.itemsContainer.className = 'items-grid';
      els.itemsContainer.innerHTML = shown
        .map((item) => {
          const itemKey = getItemKey(item);
          const isPinned = state.pinnedKeys.has(itemKey);
          const tags = [];
          if (item._isVanillaRef) {
            tags.push('<span class="tag tag-vanilla">バニラ基本素材</span>');
          } else if (showModBadge) {
            tags.push(`<span class="tag tag-mod">${escapeHtml(item._modName)}</span>`);
          }
          if (item.usageType === '実用（機能あり）') {
            tags.push('<span class="tag tag-practical">⚙ 実用</span>');
          } else if (item.usageType === '装飾・観賞用') {
            tags.push('<span class="tag tag-decor">🎨 装飾・観賞用</span>');
          }
          if (item.category) tags.push(`<span class="tag tag-cat">${escapeHtml(item.category)}</span>`);
          if (item.craftStation) tags.push(`<span class="tag tag-station">${escapeHtml(item.craftStation)}</span>`);
          if (item.applyTarget) tags.push(`<span class="tag tag-station">${escapeHtml(item.applyTarget)}</span>`);
          if (item.tamingMethod) {
            const tempMatch = item.tamingMethod.match(/【野生の性格】([^\n]+)/);
            if (tempMatch) {
              const tv = tempMatch[1].trim();
              if (tv.startsWith('攻撃的')) {
                tags.push('<span class="tag tag-temp-aggro">野生：攻撃的</span>');
              } else if (tv.startsWith('中立')) {
                tags.push('<span class="tag tag-temp-neutral">野生：中立</span>');
              } else if (tv.startsWith('臆病')) {
                tags.push('<span class="tag tag-temp-skittish">野生：臆病</span>');
              } else if (tv.startsWith('非攻撃的')) {
                tags.push('<span class="tag tag-temp-passive">野生：非攻撃的</span>');
              }
            }
            const tamingFirstLine = item.tamingMethod
              .split('\n')
              .find((l) => l.trim() && !l.trim().startsWith('【ボーラ】') && !l.trim().startsWith('【野生の性格】'));
            if (tamingFirstLine) {
              tags.push(`<span class="tag tag-station">${escapeHtml(tamingFirstLine.trim())}</span>`);
            }
          }
          if (item.obtainMethod) tags.push(`<span class="tag">${escapeHtml(item.obtainMethod)}</span>`);
          if (item.habitat) tags.push(`<span class="tag">${escapeHtml(item.habitat)}</span>`);

          const matchHintsHtml = buildMatchHintsHtml(item, tokens);

          return `
            <article class="item-card" data-global-index="${item._globalIndex}" tabindex="0">
              <div class="item-card-top">
                <div class="item-thumb">${renderIconHtml(item)}</div>
                <div class="item-headings">
                  <h3 class="item-ja">${highlightText(item.jaName || item.enName, tokens)}</h3>
                  <div class="item-en-line">
                    <span class="item-en">${highlightText(item.enName, tokens)}</span>
                    ${
                      item.enName
                        ? `<button type="button" class="mini-copy-btn" data-copy="${escapeHtml(item.enName)}" title="英語名をコピー">コピー</button>`
                        : ''
                    }
                  </div>
                </div>
                <button type="button" class="card-pin-btn ${isPinned ? 'pinned' : ''}" data-pin-key="${escapeHtml(itemKey)}" aria-pressed="${isPinned}" aria-label="${isPinned ? 'ピン留めを解除' : 'ピン留めする'}" title="${isPinned ? 'ピン留めを解除' : 'ピン留めする'}">${isPinned ? '★' : '☆'}</button>
              </div>
              ${item.description ? `<p class="item-desc">${highlightText(formatSentenceBreaks(item.description), tokens)}</p>` : ''}
              ${matchHintsHtml}
              ${tags.length ? `<div class="item-tags">${tags.join('')}</div>` : ''}
            </article>`;
        })
        .join('');
    } else {
      els.itemsContainer.className = 'items-table-wrap';
      const col4Header =
        sheetType === 'creature' ? 'テイム方法' : sheetType === 'cosmetic' ? '適用対象' : '作る場所';
      const col5Header =
        sheetType === 'creature' ? '大好きなエサ' : sheetType === 'cosmetic' ? '適用方法' : '必要素材';

      els.itemsContainer.innerHTML = `
        <table class="items-table">
          <thead>
            <tr>
              <th>画像</th>
              <th>名称（日本語 / 英語）</th>
              ${showModBadge ? '<th>MOD</th>' : ''}
              <th>分類</th>
              <th>${col4Header}</th>
              <th>${col5Header}</th>
              <th>説明</th>
            </tr>
          </thead>
          <tbody>
            ${shown
              .map((item) => {
                const itemKey = getItemKey(item);
                const isPinned = state.pinnedKeys.has(itemKey);
                const col4Val =
                  sheetType === 'creature'
                    ? item.tamingMethod || '-'
                    : sheetType === 'cosmetic'
                    ? item.applyTarget || '-'
                    : item.craftStation || item.tamingMethod || item.applyTarget || '-';
                const col5Val =
                  sheetType === 'creature'
                    ? item.favoriteFood || '-'
                    : sheetType === 'cosmetic'
                    ? item.applyMethod || '-'
                    : item.materials || item.favoriteFood || item.applyMethod || '-';
                return `
              <tr data-global-index="${item._globalIndex}">
                <td><div class="table-thumb">${renderIconHtml(item)}</div></td>
                <td>
                  <div class="table-name-row">
                    <div>
                      <div class="table-name-ja">${highlightText(item.jaName || item.enName, tokens)}</div>
                      <div class="table-name-en">${highlightText(item.enName, tokens)}</div>
                    </div>
                    <button type="button" class="card-pin-btn ${isPinned ? 'pinned' : ''}" data-pin-key="${escapeHtml(itemKey)}" aria-pressed="${isPinned}" aria-label="${isPinned ? 'ピン留めを解除' : 'ピン留めする'}" title="${isPinned ? 'ピン留めを解除' : 'ピン留めする'}">${isPinned ? '★' : '☆'}</button>
                  </div>
                </td>
                ${showModBadge ? `<td><span class="tag tag-mod">${escapeHtml(item._modName)}</span></td>` : ''}
                <td>${item.category ? `<span class="tag tag-cat">${escapeHtml(item.category)}</span>` : ''}</td>
                <td>${highlightText(col4Val, tokens)}</td>
                <td>${highlightText(col5Val, tokens)}</td>
                <td>${highlightText(formatSentenceBreaks(item.description || ''), tokens)}</td>
              </tr>`;
              })
              .join('')}
          </tbody>
        </table>`;
    }

    const remaining = list.length - shown.length;
    if (remaining > 0) {
      els.loadMoreBtn.textContent = `さらに表示（残り ${remaining} 件）`;
      els.loadMoreWrap.classList.remove('hidden');
    } else {
      els.loadMoreWrap.classList.add('hidden');
    }
  }

  function renderInstalledMods() {
    const mods = state.data.installedMods || [];
    const tokens = normalizeText(state.modSearchQuery)
      .split(/\s+/)
      .filter(Boolean);

    const sheetByName = new Map(
      (state.data.modSheets || []).map((s) => [normalizeText(s.name), s])
    );

    const filtered = mods.filter((m) => {
      if (tokens.length === 0) return true;
      const blob = normalizeText(`${m.name} ${m.description} ${m.curseForgeId}`);
      return tokens.every((tk) => blob.includes(tk));
    });

    els.modResultCount.textContent = `導入中MOD ${mods.length} 件中 ${filtered.length} 件を表示`;

    els.modsGrid.innerHTML = filtered
      .map((m) => {
        const matchedSheet = sheetByName.get(normalizeText(m.name));
        return `
          <article class="mod-card">
            <div class="mod-card-head">
              <h3 class="mod-card-title">${escapeHtml(m.name)}</h3>
              ${m.curseForgeId ? `<span class="cf-badge">ID: ${escapeHtml(m.curseForgeId)}</span>` : ''}
            </div>
            ${m.description ? `<p class="mod-card-desc">${escapeHtml(formatSentenceBreaks(m.description))}</p>` : ''}
            <div class="mod-card-actions">
              ${
                matchedSheet
                  ? `<button type="button" class="btn btn-primary jump-mod-btn" data-jump-tab="${escapeHtml(matchedSheet.id)}">一覧を見る（${matchedSheet.items.length}件）→</button>`
                  : ''
              }
              ${
                m.curseForgeUrl
                  ? `<a class="cf-link" href="${escapeHtml(m.curseForgeUrl)}" target="_blank" rel="noopener noreferrer">CurseForge を開く ↗</a>`
                  : ''
              }
            </div>
          </article>`;
      })
      .join('');
  }

  // --- Reference linking (MOD sub-panel & Vanilla ASA Wiki) ---

  function splitRespectingParens(text) {
    const result = [];
    let current = '';
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '(' || ch === '（') depth++;
      else if ((ch === ')' || ch === '）') && depth > 0) depth--;

      if (depth === 0 && (ch === '、' || ch === ',' || ch === '\n' || ch === '／' || ch === '/')) {
        if (current.trim()) result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) result.push(current.trim());
    return result;
  }

  function pickPreferredItem(candidates, preferredModId, excludeGlobalIndex) {
    if (!candidates || candidates.length === 0) return null;
    const filtered = candidates.filter((c) => c._globalIndex !== excludeGlobalIndex);
    if (filtered.length === 0) return null;
    const sameMod = filtered.find((c) => c._modId === preferredModId);
    return sameMod || filtered[0];
  }

  function findReferencedModItem(rawSegment, preferredModId, excludeGlobalIndex) {
    // Strip trailing quantity like ×150, x 1, ×1個
    const cleaned = rawSegment.replace(/\s*[×xX]\s*\d+[^\s]*$/u, '').trim();
    if (!cleaned) return null;

    // 1. Try matching ALL parenthesized substrings first (e.g., "通常の炭鉱（Coal Mine）（ファイル説明）")
    for (const m of cleaned.matchAll(/[（(]([^）)]+)[）)]/g)) {
      const inner = m[1].trim();
      if (!inner) continue;
      const kInner = normalizeKey(inner);
      const hitInner =
        pickPreferredItem(state.lookupByEn.get(kInner), preferredModId, excludeGlobalIndex) ||
        pickPreferredItem(state.lookupByJa.get(kInner), preferredModId, excludeGlobalIndex);
      if (hitInner) return hitInner;
    }

    // 2. Try matching full cleaned string against enName or jaName
    const kFull = normalizeKey(cleaned);
    let hit =
      pickPreferredItem(state.lookupByEn.get(kFull), preferredModId, excludeGlobalIndex) ||
      pickPreferredItem(state.lookupByJa.get(kFull), preferredModId, excludeGlobalIndex);
    if (hit) return hit;

    // 3. Try matching outer text before first parenthesis
    const outerPart = cleaned.replace(/\s*[（(][^）)]+[）)]/g, '').trim();
    if (outerPart && outerPart !== cleaned) {
      const kOuter = normalizeKey(outerPart);
      hit =
        pickPreferredItem(state.lookupByJa.get(kOuter), preferredModId, excludeGlobalIndex) ||
        pickPreferredItem(state.lookupByEn.get(kOuter), preferredModId, excludeGlobalIndex);
      if (hit) return hit;
    }

    return null;
  }

  function isNonLinkablePhrase(rawSegment) {
    const s = rawSegment.trim();
    if (/^(インベントリ|なし|-|ー|—|不明|不要|作成|採取|コスメティック|エングラム|スポーン|クラス切替|アビリティ|および|または|そのほか|その他|肉食|草食|雑食|肩乗せ|騎乗|サドルなし|小型|大型|水中|水産|資源|プレイヤー防具|防具|チビペット)/.test(s)) {
      return true;
    }
    const base = s.replace(/\s*[（(][^）)]+[）)]/g, '').trim();
    if (base.length > 22 || /(攻撃|ダメージ|コンポーネント|ファイル|参照|使用|装着|装備|可能|不可|ペット|対応|テスト|→)/.test(base)) {
      return true;
    }
    return false;
  }

  function buildWikiSearchUrl(rawSegment) {
    const cleaned = rawSegment
      .replace(/\s*[×xX]\s*\d+[^\s]*$/u, '')
      .replace(/\s*[（(][^）)]+[）)]/g, '')
      .replace(/等$/u, '')
      .trim();
    const query = cleaned || rawSegment.trim();
    return `https://ark.wiki.gg/ja/wiki/Special:Search?search=${encodeURIComponent(query)}&go=Go`;
  }

  function renderReferenceChipsHtml(rawText, item) {
    const segments = splitRespectingParens(rawText);
    if (segments.length === 0) return escapeHtml(rawText);

    return `<div class="ref-chips">${segments
      .map((seg) => {
        const modMatch = findReferencedModItem(seg, item._modId, item._globalIndex);
        if (modMatch) {
          return `<button type="button" class="ref-chip ref-chip-mod" data-open-sub="${modMatch._globalIndex}" title="${escapeHtml(modMatch.jaName || modMatch.enName)} をサブ画面で開く"><span>${escapeHtml(seg)}</span><span class="ref-badge">MOD詳細</span></button>`;
        }
        if (isNonLinkablePhrase(seg)) {
          return `<span class="ref-chip ref-chip-plain">${escapeHtml(seg)}</span>`;
        }
        const wikiUrl = buildWikiSearchUrl(seg);
        return `<a class="ref-chip ref-chip-wiki" href="${escapeHtml(wikiUrl)}" target="_blank" rel="noopener noreferrer" title="ARK日本語Wikiで開く"><span>${escapeHtml(seg)}</span><span class="ref-badge">Wiki ↗</span></a>`;
      })
      .join('')}</div>`;
  }

  function renderModItemChips(items, limit) {
    const shown = limit ? items.slice(0, limit) : items;
    return `<div class="ref-chips">${shown
      .map(
        (it) =>
          `<button type="button" class="ref-chip ref-chip-mod" data-open-sub="${it._globalIndex}" title="${escapeHtml(it.jaName || it.enName)} をサブ画面で開く"><span>${escapeHtml(it.jaName || it.enName)}</span><span class="ref-badge">MOD詳細</span></button>`
      )
      .join('')}</div>`;
  }

  function buildDetailBodyHtml(item) {
    // [label, value, isFullWidth, enableRefLinks]
    const fields = [
      ['用途タイプ', item.usageType, false, false],
      ['分類', item.category, false, false],
      ['入手方法', item.obtainMethod, false, false],
      ['作る場所', item.craftStation, false, true],
      ['使う道具', item.toolUsed, false, true],
      ['採取元（木・石など）', item.harvestSource, false, true],
      ['恐竜名', item.dinoName, false, true],
      ['必要素材', item.materials, true, true],
      // 生物系
      ['テイム方法', item.tamingMethod, false, false],
      ['大好きなエサ', item.favoriteFood, false, true],
      ['必要数の目安', item.foodAmount, false, false],
      ['生息地・スポーン', item.habitat, false, false],
      ['サドル・騎乗', item.saddleRide, false, true],
      ['特殊能力・用途', item.specialAbility, true, false],
      // コスメティック系
      ['適用対象', item.applyTarget, false, true],
      ['適用方法', item.applyMethod, false, false],
    ].filter(([, val]) => Boolean(val));

    let bodyHtml = '';
    if (item._isVanillaRef) {
      const wikiUrl = buildWikiSearchUrl(item.jaName || item.enName);
      bodyHtml += `
        <div class="vanilla-notice">
          <span>ℹ️ ARK本体の基本素材です（MOD専用アイテムではありません）</span>
          <a class="vanilla-notice-link" href="${escapeHtml(wikiUrl)}" target="_blank" rel="noopener noreferrer">ARK日本語Wikiで見る ↗</a>
        </div>`;
    }
    if (item.description) {
      bodyHtml += `<div class="detail-desc-box">${escapeHtml(formatSentenceBreaks(item.description))}</div>`;
    }
    if (fields.length) {
      bodyHtml += `<div class="detail-grid">${fields
        .map(([label, val, full, linkable]) => {
          const valHtml = linkable ? renderReferenceChipsHtml(val, item) : escapeHtml(formatSentenceBreaks(val));
          return `
          <div class="detail-field ${full ? 'detail-field-full' : ''}">
            <div class="detail-label">${escapeHtml(label)}</div>
            <div class="detail-value">${valHtml}</div>
          </div>`;
        })
        .join('')}</div>`;
    }

    // 逆引き①：この設備・対象で作れる／得られるもの
    const produced = state.producedByMap.get(item._globalIndex) || [];
    if (produced.length > 0) {
      const previewMax = 12;
      const extraMax = 80;
      const previewHtml = renderModItemChips(produced, previewMax);
      let extraHtml = '';
      if (produced.length > previewMax) {
        const rest = produced.slice(previewMax, previewMax + extraMax);
        const overflow = produced.length - previewMax - rest.length;
        extraHtml = `
          <details class="detail-sub-box" style="margin-top:8px;padding-top:8px;">
            <summary>残り ${produced.length - previewMax} 件を表示</summary>
            <div style="margin-top:8px;">
              ${renderModItemChips(rest)}
              ${overflow > 0 ? `<p class="rule-note" style="margin-top:8px;">※ほか ${overflow} 件あります。一覧の「作る場所」絞り込みから全件確認できます。</p>` : ''}
            </div>
          </details>`;
      }
      bodyHtml += `
        <div class="detail-field detail-field-full">
          <div class="detail-label">この設備・対象で作れる／得られるもの（${produced.length}件）</div>
          <div class="detail-value">${previewHtml}${extraHtml}</div>
        </div>`;
    }

    // 逆引き②：この素材を使うアイテム
    const usedIn = state.usedInMap.get(item._globalIndex) || [];
    if (usedIn.length > 0) {
      const maxShow = 40;
      const overflow = usedIn.length - maxShow;
      bodyHtml += `
        <details class="detail-sub-box">
          <summary>この素材を使うアイテム（${usedIn.length}件）</summary>
          <div style="margin-top:8px;">
            ${renderModItemChips(usedIn, maxShow)}
            ${overflow > 0 ? `<p class="rule-note" style="margin-top:8px;">※ほか ${overflow} 件あります。検索欄に「${escapeHtml(item.jaName || item.enName)}」と入力すると全件見られます。</p>` : ''}
          </div>
        </details>`;
    }

    if (item.enOriginal) {
      bodyHtml += `
        <details class="detail-sub-box">
          <summary>英語原文（ゲーム内表記）を見る</summary>
          <div class="detail-sub-content">
            <div>${escapeHtml(item.enOriginal)}</div>
          </div>
        </details>`;
    }
    return bodyHtml;
  }

  function openDetailModal(item) {
    state.mainItem = item;
    state.sub1Item = null;
    state.sub2Stack = [];
    recordRecentItem(item);
    renderSubPanels();

    els.modalIconWrap.innerHTML = renderIconHtml(item);
    els.modalModTag.textContent = item._modName;
    els.modalTitle.textContent = item.jaName || item.enName;
    els.modalEnName.textContent = item.enName || '';
    els.copyEnBtn.classList.toggle('hidden', !item.enName);
    els.copyEnBtn.dataset.copy = item.enName || '';
    updateModalPinButton(els.pinItemBtn, item);
    els.modalBody.innerHTML = buildDetailBodyHtml(item);

    els.detailModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function openSub1(item) {
    if (!item) return;
    state.sub1Item = item;
    state.sub2Stack = [];
    recordRecentItem(item);
    renderSubPanels();
    if (window.innerWidth <= 1120) {
      els.subModalDialog.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function openSub2(item, pushHistory) {
    if (!item) return;
    if (pushHistory && state.sub2Stack.length > 0) {
      const top = state.sub2Stack[state.sub2Stack.length - 1];
      if (top._globalIndex === item._globalIndex) return;
      state.sub2Stack.push(item);
    } else {
      state.sub2Stack = [item];
    }
    recordRecentItem(item);
    renderSubPanels();
    if (window.innerWidth <= 1120) {
      els.subModalDialog2.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function renderSubPanels() {
    const hasSub1 = Boolean(state.sub1Item);
    const hasSub2 = hasSub1 && state.sub2Stack.length > 0;

    els.modalStage.classList.toggle('has-sub', hasSub1 && !hasSub2);
    els.modalStage.classList.toggle('has-sub2', hasSub2);

    if (!hasSub1) {
      els.subModalDialog.classList.add('hidden');
      els.subModalDialog2.classList.add('hidden');
      return;
    }

    // Render Sub1
    const s1 = state.sub1Item;
    els.subModalDialog.classList.remove('hidden');
    const mainName = state.mainItem ? state.mainItem.jaName || state.mainItem.enName : '';
    els.subBannerLabel.textContent = `サブ画面①（「${mainName}」の関連）`;
    els.subIconWrap.innerHTML = renderIconHtml(s1);
    els.subModTag.textContent = s1._modName;
    els.subTitle.textContent = s1.jaName || s1.enName;
    els.subEnName.textContent = s1.enName || '';
    els.subCopyEnBtn.classList.toggle('hidden', !s1.enName);
    els.subCopyEnBtn.dataset.copy = s1.enName || '';
    updateModalPinButton(els.subPinItemBtn, s1);
    els.subModalBody.innerHTML = buildDetailBodyHtml(s1);
    els.subModalBody.scrollTop = 0;

    // Render Sub2
    if (!hasSub2) {
      els.subModalDialog2.classList.add('hidden');
      return;
    }

    const s2 = state.sub2Stack[state.sub2Stack.length - 1];
    els.subModalDialog2.classList.remove('hidden');
    els.sub2BackBtn.classList.toggle('hidden', state.sub2Stack.length <= 1);
    const sub1Name = s1.jaName || s1.enName;
    els.sub2BannerLabel.textContent =
      state.sub2Stack.length > 1
        ? `サブ画面②（階層 ${state.sub2Stack.length + 1}）`
        : `サブ画面②（「${sub1Name}」の関連）`;
    els.sub2IconWrap.innerHTML = renderIconHtml(s2);
    els.sub2ModTag.textContent = s2._modName;
    els.sub2Title.textContent = s2.jaName || s2.enName;
    els.sub2EnName.textContent = s2.enName || '';
    els.sub2CopyEnBtn.classList.toggle('hidden', !s2.enName);
    els.sub2CopyEnBtn.dataset.copy = s2.enName || '';
    updateModalPinButton(els.sub2PinItemBtn, s2);
    els.sub2ModalBody.innerHTML = buildDetailBodyHtml(s2);
    els.sub2ModalBody.scrollTop = 0;
  }

  function closeSub1() {
    if (state.sub2Stack.length > 0) {
      // Promote Sub2 into Sub1 so user doesn't lose Sub2
      state.sub1Item = state.sub2Stack[state.sub2Stack.length - 1];
      state.sub2Stack = [];
    } else {
      state.sub1Item = null;
    }
    renderSubPanels();
  }

  function closeSub2() {
    state.sub2Stack = [];
    renderSubPanels();
  }

  function closeDetailModal() {
    state.mainItem = null;
    state.sub1Item = null;
    state.sub2Stack = [];
    renderSubPanels();
    els.detailModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function buildShareUrl(item) {
    const key = item.assetName || String(item.index);
    const hash = `#item=${encodeURIComponent(item._modId)}/${encodeURIComponent(key)}`;
    return `${window.location.origin}${window.location.pathname}${hash}`;
  }

  function openItemFromHash() {
    const hash = window.location.hash || '';
    if (hash === '#guide' || hash === '#tips') {
      switchTab('TIPS');
      return;
    }
    if (hash.startsWith('#tips-')) {
      switchTab('TIPS');
      const secEl = document.getElementById(hash.slice(1));
      if (secEl) secEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (hash === '#faq') {
      switchTab('FAQ');
      return;
    }
    if (!hash.startsWith('#item=')) return;
    const raw = hash.slice(6);
    const slashIdx = raw.indexOf('/');
    if (slashIdx === -1) return;
    const modId = decodeURIComponent(raw.slice(0, slashIdx));
    const key = decodeURIComponent(raw.slice(slashIdx + 1));
    const sheet = (state.data.modSheets || []).find((s) => s.id === modId);
    if (!sheet) return;
    const item = sheet.items.find(
      (i) => (i.assetName && i.assetName.toLowerCase() === key.toLowerCase()) || String(i.index) === key
    );
    if (!item) return;
    switchTab(sheet.id);
    openDetailModal(item);
  }

  function renderServerRules() {
    const rules = state.data.serverRules || [];
    const groups = new Map();
    for (const r of rules) {
      const cat = r.category || 'その他';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(r);
    }

    els.rulesContainer.innerHTML = [...groups.entries()]
      .map(
        ([cat, rows]) => `
        <div class="rules-group">
          <h3 class="rules-group-title">${escapeHtml(cat)}</h3>
          <div class="rules-list">
            ${rows
              .map(
                (r) => `
              <div class="rule-row">
                <div class="rule-key">${escapeHtml(r.item)}</div>
                <div>
                  <div class="rule-val">${escapeHtml(formatSentenceBreaks(r.value))}</div>
                  ${r.note ? `<div class="rule-note">${escapeHtml(formatSentenceBreaks(r.note))}</div>` : ''}
                </div>
              </div>`
              )
              .join('')}
          </div>
        </div>`
      )
      .join('');
  }

  function switchTab(tabId) {
    let target = tabId;
    if (target === 'SEARCH') {
      target = state.lastModTab || 'ALL';
    }
    if (target !== 'INSTALLED' && target !== 'RULES' && target !== 'TIPS' && target !== 'FAQ') {
      state.lastModTab = target;
    }

    state.activeTab = target;
    state.visibleLimit = PAGE_SIZE;
    state.filter2 = '';
    state.filter3 = '';
    state.quickFilter = '';
    buildTabs();

    const isInstalled = target === 'INSTALLED';
    const isRules = target === 'RULES';
    const isTips = target === 'TIPS';
    const isFaq = target === 'FAQ';
    els.itemsSection.classList.toggle('hidden', isInstalled || isRules || isTips || isFaq);
    els.modsSection.classList.toggle('hidden', !isInstalled);
    els.rulesSection.classList.toggle('hidden', !isRules);
    if (els.tipsSection) {
      els.tipsSection.classList.toggle('hidden', !isTips);
    }
    if (els.faqSection) {
      els.faqSection.classList.toggle('hidden', !isFaq);
    }

    if (isInstalled) {
      els.typeTipBanner.classList.add('hidden');
      renderInstalledMods();
    } else if (isRules) {
      els.typeTipBanner.classList.add('hidden');
      renderServerRules();
    } else if (isTips) {
      els.typeTipBanner.classList.add('hidden');
    } else if (isFaq) {
      els.typeTipBanner.classList.add('hidden');
      applyFaqFilter();
    } else {
      els.modSelect.value = target;
      els.resetModBtn.classList.toggle('hidden', target === 'ALL');
      updateTypeTipBanner();
      renderQuickFilters();
      rebuildFilterOptions();
      applyFiltersAndRender();
    }
  }

  function applyFaqFilter() {
    if (!els.faqSearchInput || !els.faqList) return;
    const tokens = normalizeText(els.faqSearchInput.value).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
      for (const grp of els.faqList.querySelectorAll('[data-faq-group]')) {
        grp.classList.remove('hidden');
        for (const item of grp.querySelectorAll('.faq-item')) {
          item.classList.remove('hidden');
        }
      }
      if (els.faqEmptyState) {
        els.faqEmptyState.classList.add('hidden');
      }
      return;
    }

    let visibleTotal = 0;
    for (const grp of els.faqList.querySelectorAll('[data-faq-group]')) {
      let visibleInGroup = 0;
      for (const item of grp.querySelectorAll('.faq-item')) {
        const blob = normalizeText(item.textContent || '');
        const matched = tokens.every((tk) => blob.includes(tk));
        item.classList.toggle('hidden', !matched);
        if (matched) {
          visibleInGroup++;
          item.open = true;
        }
      }
      grp.classList.toggle('hidden', visibleInGroup === 0);
      visibleTotal += visibleInGroup;
    }
    if (els.faqEmptyState) {
      els.faqEmptyState.classList.toggle('hidden', visibleTotal > 0);
    }
  }

  function resetItemFilters() {
    state.searchQuery = '';
    state.category = '';
    state.filter2 = '';
    state.filter3 = '';
    state.quickFilter = '';
    state.visibleLimit = PAGE_SIZE;
    els.itemSearchInput.value = '';
    els.filterCategory.value = '';
    els.filterObtain.value = '';
    els.filterStation.value = '';
    renderQuickFilters();
    applyFiltersAndRender();
  }

  function bindEvents() {
    if (els.brandHomeLink) {
      els.brandHomeLink.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        if (!els.detailModal.classList.contains('hidden')) {
          closeDetailModal();
        }
        state.searchQuery = '';
        els.itemSearchInput.value = '';
        state.category = '';
        state.filter2 = '';
        state.filter3 = '';
        state.quickFilter = '';
        state.sortBy = 'index';
        els.sortSelect.value = 'index';
        state.modSearchQuery = '';
        els.modSearchInput.value = '';
        if (els.faqSearchInput) {
          els.faqSearchInput.value = '';
          applyFaqFilter();
        }
        state.visibleLimit = PAGE_SIZE;
        switchTab('ALL');
        if (window.location.hash) {
          history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    els.tabList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tab-id]');
      if (!btn) return;
      switchTab(btn.dataset.tabId);
    });

    els.modSelect.addEventListener('change', (e) => {
      switchTab(e.target.value);
    });

    els.resetModBtn.addEventListener('click', () => {
      switchTab('ALL');
    });

    els.quickFilterBar.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-quick]');
      if (!chip) return;
      state.quickFilter = chip.dataset.quick;
      state.visibleLimit = PAGE_SIZE;
      renderQuickFilters();
      applyFiltersAndRender();
    });

    els.mobileFilterToggle.addEventListener('click', () => {
      state.mobileFiltersOpen = !state.mobileFiltersOpen;
      updateMobileFilterToggle();
    });

    let searchDebounceTimer = null;
    let isSearchComposing = false;

    const runSearchNow = (val) => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
      state.searchQuery = val;
      state.visibleLimit = PAGE_SIZE;
      applyFiltersAndRender();
    };

    els.itemSearchInput.addEventListener('compositionstart', () => {
      isSearchComposing = true;
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
    });

    els.itemSearchInput.addEventListener('compositionend', (e) => {
      isSearchComposing = false;
      runSearchNow(e.target.value);
    });

    els.itemSearchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      els.clearSearchBtn.classList.toggle('hidden', !val);
      if (isSearchComposing || e.isComposing) return;
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        runSearchNow(val);
      }, 150);
    });

    els.clearSearchBtn.addEventListener('click', () => {
      els.itemSearchInput.value = '';
      els.itemSearchInput.focus();
      runSearchNow('');
    });

    els.filterCategory.addEventListener('change', (e) => {
      state.category = e.target.value;
      state.visibleLimit = PAGE_SIZE;
      applyFiltersAndRender();
    });

    els.filterObtain.addEventListener('change', (e) => {
      state.filter2 = e.target.value;
      state.visibleLimit = PAGE_SIZE;
      applyFiltersAndRender();
    });

    els.filterStation.addEventListener('change', (e) => {
      state.filter3 = e.target.value;
      state.visibleLimit = PAGE_SIZE;
      applyFiltersAndRender();
    });

    els.sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      applyFiltersAndRender();
    });

    els.resetFiltersBtn.addEventListener('click', resetItemFilters);
    els.emptyResetBtn.addEventListener('click', resetItemFilters);

    els.viewCardBtn.addEventListener('click', () => {
      applyViewMode('card', true);
      renderItemsList();
    });

    els.viewTableBtn.addEventListener('click', () => {
      applyViewMode('table', true);
      renderItemsList();
    });

    els.loadMoreBtn.addEventListener('click', () => {
      state.visibleLimit += PAGE_SIZE;
      renderItemsList();
    });

    els.showAllBtn.addEventListener('click', () => {
      state.visibleLimit = state.filteredItems.length;
      renderItemsList();
    });

    els.itemsContainer.addEventListener('click', (e) => {
      const pinBtn = e.target.closest('[data-pin-key]');
      if (pinBtn) {
        e.stopPropagation();
        togglePinByKey(pinBtn.dataset.pinKey);
        return;
      }
      const copyBtn = e.target.closest('[data-copy]');
      if (copyBtn) {
        e.stopPropagation();
        copyText(copyBtn.dataset.copy);
        return;
      }
      const target = e.target.closest('[data-global-index]');
      if (!target) return;
      const gIdx = Number(target.dataset.globalIndex);
      const item = state.allItemsByGlobalIndex.get(gIdx);
      if (item) openDetailModal(item);
    });

    els.itemsContainer.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (e.target.closest('button')) return;
      const card = e.target.closest('.item-card[data-global-index]');
      if (!card) return;
      e.preventDefault();
      const item = state.allItemsByGlobalIndex.get(Number(card.dataset.globalIndex));
      if (item) openDetailModal(item);
    });

    if (els.themeToggleBtn) {
      els.themeToggleBtn.addEventListener('click', toggleTheme);
    }

    els.modSearchInput.addEventListener('input', (e) => {
      state.modSearchQuery = e.target.value;
      renderInstalledMods();
    });

    els.modsGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-jump-tab]');
      if (!btn) return;
      switchTab(btn.dataset.jumpTab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    els.copyEnBtn.addEventListener('click', () => {
      copyText(els.copyEnBtn.dataset.copy);
    });

    els.subCopyEnBtn.addEventListener('click', () => {
      copyText(els.subCopyEnBtn.dataset.copy);
    });

    els.sub2CopyEnBtn.addEventListener('click', () => {
      copyText(els.sub2CopyEnBtn.dataset.copy);
    });

    els.shareItemBtn.addEventListener('click', () => {
      if (!state.mainItem) return;
      copyText(buildShareUrl(state.mainItem));
      showToast('このアイテムの共有URLをコピーしました');
    });

    els.subShareItemBtn.addEventListener('click', () => {
      if (!state.sub1Item) return;
      copyText(buildShareUrl(state.sub1Item));
      showToast('サブ画面①の共有URLをコピーしました');
    });

    els.sub2ShareItemBtn.addEventListener('click', () => {
      if (state.sub2Stack.length === 0) return;
      const item = state.sub2Stack[state.sub2Stack.length - 1];
      copyText(buildShareUrl(item));
      showToast('サブ画面②の共有URLをコピーしました');
    });

    if (els.pinItemBtn) {
      els.pinItemBtn.addEventListener('click', () => {
        if (!state.mainItem) return;
        togglePinByKey(getItemKey(state.mainItem));
      });
    }

    if (els.subPinItemBtn) {
      els.subPinItemBtn.addEventListener('click', () => {
        if (!state.sub1Item) return;
        togglePinByKey(getItemKey(state.sub1Item));
      });
    }

    if (els.sub2PinItemBtn) {
      els.sub2PinItemBtn.addEventListener('click', () => {
        if (state.sub2Stack.length === 0) return;
        const item = state.sub2Stack[state.sub2Stack.length - 1];
        togglePinByKey(getItemKey(item));
      });
    }

    // Open Sub1 from Main
    els.modalBody.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-open-sub]');
      if (!btn) return;
      const item = state.allItemsByGlobalIndex.get(Number(btn.dataset.openSub));
      if (item) openSub1(item);
    });

    // Open Sub2 from Sub1 (keeping Main & Sub1 open!)
    els.subModalBody.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-open-sub]');
      if (!btn) return;
      const item = state.allItemsByGlobalIndex.get(Number(btn.dataset.openSub));
      if (item) openSub2(item, false);
    });

    // Navigate deeper inside Sub2 (with history stack)
    els.sub2ModalBody.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-open-sub]');
      if (!btn) return;
      const item = state.allItemsByGlobalIndex.get(Number(btn.dataset.openSub));
      if (item) openSub2(item, true);
    });

    els.sub2BackBtn.addEventListener('click', () => {
      if (state.sub2Stack.length > 1) {
        state.sub2Stack.pop();
        renderSubPanels();
      }
    });

    els.subCloseBtn.addEventListener('click', closeSub1);
    els.sub2CloseBtn.addEventListener('click', closeSub2);
    els.modalCloseBtn.addEventListener('click', closeDetailModal);
    els.detailModal.addEventListener('click', (e) => {
      if (e.target === els.detailModal || e.target === els.modalStage) {
        closeDetailModal();
      }
    });

    if (els.shareTipsBtn) {
      els.shareTipsBtn.addEventListener('click', () => {
        const guideUrl = `${window.location.origin}${window.location.pathname}#guide`;
        copyText(guideUrl);
        showToast('初心者設定・便利技ページのURLをコピーしました');
      });
    }

    if (els.tipsDeviceBar && els.tipsContent) {
      els.tipsDeviceBar.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-device]');
        if (!btn) return;
        applyTipsDevice(btn.dataset.device || 'all', true);
      });
    }

    if (els.tipsSection) {
      els.tipsSection.addEventListener('click', (e) => {
        const copyBtn = e.target.closest('[data-tips-copy]');
        if (copyBtn) {
          copyText(copyBtn.dataset.tipsCopy);
          return;
        }
        const jumpBtn = e.target.closest('[data-jump-tab]');
        if (jumpBtn) {
          switchTab(jumpBtn.dataset.jumpTab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        const tocLink = e.target.closest('.tips-toc a[href^="#"]');
        if (tocLink) {
          const targetId = tocLink.getAttribute('href').slice(1);
          const targetEl = targetId ? document.getElementById(targetId) : null;
          if (targetEl) {
            e.preventDefault();
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    }

    if (els.shareFaqBtn) {
      els.shareFaqBtn.addEventListener('click', () => {
        const faqUrl = `${window.location.origin}${window.location.pathname}#faq`;
        copyText(faqUrl);
        showToast('よくある質問（Q&A）ページのURLをコピーしました');
      });
    }

    if (els.faqSection) {
      els.faqSection.addEventListener('click', (e) => {
        const copyBtn = e.target.closest('[data-tips-copy]');
        if (copyBtn) {
          copyText(copyBtn.dataset.tipsCopy);
          return;
        }
        const jumpBtn = e.target.closest('[data-jump-tab]');
        if (jumpBtn) {
          switchTab(jumpBtn.dataset.jumpTab);
          const targetId = jumpBtn.dataset.jumpTarget;
          const targetEl = targetId ? document.getElementById(targetId) : null;
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      });
    }

    if (els.faqSearchInput && els.faqList) {
      els.faqSearchInput.addEventListener('input', applyFaqFilter);
      els.faqSearchInput.addEventListener('search', applyFaqFilter);
    }

    if (els.scrollTopBtn) {
      els.scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    window.addEventListener('scroll', updateScrollTopButton, { passive: true });

    window.addEventListener('hashchange', () => {
      if (state.data) openItemFromHash();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !els.detailModal.classList.contains('hidden')) {
        if (state.sub2Stack.length > 0) {
          closeSub2();
        } else if (state.sub1Item) {
          closeSub1();
        } else {
          closeDetailModal();
        }
      } else if (
        e.key === '/' &&
        document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA' &&
        els.detailModal.classList.contains('hidden')
      ) {
        e.preventDefault();
        if (state.activeTab === 'INSTALLED') {
          els.modSearchInput.focus();
        } else if (state.activeTab === 'FAQ' && els.faqSearchInput) {
          els.faqSearchInput.focus();
        } else {
          if (state.activeTab === 'TIPS' || state.activeTab === 'RULES') {
            switchTab('ALL');
          }
          els.itemSearchInput.focus();
        }
      }
    });
  }

  function addLookup(map, rawKey, item) {
    const k = normalizeKey(rawKey);
    if (!k) return;
    if (!map.has(k)) map.set(k, []);
    const arr = map.get(k);
    if (!arr.includes(item)) arr.push(item);
  }

  async function init() {
    updateThemeButton();
    loadUserCollections();
    loadUserPreferences();
    updateScrollTopButton();
    bindEvents();
    try {
      const cacheBust = `?v=${Date.now()}`;
      const [modsRes, iconsRes] = await Promise.all([
        fetch(`data/mods.json${cacheBust}`, { cache: 'no-store' }),
        fetch(`data/icons.json${cacheBust}`, { cache: 'no-store' }).catch(() => null),
      ]);

      if (!modsRes.ok) {
        throw new Error(`データの読み込みに失敗しました (HTTP ${modsRes.status})`);
      }

      const data = await modsRes.json();
      const icons = iconsRes && iconsRes.ok ? await iconsRes.json() : {};

      const HIDDEN_PUBLIC_ASSETS = new Set([
        'primalitem_admintool',
        'primalitemstructure_wafabox',
        'primalitemconsumable_shibainucompanionconversiontreat',
        'brachyura',
      ]);
      const USAGE_TYPE_VALUES = new Set([
        '実用（機能あり）',
        '装飾・観賞用',
        '見た目変更（スキン）',
        '生物・繁殖',
      ]);

      // Hide template-only serverRules until real server values are filled in
      if (Array.isArray(data.serverRules)) {
        const hasOnlyTemplates = data.serverRules.every(
          (r) => !r.value || /[（(](ここに|例：)/.test(r.value) || r.category === '初心者向け案内' || r.category === 'プレイ上のルール'
        );
        if (hasOnlyTemplates && data.serverRules.some((r) => /[（(](ここに|例：)/.test(r.value || ''))) {
          data.serverRules = [];
        }
      }

      const allMap = new Map();
      const byKey = new Map();
      const byEn = new Map();
      const byJa = new Map();
      let gIdx = 0;

      for (const sheet of data.modSheets || []) {
        const sType = sheet.sheetType || 'item';
        sheet.items = (sheet.items || []).filter((item) => {
          const an = (item.assetName || '').trim().toLowerCase();
          return !HIDDEN_PUBLIC_ASSETS.has(an);
        });
        sheet.itemCount = sheet.items.length;

        for (const item of sheet.items) {
          item._modId = sheet.id;
          item._modName = sheet.name;
          item._sheetType = sType;
          // Recover usageType if GAS mapped 用途タイプ into specialAbility
          if (!item.usageType && item.specialAbility && USAGE_TYPE_VALUES.has(item.specialAbility)) {
            item.usageType = item.specialAbility;
            item.specialAbility = '';
          }
          if (!item.usageType) {
            if (sType === 'creature') item.usageType = '生物・繁殖';
            else if (sType === 'cosmetic') item.usageType = '見た目変更（スキン）';
          }
          item._isVanillaRef =
            !item.assetName && VANILLA_REF_EN_NAMES.has((item.enName || '').trim().toLowerCase());
          item._globalIndex = gIdx++;
          item._searchBlob = normalizeText(
            [
              item.jaName,
              item.enName,
              item.description,
              item.category,
              item.usageType,
              item.obtainMethod,
              item.dinoName,
              item.craftStation,
              item.toolUsed,
              item.harvestSource,
              item.materials,
              item.tamingMethod,
              item.favoriteFood,
              item.foodAmount,
              item.habitat,
              item.saddleRide,
              item.specialAbility,
              item.applyTarget,
              item.applyMethod,
              item.enOriginal,
              sheet.name,
            ].join(' ')
          );
          allMap.set(item._globalIndex, item);
          byKey.set(getItemKey(item), item);

          if (!item._isVanillaRef) {
            if (item.enName) addLookup(byEn, item.enName, item);
            if (item.jaName) {
              addLookup(byJa, item.jaName, item);
              const m = item.jaName.match(/^(.+?)\s*[（(]([^）)]+)[）)]$/);
              if (m) {
                addLookup(byJa, m[1], item);
                addLookup(byEn, m[2], item);
              }
            }
          }
        }
      }

      state.data = data;
      state.icons = icons;
      state.allItemsByGlobalIndex = allMap;
      state.itemByKey = byKey;
      state.lookupByEn = byEn;
      state.lookupByJa = byJa;

      // Build reverse-lookup maps: station/source -> produced items, material -> items using it
      const producedBy = new Map();
      const usedIn = new Map();
      const pushUnique = (map, targetId, srcItem) => {
        if (!map.has(targetId)) map.set(targetId, []);
        const arr = map.get(targetId);
        if (!arr.includes(srcItem)) arr.push(srcItem);
      };

      for (const item of allMap.values()) {
        for (const srcText of [item.craftStation, item.harvestSource]) {
          if (!srcText) continue;
          for (const seg of splitRespectingParens(srcText)) {
            const station = findReferencedModItem(seg, item._modId, item._globalIndex);
            if (station) pushUnique(producedBy, station._globalIndex, item);
          }
        }
        if (item.materials) {
          for (const seg of splitRespectingParens(item.materials)) {
            const mat = findReferencedModItem(seg, item._modId, item._globalIndex);
            if (mat) pushUnique(usedIn, mat._globalIndex, item);
          }
        }
      }

      state.producedByMap = producedBy;
      state.usedInMap = usedIn;

      const modCount = (data.installedMods || []).length;
      const itemCount = allMap.size;
      els.statBadge.textContent = `導入MOD ${modCount}件 / 収録 ${itemCount}件`;
      els.updatedBadge.textContent = formatDate(data.updatedAt);

      buildTabs();
      buildModSelector();
      switchTab('ALL');
      openItemFromHash();
    } catch (err) {
      els.statBadge.textContent = '読み込みエラー';
      els.itemsContainer.innerHTML = `<div class="empty-state"><p class="empty-title">データを読み込めませんでした</p><p class="empty-desc">${escapeHtml(err.message)}</p></div>`;
    }
  }

  init();
})();

(() => {
  'use strict';

  const PAGE_SIZE = 80;

  const state = {
    data: null,
    icons: {},
    activeTab: '', // 'ALL' | 'INSTALLED' | <modSheet.id>
    searchQuery: '',
    category: '',
    filter2: '',
    filter3: '',
    quickFilter: '', // '' | 'stations' | 'item' | 'creature' | 'cosmetic'
    mobileFiltersOpen: false,
    sortBy: 'index',
    viewMode: 'card', // 'card' | 'table'
    visibleLimit: PAGE_SIZE,
    modSearchQuery: '',
    filteredItems: [],
    allItemsByGlobalIndex: new Map(),
    lookupByEn: new Map(),
    lookupByJa: new Map(),
    mainItem: null,
    subStack: [],
  };

  const els = {
    statBadge: document.getElementById('statBadge'),
    updatedBadge: document.getElementById('updatedBadge'),
    tabList: document.getElementById('tabList'),
    itemsSection: document.getElementById('itemsSection'),
    modsSection: document.getElementById('modsSection'),
    rulesSection: document.getElementById('rulesSection'),
    rulesContainer: document.getElementById('rulesContainer'),
    typeTipBanner: document.getElementById('typeTipBanner'),
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
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    modalBody: document.getElementById('modalBody'),
    subModalDialog: document.getElementById('subModalDialog'),
    subBackBtn: document.getElementById('subBackBtn'),
    subBannerLabel: document.getElementById('subBannerLabel'),
    subCloseBtn: document.getElementById('subCloseBtn'),
    subIconWrap: document.getElementById('subIconWrap'),
    subModTag: document.getElementById('subModTag'),
    subTitle: document.getElementById('subTitle'),
    subEnName: document.getElementById('subEnName'),
    subCopyEnBtn: document.getElementById('subCopyEnBtn'),
    subShareItemBtn: document.getElementById('subShareItemBtn'),
    subModalBody: document.getElementById('subModalBody'),
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
    if (modIcons && item.assetName) {
      const found = modIcons[item.assetName.toLowerCase()];
      if (found) return found;
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

    const tabs = [];
    if (sheets.length >= 2) {
      tabs.push({ id: 'ALL', label: '🔍 全MOD横断', count: totalItems });
    }
    if (rulesCount > 0) {
      tabs.push({ id: 'RULES', label: '📜 鯖ルール・設定', count: rulesCount });
    }
    tabs.push({ id: 'INSTALLED', label: '📋 導入中MOD一覧', count: installedCount });
    for (const sheet of sheets) {
      tabs.push({ id: sheet.id, label: `${getSheetIcon(sheet)}${sheet.name}`, count: sheet.items.length });
    }

    if (!state.activeTab || !tabs.some((t) => t.id === state.activeTab)) {
      state.activeTab = tabs[0] ? tabs[0].id : 'INSTALLED';
    }

    els.tabList.innerHTML = tabs
      .map(
        (t) => `
        <button
          type="button"
          class="tab-btn ${t.id === state.activeTab ? 'active' : ''}"
          role="tab"
          aria-selected="${t.id === state.activeTab}"
          data-tab-id="${escapeHtml(t.id)}"
        >
          <span>${escapeHtml(t.label)}</span>
          <span class="tab-count">${t.count}</span>
        </button>`
      )
      .join('');
  }

  function renderQuickFilters() {
    const sourceItems = getActiveSourceItems();
    const stationCount = sourceItems.filter(isCraftingStation).length;
    const chips = [];

    if (state.activeTab === 'ALL') {
      chips.push({ id: '', label: 'すべて' });
      if (stationCount > 0) chips.push({ id: 'stations', label: `🛠 作業台・設備 (${stationCount})` });
      chips.push({ id: 'item', label: '📦 アイテム系' });
      chips.push({ id: 'creature', label: '🐾 生物系' });
      chips.push({ id: 'cosmetic', label: '✨ スキン系' });
    } else if (stationCount > 0) {
      chips.push({ id: '', label: 'すべて' });
      chips.push({ id: 'stations', label: `🛠 作業台・設備だけ見る (${stationCount})` });
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

    let list = sourceItems.filter((item) => {
      if (state.quickFilter === 'stations' && !isCraftingStation(item)) return false;
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

    if (state.viewMode === 'card') {
      els.itemsContainer.className = 'items-grid';
      els.itemsContainer.innerHTML = shown
        .map((item) => {
          const tags = [];
          if (showModBadge) tags.push(`<span class="tag tag-mod">${escapeHtml(item._modName)}</span>`);
          if (item.category) tags.push(`<span class="tag tag-cat">${escapeHtml(item.category)}</span>`);
          if (item.craftStation) tags.push(`<span class="tag tag-station">${escapeHtml(item.craftStation)}</span>`);
          if (item.applyTarget) tags.push(`<span class="tag tag-station">${escapeHtml(item.applyTarget)}</span>`);
          if (item.tamingMethod) tags.push(`<span class="tag tag-station">${escapeHtml(item.tamingMethod)}</span>`);
          if (item.obtainMethod) tags.push(`<span class="tag">${escapeHtml(item.obtainMethod)}</span>`);
          if (item.habitat) tags.push(`<span class="tag">${escapeHtml(item.habitat)}</span>`);

          return `
            <article class="item-card" data-global-index="${item._globalIndex}" tabindex="0">
              <div class="item-card-top">
                <div class="item-thumb">${renderIconHtml(item)}</div>
                <div class="item-headings">
                  <h3 class="item-ja">${escapeHtml(item.jaName || item.enName)}</h3>
                  <div class="item-en-line">
                    <span class="item-en">${escapeHtml(item.enName)}</span>
                    ${
                      item.enName
                        ? `<button type="button" class="mini-copy-btn" data-copy="${escapeHtml(item.enName)}" title="英語名をコピー">コピー</button>`
                        : ''
                    }
                  </div>
                </div>
              </div>
              ${item.description ? `<p class="item-desc">${escapeHtml(formatSentenceBreaks(item.description))}</p>` : ''}
              ${tags.length ? `<div class="item-tags">${tags.join('')}</div>` : ''}
            </article>`;
        })
        .join('');
    } else {
      els.itemsContainer.className = 'items-table-wrap';
      const col4Header =
        sheetType === 'creature' ? 'テイム方法' : sheetType === 'cosmetic' ? '適用対象' : '作る場所';
      const col5Header =
        sheetType === 'creature' ? '好物・餌' : sheetType === 'cosmetic' ? '適用方法' : '必要素材';

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
                  <div class="table-name-ja">${escapeHtml(item.jaName || item.enName)}</div>
                  <div class="table-name-en">${escapeHtml(item.enName)}</div>
                </td>
                ${showModBadge ? `<td><span class="tag tag-mod">${escapeHtml(item._modName)}</span></td>` : ''}
                <td>${item.category ? `<span class="tag tag-cat">${escapeHtml(item.category)}</span>` : ''}</td>
                <td>${escapeHtml(col4Val)}</td>
                <td>${escapeHtml(col5Val)}</td>
                <td>${escapeHtml(formatSentenceBreaks(item.description || ''))}</td>
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
      const blob = normalizeText(`${m.name} ${m.description} ${m.curseForgeId} ${m.notes}`);
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
            ${
              m.notes
                ? `<details class="mod-notes-details">
                    <summary>備考・詳細情報</summary>
                    <p class="mod-notes-text">${escapeHtml(formatSentenceBreaks(m.notes))}</p>
                  </details>`
                : ''
            }
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

      if (depth === 0 && (ch === '、' || ch === ',' || ch === '\n' || ch === '／')) {
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

    // Extract parenthesized English/alias name if present: "トゲ（Spine）" -> ja="トゲ", inner="Spine"
    const parenMatch = cleaned.match(/^(.+?)\s*[（(]([^）)]+)[）)]$/);
    const outerPart = parenMatch ? parenMatch[1].trim() : cleaned;
    const innerPart = parenMatch ? parenMatch[2].trim() : '';

    // 1. Try matching inner English name first (most precise)
    if (innerPart) {
      const kInner = normalizeKey(innerPart);
      const hitEn = pickPreferredItem(state.lookupByEn.get(kInner), preferredModId, excludeGlobalIndex);
      if (hitEn) return hitEn;
    }

    // 2. Try matching full cleaned string against jaName or enName
    const kFull = normalizeKey(cleaned);
    let hit =
      pickPreferredItem(state.lookupByEn.get(kFull), preferredModId, excludeGlobalIndex) ||
      pickPreferredItem(state.lookupByJa.get(kFull), preferredModId, excludeGlobalIndex);
    if (hit) return hit;

    // 3. Try matching outer Japanese name
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
    if (/^(インベントリ|なし|-|ー|不明|作成|採取|コスメティック|エングラム|スポーン|クラス切替|アビリティ|および|または|そのほか|その他)/.test(s)) {
      return true;
    }
    const base = s.replace(/\s*[（(][^）)]+[）)]/g, '').trim();
    if (base.length > 22 || /(攻撃|ダメージ|コンポーネント|ファイル|参照|使用)/.test(base)) {
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

  function buildDetailBodyHtml(item) {
    // [label, value, isFullWidth, enableRefLinks]
    const fields = [
      ['分類', item.category, false, false],
      ['入手方法', item.obtainMethod, false, false],
      ['作る場所', item.craftStation, false, true],
      ['使う道具', item.toolUsed, false, true],
      ['採取元（木・石など）', item.harvestSource, false, false],
      ['恐竜名', item.dinoName, false, true],
      ['必要素材', item.materials, true, true],
      // 生物系
      ['テイム方法', item.tamingMethod, false, false],
      ['好物・餌', item.favoriteFood, false, true],
      ['生息地・スポーン', item.habitat, false, false],
      ['サドル・騎乗', item.saddleRide, false, true],
      ['特殊能力・用途', item.specialAbility, true, false],
      // コスメティック系
      ['適用対象', item.applyTarget, false, true],
      ['適用方法', item.applyMethod, false, false],
    ].filter(([, val]) => Boolean(val));

    let bodyHtml = '';
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
    if (item.enOriginal || item.notes) {
      bodyHtml += `
        <details class="detail-sub-box" open>
          <summary>英語原文・備考</summary>
          <div class="detail-sub-content">
            ${item.enOriginal ? `<div><strong>英語原文:</strong>\n${escapeHtml(item.enOriginal)}</div>` : ''}
            ${item.notes ? `<div><strong>備考:</strong>\n${escapeHtml(formatSentenceBreaks(item.notes))}</div>` : ''}
          </div>
        </details>`;
    }
    return bodyHtml;
  }

  function openDetailModal(item) {
    state.mainItem = item;
    state.subStack = [];
    renderSubPanel();

    els.modalIconWrap.innerHTML = renderIconHtml(item);
    els.modalModTag.textContent = item._modName;
    els.modalTitle.textContent = item.jaName || item.enName;
    els.modalEnName.textContent = item.enName || '';
    els.copyEnBtn.classList.toggle('hidden', !item.enName);
    els.copyEnBtn.dataset.copy = item.enName || '';
    els.modalBody.innerHTML = buildDetailBodyHtml(item);

    els.detailModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function openSubItem(item, pushHistory) {
    if (!item) return;
    if (pushHistory && state.subStack.length > 0) {
      const top = state.subStack[state.subStack.length - 1];
      if (top._globalIndex === item._globalIndex) return;
      state.subStack.push(item);
    } else {
      state.subStack = [item];
    }
    renderSubPanel();
    if (window.innerWidth <= 960) {
      els.subModalDialog.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function renderSubPanel() {
    if (state.subStack.length === 0) {
      els.subModalDialog.classList.add('hidden');
      els.modalStage.classList.remove('has-sub');
      return;
    }

    const item = state.subStack[state.subStack.length - 1];
    els.modalStage.classList.add('has-sub');
    els.subModalDialog.classList.remove('hidden');

    els.subBackBtn.classList.toggle('hidden', state.subStack.length <= 1);
    const parentName = state.mainItem ? state.mainItem.jaName || state.mainItem.enName : '';
    els.subBannerLabel.textContent =
      state.subStack.length > 1
        ? `関連詳細（階層 ${state.subStack.length}）`
        : `「${parentName}」の関連MODアイテム`;

    els.subIconWrap.innerHTML = renderIconHtml(item);
    els.subModTag.textContent = item._modName;
    els.subTitle.textContent = item.jaName || item.enName;
    els.subEnName.textContent = item.enName || '';
    els.subCopyEnBtn.classList.toggle('hidden', !item.enName);
    els.subCopyEnBtn.dataset.copy = item.enName || '';
    els.subModalBody.innerHTML = buildDetailBodyHtml(item);
    els.subModalBody.scrollTop = 0;
  }

  function closeSubPanel() {
    state.subStack = [];
    renderSubPanel();
  }

  function closeDetailModal() {
    state.mainItem = null;
    state.subStack = [];
    renderSubPanel();
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
    state.activeTab = tabId;
    state.visibleLimit = PAGE_SIZE;
    state.filter2 = '';
    state.filter3 = '';
    state.quickFilter = '';
    buildTabs();

    const isInstalled = tabId === 'INSTALLED';
    const isRules = tabId === 'RULES';
    els.itemsSection.classList.toggle('hidden', isInstalled || isRules);
    els.modsSection.classList.toggle('hidden', !isInstalled);
    els.rulesSection.classList.toggle('hidden', !isRules);

    if (isInstalled) {
      els.typeTipBanner.classList.add('hidden');
      renderInstalledMods();
    } else if (isRules) {
      els.typeTipBanner.classList.add('hidden');
      renderServerRules();
    } else {
      updateTypeTipBanner();
      renderQuickFilters();
      rebuildFilterOptions();
      applyFiltersAndRender();
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
    els.tabList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tab-id]');
      if (!btn) return;
      switchTab(btn.dataset.tabId);
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

    els.itemSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      state.visibleLimit = PAGE_SIZE;
      applyFiltersAndRender();
    });

    els.clearSearchBtn.addEventListener('click', () => {
      state.searchQuery = '';
      els.itemSearchInput.value = '';
      els.itemSearchInput.focus();
      state.visibleLimit = PAGE_SIZE;
      applyFiltersAndRender();
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
      state.viewMode = 'card';
      els.viewCardBtn.classList.add('active');
      els.viewTableBtn.classList.remove('active');
      renderItemsList();
    });

    els.viewTableBtn.addEventListener('click', () => {
      state.viewMode = 'table';
      els.viewTableBtn.classList.add('active');
      els.viewCardBtn.classList.remove('active');
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
      const card = e.target.closest('.item-card[data-global-index]');
      if (!card) return;
      e.preventDefault();
      const item = state.allItemsByGlobalIndex.get(Number(card.dataset.globalIndex));
      if (item) openDetailModal(item);
    });

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

    els.shareItemBtn.addEventListener('click', () => {
      if (!state.mainItem) return;
      copyText(buildShareUrl(state.mainItem));
      showToast('このアイテムの共有URLをコピーしました');
    });

    els.subShareItemBtn.addEventListener('click', () => {
      if (state.subStack.length === 0) return;
      const item = state.subStack[state.subStack.length - 1];
      copyText(buildShareUrl(item));
      showToast('関連アイテムの共有URLをコピーしました');
    });

    // Open sub-panel from main modal body
    els.modalBody.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-open-sub]');
      if (!btn) return;
      const item = state.allItemsByGlobalIndex.get(Number(btn.dataset.openSub));
      if (item) openSubItem(item, false);
    });

    // Navigate deeper inside sub-panel
    els.subModalBody.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-open-sub]');
      if (!btn) return;
      const item = state.allItemsByGlobalIndex.get(Number(btn.dataset.openSub));
      if (item) openSubItem(item, true);
    });

    els.subBackBtn.addEventListener('click', () => {
      if (state.subStack.length > 1) {
        state.subStack.pop();
        renderSubPanel();
      }
    });

    els.subCloseBtn.addEventListener('click', closeSubPanel);
    els.modalCloseBtn.addEventListener('click', closeDetailModal);
    els.detailModal.addEventListener('click', (e) => {
      if (e.target === els.detailModal || e.target === els.modalStage) {
        closeDetailModal();
      }
    });

    window.addEventListener('hashchange', () => {
      if (state.data) openItemFromHash();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !els.detailModal.classList.contains('hidden')) {
        if (state.subStack.length > 0) {
          closeSubPanel();
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
        } else {
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

      const allMap = new Map();
      const byEn = new Map();
      const byJa = new Map();
      let gIdx = 0;

      for (const sheet of data.modSheets || []) {
        const sType = sheet.sheetType || 'item';
        for (const item of sheet.items || []) {
          item._modId = sheet.id;
          item._modName = sheet.name;
          item._sheetType = sType;
          item._globalIndex = gIdx++;
          item._searchBlob = normalizeText(
            [
              item.jaName,
              item.enName,
              item.description,
              item.category,
              item.obtainMethod,
              item.dinoName,
              item.craftStation,
              item.toolUsed,
              item.harvestSource,
              item.materials,
              item.tamingMethod,
              item.favoriteFood,
              item.habitat,
              item.saddleRide,
              item.specialAbility,
              item.applyTarget,
              item.applyMethod,
              item.enOriginal,
              item.notes,
              sheet.name,
            ].join(' ')
          );
          allMap.set(item._globalIndex, item);

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

      state.data = data;
      state.icons = icons;
      state.allItemsByGlobalIndex = allMap;
      state.lookupByEn = byEn;
      state.lookupByJa = byJa;

      const modCount = (data.installedMods || []).length;
      const itemCount = allMap.size;
      els.statBadge.textContent = `導入MOD ${modCount}件 / 収録 ${itemCount}件`;
      els.updatedBadge.textContent = formatDate(data.updatedAt);

      buildTabs();
      switchTab(state.activeTab);
      openItemFromHash();
    } catch (err) {
      els.statBadge.textContent = '読み込みエラー';
      els.itemsContainer.innerHTML = `<div class="empty-state"><p class="empty-title">データを読み込めませんでした</p><p class="empty-desc">${escapeHtml(err.message)}</p></div>`;
    }
  }

  init();
})();

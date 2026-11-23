(() => {
  'use strict';

  const PAGE_SIZE = 80;

  const state = {
    data: null,
    icons: {},
    activeTab: '', // 'ALL' | 'INSTALLED' | <modSheet.id>
    searchQuery: '',
    category: '',
    obtainMethod: '',
    craftStation: '',
    sortBy: 'index',
    viewMode: 'card', // 'card' | 'table'
    visibleLimit: PAGE_SIZE,
    modSearchQuery: '',
    filteredItems: [],
  };

  const els = {
    statBadge: document.getElementById('statBadge'),
    updatedBadge: document.getElementById('updatedBadge'),
    tabList: document.getElementById('tabList'),
    itemsSection: document.getElementById('itemsSection'),
    modsSection: document.getElementById('modsSection'),
    itemSearchInput: document.getElementById('itemSearchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    filterCategory: document.getElementById('filterCategory'),
    filterObtain: document.getElementById('filterObtain'),
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
    modalIconWrap: document.getElementById('modalIconWrap'),
    modalModTag: document.getElementById('modalModTag'),
    modalTitle: document.getElementById('modalTitle'),
    modalEnName: document.getElementById('modalEnName'),
    copyEnBtn: document.getElementById('copyEnBtn'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    modalBody: document.getElementById('modalBody'),
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

  function normalizeText(str) {
    if (!str) return '';
    return String(str)
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
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
    // Explicit safe image URL (non-Google Drive) or local path
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

  function getActiveSourceItems() {
    if (!state.data) return [];
    const sheets = state.data.modSheets || [];
    if (state.activeTab === 'ALL') {
      return sheets.flatMap((s) => s.items);
    }
    const sheet = sheets.find((s) => s.id === state.activeTab);
    return sheet ? sheet.items : [];
  }

  function buildTabs() {
    const sheets = state.data.modSheets || [];
    const installedCount = (state.data.installedMods || []).length;
    const totalItems = sheets.reduce((sum, s) => sum + s.items.length, 0);

    const tabs = [];
    if (sheets.length >= 2) {
      tabs.push({ id: 'ALL', label: '全MOD横断', count: totalItems });
    }
    for (const sheet of sheets) {
      tabs.push({ id: sheet.id, label: sheet.name, count: sheet.items.length });
    }
    tabs.push({ id: 'INSTALLED', label: '導入中MOD一覧', count: installedCount });

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
    populateSelect(
      els.filterCategory,
      items.map((i) => i.category),
      state.category
    );
    state.category = els.filterCategory.value;

    populateSelect(
      els.filterObtain,
      items.map((i) => i.obtainMethod),
      state.obtainMethod
    );
    state.obtainMethod = els.filterObtain.value;

    populateSelect(
      els.filterStation,
      items.map((i) => i.craftStation),
      state.craftStation
    );
    state.craftStation = els.filterStation.value;
  }

  function applyFiltersAndRender() {
    const sourceItems = getActiveSourceItems();
    const tokens = normalizeText(state.searchQuery)
      .split(/\s+/)
      .filter(Boolean);

    let list = sourceItems.filter((item) => {
      if (state.category && item.category !== state.category) return false;
      if (state.obtainMethod && item.obtainMethod !== state.obtainMethod) return false;
      if (state.craftStation && item.craftStation !== state.craftStation) return false;
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
      state.searchQuery.trim() || state.category || state.obtainMethod || state.craftStation
    );
    els.resetFiltersBtn.classList.toggle('hidden', !hasActiveFilter);
    els.clearSearchBtn.classList.toggle('hidden', !state.searchQuery);

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

    if (state.viewMode === 'card') {
      els.itemsContainer.className = 'items-grid';
      els.itemsContainer.innerHTML = shown
        .map((item) => {
          const tags = [];
          if (showModBadge) tags.push(`<span class="tag tag-mod">${escapeHtml(item._modName)}</span>`);
          if (item.category) tags.push(`<span class="tag tag-cat">${escapeHtml(item.category)}</span>`);
          if (item.craftStation) tags.push(`<span class="tag tag-station">${escapeHtml(item.craftStation)}</span>`);
          if (item.obtainMethod) tags.push(`<span class="tag">${escapeHtml(item.obtainMethod)}</span>`);

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
              ${item.description ? `<p class="item-desc">${escapeHtml(item.description)}</p>` : ''}
              ${tags.length ? `<div class="item-tags">${tags.join('')}</div>` : ''}
            </article>`;
        })
        .join('');
    } else {
      els.itemsContainer.className = 'items-table-wrap';
      els.itemsContainer.innerHTML = `
        <table class="items-table">
          <thead>
            <tr>
              <th>画像</th>
              <th>アイテム名（日本語 / 英語）</th>
              ${showModBadge ? '<th>MOD</th>' : ''}
              <th>分類</th>
              <th>作る場所</th>
              <th>必要素材</th>
              <th>説明</th>
            </tr>
          </thead>
          <tbody>
            ${shown
              .map(
                (item) => `
              <tr data-global-index="${item._globalIndex}">
                <td><div class="table-thumb">${renderIconHtml(item)}</div></td>
                <td>
                  <div class="table-name-ja">${escapeHtml(item.jaName || item.enName)}</div>
                  <div class="table-name-en">${escapeHtml(item.enName)}</div>
                </td>
                ${showModBadge ? `<td><span class="tag tag-mod">${escapeHtml(item._modName)}</span></td>` : ''}
                <td>${item.category ? `<span class="tag tag-cat">${escapeHtml(item.category)}</span>` : ''}</td>
                <td>${escapeHtml(item.craftStation || '-')}</td>
                <td>${escapeHtml(item.materials || '-')}</td>
                <td>${escapeHtml(item.description || '')}</td>
              </tr>`
              )
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
            ${m.description ? `<p class="mod-card-desc">${escapeHtml(m.description)}</p>` : ''}
            <div class="mod-card-actions">
              ${
                matchedSheet
                  ? `<button type="button" class="btn btn-primary jump-mod-btn" data-jump-tab="${escapeHtml(matchedSheet.id)}">アイテム一覧を見る（${matchedSheet.items.length}件）→</button>`
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
                    <p class="mod-notes-text">${escapeHtml(m.notes)}</p>
                  </details>`
                : ''
            }
          </article>`;
      })
      .join('');
  }

  function openDetailModal(item) {
    els.modalIconWrap.innerHTML = renderIconHtml(item);
    els.modalModTag.textContent = item._modName;
    els.modalTitle.textContent = item.jaName || item.enName;
    els.modalEnName.textContent = item.enName || '';
    els.copyEnBtn.classList.toggle('hidden', !item.enName);
    els.copyEnBtn.dataset.copy = item.enName || '';

    const fields = [
      ['分類', item.category],
      ['入手方法', item.obtainMethod],
      ['作る場所', item.craftStation],
      ['使う道具', item.toolUsed],
      ['採取元（木・石など）', item.harvestSource],
      ['恐竜名', item.dinoName],
      ['必要素材', item.materials, true],
    ].filter(([, val]) => Boolean(val));

    let bodyHtml = '';
    if (item.description) {
      bodyHtml += `<div class="detail-desc-box">${escapeHtml(item.description)}</div>`;
    }
    if (fields.length) {
      bodyHtml += `<div class="detail-grid">${fields
        .map(
          ([label, val, full]) => `
          <div class="detail-field ${full ? 'detail-field-full' : ''}">
            <div class="detail-label">${escapeHtml(label)}</div>
            <div class="detail-value">${escapeHtml(val)}</div>
          </div>`
        )
        .join('')}</div>`;
    }
    if (item.enOriginal || item.notes) {
      bodyHtml += `
        <details class="detail-sub-box" open>
          <summary>英語原文・備考</summary>
          <div class="detail-sub-content">
            ${item.enOriginal ? `<div><strong>英語原文:</strong> ${escapeHtml(item.enOriginal)}</div>` : ''}
            ${item.notes ? `<div><strong>備考:</strong> ${escapeHtml(item.notes)}</div>` : ''}
          </div>
        </details>`;
    }

    els.modalBody.innerHTML = bodyHtml;
    els.detailModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeDetailModal() {
    els.detailModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    state.visibleLimit = PAGE_SIZE;
    buildTabs();

    const isInstalled = tabId === 'INSTALLED';
    els.itemsSection.classList.toggle('hidden', isInstalled);
    els.modsSection.classList.toggle('hidden', !isInstalled);

    if (isInstalled) {
      renderInstalledMods();
    } else {
      rebuildFilterOptions();
      applyFiltersAndRender();
    }
  }

  function resetItemFilters() {
    state.searchQuery = '';
    state.category = '';
    state.obtainMethod = '';
    state.craftStation = '';
    state.visibleLimit = PAGE_SIZE;
    els.itemSearchInput.value = '';
    els.filterCategory.value = '';
    els.filterObtain.value = '';
    els.filterStation.value = '';
    applyFiltersAndRender();
  }

  function bindEvents() {
    els.tabList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tab-id]');
      if (!btn) return;
      switchTab(btn.dataset.tabId);
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
      state.obtainMethod = e.target.value;
      state.visibleLimit = PAGE_SIZE;
      applyFiltersAndRender();
    });

    els.filterStation.addEventListener('change', (e) => {
      state.craftStation = e.target.value;
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

    els.modalCloseBtn.addEventListener('click', closeDetailModal);
    els.detailModal.addEventListener('click', (e) => {
      if (e.target === els.detailModal) closeDetailModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !els.detailModal.classList.contains('hidden')) {
        closeDetailModal();
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

      // Pre-index all items for fast searching
      const allMap = new Map();
      let gIdx = 0;
      for (const sheet of data.modSheets || []) {
        for (const item of sheet.items || []) {
          item._modId = sheet.id;
          item._modName = sheet.name;
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
              item.enOriginal,
              item.notes,
              sheet.name,
            ].join(' ')
          );
          allMap.set(item._globalIndex, item);
        }
      }

      state.data = data;
      state.icons = icons;
      state.allItemsByGlobalIndex = allMap;

      const modCount = (data.installedMods || []).length;
      const itemCount = allMap.size;
      els.statBadge.textContent = `導入MOD ${modCount}件 / 収録アイテム ${itemCount}件`;
      els.updatedBadge.textContent = formatDate(data.updatedAt);

      buildTabs();
      switchTab(state.activeTab);
    } catch (err) {
      els.statBadge.textContent = '読み込みエラー';
      els.itemsContainer.innerHTML = `<div class="empty-state"><p class="empty-title">データを読み込めませんでした</p><p class="empty-desc">${escapeHtml(err.message)}</p></div>`;
    }
  }

  init();
})();

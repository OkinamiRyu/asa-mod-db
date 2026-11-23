/**
 * ASA_MOD_データベース - Googleスプレッドシート → GitHub 自動同期スクリプト
 *
 * 【仕組み】
 * スプレッドシートとこのGASは「完全非公開（自分だけ）」のまま、
 * シート内容を data/mods.json として GitHub リポジトリへ送信します。
 * 公開サイト側には Google アカウント情報やスプレッドシートIDは一切残りません。
 *
 * 【初回設定（スクリプトプロパティ）】
 * Apps Script エディタの左メニュー「プロジェクトの設定」→「スクリプト プロパティ」に以下を追加してください：
 *   - GITHUB_TOKEN  : GitHub の Fine-grained Personal Access Token（対象リポジトリの Contents: Read and write）
 *   - GITHUB_OWNER  : OkinamiRyu
 *   - GITHUB_REPO   : asa-mod-db
 *   - GITHUB_BRANCH : main（省略可・デフォルト main）
 */

const CONFIG = {
  INSTALLED_MODS_SHEET: '導入中mod一覧',
  // DBサイトに含めない管理用シート名（先頭が「_」または「下書き」のシートも自動除外されます）
  EXCLUDED_SHEETS: ['AIへの指示', '導入中mod一覧', 'アイテム一覧', '情報源'],
  TARGET_FILE_PATH: 'data/mods.json',
};

/**
 * スプレッドシートを開いたときに上部メニューを追加
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('DBサイト更新')
    .addItem('GitHubへ反映する', 'syncToGitHubManual')
    .addToUi();
}

/**
 * メニューから手動実行する用（完了ダイアログ表示あり）
 */
function syncToGitHubManual() {
  const ui = SpreadsheetApp.getUi();
  try {
    const summary = syncToGitHub();
    ui.alert(
      '更新完了',
      `GitHub への反映が完了しました！\n\n` +
        `・導入中MOD: ${summary.installedCount} 件\n` +
        `・MODシート: ${summary.sheetSummary}\n` +
        `・合計アイテム: ${summary.totalItems} 件\n\n` +
        `※ GitHub Pages への反映には通常 30秒〜1分ほどかかります。`,
      ui.ButtonSet.OK
    );
  } catch (err) {
    ui.alert('更新エラー', String(err.message || err), ui.ButtonSet.OK);
    throw err;
  }
}

/**
 * 定期トリガーからも呼べる本体関数
 */
function syncToGitHub() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('GITHUB_TOKEN');
  const owner = props.getProperty('GITHUB_OWNER');
  const repo = props.getProperty('GITHUB_REPO');
  const branch = props.getProperty('GITHUB_BRANCH') || 'main';

  if (!token || !owner || !repo) {
    throw new Error(
      'スクリプトプロパティ（GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO）が設定されていません。'
    );
  }

  const payloadData = buildDatabaseJson_();
  const jsonStr = JSON.stringify(payloadData, null, 2);

  pushFileToGitHub_({
    token,
    owner,
    repo,
    branch,
    path: CONFIG.TARGET_FILE_PATH,
    contentStr: jsonStr,
    commitMessage: `Update mods.json (${payloadData.updatedAt})`,
  });

  const totalItems = payloadData.modSheets.reduce((sum, s) => sum + s.items.length, 0);
  const sheetSummary = payloadData.modSheets.map((s) => `${s.name}(${s.items.length})`).join(', ');
  Logger.log(`Synced to GitHub: installed=${payloadData.installedMods.length}, totalItems=${totalItems}`);

  return {
    installedCount: payloadData.installedMods.length,
    totalItems,
    sheetSummary: sheetSummary || 'なし',
  };
}

/**
 * スプレッドシートの全シートを読み込み、サイト用JSONオブジェクトを構築
 */
function buildDatabaseJson_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();

  let installedMods = [];
  const modSheets = [];

  for (const sheet of sheets) {
    const name = sheet.getName();

    if (name === CONFIG.INSTALLED_MODS_SHEET) {
      installedMods = parseInstalledModsSheet_(sheet);
      continue;
    }

    if (
      CONFIG.EXCLUDED_SHEETS.includes(name) ||
      name.startsWith('_') ||
      name.startsWith('下書き')
    ) {
      continue;
    }

    const parsed = parseModItemSheet_(sheet);
    if (parsed.items.length > 0) {
      modSheets.push({
        id: name,
        name: name,
        sheetType: parsed.sheetType,
        itemCount: parsed.items.length,
        items: parsed.items,
      });
    }
  }

  return {
    updatedAt: new Date().toISOString(),
    installedMods: installedMods,
    modSheets: modSheets,
  };
}

/**
 * 「導入中mod一覧」シートをパース
 */
function parseInstalledModsSheet_(sheet) {
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];

  const result = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const modName = (row[0] || '').trim();
    if (!modName) continue;

    const description = (row[1] || '').trim();
    const curseForgeId = (row[2] || '').trim();
    const notes = (row[3] || '').trim();
    const urlMatch = notes.match(/https:\/\/www\.curseforge\.com\/\S+/);

    result.push({
      name: modName,
      description: description,
      curseForgeId: curseForgeId,
      curseForgeUrl: urlMatch ? urlMatch[0] : '',
      notes: notes,
    });
  }
  return result;
}

/**
 * 各MODシートをヘッダー名ベースで柔軟にパース（アイテム / 生物 / コスメティックの3タイプ対応）
 */
function parseModItemSheet_(sheet) {
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return { sheetType: 'item', items: [] };

  const headers = values[0].map((h) => String(h || '').trim());
  const findCol = (candidates) => {
    for (let idx = 0; idx < headers.length; idx++) {
      for (const cand of candidates) {
        if (headers[idx].includes(cand)) return idx;
      }
    }
    return -1;
  };

  // 共通列
  const cImg = findCol(['画像']);
  const cEn = findCol(['英語名']);
  const cJa = findCol(['日本語名']);
  const cDesc = findCol(['説明（日本語）', '説明']);
  const cCat = findCol(['分類', 'カテゴリ']);
  const cOrig = findCol(['英語原文']);
  const cNote = findCol(['備考']);

  // アイテム系
  const cObt = findCol(['入手方法']);
  const cDino = findCol(['恐竜名']);
  const cStat = findCol(['作る場所', 'クラフト']);
  const cTool = findCol(['使う道具']);
  const cHarv = findCol(['採取元']);
  const cMat = findCol(['必要素材', '素材']);

  // 生物系
  const cTaming = findCol(['テイム方法']);
  const cFood = findCol(['好物', '餌']);
  const cHabitat = findCol(['生息地', 'スポーン']);
  const cSaddle = findCol(['サドル', '騎乗']);
  const cAbility = findCol(['特殊能力', '用途']);

  // コスメティック系
  const cApplyTarget = findCol(['適用対象']);
  const cApplyMethod = findCol(['適用方法']);

  // 英語名も日本語名もヘッダーに無ければMODアイテムシートではないとみなす
  if (cEn === -1 && cJa === -1) return { sheetType: 'item', items: [] };

  // シート種別を自動判定
  let sheetType = 'item';
  if (cTaming !== -1 || cFood !== -1 || cHabitat !== -1 || cSaddle !== -1) {
    sheetType = 'creature';
  } else if (cApplyTarget !== -1 || cApplyMethod !== -1) {
    sheetType = 'cosmetic';
  }

  const items = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const gc = (ci) => (ci >= 0 && ci < row.length ? String(row[ci] || '').trim() : '');

    const enName = gc(cEn);
    const jaName = gc(cJa);
    if (!enName && !jaName) continue;

    const notes = gc(cNote);
    const assetMatch = notes.match(/([A-Za-z0-9_]+)\.uasset/);

    const entry = {
      index: items.length + 1,
      image: gc(cImg),
      enName: enName,
      jaName: jaName,
      description: gc(cDesc),
      category: gc(cCat),
      obtainMethod: gc(cObt),
      dinoName: gc(cDino),
      craftStation: gc(cStat),
      toolUsed: gc(cTool),
      harvestSource: gc(cHarv),
      materials: gc(cMat),
      enOriginal: gc(cOrig),
      notes: notes,
      assetName: assetMatch ? assetMatch[1] : '',
    };

    // 生物系・コスメティック系項目は値がある場合のみ付与（JSON軽量化）
    const tamingMethod = gc(cTaming);
    const favoriteFood = gc(cFood);
    const habitat = gc(cHabitat);
    const saddleRide = gc(cSaddle);
    const specialAbility = gc(cAbility);
    const applyTarget = gc(cApplyTarget);
    const applyMethod = gc(cApplyMethod);

    if (tamingMethod) entry.tamingMethod = tamingMethod;
    if (favoriteFood) entry.favoriteFood = favoriteFood;
    if (habitat) entry.habitat = habitat;
    if (saddleRide) entry.saddleRide = saddleRide;
    if (specialAbility) entry.specialAbility = specialAbility;
    if (applyTarget) entry.applyTarget = applyTarget;
    if (applyMethod) entry.applyMethod = applyMethod;

    items.push(entry);
  }

  return { sheetType, items };
}

/**
 * GitHub Contents API でファイルを更新（なければ新規作成）
 */
function pushFileToGitHub_({ token, owner, repo, branch, path, contentStr, commitMessage }) {
  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // 既存ファイルの SHA を取得
  let existingSha = null;
  const getRes = UrlFetchApp.fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
    method: 'get',
    headers: headers,
    muteHttpExceptions: true,
  });

  const getCode = getRes.getResponseCode();
  if (getCode === 200) {
    existingSha = JSON.parse(getRes.getContentText()).sha;
  } else if (getCode !== 404) {
    throw new Error(`GitHub 取得エラー (HTTP ${getCode}): ${getRes.getContentText()}`);
  }

  // UTF-8 を正しく Base64 エンコード
  const encodedContent = Utilities.base64Encode(
    Utilities.newBlob(contentStr, 'application/json').getBytes()
  );

  const body = {
    message: commitMessage,
    content: encodedContent,
    branch: branch,
    committer: {
      name: owner,
      email: `${owner}@users.noreply.github.com`,
    },
    author: {
      name: owner,
      email: `${owner}@users.noreply.github.com`,
    },
  };
  if (existingSha) {
    body.sha = existingSha;
  }

  const putRes = UrlFetchApp.fetch(apiUrl, {
    method: 'put',
    contentType: 'application/json',
    headers: headers,
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });

  const putCode = putRes.getResponseCode();
  if (putCode !== 200 && putCode !== 201) {
    throw new Error(`GitHub 更新エラー (HTTP ${putCode}): ${putRes.getContentText()}`);
  }
}

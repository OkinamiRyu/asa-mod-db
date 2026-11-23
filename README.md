# ASA_MOD_データベース

ARK: Survival Ascended (ASA) 導入 MOD の日本語アイテム検索データベースです。

- **公開URL**: https://okinamiryu.github.io/asa-mod-db/
- Google スプレッドシートと GAS は**完全非公開**のまま、GAS から `data/mods.json` を GitHub へ送信して更新する構成です。

---

## 初回セットアップ（スプレッドシートからの自動反映）

### 1. GitHub でトークン（Fine-grained PAT）を発行
1. GitHub（`OkinamiRyu`）の **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token** を開く
2. **Repository access** で `Only select repositories` → `asa-mod-db` を選択
3. **Permissions → Repository permissions → Contents** を `Read and write` に設定して発行し、トークン文字列をコピー

### 2. スプレッドシートに GAS を貼り付け
1. 対象のスプレッドシートを開き、上部メニュー **拡張機能 → Apps Script** を開く
2. 既存コードを消して、このリポジトリの `gas/sync_to_github.gs` の中身をすべて貼り付けて保存
3. 左メニュー **プロジェクトの設定（歯車アイコン）→ スクリプト プロパティ** に以下を追加：

| プロパティ | 値 |
| :--- | :--- |
| `GITHUB_TOKEN` | 手順1で発行したトークン |
| `GITHUB_OWNER` | `OkinamiRyu` |
| `GITHUB_REPO` | `asa-mod-db` |

### 3. 実行テスト
- スプレッドシートを再読み込みすると、上部メニューに **「DBサイト更新」→「GitHubへ反映する」** が表示されます。
- 初回のみ Google の承認画面が出るので許可して実行すると、`data/mods.json` が更新され、約30秒〜1分で公開サイトに反映されます。
- 自動更新したい場合は、Apps Script 左メニューの **トリガー（時計アイコン）** から `syncToGitHub` を「時間主導型（例：1時間ごと）」で登録できます。

---

## 新しい MOD を追加するとき

1. スプレッドシートに **MOD 名の新しいシート** を追加（1行目に `英語名`・`日本語名`・`説明（日本語）`・`分類` などの見出しを記載）
   - ※先頭が `_` または `下書き` で始まるシートはサイトに公開されません。
2. スプレッドシートの **「DBサイト更新」→「GitHubへ反映する」** をクリック
3. 自動的にサイト上に新しい MOD タブと「全MOD横断」検索タブが追加されます（HTML の修正は不要です）。

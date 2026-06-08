# 📻 Podcast お便りフォーム

GitHub Pages でホスティングする静的なアンケートフォーム。
送信内容は Google Apps Script(GAS)経由で Google スプレッドシートに蓄積されます。

```
[ユーザー] → [GitHub Pages の HTMLフォーム] → POST → [GAS Web App] → [Google スプレッドシート]
```

## 収集する項目

| 項目 | 必須 | 説明 |
|------|------|------|
| お名前 / ニックネーム | ✅ | ラジオネームなど |
| メールアドレス | 任意 | 返信が必要な場合のみ |
| 感想・お便り | ✅ | 自由記述(最大2000文字) |

---

## セットアップ手順

### 1. スプレッドシートと Apps Script を用意する

1. データを貯めたい **Google スプレッドシート**を新規作成して開く
2. メニューの **拡張機能 → Apps Script** を開く
3. エディタの `Code.gs` の中身を、本リポジトリの [`gas/Code.gs`](./gas/Code.gs) の内容に置き換えて保存

### 2. Web App としてデプロイする

1. Apps Script 画面右上の **デプロイ → 新しいデプロイ**
2. 歯車アイコン → 種類: **ウェブアプリ** を選択
3. 設定:
   - **実行するユーザー**: 自分
   - **アクセスできるユーザー**: **全員**
4. **デプロイ** を押し、初回は権限を承認
5. 表示される **ウェブアプリの URL**(`https://script.google.com/macros/s/..../exec`)をコピー

> 動作確認: その URL をブラウザで開いて `{"result":"ok",...}` が出れば成功。

### 3. フォーム側に URL を設定する

[`script.js`](./script.js) の先頭を編集:

```js
const GAS_ENDPOINT = "https://script.google.com/macros/s/..../exec";
```

### 4. GitHub Pages で公開する

1. このフォルダを GitHub リポジトリにプッシュ
2. リポジトリの **Settings → Pages**
3. **Source** を `Deploy from a branch` にし、Branch を `main` / フォルダを `/ (root)` に設定して保存
4. 数分後に発行される `https://<ユーザー名>.github.io/<リポジトリ名>/` でフォームが公開される

---

## ローカルで確認する

```bash
# このフォルダで簡易サーバを起動
python3 -m http.server 8000
# ブラウザで http://localhost:8000 を開く
```

> GAS_ENDPOINT 未設定でも画面は表示されます(送信時に警告が出ます)。

---

## フォームの項目を変更したいとき

1. `index.html` … 入力欄(`<input>` / `<textarea>`)を追加・削除
2. `script.js` … `payload` に項目を追加し、必要なら `validate()` も更新
3. `gas/Code.gs` … `appendRow([...])` の列を合わせ、`getSheet_()` のヘッダー行も更新
4. **GAS を再デプロイ**(デプロイ → デプロイを管理 → 編集 → 新バージョン)

> ⚠ Code.gs を変更したら、必ず**新バージョンとして再デプロイ**しないと反映されません。

## 補足

- 送信は `Content-Type: text/plain` で行い、CORS プリフライトを回避しています。
- スパム対策が必要になったら、GAS 側にハニーポット項目や reCAPTCHA 検証を追加してください。
- 右上のボタンでライト/ダークを切り替えできます。初期状態は OS の設定に追従し、選択は `localStorage` に保存されます(描画前のインラインスクリプトでチラつきを防止)。

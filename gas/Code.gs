/**
 * Podcast お便りフォーム — Google Apps Script (Web App)
 *
 * 役割: GitHub Pages のフォームから送られてきた JSON を受け取り、
 *       スプレッドシートに1行ずつ追記する。
 *
 * セットアップ:
 *   1. 保存先にしたい Google スプレッドシートを開く
 *   2. 拡張機能 → Apps Script を開く
 *   3. このファイルの中身を Code.gs に貼り付けて保存
 *   4. 「デプロイ」→「新しいデプロイ」→ 種類: ウェブアプリ
 *        - 実行ユーザー: 自分
 *        - アクセスできるユーザー: 全員
 *   5. 発行された URL を script.js の GAS_ENDPOINT に貼る
 */

// 書き込み先シート名(無ければ自動作成)
const SHEET_NAME = "responses";

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); // 同時送信での行ズレを防ぐ

    const data = parseBody_(e);
    const name = sanitize_(data.name);
    const email = sanitize_(data.email);
    const message = sanitize_(data.message);

    if (!name || !message) {
      return json_({ result: "error", message: "name と message は必須です。" });
    }

    const sheet = getSheet_();
    sheet.appendRow([
      new Date(),                 // タイムスタンプ
      name,                       // お名前 / ニックネーム
      email,                      // メールアドレス(任意)
      message,                    // 感想・お便り
    ]);

    return json_({ result: "success" });
  } catch (err) {
    return json_({ result: "error", message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// ブラウザで URL を直接開いたときの確認用
function doGet() {
  return json_({ result: "ok", message: "Podcast form endpoint is alive." });
}

// --- helpers ---------------------------------------------------------------

function parseBody_(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (_) {
      // text/plain でない場合のフォールバック
    }
  }
  return (e && e.parameter) || {};
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["タイムスタンプ", "お名前", "メールアドレス", "感想・お便り"]);
  }
  return sheet;
}

function sanitize_(v) {
  if (v == null) return "";
  return String(v).trim().slice(0, 2000);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

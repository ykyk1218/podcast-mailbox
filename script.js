// ===========================================================================
//  設定:Google Apps Script(GAS)でデプロイした Web App の URL をここに貼る
//  例: "https://script.google.com/macros/s/AKfycb...../exec"
//  ※ README.md の手順どおりにデプロイすると取得できます。
// ===========================================================================
const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbwEq-ItuLhJpgY5MuxQbNAtx6b9-U7GAgotm3GlOhUC40O5h5QABoYVHl2jilDbsOA2KQ/exec";

const form = document.getElementById("survey-form");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submit-btn");
const counter = document.getElementById("counter");
const messageEl = document.getElementById("message");

// --- テーマ切り替え(2状態:システム追従 ⇄ 反対をピン留め)----------------
// 文言/挙動の方針は modern-web-guidance の dark-mode ガイドに準拠。
const themeMeta = document.querySelector('meta[name="color-scheme"]');
const themeToggle = document.getElementById("theme-toggle");

// localStorage は file:// の Safari 等で例外を投げることがあるため握りつぶす。
// 保存は「あくまでベストエフォート」。切り替え自体は保存に依存させない。
const themeStore = {
  get() { try { return localStorage.getItem("color-scheme"); } catch (e) { return null; } },
  set(v) { try { localStorage.setItem("color-scheme", v); } catch (e) {} },
  clear() { try { localStorage.removeItem("color-scheme"); } catch (e) {} },
};

function systemTheme() {
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(pinned) {
  if (pinned === "light" || pinned === "dark") {
    document.documentElement.dataset.theme = pinned;
    themeMeta.content = pinned;
    themeStore.set(pinned);
  } else {
    // システム追従に戻す
    delete document.documentElement.dataset.theme;
    themeMeta.content = "light dark";
    themeStore.clear();
  }
}

themeToggle.addEventListener("click", () => {
  // 現在の実効テーマは DOM から判定(localStorage に依存しない)
  const effective = document.documentElement.dataset.theme || systemTheme();
  const next = effective === "dark" ? "light" : "dark";
  // 反対の指定がシステム設定と一致するなら、ピン留めせず追従に戻す
  applyTheme(next === systemTheme() ? null : next);
});

// 文字数カウンター(更新のたびにぴょこっと跳ねさせる)
messageEl.addEventListener("input", () => {
  counter.textContent = String(messageEl.value.length);
  // 連続入力でも毎回アニメを出すため、一度外して reflow を挟んでから付け直す
  counter.classList.remove("bump");
  void counter.offsetWidth; // 強制リフロー:直前の remove を確定させる
  counter.classList.add("bump");
});
counter.addEventListener("animationend", () => counter.classList.remove("bump"));

// --- アクセシビリティ:aria-invalid を :user-invalid の状態に同期する ----
// ネイティブの :user-invalid は ARIA を自動更新しないため、手動で橋渡しする。
const supportsUserInvalid = CSS.supports("selector(:user-invalid)");

function syncAria(el) {
  if (!el || !el.matches || !el.matches("input, textarea")) return;
  // .invalid(JS判定)か :user-invalid(ネイティブ)のどちらかで invalid 扱い
  const invalid =
    el.classList.contains("invalid") ||
    (supportsUserInvalid && el.matches(":user-invalid"));
  el.setAttribute("aria-invalid", invalid ? "true" : "false");
}

// blur で表示、input で(誤りが直れば)解除
form.addEventListener("blur", (e) => syncAria(e.target), true);
form.addEventListener("input", (e) => {
  // 送信時に付けた .invalid は、入力が直ったら外す
  if (e.target.classList && e.target.classList.contains("invalid")) {
    if (e.target.checkValidity()) e.target.classList.remove("invalid");
  }
  syncAria(e.target);
});

// --- バリデーション -------------------------------------------------------
// 文言は HTML に静的に置き、表示/非表示は CSS(:user-invalid / .invalid)に任せる。
// JS はエラー状態の付与と aria 同期のみ担当する。
function setInvalid(name, isInvalid) {
  const field = form.elements[name];
  if (!field) return;
  if (isInvalid) {
    // 連続して同じ項目がエラーでも、毎回シェイクを再生させる
    field.classList.remove("invalid");
    void field.offsetWidth; // 強制リフローで remove を確定
    field.classList.add("invalid");
  } else {
    field.classList.remove("invalid");
  }
  field.setAttribute("aria-invalid", isInvalid ? "true" : "false");
}

function validate() {
  let ok = true;
  const name = form.elements.name.value.trim();
  const email = form.elements.email.value.trim();
  const message = form.elements.message.value.trim();

  const nameBad = !name;
  // メールは任意。入力時のみ厳しめにチェック(ネイティブ判定は緩いため)
  const emailBad = Boolean(email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const messageBad = !message;

  setInvalid("name", nameBad);
  setInvalid("email", emailBad);
  setInvalid("message", messageBad);

  ok = !(nameBad || emailBad || messageBad);

  // 最初のエラー項目へフォーカスを移す
  if (!ok) {
    const first = nameBad ? "name" : emailBad ? "email" : "message";
    form.elements[first].focus();
  }
  return ok;
}

// --- 送信 -----------------------------------------------------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "";
  statusEl.className = "status";

  if (!validate()) return;

  if (GAS_ENDPOINT.startsWith("PASTE_")) {
    statusEl.textContent = "⚠ 送信先(GAS_ENDPOINT)が未設定です。script.js を確認してください。";
    statusEl.classList.add("ng");
    return;
  }

  const payload = {
    name: form.elements.name.value.trim(),
    email: form.elements.email.value.trim(),
    message: form.elements.message.value.trim(),
  };

  setLoading(true);
  try {
    const res = await fetch(GAS_ENDPOINT, {
      method: "POST",
      // text/plain にすることで CORS プリフライト(OPTIONS)を回避する
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.result === "success") {
      showThanks();
    } else {
      throw new Error(data.message || "送信に失敗しました。");
    }
  } catch (err) {
    statusEl.textContent = "送信に失敗しました。時間をおいて再度お試しください。";
    statusEl.classList.add("ng");
    console.error(err);
  } finally {
    setLoading(false);
  }
});

function setLoading(loading) {
  submitBtn.disabled = loading;
  submitBtn.classList.toggle("loading", loading);
}

function showThanks() {
  document.body.classList.add("sent");
  form.reset();
  counter.textContent = "0";
  form.innerHTML = `
    <div class="thanks" style="text-align:center; padding:8px 0 4px;">
      <div class="thanks__icon">
        <svg class="thanks__check" viewBox="0 0 52 52" role="img"
             aria-label="送信完了" xmlns="http://www.w3.org/2000/svg">
          <circle class="thanks__check-disc"  cx="26" cy="26" r="24" />
          <circle class="thanks__check-pulse" cx="26" cy="26" r="24" />
          <circle class="thanks__check-ring"  cx="26" cy="26" r="24" />
          <path   class="thanks__check-mark" d="M15 27 l7.5 7.5 L38 18" />
        </svg>
      </div>
      <h2 class="thanks__title">送信ありがとうございました!</h2>
      <p class="thanks__text">
        いただいたお便りは番組内で紹介させていただくことがあります。
      </p>
    </div>`;
}

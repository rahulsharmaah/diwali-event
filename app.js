const PRICE = 250;
const MAX = 15;
const UPI_ID = "sharmaayush6872@okicici";
const UPI_NAME = "Diwali Event";
const SAVED = "diwaliRegistration";

const $ = (id) => document.getElementById(id);
const form = $("regForm");
const guestsEl = $("guests");
const tpl = $("guestTpl");
const btn = $("submitBtn");
const [minusBtn, plusBtn] = form.querySelectorAll(".stepper button");

let count = 1;
const inr = (n) => "₹" + n.toLocaleString("en-IN");
const BOOK_LABEL = () => `Book & pay ${inr(count * PRICE)}`;

// Main person counts as #1; rows are only for the other people.
function render() {
  $("countOut").textContent = count;
  minusBtn.disabled = count <= 1;
  plusBtn.disabled = count >= MAX;
  $("totalAmt").textContent = inr(count * PRICE);
  $("totalCalc").textContent = `${count} × ${inr(PRICE)}`;
  btn.textContent = BOOK_LABEL();

  const want = count - 1;
  while (guestsEl.children.length > want) guestsEl.lastElementChild.remove();
  while (guestsEl.children.length < want) {
    const row = tpl.content.firstElementChild.cloneNode(true);
    row.querySelector(".num").textContent = guestsEl.children.length + 2;
    guestsEl.appendChild(row);
  }
}

form.querySelectorAll("[data-step]").forEach((b) =>
  b.addEventListener("click", () => {
    count = Math.min(MAX, Math.max(1, count + Number(b.dataset.step)));
    render();
  })
);

document.addEventListener("input", (e) => e.target.classList?.remove("invalid"));

function showError(el, msg) {
  el.textContent = msg;
  el.hidden = false;
}

function collect() {
  const fd = new FormData(form);
  const v = (k) => String(fd.get(k) || "").trim();
  return {
    name: v("name"),
    email: v("email").toLowerCase(),
    phone: v("phone").replace(/[\s-]/g, ""),
    age: Number(v("age")),
    food: v("food"),
    ethnic: v("ethnic"),
    website: v("website"),
    guests: [...guestsEl.children].map((row) => ({
      name: row.querySelector(".g-name").value.trim(),
      age: Number(row.querySelector(".g-age").value),
      food: row.querySelector(".g-food").value,
    })),
  };
}

function validate(d) {
  const bad = [];
  const mark = (el) => { el.classList.add("invalid"); bad.push(el); };
  if (d.name.length < 2) mark(form.name);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) mark(form.email);
  if (!/^(\+?91)?[6-9]\d{9}$/.test(d.phone)) mark(form.phone);
  if (!(d.age >= 1 && d.age <= 120)) mark(form.age);
  [...guestsEl.children].forEach((row, i) => {
    const g = d.guests[i];
    if (g.name.length < 1) mark(row.querySelector(".g-name"));
    if (!(Number.isFinite(g.age) && g.age >= 0 && g.age <= 120) || row.querySelector(".g-age").value === "") mark(row.querySelector(".g-age"));
  });
  if (bad.length) bad[0].focus();
  return bad.length === 0;
}

// --- Payment step ---------------------------------------------------------

const upiQuery = (reg) =>
  new URLSearchParams({ pa: UPI_ID, pn: UPI_NAME, am: reg.total.toFixed(2), cu: "INR", tn: `Diwali ${reg.id}` }).toString();
const upiLink = (reg) => "upi://pay?" + upiQuery(reg);

const isAndroid = /Android/i.test(navigator.userAgent);
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isPhone = () => isAndroid || isIOS;

// One button per app. Android opens the exact app via an intent (Play Store if
// missing); iOS uses each app’s own URL scheme since iOS has no UPI chooser.
const UPI_APPS = [
  { name: "Google Pay", pkg: "com.google.android.apps.nbu.paisa.user", ios: "gpay://upi/pay?", color: "#4285f4" },
  { name: "PhonePe", pkg: "com.phonepe.app", ios: "phonepe://pay?", color: "#5f259f" },
  { name: "Paytm", pkg: "net.one97.paytm", ios: "paytmmp://pay?", color: "#00baf2" },
];
function appLink(app, reg) {
  const q = upiQuery(reg);
  if (isAndroid) return `intent://pay?${q}#Intent;scheme=upi;package=${app.pkg};end`;
  if (isIOS) return app.ios + q;
  return upiLink(reg);
}

function remember(reg) {
  try { localStorage.setItem(SAVED, JSON.stringify(reg)); } catch {}
}
function forget() {
  try { localStorage.removeItem(SAVED); } catch {}
}

function showView(which) {
  form.hidden = which !== "form";
  $("payView").hidden = which !== "pay";
  $("doneView").hidden = which !== "done";
  $("formCard").scrollIntoView({ behavior: "smooth", block: "start" });
}

function showPay(reg) {
  const link = upiLink(reg);
  document.querySelectorAll(".js-regid").forEach((el) => (el.textContent = reg.id));
  $("payHello").textContent = `Almost there, ${reg.name.split(" ")[0]}!`;
  $("payAmt").textContent = inr(reg.total);
  $("payFor").textContent = `${reg.count} ${reg.count === 1 ? "person" : "people"} × ${inr(PRICE)}`;
  $("upiId").textContent = UPI_ID;
  $("upiApps").innerHTML =
    UPI_APPS.map((a) => `<a class="app" style="--app:${a.color}" href="${appLink(a, reg)}"><span class="dot"></span>${a.name}</a>`).join("") +
    `<a class="app other" href="${link}"><span class="dot"></span>${isAndroid ? "Any UPI app" : "Other UPI app"}</a>`;
  // Phones pay from the app buttons; other screens get the QR straight away.
  $("qrDetails").open = !isPhone();

  const box = $("qr");
  box.innerHTML = "";
  if (window.qrcode) {
    const qr = window.qrcode(0, "M");
    qr.addData(link);
    qr.make();
    box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0 });
  }
  showView("pay");
}

function showDone(reg) {
  document.querySelectorAll(".js-regid").forEach((el) => (el.textContent = reg.id));
  $("doneText").textContent =
    `${reg.name}, your group of ${reg.count} is booked. We have your payment of ${inr(reg.total)} and will confirm it shortly.`;
  showView("done");
}

$("copyUpi").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(UPI_ID);
    $("copyUpi").textContent = "Copied";
    setTimeout(() => ($("copyUpi").textContent = "Copy"), 1500);
  } catch {}
});

function startOver() {
  forget();
  form.reset();
  count = 1;
  render();
  showView("form");
}
$("newReg").addEventListener("click", startOver);
$("newReg2").addEventListener("click", startOver);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = $("formError");
  errEl.hidden = true;
  const data = collect();
  if (!validate(data)) return showError(errEl, "Please fill the highlighted fields.");

  btn.disabled = true;
  btn.textContent = "Booking…";
  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || "Something went wrong. Please try again.");

    const reg = { ...out, status: "unpaid" };
    remember(reg);
    showPay(reg);
    // Android: jump straight into the system chooser listing every UPI app.
    // iOS has no chooser, so the app buttons on the pay screen do the job.
    if (isAndroid) window.location.href = upiLink(reg);
  } catch (err) {
    showError(errEl, err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = BOOK_LABEL();
  }
});

$("claimForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = $("payError");
  errEl.hidden = true;
  const input = e.target.utr;
  const utr = input.value.replace(/\s/g, "");
  if (!/^[A-Za-z0-9]{8,35}$/.test(utr)) {
    input.classList.add("invalid");
    input.focus();
    return showError(errEl, "Enter the transaction ID shown in your UPI app after paying.");
  }

  let reg;
  try { reg = JSON.parse(localStorage.getItem(SAVED)); } catch {}
  if (!reg) return showError(errEl, "Registration not found on this device. Please contact the organisers.");

  const claimBtn = $("claimBtn");
  claimBtn.disabled = true;
  try {
    const res = await fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reg.id, email: reg.email, utr }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || "Could not save. Please try again.");
    reg.status = out.status;
    remember(reg);
    showDone(reg);
  } catch (err) {
    showError(errEl, err.message);
  } finally {
    claimBtn.disabled = false;
  }
});

// Resume where this device left off (e.g. after returning from the UPI app).
try {
  const saved = JSON.parse(localStorage.getItem(SAVED));
  if (saved?.id) saved.status === "unpaid" ? showPay(saved) : showDone(saved);
} catch {}

render();

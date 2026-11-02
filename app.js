const PRICE = 250;
const MAX = 15;

const form = document.getElementById("regForm");
const guestsEl = document.getElementById("guests");
const tpl = document.getElementById("guestTpl");
const countOut = document.getElementById("countOut");
const totalAmt = document.getElementById("totalAmt");
const totalCalc = document.getElementById("totalCalc");
const errEl = document.getElementById("formError");
const btn = document.getElementById("submitBtn");
const [minusBtn, plusBtn] = form.querySelectorAll(".stepper button");

let count = 1;
const inr = (n) => "₹" + n.toLocaleString("en-IN");

// Main person counts as #1; rows are only for the other people.
function render() {
  countOut.textContent = count;
  minusBtn.disabled = count <= 1;
  plusBtn.disabled = count >= MAX;
  totalAmt.textContent = inr(count * PRICE);
  totalCalc.textContent = `${count} × ${inr(PRICE)}`;

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

form.addEventListener("input", (e) => e.target.classList.remove("invalid"));

function showError(msg) {
  errEl.textContent = msg;
  errEl.hidden = false;
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

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errEl.hidden = true;
  const data = collect();
  if (!validate(data)) {
    showError("Please fill the highlighted fields.");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Carving…";
  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || "Something went wrong. Please try again.");

    document.getElementById("regId").textContent = out.id;
    document.getElementById("doneText").textContent =
      `${out.name}, your clan of ${out.count} is registered. Entry total ${inr(out.total)}.`;
    form.hidden = true;
    document.getElementById("doneView").hidden = false;
    document.getElementById("formCard").scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Carve my name in stone";
  }
});

render();

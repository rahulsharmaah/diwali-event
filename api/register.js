import { addRegistration } from "./_store.js";
import { summarize, FOODS, DRINKS, MIN_DRINKING_AGE } from "../pricing.js";

const MAX = 15;

const clean = (s, n = 80) => String(s ?? "").trim().replace(/\s+/g, " ").slice(0, n);
const validAge = (a, min) => Number.isInteger(a) && a >= min && a <= 120;

function makeId() {
  const abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return "DW-" + s;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  // Honeypot: bots fill hidden fields, humans don't.
  if (b.website) return res.status(400).json({ error: "Invalid submission." });

  const name = clean(b.name);
  const email = clean(b.email, 120).toLowerCase();
  const phone = String(b.phone ?? "").replace(/[\s-]/g, "");
  const age = Number(b.age);
  const food = FOODS.includes(b.food) ? b.food : null;
  const drinks = DRINKS.includes(b.drinks) ? b.drinks : "soft";
  const ethnic = b.ethnic === "yes" ? "yes" : b.ethnic === "no" ? "no" : null;
  const rawGuests = Array.isArray(b.guests) ? b.guests : [];

  if (name.length < 2) return res.status(400).json({ error: "Please enter your name." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Please enter a valid email." });
  if (!/^(\+?91)?[6-9]\d{9}$/.test(phone)) return res.status(400).json({ error: "Please enter a valid 10-digit mobile number." });
  if (!validAge(age, 1)) return res.status(400).json({ error: "Please enter a valid age." });
  if (!food || !ethnic) return res.status(400).json({ error: "Please choose food and ethnic wear." });
  if (drinks === "alcohol" && age < MIN_DRINKING_AGE) return res.status(400).json({ error: `Alcoholic drinks are only for guests aged ${MIN_DRINKING_AGE}+.` });
  if (rawGuests.length > MAX - 1) return res.status(400).json({ error: `Maximum ${MAX} people per registration.` });

  const guests = [];
  for (const g of rawGuests) {
    const gName = clean(g?.name);
    const gAge = Number(g?.age);
    if (!gName || !validAge(gAge, 0) || !FOODS.includes(g?.food)) {
      return res.status(400).json({ error: "Please complete name and age for every person." });
    }
    const gDrinks = DRINKS.includes(g?.drinks) ? g.drinks : "soft";
    if (gDrinks === "alcohol" && gAge < MIN_DRINKING_AGE) {
      return res.status(400).json({ error: `Alcoholic drinks are only for guests aged ${MIN_DRINKING_AGE}+.` });
    }
    guests.push({ name: gName, age: gAge, food: g.food, drinks: gDrinks });
  }

  const count = guests.length + 1;
  const rec = {
    id: makeId(),
    name, email, phone, age, food, drinks, ethnic,
    guests,
    count,
    total: summarize([{ food, drinks }, ...guests]).total,
    payment: { status: "unpaid" },
    createdAt: new Date().toISOString(),
  };

  try {
    const saved = await addRegistration(rec);
    if (!saved) return res.status(409).json({ error: "This email is already registered." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Could not save right now. Please try again." });
  }

  return res.status(201).json({ id: rec.id, name, email, count, total: rec.total });
}

// Ticket pricing, shared by the page (app.js) and the server (api/register.js)
// so the amount shown always matches the amount charged.
export const PRICES = { veg: 250, nonveg: 350, alcohol: 150 };
export const FOODS = ["veg", "nonveg"];
export const DRINKS = ["soft", "alcohol"];
export const MIN_DRINKING_AGE = 18;

export const personPrice = (p) => (PRICES[p.food] || 0) + (p.drinks === "alcohol" ? PRICES.alcohol : 0);

export function summarize(people) {
  const s = { total: 0, veg: 0, nonveg: 0, alcohol: 0 };
  for (const p of people) {
    s.total += personPrice(p);
    if (p.food === "nonveg") s.nonveg++;
    else s.veg++;
    if (p.drinks === "alcohol") s.alcohol++;
  }
  return s;
}

const inr = (n) => "₹" + n.toLocaleString("en-IN");

// e.g. "2 veg × ₹250 + 1 non-veg × ₹350 + 1 drinks × ₹150"
export function priceLine(people) {
  const s = summarize(people);
  return [
    s.veg && `${s.veg} veg × ${inr(PRICES.veg)}`,
    s.nonveg && `${s.nonveg} non-veg × ${inr(PRICES.nonveg)}`,
    s.alcohol && `${s.alcohol} drinks × ${inr(PRICES.alcohol)}`,
  ].filter(Boolean).join(" + ");
}

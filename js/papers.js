import { HAND } from './mcq_hand_data.js?v=career1';
import { FAM } from './mcq_family_data.js?v=walk1';
import { drawExam } from './exam_bank.js?v=exam1';

function rowsFor(id) {
  const fam = (FAM.map && FAM.map[id]) || 'office';
  const rows = FAM.family && FAM.family[fam];
  return rows && rows.length >= 5 ? rows : (FAM.family && FAM.family.office) || [];
}
function salt(id) {
  const k = 'sansar.iv.' + (id || 'x');
  let n = 0;
  try {
    n = parseInt(sessionStorage.getItem(k) || '0', 10) || 0;
    sessionStorage.setItem(k, String((n + 1) % 97));
  } catch (e) { n = 0; }
  return n;
}
function pin(rows, out, re) {
  const hit = rows.find((r) => re.test(r.q));
  if (hit && out.indexOf(hit) < 0) out[0] = hit;
}
export function jobPaper(id) {
  const rows = rowsFor(id);
  const n = salt(id);
  const out = [];
  for (let i = 0; i < 3 && i < rows.length; i++) out.push(rows[(n + i) % rows.length]);
  if (id === 'teller') pin(rows, out, /cash drawer/i);
  if (id === 'fpa-an' || id === 'analyst') pin(rows, out, /15%/);
  if (id === 'nurse' || id === 'med-nurse') pin(rows, out, /two patients/i);
  if (id === 'dev' || id === 'it-dev') pin(rows, out, /production/i);
  return out;
}
export function examPaper(id, seen, rng) {
  const paper = drawExam(id || 'College year', seen || [], rng || Math.random, 0);
  if (paper.length >= 3) return paper.map((item) => ({ id: item.id, q: item.q, opts: item.opts.map((o) => ({ t: o.t, k: o.ok ? 'best' : 'weak' })) }));
  const rows = HAND.exam && (HAND.exam[id] || HAND.exam['College year']);
  if (rows && rows.length >= 3) return rows.slice(0, 3);
  return jobPaper(id || 'clerk');
}
export function bankQuestions() {
  const out = { job: {}, exam: {}, family: {} };
  for (const k of Object.keys(FAM.family || {})) out.family[k] = FAM.family[k].map((r) => r.q);
  for (const k of Object.keys(FAM.map || {})) out.job[k] = (FAM.family[FAM.map[k]] || []).map((r) => r.q);
  for (const k of Object.keys(HAND.exam || {})) out.exam[k] = HAND.exam[k].map((r) => r.q);
  return out;
}

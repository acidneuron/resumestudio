/* Resume Studio — core app logic */
"use strict";

/* ================= state ================= */
const STORAGE_KEY = "resume-studio-v1";

const EMPTY = {
  personal: { name: "", title: "", location: "", phone: "", email: "", website: "" },
  summary: "",
  work: [],
  education: [],
  skills: [],
  photo: null,
  template: "blue"
};

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(EMPTY);
    const parsed = JSON.parse(raw);
    const merged = structuredClone(EMPTY);
    merged.personal = { ...merged.personal, ...(parsed.personal || {}) };
    merged.summary = parsed.summary || "";
    merged.work = Array.isArray(parsed.work) ? parsed.work : [];
    merged.education = Array.isArray(parsed.education) ? parsed.education : [];
    merged.skills = Array.isArray(parsed.skills) ? parsed.skills : [];
    merged.photo = parsed.photo || null;
    merged.template = parsed.template || "blue";
    return merged;
  } catch {
    return structuredClone(EMPTY);
  }
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {
    console.warn("localStorage save failed (photo too big?):", e);
  }
}

/* ================= helpers ================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function setPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
  cur[parts[parts.length - 1]] = value;
}

let renderTimer = null;
function scheduleRender() {
  saveState();
  if (renderTimer) return;
  renderTimer = setTimeout(() => { renderTimer = null; render(); updateEntryLabels(); }, 60);
}

/* ================= preview rendering ================= */
const pageEl = $("#page");

function render() {
  const t = state.template;
  pageEl.className = `page t-${t}`;

  const p = state.personal;
  const contacts = [
    p.location, p.phone,
    p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : null,
    p.website ? `<a href="${esc(p.website)}">${esc(p.website.replace(/^https?:\/\/(www\.)?/, ""))}</a>` : null
  ].filter(Boolean);
  const contactHtml = contacts.join(t === "blue" ? `<span class="sep">|</span>` : `<span class="sep">•</span>`);
  const photoHtml = state.photo ? `<img class="rv-photo" src="${state.photo}" alt="photo">` : "";

  const workHtml = state.work.map(w => `
    <div class="rv-entry rv-tl-item">
      <div class="rv-tl-when">${esc(datesDisplay(w))}</div>
      <div class="rv-tl-what">
        <div class="rv-role">${esc(w.role)}</div>
        <div class="rv-org">${esc(w.org)}</div>
        ${w.details ? `<div class="rv-details">${esc(w.details)}</div>` : ""}
      </div>
    </div>`).join("");

  const eduHtml = state.education.map(w => `
    <div class="rv-entry rv-tl-item">
      <div class="rv-tl-when">${esc(datesDisplay(w))}</div>
      <div class="rv-tl-what">
        <div class="rv-role">${esc(w.role)}</div>
        <div class="rv-org">${esc(w.org)}</div>
        ${w.details ? `<div class="rv-details">${esc(w.details)}</div>` : ""}
      </div>`).join("");

  const skillsBlue = state.skills.map(s => `
    <div class="rv-skill">
      <div class="rv-skill-name">${esc(s.name)}</div>
      <div class="rv-skill-bar">
        <div class="rv-skill-track"><div class="rv-skill-fill" style="width:${Math.max(2, Math.min(100, +s.level || 0))}%"></div></div>
        <span class="rv-skill-val">${Math.min(100, +s.level || 0)}%</span>
      </div>
    </div>`).join("");

  const skillsAts = state.skills
    .map(s => esc(s.name) + (s.level ? ` (${Math.min(100, +s.level)}%)` : ""))
    .join("  •  ");

  pageEl.innerHTML = `
    <header class="rv-header">
      <div class="rv-name">${esc(p.name) || "Your Name"}</div>
      ${photoHtml}
      <div class="rv-title">${esc(p.title) || "Job Title"}</div>
      ${contactHtml ? `<div class="rv-contact">${contactHtml}</div>` : ""}
    </header>
    ${state.summary ? `<section class="rv-section rv-summary"><h3>Summary</h3><p>${esc(state.summary)}</p></section>` : ""}
    ${state.work.length ? `<section class="rv-section"><h3>Work Experience</h3><div class="rv-timeline">${workHtml}</div></section>` : ""}
    ${state.education.length ? `<section class="rv-section"><h3>Education &amp; Training</h3><div class="rv-timeline">${eduHtml}</div></section>` : ""}
    ${state.skills.length ? (t === "blue"
      ? `<section class="rv-section"><h3>Skills</h3><div class="rv-skills">${skillsBlue}</div></section>`
      : `<section class="rv-section"><h3>Skills</h3><div class="rv-skills-line">${skillsAts}</div></section>`) : ""}
  `;

  fitPage();
}

/* scale the 794px page to fit the pane width */
function fitPage() {
  const pane = $("#previewPane");
  const avail = pane.clientWidth - 48;
  const scale = Math.min(1, avail / 794);
  const el = $("#pageScale");
  el.style.transform = `scale(${scale})`;
  el.style.width = 794 * scale + "px";
  el.style.height = pageEl.offsetHeight * scale + "px";
}
window.addEventListener("resize", fitPage);

/* ================= form: flat fields ================= */
$$("[data-path]").forEach(el => {
  const path = el.dataset.path;
  const cur = path.split(".").reduce((o, k) => o?.[k], state);
  el.value = cur ?? "";
  el.addEventListener("input", () => {
    setPath(state, path, el.value);
    scheduleRender();
  });
});

$("#templateSelect").value = state.template;
$("#templateSelect").addEventListener("change", e => {
  state.template = e.target.value;
  scheduleRender();
});

/* ================= form: list entries ================= */
/* ---------- date helpers (month-granularity, "Present" supported) ---------- */
const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
function fmtMonth(v){
  if(!v) return "";
  const p = String(v).split("-");
  if(p.length < 2) return v;
  return MONTHS[+p[1]-1] + " " + p[0];
}
// Works for new structured entries ({start,end,present}) and legacy ones ({dates:"..."})
function datesDisplay(e){
  if(e.start || e.end){
    const s = fmtMonth(e.start);
    const en = e.present ? "PRESENT" : fmtMonth(e.end);
    if(s && en) return s + " – " + en;
    return s || en;
  }
  return e.dates || "";
}
function buildDatesRow(entry){
  const row = document.createElement("div");
  row.className = "f-row dates-row";
  const mkMonth = (field, labelText) => {
    const wrap = document.createElement("span");
    wrap.className = "date-field";
    const l = document.createElement("label");
    l.className = "date-lbl";
    l.textContent = labelText + " ";
    const inp = document.createElement("input");
    inp.type = "date";
    inp.min = "1980-01-01";
    // normalize legacy month-only values ("2024-01" → "2024-01-01") for the date input
    const raw = entry[field] || "";
    inp.value = /^\d{4}-\d{2}$/.test(raw) ? raw + "-01" : raw;
    if (inp.value !== raw) entry[field] = inp.value;
    inp.addEventListener("input", () => { entry[field] = inp.value; scheduleRender(); });
    l.appendChild(inp);
    wrap.appendChild(l);
    return { wrap, inp };
  };
  const s = mkMonth("start", "Start");
  const e = mkMonth("end", "End");
  const presWrap = document.createElement("label");
  presWrap.className = "present-toggle";
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = entry.present === true;
  cb.addEventListener("change", () => {
    entry.present = cb.checked;
    e.inp.disabled = cb.checked;
    scheduleRender();
  });
  presWrap.appendChild(cb);
  presWrap.appendChild(document.createTextNode("Present"));
  row.appendChild(s.wrap);
  row.appendChild(e.wrap);
  row.appendChild(presWrap);
  if(cb.checked) e.inp.disabled = true;
  return row;
}

function makeEntryCard(list, entry, index) {
  const card = document.createElement("div");
  card.className = "entry-card";
  card.dataset.list = list;
  card.dataset.index = index;

  const head = document.createElement("div");
  head.className = "entry-head";
  const label = document.createElement("span");
  label.className = "drag-label";
  head.appendChild(label);

  const mkBtn = (txt, title, cls, fn) => {
    const b = document.createElement("button");
    b.textContent = txt; b.title = title; if (cls) b.className = cls;
    b.addEventListener("click", fn);
    head.appendChild(b);
    return b;
  };

  const arr = state[list];
  mkBtn("↑", "Move up", null, () => {
    if (index === 0) return;
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    rebuildList(list); scheduleRender();
  });
  mkBtn("↓", "Move down", null, () => {
    if (index >= arr.length - 1) return;
    [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
    rebuildList(list); scheduleRender();
  });
  mkBtn("✕", "Remove", "del", () => {
    arr.splice(index, 1);
    rebuildList(list); scheduleRender();
  });
  card.appendChild(head);

  if (list === "skills") {
    const row = document.createElement("div");
    row.className = "skill-row";
    const nameInp = document.createElement("input");
    nameInp.placeholder = "Skill";
    nameInp.value = entry.name;
    nameInp.addEventListener("input", () => { entry.name = nameInp.value; scheduleRender(); });
    const pctWrap = document.createElement("div");
    const range = document.createElement("input");
    range.type = "range"; range.min = 0; range.max = 100; range.step = 5;
    range.value = entry.level;
    const pctLbl = document.createElement("div");
    pctLbl.className = "skill-pct";
    pctLbl.textContent = entry.level + "%";
    range.addEventListener("input", () => {
      entry.level = +range.value;
      pctLbl.textContent = range.value + "%";
      scheduleRender();
    });
    pctWrap.appendChild(range); pctWrap.appendChild(pctLbl);
    row.appendChild(nameInp); row.appendChild(pctWrap);
    card.appendChild(row);
    return card;
  }

  const mkField = (field, placeholder, tag) => {
    const lbl = document.createElement("label");
    lbl.className = "f-row";
    if (tag === "textarea") {
      const ta = document.createElement("textarea");
      ta.rows = 2; ta.placeholder = placeholder; ta.value = entry[field] || "";
      ta.addEventListener("input", () => { entry[field] = ta.value; scheduleRender(); });
      lbl.appendChild(ta);
    } else {
      const inp = document.createElement("input");
      inp.placeholder = placeholder; inp.value = entry[field] || "";
      inp.addEventListener("input", () => { entry[field] = inp.value; scheduleRender(); });
      lbl.appendChild(inp);
    }
    card.appendChild(lbl);
  };
  card.appendChild(buildDatesRow(entry));
  mkField("role", "Role / position");
  mkField("org", "Company / school");
  mkField("details", "Details, shows, projects…", "textarea");
  return card;
}

function rebuildList(list) {
  const container = $({ skills: "#skillList", education: "#eduList", work: "#workList" }[list]);
  container.innerHTML = "";
  state[list].forEach((entry, i) => container.appendChild(makeEntryCard(list, entry, i)));
}

function updateEntryLabels() {
  $$(".entry-card").forEach(card => {
    const list = card.dataset.list;
    const idx = +card.dataset.index;
    const e = state[list][idx];
    if (!e) return;
    const label = $(".drag-label", card);
    if (list === "skills") label.textContent = e.name || "New skill";
    else label.textContent = [e.role, e.org].filter(Boolean).join(" · ") || "New entry";
  });
}

$$("[data-add]").forEach(btn => {
  const list = btn.dataset.add;
  btn.addEventListener("click", () => {
    if (list === "skills") state.skills.push({ name: "", level: 80 });
    else state[list].push({ start: "", end: "", present: false, role: "", org: "", details: "" });
    rebuildList(list);
    scheduleRender();
    const cards = $$(({ skills: "#skillList", education: "#eduList", work: "#workList" }[list]) + " .entry-card");
    const last = cards[cards.length - 1];
    const first = last?.querySelector("input, textarea");
    first?.focus();
  });
});

/* ================= photo ================= */
$("#btnPhoto").addEventListener("click", () => $("#photoFile").click());
$("#photoFile").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    // downscale to keep localStorage + JSON export small
    const img = new Image();
    img.onload = () => {
      const MAX = 480;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      state.photo = canvas.toDataURL("image/jpeg", 0.85);
      $("#btnPhotoRemove").hidden = false;
      scheduleRender();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
  e.target.value = "";
});
$("#btnPhotoRemove").addEventListener("click", () => {
  state.photo = null;
  $("#btnPhotoRemove").hidden = true;
  scheduleRender();
});

/* ================= save / load JSON ================= */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

$("#btnSaveJson").addEventListener("click", () => {
  const name = (state.personal.name || "resume").replace(/[^\w\- ]/g, "").replace(/\s+/g, "_") + ".json";
  downloadBlob(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }), name);
});

$("#btnLoadJson").addEventListener("click", () => $("#jsonFile").click());
$("#jsonFile").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      state = {
        ...structuredClone(EMPTY),
        ...parsed,
        personal: { ...EMPTY.personal, ...(parsed.personal || {}) }
      };
      syncFlatFields();
      $$("#workList, #eduList, #skillList").forEach(el => el.innerHTML = "");
      ["work", "education", "skills"].forEach(rebuildList);
      $("#btnPhotoRemove").hidden = !state.photo;
      $("#templateSelect").value = state.template;
      saveState();
      render();
      updateEntryLabels();
    } catch (err) {
      alert("Couldn't read that file: " + err.message);
    }
    e.target.value = "";
  };
  reader.readAsText(file);
});

function syncFlatFields() {
  $$("[data-path]").forEach(el => {
    el.value = el.dataset.path.split(".").reduce((o, k) => o?.[k], state) ?? "";
  });
}

/* ================= print & word & reset ================= */
$("#btnPrint").addEventListener("click", () => window.print());

$("#btnWord").addEventListener("click", () => {
  if (typeof exportToDocx === "function") {
    exportToDocx(state).catch(err => alert("Word export failed: " + err.message));
  } else {
    alert("Word export isn't ready yet — the local docx library didn't load, or use Print / PDF instead.");
  }
});

$("#btnReset").addEventListener("click", () => {
  if (!confirm("Start over? This wipes everything on this browser (you can't undo).")) return;
  state = structuredClone(EMPTY);
  syncFlatFields();
  $$("#workList, #eduList, #skillList").forEach(el => el.innerHTML = "");
  $("#btnPhotoRemove").hidden = true;
  saveState();
  render();
  updateEntryLabels();
});

/* ================= boot ================= */
if (state.photo) $("#btnPhotoRemove").hidden = false;
render();
updateEntryLabels();

/* Resume Studio — in-browser .docx export (uses the CDN `docx` UMD build → window.docx) */
"use strict";

function base64ToArrayBuffer(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

const BLUE = "3D85C6";
const BLUE_LIGHT = "D8E6F3";
const INK = "222222";

function sectionHeader(text) {
  const D = window.docx;
  return new D.Paragraph({
    spacing: { before: 240, after: 120 },
    border: { bottom: { color: BLUE, style: D.BorderStyle.SINGLE, size: 12, space: 3 } },
    children: [new D.TextRun({ text, bold: true, color: BLUE, size: 28 })]
  });
}

function timelineRow(dates, role, org, details, isLast) {
  const D = window.docx;
  return new D.TableRow({
    children: [
      new D.TableCell({
        width: { size: 1500, type: D.WidthType.DXA },
        borders: { top: nb(), left: nb(), bottom: nb() },
        margins: { top: 40, bottom: 40, left: 40, right: 80 },
        children: [new D.Paragraph({
          alignment: D.AlignmentType.RIGHT,
          children: [new D.TextRun({ text: dates || "", size: 17, color: "555555" })]
        })]
      }),
      new D.TableCell({
        width: { size: 8246, type: D.WidthType.DXA },
        borders: { top: nb(), bottom: nb(), left: { color: BLUE_LIGHT, style: D.BorderStyle.SINGLE, size: 12 }, right: nb() },
        margins: { top: 40, bottom: 40, left: 160, right: 40 },
        children: [
          new D.Paragraph({ children: [new D.TextRun({ text: role || "", bold: true, size: 22, color: INK })] }),
          new D.Paragraph({ children: [new D.TextRun({ text: org || "", italics: true, size: 22, color: INK })] }),
          ...(details ? String(details).split("\n").map(line =>
            new D.Paragraph({ children: [new D.TextRun({ text: line, size: 19, color: "333333" })] })) : [])
        ]
      })
    ]
  });
}

function nb() { const D = window.docx; return { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" }; }

function timelineTable(entries) {
  const D = window.docx;
  return new D.Table({
    width: { size: 9746, type: D.WidthType.DXA },
    rows: entries.map((e, i) => timelineRow(datesDisplay(e), e.role, e.org, e.details, i === entries.length - 1))
  });
}

function skillBarTable(skills) {
  const D = window.docx;
  const BAR = 3200, PCTW = 480, LABEL = 9746 - BAR - PCTW - 200;
  const rows = [];
  const half = Math.ceil(skills.length / 2);
  const cols = [skills.slice(0, half), skills.slice(half)];
  for (let r = 0; r < half; r++) {
    const cells = [];
    for (const col of cols) {
      const s = col[r];
      const pct = s ? Math.max(0, Math.min(100, +s.level || 0)) : 0;
      if (s) {
        const fillW = Math.round(BAR * pct / 100);
        const trackW = BAR - fillW;
        cells.push(new D.TableCell({
          width: { size: 9746 / 2, type: D.WidthType.DXA },
          borders: { top: nb(), left: nb(), bottom: nb(), right: nb() },
          margins: { top: 30, bottom: 30, left: 0, right: 0 },
          children: [
            new D.Paragraph({ spacing: { after: 20 }, children: [new D.TextRun({ text: s.name || "", bold: true, size: 21, color: INK })] }),
            new D.Table({
              width: { size: BAR + PCTW, type: D.WidthType.DXA },
              borders: {
                top: nb(), bottom: nb(), left: nb(), right: nb(),
                insideHorizontal: nb(), insideVertical: nb()
              },
              rows: [new D.TableRow({
                height: { value: 60, rule: D.HeightRule.EXACT },
                children: [
                  new D.TableCell({
                    width: { size: Math.max(20, fillW), type: D.WidthType.DXA },
                    shading: { type: D.ShadingType.CLEAR, fill: BLUE },
                    borders: { top: nb(), left: nb(), bottom: nb(), right: nb() },
                    children: [new D.Paragraph({ children: [] })]
                  }),
                  new D.TableCell({
                    width: { size: Math.max(20, trackW), type: D.WidthType.DXA },
                    shading: { type: D.ShadingType.CLEAR, fill: BLUE_LIGHT },
                    borders: { top: nb(), left: nb(), bottom: nb(), right: nb() },
                    children: [new D.Paragraph({ children: [] })]
                  }),
                  new D.TableCell({
                    width: { size: PCTW, type: D.WidthType.DXA },
                    borders: { top: nb(), left: nb(), bottom: nb(), right: nb() },
                    children: [new D.Paragraph({
                      alignment: D.AlignmentType.RIGHT,
                      children: [new D.TextRun({ text: pct + "%", size: 16, color: "555555" })]
                    })]
                  })
                ]
              })]
            })
          ]
        }));
      } else {
        cells.push(new D.TableCell({
          width: { size: 9746 / 2, type: D.WidthType.DXA },
          borders: { top: nb(), left: nb(), bottom: nb(), right: nb() },
          children: [new D.Paragraph({ children: [] })]
        }));
      }
    }
    rows.push(new D.TableRow({ children: cells }));
  }
  return new D.Table({
    width: { size: 9746, type: D.WidthType.DXA },
    borders: { top: nb(), bottom: nb(), left: nb(), right: nb(), insideHorizontal: nb(), insideVertical: nb() },
    rows
  });
}

async function exportToDocx(state) {
  const D = window.docx;
  if (!D) throw new Error("docx library not loaded");

  const p = state.personal;
  const children = [];

  // header
  children.push(new D.Paragraph({
    alignment: D.AlignmentType.CENTER, spacing: { after: 80 },
    children: [new D.TextRun({ text: p.name || "Your Name", bold: true, size: 56, color: BLUE })]
  }));

  if (state.photo) {
    const b64 = state.photo.split(",")[1];
    const buf = base64ToArrayBuffer(b64);
    children.push(new D.Paragraph({
      alignment: D.AlignmentType.CENTER, spacing: { after: 80 },
      children: [new D.ImageRun({ data: buf, transformation: { width: 96, height: 96 } })]
    }));
  }

  children.push(new D.Paragraph({
    alignment: D.AlignmentType.CENTER, spacing: { after: 40 },
    children: [new D.TextRun({ text: p.title || "Job Title", bold: true, size: 36, color: BLUE })]
  }));

  const contacts = [p.location, p.phone, p.email, p.website].filter(Boolean);
  if (contacts.length) {
    children.push(new D.Paragraph({
      alignment: D.AlignmentType.CENTER, spacing: { after: 120 },
      children: [new D.TextRun({ text: contacts.join("  |  "), size: 19, color: INK })]
    }));
  }

  if (state.summary) {
    children.push(sectionHeader("SUMMARY"));
    children.push(new D.Paragraph({
      children: [new D.TextRun({ text: state.summary, size: 21, color: "333333" })]
    }));
  }

  if (state.work.length) {
    children.push(sectionHeader("WORK EXPERIENCE"));
    children.push(timelineTable(state.work));
  }

  if (state.education.length) {
    children.push(sectionHeader("EDUCATION & TRAINING"));
    children.push(timelineTable(state.education));
  }

  if (state.skills.length) {
    children.push(sectionHeader("SKILLS"));
    children.push(skillBarTable(state.skills));
  }

  const doc = new D.Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
        }
      },
      children
    }]
  });

  const blob = await D.Packer.toBlob(doc);
  const name = (p.name || "resume").replace(/[^\w\- ]/g, "").replace(/\s+/g, "_") + "_resume.docx";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

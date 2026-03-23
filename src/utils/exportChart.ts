import { PIE_COLORS_HEX } from "@/constants/dashboard";

export function exportChartAsPng(
  segments: { label: string; pct: number }[],
  targetName: string,
  pValue: string,
  references: string[],
): void {
  const canvas = document.createElement("canvas");
  const scale = 2;
  const hasRefs = references.length > 0;
  const refsRowH = hasRefs ? 36 : 0;
  const bw = 800;
  const headerH = 70;
  const bodyH = Math.max(segments.length * 28 + 50, 320);
  const bh = headerH + bodyH + refsRowH + 16;
  canvas.width = bw * scale;
  canvas.height = bh * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, bw, bh);
  ctx.strokeStyle = "rgba(83,189,227,0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, bw - 1, bh - 1);

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.letterSpacing = "2px";
  ctx.textAlign = "left";
  ctx.fillText("INSIGHTSONANCESTRY", 28, 28);

  const pText = `P = ${pValue}`;
  ctx.font = "11px system-ui, sans-serif";
  ctx.letterSpacing = "2px";
  const pW = ctx.measureText(pText).width + 16;
  ctx.fillStyle = "rgba(83,189,227,0.08)";
  ctx.fillRect(bw - 28 - pW, 14, pW, 22);
  ctx.strokeStyle = "rgba(83,189,227,0.25)";
  ctx.strokeRect(bw - 28 - pW, 14, pW, 22);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.textAlign = "center";
  ctx.fillText(pText, bw - 28 - pW / 2, 29);

  ctx.fillStyle = "#53bde3";
  ctx.beginPath();
  ctx.arc(bw / 2 - 60, 50, 3, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px system-ui, sans-serif";
  ctx.letterSpacing = "3px";
  ctx.textAlign = "left";
  ctx.fillText(targetName.toUpperCase(), bw / 2 - 50, 55);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = "rgba(83,189,227,0.12)";
  ctx.fillRect(28, headerH, bw - 56, 1);

  const halfW = (bw - 56) / 2;
  const srcX = 28;
  const donutCx = 28 + halfW + halfW / 2;
  const donutCy = headerH + bodyH / 2;
  const r = Math.min(halfW / 2 - 20, bodyH / 2 - 20);
  const iR = r * 0.6;

  ctx.strokeStyle = "rgba(83,189,227,0.12)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(28 + halfW, headerH + 12);
  ctx.lineTo(28 + halfW, headerH + bodyH - 12);
  ctx.stroke();

  const srcStartY = headerH + 20;
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "9px system-ui, sans-serif";
  ctx.letterSpacing = "2px";
  ctx.textAlign = "left";
  ctx.fillText("SOURCES", srcX, srcStartY);
  ctx.letterSpacing = "0px";

  for (let i = 0; i < segments.length; i++) {
    const sy = srcStartY + 16 + i * 28;
    const color = PIE_COLORS_HEX[i % PIE_COLORS_HEX.length];

    ctx.fillStyle = color;
    ctx.fillRect(srcX, sy - 2, 2, 20);

    ctx.globalAlpha = 0.08;
    ctx.fillStyle = color;
    ctx.fillRect(srcX + 2, sy - 2, (halfW - 40) * segments[i].pct / 100, 20);
    ctx.globalAlpha = 1;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(srcX + 14, sy + 7, 3.5, 0, 2 * Math.PI);
    ctx.fill();

    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(segments[i].label, srcX + 26, sy + 12);

    ctx.fillStyle = color;
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${segments[i].pct}%`, srcX + halfW - 16, sy + 12);
  }

  const glow = ctx.createRadialGradient(donutCx, donutCy, 0, donutCx, donutCy, r * 1.8);
  glow.addColorStop(0, "rgba(83,189,227,0.06)");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(donutCx - r * 2, donutCy - r * 2, r * 4, r * 4);

  ctx.strokeStyle = "rgba(83,189,227,0.12)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.arc(donutCx, donutCy, r + 10, 0, 2 * Math.PI);
  ctx.stroke();
  for (let t = 0; t < 36; t++) {
    const ta = (t / 36) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(donutCx + (r + 6) * Math.cos(ta), donutCy + (r + 6) * Math.sin(ta));
    ctx.lineTo(donutCx + (r + 10) * Math.cos(ta), donutCy + (r + 10) * Math.sin(ta));
    ctx.strokeStyle = "rgba(83,189,227,0.2)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  let cum = 0;
  for (let i = 0; i < segments.length; i++) {
    const frac = segments[i].pct / 100;
    const gap = 0.008;
    const start = (cum + gap) * 2 * Math.PI - Math.PI / 2;
    const end = (cum + frac - gap) * 2 * Math.PI - Math.PI / 2;
    const color = PIE_COLORS_HEX[i % PIE_COLORS_HEX.length];

    ctx.beginPath();
    ctx.arc(donutCx, donutCy, r, start, end);
    ctx.arc(donutCx, donutCy, iR, end, start, true);
    ctx.closePath();

    const midA = (start + end) / 2;
    const grad = ctx.createLinearGradient(
      donutCx + r * Math.cos(midA), donutCy + r * Math.sin(midA),
      donutCx + iR * Math.cos(midA), donutCy + iR * Math.sin(midA)
    );
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + "b3");
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    cum += frac;
  }

  ctx.strokeStyle = "rgba(83,189,227,0.12)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.arc(donutCx, donutCy, iR - 4, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = "#000000";
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(donutCx, donutCy, iR - 6, 0, 2 * Math.PI);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px system-ui, sans-serif";
  ctx.letterSpacing = "2px";
  ctx.textAlign = "center";
  ctx.fillText(String(segments.length), donutCx, donutCy - 2);
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "9px system-ui, sans-serif";
  ctx.letterSpacing = "2px";
  ctx.fillText("SOURCES", donutCx, donutCy + 16);
  ctx.letterSpacing = "0px";

  if (hasRefs) {
    const refY = headerH + bodyH + 4;
    ctx.fillStyle = "rgba(83,189,227,0.12)";
    ctx.fillRect(28, refY, bw - 56, 1);

    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "9px system-ui, sans-serif";
    ctx.letterSpacing = "2px";
    ctx.textAlign = "left";
    let rx = 28;
    ctx.fillText("REFS", rx, refY + 22);
    ctx.letterSpacing = "0px";
    rx += 40;

    ctx.font = "11px system-ui, sans-serif";
    for (let i = 0; i < references.length; i++) {
      ctx.fillStyle = "rgba(83,189,227,0.4)";
      ctx.beginPath();
      ctx.arc(rx, refY + 18, 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.textAlign = "left";
      ctx.fillText(references[i], rx + 8, refY + 22);
      rx += ctx.measureText(references[i]).width + 24;
    }
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${targetName || "model_chart"}.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

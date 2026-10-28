// Tira estilo cabina de fotos: se dibuja en un canvas y se exporta como imagen.
const STRIP = {
  width: 600,
  padding: 30,
  border: 10,
  gap: 28,
  perforation: 24,
  captionGap: 12,
  captionLine: 28,
  footer: 130,
  maxPixels: 16_000_000, // límite de área de canvas en iOS Safari
};

const STRIP_FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

const STRIP_COLORS = {
  paper: "#fffaf3",
  hole: "#e9dccb",
  dash: "#ddd0c0",
  caption: "#8f6440",
  title: "#333",
  muted: "#8a7a6a",
};

async function fetchPhotoBlob(url) {
  // Sin caché: una copia guardada desde un <img> sin CORS bloquearía la exportación del canvas
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo descargar una foto");
  return res.blob();
}

async function loadImage(url) {
  return createImageBitmap(await fetchPhotoBlob(url));
}

function wrapText(ctx, text, maxWidth, maxLines = 2) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (!line || ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;

  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last.trimEnd()}…`;
  return kept;
}

function drawCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

function drawPerforation(ctx, y) {
  ctx.fillStyle = STRIP_COLORS.hole;
  for (let x = 15; x < STRIP.width; x += 22) {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDash(ctx, y) {
  ctx.save();
  ctx.strokeStyle = STRIP_COLORS.dash;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(STRIP.padding, y);
  ctx.lineTo(STRIP.width - STRIP.padding, y);
  ctx.stroke();
  ctx.restore();
}

// frames: [{ url, caption }]
async function buildStripBlob(title, frames) {
  const [images, logo] = await Promise.all([
    Promise.all(frames.map((frame) => loadImage(frame.url))),
    loadImage("/assets/logo.png").catch(() => null),
  ]);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const photoW = STRIP.width - STRIP.padding * 2 - STRIP.border * 2;
  const photoH = Math.round((photoW * 3) / 4);

  ctx.font = `600 22px ${STRIP_FONT}`;
  const captions = frames.map((frame) => wrapText(ctx, frame.caption, photoW));
  const framesHeight = captions.reduce(
    (total, lines) =>
      total + photoH + STRIP.border * 2 + STRIP.captionGap + lines.length * STRIP.captionLine + STRIP.gap,
    0
  );
  const height = STRIP.perforation + STRIP.padding + framesHeight + STRIP.footer + STRIP.perforation;

  // Doble resolución, salvo que la tira sea tan larga que pase el límite del canvas
  const scale = Math.min(2, Math.sqrt(STRIP.maxPixels / (STRIP.width * height)));
  canvas.width = Math.floor(STRIP.width * scale);
  canvas.height = Math.floor(height * scale);
  ctx.scale(scale, scale);

  ctx.fillStyle = STRIP_COLORS.paper;
  ctx.fillRect(0, 0, STRIP.width, height);
  drawPerforation(ctx, STRIP.perforation / 2);
  drawPerforation(ctx, height - STRIP.perforation / 2);

  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  let y = STRIP.perforation + STRIP.padding;
  frames.forEach((_, i) => {
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(STRIP.padding, y, photoW + STRIP.border * 2, photoH + STRIP.border * 2);
    ctx.restore();
    drawCover(ctx, images[i], STRIP.padding + STRIP.border, y + STRIP.border, photoW, photoH);
    y += photoH + STRIP.border * 2 + STRIP.captionGap;

    ctx.font = `600 22px ${STRIP_FONT}`;
    ctx.fillStyle = STRIP_COLORS.caption;
    for (const line of captions[i]) {
      ctx.fillText(line, STRIP.width / 2, y);
      y += STRIP.captionLine;
    }

    if (i < frames.length - 1) drawDash(ctx, y + STRIP.gap / 2);
    y += STRIP.gap;
  });

  if (logo) {
    const size = 56;
    const ratio = Math.min(size / logo.width, size / logo.height);
    const w = logo.width * ratio;
    const h = logo.height * ratio;
    ctx.drawImage(logo, (STRIP.width - w) / 2, y + (size - h) / 2, w, h);
  }

  ctx.font = `700 26px ${STRIP_FONT}`;
  ctx.fillStyle = STRIP_COLORS.title;
  ctx.fillText(wrapText(ctx, title, STRIP.width - STRIP.padding * 2, 1)[0] ?? "", STRIP.width / 2, y + 66);

  ctx.font = `400 16px ${STRIP_FONT}`;
  ctx.fillStyle = STRIP_COLORS.muted;
  ctx.fillText(new Date().toLocaleDateString("es"), STRIP.width / 2, y + 102);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la tira"))),
      "image/jpeg",
      0.92
    );
  });
}

async function saveBlob(blob, filename) {
  // En el celular, el menú de compartir permite "Guardar imagen" en la galería
  const file = new File([blob], filename, { type: blob.type });
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  if (isTouch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (err) {
      if (err.name === "AbortError") return;
      // Si el navegador no deja compartir, se descarga como archivo
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugify(text) {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "mural"
  );
}

// Piezas compartidas por "Otros murales" y "Resultados". Necesita lightbox.js y strip.js.
const CORK_ROTATIONS = [-6, 4, -8, 3, -3, 7, -5, 5];

// highlights: solo las que tienen foto
function renderCorkboard(highlights) {
  const corkboard = document.createElement("div");
  corkboard.className = "board-corkboard";

  highlights.forEach((highlight, index) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "cork-photo";
    tile.style.transform = `rotate(${CORK_ROTATIONS[index % CORK_ROTATIONS.length]}deg)`;

    const img = document.createElement("img");
    img.src = highlight.photo.url;
    tile.appendChild(img);

    tile.addEventListener("click", () => {
      openLightbox(highlight.photo.url, highlight.prompt_text);
    });

    corkboard.appendChild(tile);
  });
  return corkboard;
}

function stripDownloadButton(boardName, highlights) {
  const label = "📸 Descargar tira";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "secondary";
  button.textContent = label;
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Armando tira...";
    try {
      const frames = highlights.map((h) => ({ url: h.photo.url, caption: h.prompt_text }));
      const blob = await buildStripBlob(boardName, frames);
      await saveBlob(blob, `tira-${slugify(boardName)}.jpg`);
    } catch (err) {
      alert(err.message);
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  });
  return button;
}

function voteCountLabel(count) {
  return `${count} voto${count === 1 ? "" : "s"}`;
}

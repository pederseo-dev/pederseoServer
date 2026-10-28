function ensureLightbox() {
  if (document.getElementById("lightbox-modal")) return;

  const modal = document.createElement("div");
  modal.id = "lightbox-modal";
  modal.className = "lightbox-modal hidden";
  modal.innerHTML = `
    <img id="lightbox-img" src="" alt="" />
    <p id="lightbox-caption" class="lightbox-caption"></p>
    <button type="button" id="lightbox-close" class="secondary">Cerrar</button>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeLightbox();
  });
  document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
}

function openLightbox(url, caption) {
  ensureLightbox();
  document.getElementById("lightbox-img").src = url;
  document.getElementById("lightbox-caption").textContent = caption || "";
  document.getElementById("lightbox-modal").classList.remove("hidden");
}

function closeLightbox() {
  const modal = document.getElementById("lightbox-modal");
  if (modal) modal.classList.add("hidden");
}

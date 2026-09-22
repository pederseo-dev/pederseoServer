let cameraStream = null;
let cameraFacingMode = "environment";

const CAMERA_FILTERS = [
  { key: "none", label: "Normal", css: "none" },
  { key: "bw", label: "B/N", css: "grayscale(1)" },
  { key: "sepia", label: "Sepia", css: "sepia(0.8) contrast(1.1)" },
  { key: "vintage", label: "Vintage", css: "sepia(0.35) contrast(1.1) saturate(1.3) brightness(0.95)" },
];

let selectedCameraFilter = CAMERA_FILTERS[0];

function ensureCameraModal() {
  if (document.getElementById("camera-modal")) return;

  const modal = document.createElement("div");
  modal.id = "camera-modal";
  modal.className = "camera-modal hidden";
  modal.innerHTML = `
    <video id="camera-video" autoplay playsinline muted></video>
    <canvas id="camera-canvas" class="hidden"></canvas>
    <div class="camera-filters" id="camera-filters"></div>
    <div class="camera-controls">
      <button type="button" id="camera-cancel" class="secondary">Cancelar</button>
      <button type="button" id="camera-flip" class="secondary">Cambiar cámara</button>
      <button type="button" id="camera-shoot">Capturar</button>
      <button type="button" id="camera-retake" class="secondary hidden">Repetir</button>
      <button type="button" id="camera-confirm" class="hidden">Usar foto</button>
    </div>
  `;
  document.body.appendChild(modal);

  const filtersRow = document.getElementById("camera-filters");
  CAMERA_FILTERS.forEach((filter) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = filter.label;
    btn.className = "filter-btn";
    if (filter.key === selectedCameraFilter.key) btn.classList.add("active");
    btn.addEventListener("click", () => {
      selectedCameraFilter = filter;
      document.getElementById("camera-video").style.filter = filter.css;
      filtersRow.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
    filtersRow.appendChild(btn);
  });
}

function stopCameraStream() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
}

async function startCameraStream(video) {
  stopCameraStream();
  cameraStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: cameraFacingMode } },
    audio: false,
  });
  video.srcObject = cameraStream;
  video.style.filter = selectedCameraFilter.css;
}

function openCamera() {
  return new Promise(async (resolve) => {
    ensureCameraModal();

    const modal = document.getElementById("camera-modal");
    const video = document.getElementById("camera-video");
    const canvas = document.getElementById("camera-canvas");
    const cancelBtn = document.getElementById("camera-cancel");
    const flipBtn = document.getElementById("camera-flip");
    const shootBtn = document.getElementById("camera-shoot");
    const retakeBtn = document.getElementById("camera-retake");
    const confirmBtn = document.getElementById("camera-confirm");
    const filtersRow = document.getElementById("camera-filters");

    function showLiveState() {
      video.classList.remove("hidden");
      canvas.classList.add("hidden");
      shootBtn.classList.remove("hidden");
      flipBtn.classList.remove("hidden");
      filtersRow.classList.remove("hidden");
      retakeBtn.classList.add("hidden");
      confirmBtn.classList.add("hidden");
    }

    function showPreviewState() {
      video.classList.add("hidden");
      canvas.classList.remove("hidden");
      shootBtn.classList.add("hidden");
      flipBtn.classList.add("hidden");
      filtersRow.classList.add("hidden");
      retakeBtn.classList.remove("hidden");
      confirmBtn.classList.remove("hidden");
    }

    function cleanup() {
      stopCameraStream();
      modal.classList.add("hidden");
      cancelBtn.onclick = null;
      flipBtn.onclick = null;
      shootBtn.onclick = null;
      retakeBtn.onclick = null;
      confirmBtn.onclick = null;
    }

    modal.classList.remove("hidden");
    showLiveState();

    try {
      await startCameraStream(video);
    } catch (err) {
      cleanup();
      resolve({ error: "No se pudo acceder a la cámara: " + err.message });
      return;
    }

    cancelBtn.onclick = () => {
      cleanup();
      resolve({ blob: null });
    };

    flipBtn.onclick = async () => {
      cameraFacingMode = cameraFacingMode === "environment" ? "user" : "environment";
      try {
        await startCameraStream(video);
      } catch (err) {
        cameraFacingMode = cameraFacingMode === "environment" ? "user" : "environment";
      }
    };

    shootBtn.onclick = () => {
      // Recorte cuadrado centrado: coincide con lo que se ve en vivo (object-fit: cover en el <video>).
      const side = Math.min(video.videoWidth, video.videoHeight);
      const sx = (video.videoWidth - side) / 2;
      const sy = (video.videoHeight - side) / 2;
      const outputSize = Math.min(side, 1280);

      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext("2d");
      ctx.filter = selectedCameraFilter.css;
      ctx.drawImage(video, sx, sy, side, side, 0, 0, outputSize, outputSize);
      showPreviewState();
    };

    retakeBtn.onclick = () => {
      showLiveState();
    };

    confirmBtn.onclick = () => {
      canvas.toBlob(
        (blob) => {
          cleanup();
          resolve({ blob });
        },
        "image/jpeg",
        0.7
      );
    };
  });
}

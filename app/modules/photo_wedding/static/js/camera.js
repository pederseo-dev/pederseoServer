let cameraStream = null;
let cameraFacingMode = "environment";

function ensureCameraModal() {
  if (document.getElementById("camera-modal")) return;

  const modal = document.createElement("div");
  modal.id = "camera-modal";
  modal.className = "camera-modal hidden";
  modal.innerHTML = `
    <video id="camera-video" autoplay playsinline muted></video>
    <canvas id="camera-canvas" class="hidden"></canvas>
    <div class="camera-controls">
      <button type="button" id="camera-cancel" class="secondary">Cancelar</button>
      <button type="button" id="camera-flip" class="secondary">Cambiar cámara</button>
      <button type="button" id="camera-shoot">Capturar</button>
      <button type="button" id="camera-retake" class="secondary hidden">Repetir</button>
      <button type="button" id="camera-confirm" class="hidden">Usar foto</button>
    </div>
  `;
  document.body.appendChild(modal);
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

    function showLiveState() {
      video.classList.remove("hidden");
      canvas.classList.add("hidden");
      shootBtn.classList.remove("hidden");
      flipBtn.classList.remove("hidden");
      retakeBtn.classList.add("hidden");
      confirmBtn.classList.add("hidden");
    }

    function showPreviewState() {
      video.classList.add("hidden");
      canvas.classList.remove("hidden");
      shootBtn.classList.add("hidden");
      flipBtn.classList.add("hidden");
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
      const maxSize = 1280;
      let { videoWidth: width, videoHeight: height } = video;
      if (width > height && width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      } else if (height > maxSize) {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(video, 0, 0, width, height);
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

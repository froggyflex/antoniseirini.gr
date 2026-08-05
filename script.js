const CONFIG = {
  rsvpEndpoint: "",
  photoUploadEndpoint: "",
  maxPhotoUploadMb: 8,
  couple: "Antonis & Eirini",
};

const header = document.querySelector(".site-header");
const form = document.querySelector("#rsvp-form");
const statusEl = document.querySelector("#form-status");
const canvas = document.querySelector("#constellation");
const ctx = canvas.getContext("2d");
const modal = document.querySelector("#rsvp-modal");
const modalTitle = document.querySelector("#modal-title");
const modalIntro = document.querySelector("#modal-intro");
const attendanceField = document.querySelector("#attendance-field");
const attendanceFields = document.querySelector("#attendance-fields");
const replayInvite = document.querySelector("#replay-invite");
const photoForm = document.querySelector("#photo-form");
const photoFiles = document.querySelector("#photo-files");
const photoPreview = document.querySelector("#photo-preview");
const photoStatus = document.querySelector("#photo-status");

function setHeaderState() {
  header.classList.toggle("is-scrolled", window.scrollY > 24);
}

function replayInvitation() {
  const invite = document.querySelector(".paper-invite");
  invite.classList.remove("is-replaying");
  void invite.offsetWidth;
  invite.classList.add("is-replaying");
}

function openRsvpModal(attendance) {
  const isAttending = attendance === "attending";
  attendanceField.value = attendance;
  modalTitle.textContent = isAttending ? "We will attend" : "We cannot attend";
  modalIntro.textContent = isAttending
    ? "Add the number of adults and children so the menu totals are clear."
    : "Send a short reply so the guest list stays accurate.";
  attendanceFields.hidden = !isAttending;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  form.querySelector("input[name='name']").focus();
}

function closeRsvpModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

async function submitRsvp(event) {
  event.preventDefault();

  const data = new FormData(form);
  const attendance = data.get("attendance");
  const adultMenus = attendance === "attending" ? Number(data.get("adults") || 0) : 0;
  const kidMenus = attendance === "attending" ? Number(data.get("kids") || 0) : 0;
  const totalGuests = adultMenus + kidMenus;

  if (attendance === "attending" && totalGuests < 1) {
    statusEl.textContent = "Add at least one adult or kid menu.";
    return;
  }

  const payload = {
    name: data.get("name"),
    email: data.get("email"),
    attendance,
    adultMenus,
    kidMenus,
    totalGuests,
    message: data.get("message"),
    submittedAt: new Date().toISOString(),
    source: window.location.href,
  };

  if (!CONFIG.rsvpEndpoint) {
    statusEl.textContent =
      "RSVP endpoint is not connected yet. Your form is ready; add the endpoint in script.js.";
    console.info("RSVP preview payload:", payload);
    return;
  }

  statusEl.textContent = "Sending...";

  try {
    const body = new URLSearchParams({
      name: payload.name,
      email: payload.email || "",
      attendance: payload.attendance,
      adultMenus: String(payload.adultMenus),
      kidMenus: String(payload.kidMenus),
      totalGuests: String(payload.totalGuests),
      message: payload.message || "",
      submittedAt: payload.submittedAt,
      source: payload.source,
    });

    const response = await fetch(CONFIG.rsvpEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
    });

    if (!response.ok) {
      throw new Error(`RSVP failed with status ${response.status}`);
    }

    form.reset();
    statusEl.textContent = "Thank you. Your RSVP has been sent.";
    setTimeout(closeRsvpModal, 900);
  } catch (error) {
    console.error(error);
    statusEl.textContent =
      "The RSVP could not be sent. Please try again or contact the couple directly.";
  }
}

function renderPhotoPreview() {
  photoPreview.innerHTML = "";
  photoStatus.textContent = "";

  Array.from(photoFiles.files).slice(0, 9).forEach((file) => {
    const image = document.createElement("img");
    image.src = URL.createObjectURL(file);
    image.alt = file.name;
    image.addEventListener("load", () => URL.revokeObjectURL(image.src), {
      once: true,
    });
    photoPreview.append(image);
  });
}

async function submitPhotos(event) {
  event.preventDefault();

  const files = Array.from(photoFiles.files);
  if (!files.length) {
    photoStatus.textContent = "Choose at least one photo first.";
    return;
  }

  const maxBytes = CONFIG.maxPhotoUploadMb * 1024 * 1024;
  const oversized = files.find((file) => file.size > maxBytes);
  if (oversized) {
    photoStatus.textContent = `${oversized.name} is larger than ${CONFIG.maxPhotoUploadMb} MB.`;
    return;
  }

  if (!CONFIG.photoUploadEndpoint) {
    photoStatus.textContent =
      "Photo storage is not connected yet. The previews work; add the upload endpoint in script.js.";
    return;
  }

  const data = new FormData(photoForm);
  data.append("submittedAt", new Date().toISOString());
  data.append("source", window.location.href);

  photoStatus.textContent = "Uploading...";

  try {
    const response = await fetch(CONFIG.photoUploadEndpoint, {
      method: "POST",
      body: data,
    });

    if (!response.ok) {
      throw new Error(`Photo upload failed with status ${response.status}`);
    }

    photoForm.reset();
    photoPreview.innerHTML = "";
    photoStatus.textContent = "Thank you. Your photos have been uploaded.";
  } catch (error) {
    console.error(error);
    photoStatus.textContent =
      "The photos could not be uploaded. Please try again later.";
  }
}

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(canvas.offsetWidth * ratio);
  canvas.height = Math.floor(canvas.offsetHeight * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawConstellation(time = 0) {
  const width = canvas.offsetWidth;
  const height = canvas.offsetHeight;
  const progress = (Math.sin(time / 1500) + 1) / 2;

  ctx.clearRect(0, 0, width, height);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(137, 145, 127, 0.2)";
  ctx.fillStyle = "rgba(201, 168, 101, 0.62)";

  const routeOffset = Math.sin(time / 1400) * 14;
  ctx.beginPath();
  ctx.moveTo(width * 0.08, height * 0.62);
  ctx.bezierCurveTo(
    width * 0.28,
    height * 0.28 + routeOffset,
    width * 0.58,
    height * 0.78 - routeOffset,
    width * 0.9,
    height * 0.34,
  );
  ctx.stroke();

  ctx.strokeStyle = "rgba(126, 167, 169, 0.26)";
  ctx.beginPath();
  ctx.moveTo(width * 0.16, height * 0.45);
  ctx.bezierCurveTo(
    width * 0.31,
    height * 0.58,
    width * 0.39,
    height * 0.12 + progress * 24,
    width * 0.52,
    height * 0.34,
  );
  ctx.bezierCurveTo(
    width * 0.63,
    height * 0.52,
    width * 0.72,
    height * 0.18,
    width * 0.84,
    height * 0.26 + progress * 20,
  );
  ctx.stroke();

  const dots = [
    [0.08, 0.62],
    [0.36, 0.34],
    [0.58, 0.53],
    [0.9, 0.34],
  ];

  dots.forEach(([x, y], index) => {
    ctx.beginPath();
    ctx.arc(width * x, height * y + Math.sin(time / 900 + index) * 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  const compassX = width * 0.82;
  const compassY = height * 0.18;
  ctx.strokeStyle = "rgba(183, 168, 207, 0.22)";
  ctx.beginPath();
  ctx.arc(compassX, compassY, 58 + progress * 5, 0, Math.PI * 2);
  ctx.moveTo(compassX - 70, compassY);
  ctx.lineTo(compassX + 70, compassY);
  ctx.moveTo(compassX, compassY - 70);
  ctx.lineTo(compassX, compassY + 70);
  ctx.stroke();

  requestAnimationFrame(drawConstellation);
}

window.addEventListener("scroll", setHeaderState, { passive: true });
window.addEventListener("resize", resizeCanvas);
form.addEventListener("submit", submitRsvp);
photoFiles.addEventListener("change", renderPhotoPreview);
photoForm.addEventListener("submit", submitPhotos);
replayInvite.addEventListener("click", replayInvitation);
document.querySelectorAll("[data-rsvp-open]").forEach((button) => {
  button.addEventListener("click", () => openRsvpModal(button.dataset.rsvpOpen));
});
document.querySelectorAll("[data-rsvp-close]").forEach((button) => {
  button.addEventListener("click", closeRsvpModal);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("is-open")) {
    closeRsvpModal();
  }
});

setHeaderState();
resizeCanvas();
requestAnimationFrame(drawConstellation);

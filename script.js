const CONFIG = {
  rsvpEndpoint: "",
  photoUploadEndpoint: "",
  maxPhotoUploadMb: 8,
  couple: "Antonis & Eirini",
  timezone: "Europe/Athens",
  events: [
    {
      id: "ceremony",
      title: "Antonis & Eirini - Wedding Ceremony",
      location: "Rhodes, Greece",
      start: "2026-09-27T17:30:00+03:00",
      end: "2026-09-27T18:30:00+03:00",
      description: "Wedding ceremony for Antonis and Eirini in Rhodes, Greece.",
    },
    {
      id: "celebration",
      title: "Antonis & Eirini - Wedding Celebration",
      location: "Rhodes, Greece",
      start: "2026-09-27T20:00:00+03:00",
      end: "2026-09-28T02:00:00+03:00",
      description: "Wedding celebration for Antonis and Eirini in Rhodes, Greece.",
    },
  ],
};

const header = document.querySelector(".site-header");
const form = document.querySelector("#rsvp-form");
const statusEl = document.querySelector("#form-status");
const calendarActions = document.querySelector("#calendar-actions");
const canvas = document.querySelector("#constellation");
const ctx = canvas.getContext("2d");
const photoForm = document.querySelector("#photo-form");
const photoFiles = document.querySelector("#photo-files");
const photoPreview = document.querySelector("#photo-preview");
const photoStatus = document.querySelector("#photo-status");

function setHeaderState() {
  header.classList.toggle("is-scrolled", window.scrollY > 24);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function toCalendarStamp(value) {
  const date = new Date(value);
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

function googleCalendarUrl(event) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toCalendarStamp(event.start)}/${toCalendarStamp(event.end)}`,
    details: event.description,
    location: event.location,
    ctz: CONFIG.timezone,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsContent(events) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Antonis Eirini Wedding//Invitation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  events.forEach((event) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}-antonis-eirini-20260927@antoniseirini.gr`,
      `DTSTAMP:${toCalendarStamp(new Date().toISOString())}`,
      `DTSTART:${toCalendarStamp(event.start)}`,
      `DTEND:${toCalendarStamp(event.end)}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description}`,
      `LOCATION:${event.location}`,
      "END:VEVENT",
    );
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function downloadIcs(events) {
  const blob = new Blob([icsContent(events)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "antonis-eirini-wedding.ics";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderCalendarActions() {
  CONFIG.events.forEach((event) => {
    const link = document.createElement("a");
    link.className = "button";
    link.href = googleCalendarUrl(event);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = `Google: ${event.id}`;
    calendarActions.append(link);
  });

  const icsButton = document.createElement("button");
  icsButton.className = "button primary";
  icsButton.type = "button";
  icsButton.textContent = "Download .ics";
  icsButton.addEventListener("click", () => downloadIcs(CONFIG.events));
  calendarActions.append(icsButton);
}

async function submitRsvp(event) {
  event.preventDefault();

  const data = new FormData(form);
  const selectedEvents = data.getAll("events");
  const payload = {
    name: data.get("name"),
    email: data.get("email"),
    guests: Number(data.get("guests")),
    events: selectedEvents,
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
      email: payload.email,
      guests: String(payload.guests),
      events: payload.events.join(", "),
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
  const centerX = width / 2;
  const centerY = height * 0.44;
  const scale = Math.min(width, height) * 0.22;
  const progress = (Math.sin(time / 1500) + 1) / 2;

  ctx.clearRect(0, 0, width, height);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(157, 86, 88, 0.24)";
  ctx.fillStyle = "rgba(196, 154, 93, 0.72)";

  const points = [];
  for (let i = 0; i < 84; i += 1) {
    const t = (Math.PI * 2 * i) / 84;
    const x = 16 * Math.sin(t) ** 3;
    const y =
      -(
        13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t)
      );
    const routeWave = Math.sin(t * 3 + time / 950) * 8 * progress;
    points.push({
      x: centerX + (x / 18) * scale + routeWave,
      y: centerY + (y / 18) * scale,
    });
  }

  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.closePath();
  ctx.stroke();

  for (let i = 0; i < points.length; i += 7) {
    const point = points[i];
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(68, 127, 142, 0.34)";
  ctx.beginPath();
  ctx.moveTo(width * 0.15, height * 0.62);
  ctx.bezierCurveTo(
    width * 0.32,
    height * 0.35 + progress * 22,
    width * 0.58,
    height * 0.68 - progress * 28,
    width * 0.84,
    height * 0.31,
  );
  ctx.stroke();

  requestAnimationFrame(drawConstellation);
}

window.addEventListener("scroll", setHeaderState, { passive: true });
window.addEventListener("resize", resizeCanvas);
form.addEventListener("submit", submitRsvp);
photoFiles.addEventListener("change", renderPhotoPreview);
photoForm.addEventListener("submit", submitPhotos);

setHeaderState();
renderCalendarActions();
resizeCanvas();
requestAnimationFrame(drawConstellation);

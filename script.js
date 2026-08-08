const CONFIG = {
  rsvpEndpoint: "https://script.google.com/macros/s/AKfycbx4GnDYccJuficQdT0SJ0y_uYZAJ-Lg-fZLzhioPuuuzhNr2iZQg-e_hVl_po1xECUT/exec",
  wishesEndpoint: "",
  photoUploadEndpoint: "https://script.google.com/macros/s/AKfycbx4GnDYccJuficQdT0SJ0y_uYZAJ-Lg-fZLzhioPuuuzhNr2iZQg-e_hVl_po1xECUT/exec",
  giftIban: "GR0602601630000860201065201",
  maxPhotoUploadMb: 8,
  maxPhotoFiles: 12,
  couple: "Αντώνης & Ειρήνη",
};

const header = document.querySelector(".site-header");
const form = document.querySelector("#rsvp-form");
const statusEl = document.querySelector("#form-status");
const canvas = document.querySelector("#constellation");
const ctx = canvas?.getContext("2d");
const modal = document.querySelector("#rsvp-modal");
const modalTitle = document.querySelector("#modal-title");
const modalIntro = document.querySelector("#modal-intro");
const attendanceField = document.querySelector("#attendance-field");
const attendanceFields = document.querySelector("#attendance-fields");
const kidsField = document.querySelector("#kids-field");
const kidsMenuNote = document.querySelector("#kids-menu-note");
const invite = document.querySelector(".paper-invite");
const inviteStage = document.querySelector(".invite-stage");
const flipInvite = document.querySelector("#flip-invite");
const photoForm = document.querySelector("#photo-form");
const photoFiles = document.querySelector("#photo-files");
const photoPreview = document.querySelector("#photo-preview");
const photoStatus = document.querySelector("#photo-status");
const photoSubmit = document.querySelector("#photo-submit");
const wishForm = document.querySelector("#wish-form");
const wishStatus = document.querySelector("#wish-status");
const giftIban = document.querySelector("#gift-iban");
const copyIban = document.querySelector("#copy-iban");
const ibanStatus = document.querySelector("#iban-status");
const equationIntro = document.querySelector("#equation-intro");
const heartCanvas = document.querySelector("#heart-equation");
const heartContext = heartCanvas?.getContext("2d");
const magicDustCanvas = document.querySelector("#magic-dust");
const magicDustContext = magicDustCanvas?.getContext("2d");
const inviteMotion = document.querySelector(".invite-motion");
const folderPocket = document.querySelector(".folder-pocket");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let envelopeSequenceStarted = false;
let invitationReadyTimer;
let envelopeReleaseTimer;
let heartCurvePoints;
let magicDustFrame;
let modalScrollPosition = 0;
let lastRsvpPointerOpen = 0;
let lastRsvpTrigger = null;

function setHeaderState() {
  header.classList.toggle("is-scrolled", window.scrollY > window.innerHeight * 0.82);
}

function updateKidsMenuNote() {
  const shouldShow = attendanceField.value === "attending" && Number(kidsField.value) > 0;
  kidsMenuNote.hidden = !shouldShow;
}

function updateInvitationLabels(isShowingFront) {
  flipInvite.setAttribute(
    "aria-label",
    isShowingFront ? "Προβολή της πίσω όψης" : "Προβολή της μπροστινής όψης",
  );
  flipInvite.setAttribute("title", isShowingFront ? "Πίσω όψη" : "Μπροστινή όψη");
  inviteStage.setAttribute(
    "aria-label",
    isShowingFront
      ? "Προβολή της πίσω όψης του προσκλητηρίου"
      : "Προβολή της μπροστινής όψης του προσκλητηρίου",
  );
}

function flipInvitation() {
  if (!invite.classList.contains("is-ready")) return;
  const isShowingFront = invite.classList.toggle("is-flipped");
  updateInvitationLabels(isShowingFront);
}

function openRsvpModal(attendance) {
  const isAttending = attendance === "attending";
  attendanceField.value = attendance;
  modalTitle.textContent = isAttending ? "Θα παρευρεθούμε" : "Δεν θα μπορέσουμε να παρευρεθούμε";
  modalIntro.textContent = isAttending
    ? "Παρακαλούμε συμπληρώστε τον αριθμό ενηλίκων και παιδιών που θα παρευρεθούν."
    : "Παρακαλούμε καταχωρίστε την απάντησή σας, ώστε να ενημερωθεί η λίστα των προσκεκλημένων.";
  attendanceFields.hidden = !isAttending;
  updateKidsMenuNote();
  modalScrollPosition = window.scrollY;
  lastRsvpTrigger = document.activeElement;
  document.body.style.setProperty("--modal-scroll-position", `-${modalScrollPosition}px`);
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    window.requestAnimationFrame(() => {
      form.querySelector("input[name='name']").focus({ preventScroll: true });
    });
  }
}

function closeRsvpModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  document.body.style.removeProperty("--modal-scroll-position");
  window.scrollTo(0, modalScrollPosition);
  lastRsvpTrigger?.focus?.({ preventScroll: true });
}

async function submitRsvp(event) {
  event.preventDefault();

  const data = new FormData(form);
  const attendance = data.get("attendance");
  const adultMenus = attendance === "attending" ? Number(data.get("adults") || 0) : 0;
  const kidMenus = attendance === "attending" ? Number(data.get("kids") || 0) : 0;
  const totalGuests = adultMenus + kidMenus;
  const ceremonyAttendance = attendance === "attending" && data.get("ceremony") === "yes";
  const receptionAttendance = attendance === "attending" && data.get("reception") === "yes";

  if (attendance === "attending" && totalGuests < 1) {
    statusEl.textContent = "Προσθέστε τουλάχιστον έναν ενήλικα ή ένα παιδί.";
    return;
  }

  if (attendance === "attending" && !ceremonyAttendance && !receptionAttendance) {
    statusEl.textContent = "Επιλέξτε το μυστήριο, τη δεξίωση ή και τα δύο.";
    return;
  }

  const payload = {
    name: data.get("name"),
    attendance,
    adultMenus,
    kidMenus,
    totalGuests,
    ceremonyAttendance,
    receptionAttendance,
    message: data.get("message"),
    submittedAt: new Date().toISOString(),
    source: window.location.href,
  };

  if (!CONFIG.rsvpEndpoint) {
    statusEl.textContent =
      "Η φόρμα είναι έτοιμη και θα ενεργοποιηθεί μόλις συνδεθεί η υπηρεσία επιβεβαίωσης.";
    console.info("RSVP preview payload:", payload);
    return;
  }

  statusEl.textContent = "Αποστολή...";

  try {
    const body = new URLSearchParams({
      type: "rsvp",
      name: payload.name,
      attendance: payload.attendance,
      adultMenus: String(payload.adultMenus),
      kidMenus: String(payload.kidMenus),
      totalGuests: String(payload.totalGuests),
      ceremonyAttendance: String(payload.ceremonyAttendance),
      receptionAttendance: String(payload.receptionAttendance),
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

    const result = await response.json().catch(() => ({ ok: true }));
    if (result.ok === false) {
      throw new Error(result.message || "The RSVP could not be saved.");
    }

    form.reset();
    updateKidsMenuNote();
    statusEl.textContent = result.updatedExisting
      ? "Ευχαριστούμε! Η προηγούμενη απάντησή σας ενημερώθηκε."
      : "Ευχαριστούμε! Η απάντησή σας στάλθηκε.";
    setTimeout(closeRsvpModal, 900);
  } catch (error) {
    console.error(error);
    statusEl.textContent =
      "Η απάντηση δεν μπόρεσε να σταλεί. Δοκιμάστε ξανά ή επικοινωνήστε απευθείας μαζί μας.";
  }
}

async function submitWish(event) {
  event.preventDefault();

  const data = new FormData(wishForm);
  const payload = {
    type: "wish",
    name: data.get("wishName"),
    message: data.get("wishMessage"),
    submittedAt: new Date().toISOString(),
    source: window.location.href,
  };
  const endpoint = CONFIG.wishesEndpoint || CONFIG.rsvpEndpoint;

  if (!endpoint) {
    wishStatus.textContent =
      "Η αποστολή ευχών θα ενεργοποιηθεί μόλις συνδεθεί η υπηρεσία καταχώρισης.";
    console.info("Wish preview payload:", payload);
    return;
  }

  wishStatus.textContent = "Αποστολή...";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams(payload),
    });

    if (!response.ok) {
      throw new Error(`Wish submission failed with status ${response.status}`);
    }

    const result = await response.json().catch(() => ({ ok: true }));
    if (result.ok === false) {
      throw new Error(result.message || "The wish could not be saved.");
    }

    wishForm.reset();
    wishStatus.textContent = "Ευχαριστούμε! Η ευχή σας στάλθηκε.";
  } catch (error) {
    console.error(error);
    wishStatus.textContent = "Η ευχή δεν μπόρεσε να σταλεί. Δοκιμάστε ξανά αργότερα.";
  }
}

async function copyGiftIban() {
  if (!CONFIG.giftIban) return;

  try {
    await navigator.clipboard.writeText(CONFIG.giftIban);
    ibanStatus.textContent = "Το IBAN αντιγράφηκε.";
  } catch {
    const helper = document.createElement("textarea");
    helper.value = CONFIG.giftIban;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.append(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
    ibanStatus.textContent = "Το IBAN αντιγράφηκε.";
  }
}

function renderPhotoPreview() {
  photoPreview.innerHTML = "";
  photoStatus.textContent = "";

  const files = Array.from(photoFiles.files).slice(0, CONFIG.maxPhotoFiles);
  files.forEach((file) => {
    const item = document.createElement("figure");
    item.className = "photo-preview-item";
    const extension = file.name.split(".").pop()?.toUpperCase() || "IMAGE";
    const canPreview = !/\.(heic|heif)$/i.test(file.name);

    if (canPreview) {
      const image = document.createElement("img");
      const objectUrl = URL.createObjectURL(file);
      image.src = objectUrl;
      image.alt = "";
      const releaseUrl = () => URL.revokeObjectURL(objectUrl);
      image.addEventListener("load", releaseUrl, { once: true });
      image.addEventListener("error", releaseUrl, { once: true });
      item.append(image);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "photo-preview-placeholder";
      placeholder.textContent = extension;
      item.append(placeholder);
    }

    const caption = document.createElement("figcaption");
    caption.innerHTML = `<strong></strong><small>${(file.size / 1024 / 1024).toFixed(1)} MB</small>`;
    caption.querySelector("strong").textContent = file.name;
    item.append(caption);
    photoPreview.append(item);
  });

  if (photoFiles.files.length > CONFIG.maxPhotoFiles) {
    photoStatus.textContent = `Μπορείτε να στείλετε έως ${CONFIG.maxPhotoFiles} φωτογραφίες κάθε φορά.`;
  } else if (files.length) {
    const totalMb = files.reduce((total, file) => total + file.size, 0) / 1024 / 1024;
    photoStatus.textContent = `${files.length} φωτογραφίες επιλέχθηκαν · ${totalMb.toFixed(1)} MB συνολικά`;
  }
}

async function submitPhotos(event) {
  event.preventDefault();

  const files = Array.from(photoFiles.files);
  const uploaderName = String(new FormData(photoForm).get("photoName") || "").trim();
  if (!files.length) {
    photoStatus.textContent = "Επιλέξτε πρώτα τουλάχιστον μία φωτογραφία.";
    return;
  }

  if (!uploaderName) {
    photoStatus.textContent = "Συμπληρώστε το ονοματεπώνυμό σας.";
    return;
  }

  if (files.length > CONFIG.maxPhotoFiles) {
    photoStatus.textContent = `Μπορείτε να στείλετε έως ${CONFIG.maxPhotoFiles} φωτογραφίες κάθε φορά.`;
    return;
  }

  const maxBytes = CONFIG.maxPhotoUploadMb * 1024 * 1024;
  const oversized = files.find((file) => file.size > maxBytes);
  if (oversized) {
    photoStatus.textContent = `Το αρχείο ${oversized.name} είναι μεγαλύτερο από ${CONFIG.maxPhotoUploadMb} MB.`;
    return;
  }

  const unsupported = files.find((file) => !isSupportedPhoto(file));
  if (unsupported) {
    photoStatus.textContent = `Ο τύπος του αρχείου ${unsupported.name} δεν υποστηρίζεται.`;
    return;
  }

  const endpoint = CONFIG.photoUploadEndpoint || CONFIG.rsvpEndpoint;
  if (!endpoint) {
    photoStatus.textContent =
      "Η αποστολή φωτογραφιών θα ενεργοποιηθεί πριν από τον γάμο.";
    return;
  }

  photoSubmit.disabled = true;
  const failures = [];
  let uploaded = 0;

  try {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      photoStatus.textContent = `Αποστολή ${index + 1} από ${files.length}: ${file.name}`;

      try {
        const fileData = await readFileAsBase64(file);
        const body = {
          type: "photo",
          name: uploaderName,
          fileName: file.name,
          mimeType: file.type || "",
          fileSize: String(file.size),
          fileData,
          submittedAt: new Date().toISOString(),
          source: window.location.href,
        };
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=UTF-8" },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          throw new Error(`Photo upload failed with status ${response.status}`);
        }

        const responseText = await response.text();
        let result;
        try {
          result = JSON.parse(responseText);
        } catch {
          throw new Error("Η υπηρεσία αποθήκευσης επέστρεψε μη έγκυρη απάντηση.");
        }
        if (result.ok !== true) {
          throw new Error(result.message || "The photo could not be saved.");
        }
        uploaded += 1;
      } catch (error) {
        console.error(error);
        failures.push({
          name: file.name,
          message: String(error?.message || "Άγνωστο σφάλμα αποστολής."),
        });
      }
    }

    if (!failures.length) {
      photoForm.reset();
      photoPreview.innerHTML = "";
      photoStatus.textContent = `Ευχαριστούμε! Ανέβηκαν ${uploaded} φωτογραφίες.`;
    } else {
      const failedNames = failures.map((failure) => failure.name).join(", ");
      const firstReason = failures[0]?.message;
      photoStatus.textContent = `Ανέβηκαν ${uploaded} από ${files.length}. Δεν στάλθηκαν: ${failedNames}.${firstReason ? ` Αιτία: ${firstReason}` : ""}`;
    }
  } catch (error) {
    console.error(error);
    photoStatus.textContent =
      "Οι φωτογραφίες δεν μπόρεσαν να ανέβουν. Δοκιμάστε ξανά αργότερα.";
  } finally {
    photoSubmit.disabled = false;
  }
}

function isSupportedPhoto(file) {
  const validExtension = /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
  const validMime = !file.type || [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ].includes(file.type.toLowerCase());
  return validExtension && validMime;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",", 2)[1] : result);
    }, { once: true });
    reader.addEventListener("error", () => reject(reader.error), { once: true });
    reader.readAsDataURL(file);
  });
}

function resizeCanvas() {
  if (!canvas || !ctx) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(canvas.offsetWidth * ratio);
  canvas.height = Math.floor(canvas.offsetHeight * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawConstellation(time = 0) {
  if (!canvas || !ctx) return;
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

function heartRadius(angle) {
  const sine = Math.sin(angle);
  const cosine = Math.cos(angle);
  const coefficient = cosine * cosine * sine * sine * sine;

  if (Math.abs(coefficient) < 0.000001) return 1;

  let low = coefficient > 0 ? 1 : 0;
  let high = coefficient > 0 ? 2.25 : 1;
  const evaluate = (radius) =>
    Math.pow(radius * radius - 1, 3) - Math.pow(radius, 5) * coefficient;

  for (let iteration = 0; iteration < 48; iteration += 1) {
    const middle = (low + high) / 2;
    if (evaluate(middle) > 0) high = middle;
    else low = middle;
  }

  return (low + high) / 2;
}

function easeInOutCubic(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function drawHeartEquation(axisProgress, curveProgress, pulse = 0) {
  if (!heartCanvas || !heartContext) return;

  const width = heartCanvas.offsetWidth;
  const height = heartCanvas.offsetHeight;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);

  if (
    heartCanvas.width !== Math.round(width * ratio) ||
    heartCanvas.height !== Math.round(height * ratio)
  ) {
    heartCanvas.width = Math.round(width * ratio);
    heartCanvas.height = Math.round(height * ratio);
    heartContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  heartContext.clearRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height * 0.5;
  const scale = Math.min(width * 0.29, height * 0.31);
  const axisLengthX = width * 0.39 * easeInOutCubic(axisProgress);
  const axisLengthY = height * 0.39 * easeInOutCubic(axisProgress);

  heartContext.save();
  heartContext.lineCap = "round";
  heartContext.strokeStyle = `rgba(111, 121, 104, ${0.16 + axisProgress * 0.34})`;
  heartContext.lineWidth = 1;
  heartContext.beginPath();
  heartContext.moveTo(centerX - axisLengthX, centerY);
  heartContext.lineTo(centerX + axisLengthX, centerY);
  heartContext.moveTo(centerX, centerY + axisLengthY);
  heartContext.lineTo(centerX, centerY - axisLengthY);
  heartContext.stroke();

  if (axisProgress > 0.7) {
    const arrowOpacity = (axisProgress - 0.7) / 0.3;
    heartContext.fillStyle = `rgba(111, 121, 104, ${arrowOpacity * 0.5})`;
    heartContext.beginPath();
    heartContext.moveTo(centerX + axisLengthX + 7, centerY);
    heartContext.lineTo(centerX + axisLengthX - 3, centerY - 4);
    heartContext.lineTo(centerX + axisLengthX - 3, centerY + 4);
    heartContext.closePath();
    heartContext.fill();
    heartContext.beginPath();
    heartContext.moveTo(centerX, centerY - axisLengthY - 7);
    heartContext.lineTo(centerX - 4, centerY - axisLengthY + 3);
    heartContext.lineTo(centerX + 4, centerY - axisLengthY + 3);
    heartContext.closePath();
    heartContext.fill();
  }

  const pointCount = 520;
  const visiblePoints = Math.max(0, Math.floor(pointCount * easeInOutCubic(curveProgress)));
  const points = [];

  if (!heartCurvePoints) {
    heartCurvePoints = Array.from({ length: pointCount + 1 }, (_, index) => {
      const angle = -Math.PI / 2 + (index / pointCount) * Math.PI * 2;
      const radius = heartRadius(angle);
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      };
    });
  }

  for (let index = 0; index <= visiblePoints; index += 1) {
    const point = heartCurvePoints[index];
    points.push({
      x: centerX + point.x * scale,
      y: centerY - point.y * scale,
    });
  }

  if (points.length > 1) {
    heartContext.shadowColor = `rgba(226, 143, 116, ${0.2 + pulse * 0.22})`;
    heartContext.shadowBlur = 8 + pulse * 12;
    heartContext.strokeStyle = "rgba(210, 126, 103, 0.96)";
    heartContext.lineWidth = 2.2 + pulse * 0.8;
    heartContext.beginPath();
    heartContext.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      heartContext.lineTo(points[index].x, points[index].y);
    }
    heartContext.stroke();
    heartContext.shadowBlur = 0;

    if (curveProgress < 0.995) {
      const leadingPoint = points[points.length - 1];
      heartContext.fillStyle = "#c9a865";
      heartContext.beginPath();
      heartContext.arc(leadingPoint.x, leadingPoint.y, 3.6, 0, Math.PI * 2);
      heartContext.fill();
    }
  }

  heartContext.restore();
}

function startMagicDust() {
  if (!magicDustCanvas || !magicDustContext || reducedMotion.matches) return;

  window.cancelAnimationFrame(magicDustFrame);
  const particles = [];
  const colors = [
    [201, 168, 101],
    [226, 143, 116],
    [183, 168, 207],
    [137, 145, 127],
  ];
  const startTime = performance.now();
  let previousTime = startTime;

  function sizeDustCanvas() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = magicDustCanvas.offsetWidth;
    const height = magicDustCanvas.offsetHeight;
    if (
      magicDustCanvas.width !== Math.round(width * ratio) ||
      magicDustCanvas.height !== Math.round(height * ratio)
    ) {
      magicDustCanvas.width = Math.round(width * ratio);
      magicDustCanvas.height = Math.round(height * ratio);
      magicDustContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    return { width, height };
  }

  function addParticle(x, y, options = {}) {
    particles.push({
      x,
      y,
      velocityX: options.velocityX ?? (Math.random() - 0.5) * 34,
      velocityY: options.velocityY ?? -(80 + Math.random() * 105),
      age: 0,
      life: options.life ?? (1.05 + Math.random() * 1.25),
      radius: options.radius ?? (0.9 + Math.random() * 2.2),
      opacity: options.opacity ?? (0.48 + Math.random() * 0.48),
      phase: Math.random() * Math.PI * 2,
      swirl: options.swirl ?? (8 + Math.random() * 24),
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }

  function animateDust(now) {
    const elapsed = now - startTime;
    const delta = Math.min((now - previousTime) / 1000, 0.034);
    previousTime = now;
    const { width, height } = sizeDustCanvas();
    const originX = width / 2;
    const originY = height * 0.61;
    const isMobile = width < 460;
    const streamActive = elapsed > 280 && elapsed < 2100;
    const revealProgress = Math.min(1, Math.max(0, (elapsed - 1280) / 1550));
    const cardWidth = inviteMotion.offsetWidth;
    const cardHeight = inviteMotion.offsetHeight;
    const cardLeft = (width - cardWidth) / 2;
    const cardBottom = (height + cardHeight) / 2;
    const revealY = cardBottom - cardHeight * revealProgress;

    magicDustContext.clearRect(0, 0, width, height);
    magicDustContext.save();
    magicDustContext.globalCompositeOperation = "lighter";

    if (streamActive) {
      const count = isMobile ? 2 : 3;
      for (let index = 0; index < count; index += 1) {
        addParticle(originX + (Math.random() - 0.5) * 22, originY + Math.random() * 10, {
          velocityX: (Math.random() - 0.5) * 24,
          velocityY: -(95 + Math.random() * 120),
          life: 1.35 + Math.random() * 1.25,
        });
      }
    }

    if (revealProgress > 0 && revealProgress < 1) {
      const edgeCount = isMobile ? 3 : 5;

      for (let index = 0; index < edgeCount; index += 1) {
        addParticle(cardLeft + Math.random() * cardWidth, revealY + (Math.random() - 0.5) * 12, {
          velocityX: (Math.random() - 0.5) * 20,
          velocityY: -(18 + Math.random() * 42),
          life: 0.55 + Math.random() * 0.7,
          radius: 0.8 + Math.random() * 1.7,
          swirl: 4 + Math.random() * 10,
        });
      }
    }

    const plumeProgress = Math.min(1, Math.max(0, (elapsed - 320) / 1050));
    if (plumeProgress > 0 && elapsed < 2000) {
      const plumeOpacity = Math.sin(Math.min(1, plumeProgress) * Math.PI) * 0.2;
      magicDustContext.beginPath();
      magicDustContext.moveTo(originX, originY);
      magicDustContext.bezierCurveTo(
        originX - width * 0.11,
        originY - height * 0.13,
        originX + width * 0.13,
        originY - height * 0.3,
        originX - width * 0.025,
        originY - height * 0.47 * plumeProgress,
      );
      magicDustContext.strokeStyle = `rgba(201, 168, 101, ${plumeOpacity})`;
      magicDustContext.lineWidth = 7;
      magicDustContext.shadowColor = "rgba(226, 143, 116, 0.34)";
      magicDustContext.shadowBlur = 18;
      magicDustContext.stroke();
    }

    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.age += delta;
      if (particle.age >= particle.life) {
        particles.splice(index, 1);
        continue;
      }

      const lifeProgress = particle.age / particle.life;
      particle.x += particle.velocityX * delta + Math.sin(particle.phase + particle.age * 5.2) * particle.swirl * delta;
      particle.y += particle.velocityY * delta;
      particle.velocityX *= 0.992;
      particle.velocityY *= 0.995;
      const alpha = Math.sin(lifeProgress * Math.PI) * particle.opacity;
      const [red, green, blue] = particle.color;

      magicDustContext.beginPath();
      magicDustContext.arc(particle.x, particle.y, particle.radius * (1 - lifeProgress * 0.28), 0, Math.PI * 2);
      magicDustContext.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
      magicDustContext.shadowColor = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
      magicDustContext.shadowBlur = 7;
      magicDustContext.fill();
    }

    magicDustContext.restore();

    if (elapsed < 3200 || particles.length) {
      magicDustFrame = requestAnimationFrame(animateDust);
    } else {
      magicDustContext.clearRect(0, 0, width, height);
    }
  }

  magicDustFrame = requestAnimationFrame(animateDust);
}

function startEnvelopeSequence() {
  if (envelopeSequenceStarted) return;
  envelopeSequenceStarted = true;
  invite.classList.add("is-replaying");
  startMagicDust();
  invitationReadyTimer = window.setTimeout(() => {
    invite.classList.add("is-ready");
  }, 3000);
}

function completeEnvelopeSequence() {
  if (invite.classList.contains("is-ready")) return;

  window.clearTimeout(invitationReadyTimer);
  window.clearTimeout(envelopeReleaseTimer);
  invite.classList.add("is-ready");

  window.setTimeout(() => {
    invite.classList.add("is-flipped");
    updateInvitationLabels(true);
  }, 240);

  window.setTimeout(() => {
    invite.classList.remove("is-replaying");
    invite.classList.add("intro-complete");
  }, 1460);
}

function releaseEnvelopeAfterCard() {
  if (invite.classList.contains("is-ready") || invite.classList.contains("is-card-out")) return;
  invite.classList.add("is-card-out");
}

function startInvitationIntro() {
  window.clearTimeout(invitationReadyTimer);
  window.clearTimeout(envelopeReleaseTimer);
  equationIntro?.setAttribute("hidden", "");
  invite.classList.remove("is-ready", "is-flipped", "is-card-out", "intro-complete");
  invite.classList.add("is-intro", "is-replaying");
  updateInvitationLabels(false);

  if (reducedMotion.matches) {
    invite.classList.remove("is-replaying");
    invite.classList.add("is-ready", "is-flipped", "intro-complete");
    updateInvitationLabels(true);
    return;
  }

  envelopeReleaseTimer = window.setTimeout(releaseEnvelopeAfterCard, 3240);
  invitationReadyTimer = window.setTimeout(completeEnvelopeSequence, 4400);
}

window.addEventListener("scroll", setHeaderState, { passive: true });
window.addEventListener("resize", resizeCanvas);
form.addEventListener("submit", submitRsvp);
kidsField.addEventListener("input", updateKidsMenuNote);
photoFiles.addEventListener("change", renderPhotoPreview);
photoForm.addEventListener("submit", submitPhotos);
wishForm.addEventListener("submit", submitWish);
copyIban.addEventListener("click", copyGiftIban);
inviteStage.addEventListener("click", (event) => {
  flipInvitation();
  if (event.detail > 0) inviteStage.blur();
});
inviteStage.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    flipInvitation();
  }
});
inviteStage.addEventListener("pointerup", (event) => {
  if (event.pointerType !== "mouse") inviteStage.blur();
});
flipInvite.addEventListener("click", flipInvitation);
document.querySelector(".invite-motion").addEventListener("animationend", (event) => {
  if (event.animationName === "invitation-release") {
    window.clearTimeout(invitationReadyTimer);
    invite.classList.add("is-ready");
  }
});
folderPocket.addEventListener("animationend", (event) => {
  if (event.animationName === "irl-envelope-depart") {
    completeEnvelopeSequence();
  }
});
document.querySelectorAll("[data-rsvp-open]").forEach((button) => {
  button.addEventListener("pointerup", (event) => {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
    lastRsvpPointerOpen = Date.now();
    openRsvpModal(button.dataset.rsvpOpen);
  });
  button.addEventListener("click", () => {
    if (Date.now() - lastRsvpPointerOpen < 700) return;
    openRsvpModal(button.dataset.rsvpOpen);
  });
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
if (canvas && ctx) requestAnimationFrame(drawConstellation);
if (document.readyState === "complete") {
  startInvitationIntro();
} else {
  window.addEventListener("load", startInvitationIntro, { once: true });
}

if (CONFIG.giftIban) {
  giftIban.textContent = CONFIG.giftIban;
  copyIban.hidden = false;
}

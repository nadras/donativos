// ============================================================
//  DONATIVOS SYSTEM — Google Apps Script Backend
//  Copy this entire file into your Google Apps Script project
// ============================================================

// ── CONFIG (filled automatically by setup wizard, or edit manually) ──────────
const CONFIG = {
  CAMPAIGN_NAME:   "Ven",
  CENTER_NAME:     "test4",
  LEADER_EMAILS:   ["para.nadra@gmail.com"],
  SHEET_ID:        "",   // auto-created on first run
  FOLDER_ID:       "",   // auto-created on first run
  UPLOAD_PAGE_URL: "",   // fill in Step 5 after upload.html is on GitHub Pages
};

// ── SHEET COLUMNS ─────────────────────────────────────────────────────────────
const COLS = {
  TOKEN:       1,
  TIMESTAMP:   2,
  CEDULA:      3,
  NOMBRE:      4,
  CELULAR:     5,
  DESTINO:     6,
  STATUS:      7,
  PHOTO1_URL:  8,
  PHOTO2_URL:  9,
  VIDEO_URL:   10,
  NOTE:        11,
  UPLOAD_TIME: 12,
};

// ── ENTRY POINTS ──────────────────────────────────────────────────────────────

function doGet(e) {
  const action = e.parameter.action || "";

  if (action === "ping") {
    return jsonResponse({ ok: true, center: CONFIG.CENTER_NAME });
  }

  // Serve upload page data by token
  if (action === "getToken") {
    return handleGetToken(e.parameter.token);
  }

  return jsonResponse({ error: "Unknown action" });
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || "";

    if (action === "register")    return handleRegister(data);
    if (action === "uploadMedia") return handleUploadMedia(data);

    return jsonResponse({ error: "Unknown action" });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}


// Run this once manually from the Apps Script editor after pasting the code.
// It forces Google to show the OAuth permission prompt for GmailApp before real donations arrive.
function grantEmailPermission() {
  const recipient = Session.getEffectiveUser().getEmail() || CONFIG.LEADER_EMAILS.find(email => email && email !== "lider@gmail.com");
  if (!recipient) throw new Error("Configura al menos un email válido antes de autorizar Gmail.");

  GmailApp.sendEmail(
    recipient,
    "Sistema de Donativos — permiso de email autorizado",
    "Listo. La cuenta de Google autorizó el envío de notificaciones por email para el Sistema de Donativos."
  );
}

// Run this manually if you want to verify that leader emails are configured and authorized.
function testEmailNotifications() {
  const result = notifyLeaders(
    `Prueba de correo — ${CONFIG.CENTER_NAME}`,
    `Este es un correo de prueba del Sistema de Donativos.\n\nCampaña: ${CONFIG.CAMPAIGN_NAME}\nCentro: ${CONFIG.CENTER_NAME}`
  );

  Logger.log(JSON.stringify(result));

  if (!result.sent.length) {
    throw new Error("No se envió ningún email. Revisa CONFIG.LEADER_EMAILS y que no siga usando lider@gmail.com.");
  }

  if (result.errors.length) {
    throw new Error("Algunos emails fallaron: " + JSON.stringify(result.errors));
  }

  return result;
}

// ── REGISTER HANDLER ──────────────────────────────────────────────────────────

function handleRegister(data) {
  const sheet = getSheet();
  const token = generateToken();
  const now   = new Date();

  const row = new Array(12).fill("");
  row[COLS.TOKEN       - 1] = token;
  row[COLS.TIMESTAMP   - 1] = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  row[COLS.CEDULA      - 1] = data.cedula   || "";
  row[COLS.NOMBRE      - 1] = data.nombre   || "";
  row[COLS.CELULAR     - 1] = data.celular  || "";
  row[COLS.DESTINO     - 1] = data.destino  || "";
  row[COLS.STATUS      - 1] = "Registrado";

  sheet.appendRow(row);

  // Notify leaders via email
  const regSubject = `✅ Nueva entrega — ${data.nombre} → ${data.destino} | ${CONFIG.CENTER_NAME}`;
  const regBody =
    `Se registró una nueva entrega en el sistema.\n\n` +
    `Campaña:  ${CONFIG.CAMPAIGN_NAME}\n` +
    `Centro:   ${CONFIG.CENTER_NAME}\n` +
    `──────────────────────────────\n` +
    `Nombre:   ${data.nombre}\n` +
    `Cédula:   ${data.cedula}\n` +
    `Celular:  ${data.celular}\n` +
    `Destino:  ${data.destino}\n` +
    `Fecha:    ${Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm")}\n` +
    `──────────────────────────────\n` +
    `Estado: Registrado — pendiente evidencia de entrega.\n\n` +
    `Mensaje generado automáticamente por el Sistema de Donativos.`;

  notifyLeaders(regSubject, regBody);

  const uploadLink = buildUploadLink(token);

  return jsonResponse({ ok: true, token, uploadLink });
}

// ── UPLOAD MEDIA HANDLER ───────────────────────────────────────────────────────

function handleUploadMedia(data) {
  const token = data.token;
  if (!token) return jsonResponse({ error: "Token requerido" });

  const sheet = getSheet();
  const rows  = sheet.getDataRange().getValues();
  let rowIndex = -1;
  let rowData  = null;

  for (let i = 1; i < rows.length; i++) {
    if (normalizeToken(rows[i][COLS.TOKEN - 1]) === normalizeToken(token)) {
      rowIndex = i + 1; // 1-based for Sheets
      rowData  = rows[i];
      break;
    }
  }

  if (rowIndex === -1) return jsonResponse({ error: "Token no encontrado" });

  const folder = getDriveFolder();
  const nombre = rowData[COLS.NOMBRE - 1] || "Donante";
  const destino = rowData[COLS.DESTINO - 1] || "Destino";
  const subFolder = folder.createFolder(`${nombre} — ${destino} — ${token.slice(0,6)}`);

  let photo1Url = "", photo2Url = "", videoUrl = "";

  if (data.photo1) {
    const blob = Utilities.newBlob(Utilities.base64Decode(data.photo1), data.photo1Type || "image/jpeg", "foto1.jpg");
    const file = subFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    photo1Url = `https://drive.google.com/file/d/${file.getId()}/view`;
  }

  if (data.photo2) {
    const blob = Utilities.newBlob(Utilities.base64Decode(data.photo2), data.photo2Type || "image/jpeg", "foto2.jpg");
    const file = subFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    photo2Url = `https://drive.google.com/file/d/${file.getId()}/view`;
  }

  if (data.video) {
    const blob = Utilities.newBlob(Utilities.base64Decode(data.video), data.videoType || "video/mp4", "video.mp4");
    const file = subFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    videoUrl = `https://drive.google.com/file/d/${file.getId()}/view`;
  }

  // Update sheet row
  const now = new Date();
  sheet.getRange(rowIndex, COLS.STATUS      ).setValue("Entregado ✅");
  sheet.getRange(rowIndex, COLS.PHOTO1_URL  ).setValue(photo1Url);
  sheet.getRange(rowIndex, COLS.PHOTO2_URL  ).setValue(photo2Url);
  sheet.getRange(rowIndex, COLS.VIDEO_URL   ).setValue(videoUrl);
  sheet.getRange(rowIndex, COLS.NOTE        ).setValue(data.note || "");
  sheet.getRange(rowIndex, COLS.UPLOAD_TIME ).setValue(
    Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
  );

  // Notify leaders via email
  const mediaList = [
    photo1Url ? "Foto 1: " + photo1Url : null,
    photo2Url ? "Foto 2: " + photo2Url : null,
    videoUrl  ? "Video:  " + videoUrl  : null,
  ].filter(Boolean).join("\n");

  const upSubject = `Evidencia recibida — ${nombre} → ${destino} | ${CONFIG.CENTER_NAME}`;
  const upBody =
    `Se subió evidencia de entrega.\n\n` +
    `Campaña:  ${CONFIG.CAMPAIGN_NAME}\n` +
    `Centro:   ${CONFIG.CENTER_NAME}\n` +
    `──────────────────────────────\n` +
    `Nombre:   ${nombre}\n` +
    `Destino:  ${destino}\n` +
    `Fecha:    ${Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm")}\n` +
    `──────────────────────────────\n` +
    `Archivos subidos:\n${mediaList}\n` +
    (data.note ? `\nNota del donante:\n${data.note}\n` : "") +
    `\nMensaje generado automáticamente por el Sistema de Donativos.`;

  notifyLeaders(upSubject, upBody);

  return jsonResponse({ ok: true });
}

// ── GET TOKEN INFO (for upload page pre-fill) ─────────────────────────────────

function handleGetToken(token) {
  if (!token) return jsonResponse({ error: "Token requerido" });

  const sheet = getSheet();
  const rows  = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (normalizeToken(rows[i][COLS.TOKEN - 1]) === normalizeToken(token)) {
      return jsonResponse({
        ok:      true,
        nombre:  rows[i][COLS.NOMBRE  - 1],
        destino: rows[i][COLS.DESTINO - 1],
        status:  rows[i][COLS.STATUS  - 1],
      });
    }
  }

  return jsonResponse({ error: "Token no encontrado" });
}

// ── EMAIL NOTIFICATIONS ──────────────────────────────────────────────────────

function notifyLeaders(subject, body) {
  const result = { sent: [], skipped: [], errors: [] };

  CONFIG.LEADER_EMAILS.forEach(rawEmail => {
    const email = String(rawEmail || "").trim();

    if (!email || email === "lider@gmail.com") {
      result.skipped.push(email || "empty");
      return;
    }

    try {
      GmailApp.sendEmail(email, subject, body);
      result.sent.push(email);
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      result.errors.push({ email, message });
      Logger.log(`Email error for ${email}: ${message}`);
    }
  });

  Logger.log(`Email notification result: ${JSON.stringify(result)}`);
  return result;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function normalizeToken(value) {
  return String(value || "").trim().toUpperCase();
}

function buildUploadLink(token) {
  const uploadPageUrl = (CONFIG.UPLOAD_PAGE_URL || "").trim();
  const encodedToken = encodeURIComponent(token);

  if (!uploadPageUrl) {
    throw new Error("UPLOAD_PAGE_URL no está configurado. Usa la URL completa de GitHub Pages para upload.html.");
  }

  const separator = uploadPageUrl.includes("?") ? "&" : "?";
  return `${uploadPageUrl}${separator}token=${encodedToken}`;
}

function generateToken() {
  return Utilities.getUuid().replace(/-/g, "").slice(0, 16).toUpperCase();
}

function getSheet() {
  const savedSheetId = PropertiesService.getScriptProperties().getProperty("SHEET_ID") || CONFIG.SHEET_ID;

  if (savedSheetId) {
    const ss = SpreadsheetApp.openById(savedSheetId);
    PropertiesService.getScriptProperties().setProperty("SHEET_ID", ss.getId());
    return ss.getSheets()[0];
  }

  // Auto-create only once, then persist the ID in Script Properties.
  const ss = SpreadsheetApp.create(`${CONFIG.CAMPAIGN_NAME} — ${CONFIG.CENTER_NAME}`);
  PropertiesService.getScriptProperties().setProperty("SHEET_ID", ss.getId());

  const sheet = ss.getActiveSheet();
  sheet.setName("Registros");
  sheet.appendRow([
    "Token", "Fecha Registro", "Cédula", "Nombre", "Celular",
    "Destino", "Estado", "Foto 1", "Foto 2", "Video", "Nota", "Fecha Entrega"
  ]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, 12).setFontWeight("bold").setBackground("#1B4332").setFontColor("#ffffff");
  return sheet;
}

function getDriveFolder() {
  const savedId = PropertiesService.getScriptProperties().getProperty("FOLDER_ID") || CONFIG.FOLDER_ID;

  if (savedId) {
    try { return DriveApp.getFolderById(savedId); } catch(e) {}
  }

  const folder = DriveApp.createFolder(`📦 ${CONFIG.CAMPAIGN_NAME} — ${CONFIG.CENTER_NAME}`);
  PropertiesService.getScriptProperties().setProperty("FOLDER_ID", folder.getId());
  return folder;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

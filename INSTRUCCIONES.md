# 📦 Sistema de Donativos — Guía de Instalación Completa

## ¿Qué incluye este sistema?

| Archivo | Función |
|---|---|
| `setup.html` | Asistente de configuración (solo para el organizador) |
| `form.html` | Formulario de registro para donantes (enlace del QR) |
| `upload.html` | Página para subir foto/video de entrega |
| `Code.gs` | Backend en Google Apps Script (la "base de datos" y notificaciones) |

---

## PASO 1 — Configurar Google Apps Script

### 1.1 Abre Google Apps Script
1. Ve a [script.google.com](https://script.google.com)
2. Inicia sesión con la cuenta de Google del organizador
3. Haz clic en **"Nuevo proyecto"**
4. Bórralo que hay en el editor y pega todo el contenido de `Code.gs`

### 1.2 Ejecuta el asistente de configuración
1. Abre `setup.html` en tu navegador (doble clic)
2. Completa los 5 pasos del asistente
3. En el **Paso 4**, copia el bloque CONFIG generado
4. Pégalo al inicio de tu `Code.gs` en Apps Script, **reemplazando** el bloque CONFIG existente
5. Guarda el proyecto (Ctrl+S o ⌘+S)

---

## PASO 2 — Emails de los líderes (sin configuración extra)

Los correos se envían automáticamente usando **GmailApp**, un servicio nativo de Google Apps Script. No se necesita ninguna API externa ni activación.

Solo asegúrate de:
1. Ingresar los emails correctos de los líderes en el **Paso 2 del asistente**
2. Que la cuenta de Google donde instalaste el Apps Script tenga Gmail activo (todas las cuentas Gmail lo tienen)

> ✅ Cuando alguien registre una entrega, los líderes recibirán un email al instante. Lo mismo cuando se suba evidencia fotográfica.

---

## PASO 3 — Publicar el Apps Script como Web App

1. En Google Apps Script, haz clic en **"Implementar"** → **"Nueva implementación"**
2. Haz clic en el ícono de engranaje ⚙️ junto a "Tipo" y selecciona **"Aplicación web"**
3. Configura así:
   - **Descripción:** `Donativos v1`
   - **Ejecutar como:** `Yo (tu email)`
   - **Quién puede acceder:** `Cualquier persona`
4. Haz clic en **"Implementar"**
5. Acepta los permisos cuando te los pida (esto es normal y necesario)
6. Copia la **URL del Web App** que aparece (empieza con `https://script.google.com/macros/s/...`)

> 📌 **Guarda esta URL** — la necesitas en el siguiente paso.

---

## PASO 4 — Configurar los archivos HTML

### 4.1 Actualiza form.html y upload.html
En cada uno de estos dos archivos, busca esta sección cerca del inicio del `<script>`:

```javascript
window.APP_CONFIG = {
  SCRIPT_URL:   "",   // ← Aquí
  ...
};
```

Y pega la URL del Web App entre las comillas. También puedes copiar el bloque completo generado en el **Paso 4** del asistente de configuración.

### 4.2 También en Code.gs
Asegúrate de que `DEPLOYED_URL` en el CONFIG tenga la URL del Web App:

```javascript
DEPLOYED_URL: "https://script.google.com/macros/s/TU_URL/exec",
```

Después de editar, guarda y vuelve a **Implementar → Administrar implementaciones → ✏️ Editar → Versión: Nueva versión → Actualizar**.

---

## PASO 5 — Alojar los archivos HTML (gratuito)

Los archivos `form.html` y `upload.html` necesitan estar en línea para que la gente pueda acceder.

### Opción A: GitHub Pages (recomendado, gratis)
1. Crea una cuenta en [github.com](https://github.com)
2. Crea un repositorio nuevo → ponle nombre → "Public"
3. Sube `form.html` y `upload.html`
4. Ve a Settings → Pages → Source: `main` branch → Save
5. Tu URL será: `https://tunombre.github.io/tu-repo/form.html`

### Opción B: Netlify Drop (más fácil, gratis)
1. Ve a [app.netlify.com/drop](https://app.netlify.com/drop)
2. Arrastra la carpeta con tus archivos HTML
3. Netlify te da una URL al instante

### Opción C: Hosting propio
Sube los archivos a tu hosting como cualquier archivo HTML estático.

---

## PASO 6 — Generar el código QR

1. Ve a [qrcode-monkey.com](https://www.qrcode-monkey.com) o [qr.io](https://qr.io)
2. Pega la URL de tu `form.html` (ej: `https://tunombre.github.io/donativos/form.html`)
3. Personaliza el color si quieres (verde recomendado 🟢)
4. Descarga en alta resolución (PNG 1000px mínimo)
5. Imprime y coloca en el centro de acopio

---

## PASO 7 — Prueba completa

Antes de activar el sistema, haz una prueba de extremo a extremo:

- [ ] Escanea el QR con tu teléfono
- [ ] Llena el formulario con datos de prueba
- [ ] Verifica que el líder recibe el WhatsApp de confirmación
- [ ] Guarda el enlace de subida en WhatsApp (usando el botón verde)
- [ ] Abre el enlace, sube una foto real
- [ ] Verifica que el Google Drive tiene la carpeta con la foto
- [ ] Verifica que el Google Sheets tiene el registro completo con la URL de la foto
- [ ] Verifica que el líder recibe el WhatsApp de "Evidencia Recibida"

---

## ESTRUCTURA DEL GOOGLE SHEETS

Las columnas creadas automáticamente son:

| Token | Fecha Registro | Cédula | Nombre | Celular | Destino | Estado | Foto 1 | Foto 2 | Video | Nota | Fecha Entrega |
|---|---|---|---|---|---|---|---|---|---|---|---|

El estado cambia de `Registrado` → `Entregado ✅` cuando sube la evidencia.

---

## GOOGLE DRIVE

Se crea automáticamente una carpeta llamada:
```
📦 [Campaña] — [Centro]
  └── Juan Pérez — Comunidad El Progreso — ABC123/
        ├── foto1.jpg
        ├── foto2.jpg (si aplica)
        └── video.mp4 (si aplica)
```

---

## Agregar un nuevo centro de acopio

1. Copia todos los archivos a una nueva carpeta
2. Abre `setup.html` y completa con los datos del nuevo centro
3. Crea un nuevo proyecto en Google Apps Script con el nuevo `Code.gs`
4. Cada centro tiene su propio Sheets, Drive y URL de formulario
5. Genera un QR nuevo para ese centro

---

## Preguntas frecuentes

**¿Funciona sin internet en el lugar de entrega?**
El formulario y la subida de fotos requieren internet. El enlace se guarda en WhatsApp y funciona en cualquier momento.

**¿Qué pasa si el video es muy grande?**
Videos mayores a ~50MB pueden fallar. Recomendamos máximo 1 minuto de video o comprimir antes de subir.

**¿Puedo cambiar los líderes de WhatsApp después?**
Sí. Edita el bloque CONFIG en `Code.gs` y vuelve a publicar (Implementar → Actualizar).

**¿El sistema soporta múltiples centros al mismo tiempo?**
Sí, cada centro tiene sus propios archivos y su propio Apps Script. Pueden correr en paralelo.

**¿Qué pasa si alguien intenta usar el enlace de upload dos veces?**
El sistema detecta que ya se subió evidencia y muestra un aviso. No sobreescribe los archivos.

---

*Sistema desarrollado para gestión de donativos. Datos almacenados en Google Drive y Google Sheets de la cuenta del organizador.*

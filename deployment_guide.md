# 🚀 Guía de Despliegue en Hostinger

Sigue estos pasos para subir tu proyecto a **live.americolabs.com**.

## 1. Preparar la Base de Datos en Hostinger
1. Entra a tu **Panel de Hostinger (hPanel)**.
2. Ve a **Bases de Datos** > **Gestión de Bases de Datos**.
3. Crea una nueva base de datos MySQL (ejemplo: `u636084353_jukebox`).
4. Anota el **Nombre de la base de datos**, **Usuario** y **Contraseña**.
5. Ve a **phpMyAdmin** para esa base de datos e **Importa** el archivo `init.sql` que tienes en tu proyecto.

## 2. Subir el Código
Puedes hacerlo de dos formas:
- **Git**: Conecta tu repositorio de GitHub en el panel de Hostinger (recomendado).
- **FTP/Administrador de Archivos**: Sube todos los archivos (excepto `node_modules`).

## 3. Configurar Node.js en Hostinger
1. En el hPanel, busca **Node.js**.
2. Selecciona la versión **20.x** o **22.x**.
3. **Application Root**: Pon la carpeta donde subiste el código (ej: `public_html`).
4. **Application Mode**: `production`.
5. **Application Startup File**: `dist/server.cjs`.
6. Haz clic en **Setup** y luego en **Run build**.

## 4. Configurar Variables de Entorno (.env)
En la misma sección de Node.js o creando un archivo `.env` en la raíz del servidor, agrega lo siguiente (con tus datos reales):

```env
DB_HOST=127.0.0.1
DB_USER=u636084353_tu_usuario
DB_PASSWORD=tu_password
DB_NAME=u636084353_tu_db
PORT=3000
NODE_ENV=production
```

## 5. Comandos Útiles (SSH)
Como ya tienes acceso por SSH, puedes ejecutar estos comandos dentro de la carpeta del proyecto:

1. **Instalar dependencias**:
   ```bash
   npm install --production
   ```

2. **Generar el build (Frontend y Servidor empacado)**:
   ```bash
   npm run build
   ```

3. **Ver logs (si usas PM2 o similar)**:
   Si Hostinger no te muestra los logs, puedes usar `tail -f logs/error.log` (depende de la configuración).

---

> [!TIP]
> Si tienes problemas con las rutas, asegúrate de que el **Directorio de la Aplicación** en el panel de Node.js coincida con donde subiste los archivos.

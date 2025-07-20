# Pederseo Server

Un servidor Express básico listo para desplegar en Render.

## 🚀 Características

- Servidor Express básico con CORS habilitado
- Rutas de ejemplo (GET y POST)
- Manejo de errores
- Configuración lista para Render
- Health check endpoint

## 📋 Prerrequisitos

- Node.js 18+ 
- npm o yarn

## 🛠️ Instalación

1. Clona el repositorio:
```bash
git clone <tu-repositorio>
cd pederseoServer
```

2. Instala las dependencias:
```bash
npm install
```

## 🏃‍♂️ Desarrollo Local

Para ejecutar en modo desarrollo (con auto-reload):
```bash
npm run dev
```

Para ejecutar en modo producción:
```bash
npm start
```

El servidor estará disponible en: `http://localhost:3000`

## 📡 Endpoints Disponibles

### GET `/`
- **Descripción**: Página principal
- **Respuesta**: Mensaje de bienvenida con timestamp

### GET `/api/health`
- **Descripción**: Health check del servidor
- **Respuesta**: Estado del servidor y uptime

### GET `/api/info`
- **Descripción**: Información del servidor
- **Respuesta**: Nombre, versión, ambiente y puerto

### POST `/api/data`
- **Descripción**: Endpoint de ejemplo para POST
- **Body**: `{ "message": "tu mensaje" }`
- **Respuesta**: Confirmación del mensaje recibido

## 🌐 Despliegue en Render

### 1. Preparar el Repositorio
Asegúrate de que tu código esté en un repositorio de GitHub, GitLab o Bitbucket.

### 2. Crear un Nuevo Web Service en Render
1. Ve a [render.com](https://render.com)
2. Haz clic en "New +" → "Web Service"
3. Conecta tu repositorio
4. Configura el servicio:
   - **Name**: `pederseo-server` (o el nombre que prefieras)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (o el plan que prefieras)

### 3. Variables de Entorno (Opcional)
Si necesitas variables de entorno, puedes agregarlas en la sección "Environment Variables":
- `NODE_ENV`: `production`
- `PORT`: Render asignará automáticamente el puerto

### 4. Desplegar
Haz clic en "Create Web Service" y Render comenzará el despliegue automáticamente.

## 🔧 Configuración

El servidor usa las siguientes variables de entorno:
- `PORT`: Puerto del servidor (por defecto: 3000)
- `NODE_ENV`: Ambiente de ejecución (development/production)

## 📝 Scripts Disponibles

- `npm start`: Ejecuta el servidor en modo producción
- `npm run dev`: Ejecuta el servidor en modo desarrollo con nodemon
- `npm test`: Ejecuta las pruebas (configurar según necesidades)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia ISC.
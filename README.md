# HealthTrack Pharmacy Management System

Sistema de gestión farmacéutica con Node.js, Express y SQL Server.

## Instalación

1. Asegúrate de tener Node.js instalado (v18 o superior)
2. Abre una terminal en la carpeta del proyecto
3. Ejecuta: ```npm install```

## Configuración

1. Edita el archivo `.env` con tu configuración de base de datos
2. Asegúrate de que SQL Server esté corriendo
3. Verifica que la base de datos HealthTrackDB exista

## Ejecutar

### Modo desarrollo (con auto-reload):
```
npm run dev
```

### Modo producción:
```
npm start
```

Abre tu navegador en: http://localhost:3000

## Credenciales de Prueba

- **Usuario:** JD12345
- **Contraseña:** JOHND_HASH_12345

## Estructura del Proyecto

```
healthtrack-pharmacy/
├── backend/
│   ├── config/          # Configuración de base de datos
│   ├── middleware/      # Middleware de autenticación
│   ├── routes/          # Rutas API
│   └── server.js        # Servidor Express
├── frontend/
│   ├── css/            # Estilos
│   ├── js/             # JavaScript del cliente
│   └── *.html          # Páginas HTML
└── package.json
```

## Tecnologías

- **Backend:** Node.js + Express
- **Database:** SQL Server 2025
- **Frontend:** HTML + CSS + JavaScript
- **Session:** express-session

## Autor

Proyecto universitario - Sistema de Gestión Farmacéutica

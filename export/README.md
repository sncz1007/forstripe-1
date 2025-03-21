# Formulario de Pago con Validación de RUT Chileno

## Descripción
Este proyecto implementa un formulario de pago con validación de RUT chileno, un panel de administración en tiempo real, y comunicación bidireccional entre el usuario y el administrador. El sistema permite a los usuarios enviar su información de RUT y esperar aprobación, mientras los administradores pueden ver, procesar y responder a estas solicitudes.

## Características Principales
- Validación de RUT chileno con formato y validación de dígito verificador
- Comunicación en tiempo real mediante WebSockets
- Panel de administración para gestionar solicitudes de pago
- API REST para respaldo y mayor robustez
- Interfaz responsiva y amigable para el usuario
- Procesamiento de solicitudes en diferentes estados (pendiente, procesando, completado, rechazado)

## Tecnologías Utilizadas
- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Node.js, Express
- **Comunicación**: WebSockets (ws), REST API
- **Herramientas**: Vite, TanStack Query, Zod (validación)

## Estructura del Proyecto
Los archivos principales se encuentran organizados en la siguiente estructura:

```
├── server/                    # Código del servidor
│   ├── index.ts               # Punto de entrada del servidor
│   ├── routes.ts              # Definición de rutas y WebSockets
│   ├── storage.ts             # Gestión de almacenamiento
│   └── vite.ts                # Configuración de Vite
├── client/src/                # Código del cliente
│   ├── App.tsx                # Componente principal y rutas
│   ├── main.tsx               # Punto de entrada del cliente
│   ├── pages/                 # Páginas de la aplicación
│   │   ├── PaymentPage.tsx    # Página de pago con validación de RUT
│   │   ├── LoadingPage.tsx    # Página de carga y resultados
│   │   └── AdminPanel.tsx     # Panel de administración
│   ├── hooks/                 # Hooks personalizados
│   │   └── use-websocket.ts   # Hook para WebSockets
│   └── components/            # Componentes reutilizables
│       └── RutInput.tsx       # Componente de entrada RUT
└── shared/                    # Código compartido
    └── schema.ts              # Esquemas de datos
```

## Flujo de la Aplicación
1. El usuario ingresa su RUT en la página principal
2. El formulario valida el RUT (formato y dígito verificador)
3. Al enviar, el usuario es redirigido a una página de carga
4. El administrador ve la solicitud en su panel de control
5. El administrador completa los datos adicionales (contrato, vehículo, monto, enlace)
6. El administrador aprueba o rechaza la solicitud
7. El usuario recibe la respuesta en tiempo real y ve el resultado

## Instalación y Ejecución
1. Clona el repositorio
2. Instala las dependencias: `npm install`
3. Inicia la aplicación en modo desarrollo: `npm run dev`
4. Accede a la aplicación: http://localhost:5000
5. Para el panel de administración: http://localhost:5000/admin

## Contribuciones
Este proyecto fue desarrollado como parte de un ejercicio práctico. Si deseas contribuir, por favor crear un fork y enviar pull requests.

## Licencia
MIT
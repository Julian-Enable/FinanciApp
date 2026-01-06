# FinanciApp

Aplicación web de control financiero personal con sincronización en la nube.

## Características

- 💰 **Dashboard**: Resumen de ingresos, gastos y balance
- 💳 **Deudas**: Gestión de deudas con pagos mensuales
- 💵 **Ingresos**: Registro de fuentes de ingreso
- 🛒 **Gastos**: Categorización y seguimiento de gastos
- 📅 **Calendario**: Vista de próximos pagos
- ☁️ **Sincronización**: Datos sincronizados en todos tus dispositivos
- 🌙 **Dark Mode**: Diseño oscuro elegante

## Configuración de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Crea un nuevo proyecto (o usa uno existente)
3. Agrega una app web (ícono `</>`)
4. Copia la configuración y pégala en `app.js`
5. En Authentication, habilita:
   - Google
   - Email/Password
6. En Firestore Database:
   - Crear base de datos
   - Iniciar en modo de prueba (o configurar reglas)

### Reglas de Firestore recomendadas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{collection}/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

## Deploy en Netlify

1. Sube este código a GitHub
2. Conecta el repositorio en [Netlify](https://netlify.com)
3. Deploy automático configurado

## Tecnologías

- HTML5, CSS3, JavaScript ES6+
- Firebase Authentication
- Cloud Firestore
- Netlify Hosting

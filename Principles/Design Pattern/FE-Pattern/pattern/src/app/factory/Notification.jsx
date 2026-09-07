function SuccessNotification() { /* ... */ }
function ErrorNotification() { /* ... */ }
function InfoNotification() { /* ... */ }

function NotificationFactory(type) {
  switch(type) {
    case 'success': return SuccessNotification;
    case 'error': return ErrorNotification;
    case 'info': return InfoNotification;
    default: return () => null;
  }
}

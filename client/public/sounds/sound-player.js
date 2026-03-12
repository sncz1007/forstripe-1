// sound-player.js - Sistema simple de reproducción de audio
// Este archivo proporciona funciones directas para reproducir sonidos en el navegador

/**
 * Reproducir un sonido de forma simple y directa
 * @param {string} soundPath - Ruta al archivo de sonido
 * @param {number} volume - Volumen (0-1)
 */
function playSound(soundPath, volume = 1.0) {
  try {
    console.log('🔊 Intentando reproducir sonido:', soundPath);
    
    // Crear elemento de audio temporal
    const audio = new Audio(soundPath);
    audio.volume = volume;
    
    // Intento de reproducción con manejo básico de errores
    audio.play()
      .then(() => console.log('✅ Reproducción iniciada:', soundPath))
      .catch(err => {
        console.error('❌ Error al reproducir sonido:', err.message);
        
        // Intentar una estrategia alternativa si hay un error de autoplay
        if (err.name === 'NotAllowedError') {
          console.warn('⚠️ Reproducción automática bloqueada. El usuario debe interactuar primero.');
          
          // Mostramos un indicador visual para que el usuario interactúe
          const notificationDiv = document.createElement('div');
          notificationDiv.style.position = 'fixed';
          notificationDiv.style.bottom = '20px';
          notificationDiv.style.right = '20px';
          notificationDiv.style.backgroundColor = '#4CAF50';
          notificationDiv.style.color = 'white';
          notificationDiv.style.padding = '10px';
          notificationDiv.style.borderRadius = '5px';
          notificationDiv.style.cursor = 'pointer';
          notificationDiv.style.zIndex = '9999';
          notificationDiv.textContent = 'Haz clic aquí para habilitar sonidos';
          
          notificationDiv.onclick = function() {
            // Al hacer clic, intentamos reproducir el sonido nuevamente
            audio.play()
              .then(() => {
                console.log('✅ Reproducción iniciada después de interacción');
                document.body.removeChild(notificationDiv);
              })
              .catch(e => console.error('❌ Error reproduciendo incluso después de interacción:', e));
          };
          
          document.body.appendChild(notificationDiv);
          
          // Auto-remover después de 10 segundos
          setTimeout(() => {
            if (document.body.contains(notificationDiv)) {
              document.body.removeChild(notificationDiv);
            }
          }, 10000);
        }
      });
      
    return true;
  } catch (err) {
    console.error('❌ Error general reproduciendo sonido:', err);
    return false;
  }
}

// Función específica para reproducir el sonido de Squirtle
window.playSquirtleSound = function() {
  return playSound('/sounds/squirtle.mp3', 1.0);
};

// Función específica para reproducir el sonido de notificación
window.playNotificationSound = function() {
  return playSound('/sounds/notification.mp3', 1.0);
};

// Alias para mantener compatibilidad 
window.playPaymentCompletedSound = window.playNotificationSound;

console.log('🎵 Sistema de reproducción de audio cargado (v2)');
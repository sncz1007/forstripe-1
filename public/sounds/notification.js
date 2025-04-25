/**
 * Sistema simple de notificaciones de audio
 * 
 * Este script proporciona funciones para reproducir sonidos
 * a través de los altavoces del computador
 */

// Crear elementos de audio globales con autoplay para funcionamiento más seguro
const squirtleAudio = new Audio('/sounds/squirtle.mp3');
squirtleAudio.id = 'squirtle-audio';
squirtleAudio.preload = 'auto';

const notificationAudio = new Audio('/sounds/notification.mp3');
notificationAudio.id = 'notification-audio';
notificationAudio.preload = 'auto';

// Configurar volumen alto para ambos
squirtleAudio.volume = 1.0;
notificationAudio.volume = 1.0;

/**
 * Función simple para reproducir un sonido
 */
function playSound(audioElement) {
  console.log('⏯️ Intentando reproducir sonido...');
  
  // Reiniciar el audio para asegurar que se reproduzca desde el principio
  audioElement.currentTime = 0;
  
  // Intentar reproducir
  const playPromise = audioElement.play();
  
  if (playPromise !== undefined) {
    playPromise.then(() => {
      console.log('✅ Reproducción de audio iniciada correctamente');
      return true;
    }).catch(error => {
      console.error('❌ Error reproduciendo audio:', error);
      // Intento alternativo con un clic automático para desbloquear el audio
      if (error.name === 'NotAllowedError') {
        console.warn('🔓 Intentando desbloquear audio con interacción simulada...');
        // Muchos navegadores requieren interacción del usuario
      }
      return false;
    });
  }
  
  return true;
}

// Función global para reproducir el sonido Squirtle
window.playSquirtleSound = function() {
  console.log('🔊 Reproduciendo sonido Squirtle');
  return playSound(squirtleAudio);
};

// Función global para reproducir el sonido de notificación
window.playPaymentCompletedSound = function() {
  console.log('🔊 Reproduciendo sonido de notificación');
  return playSound(notificationAudio);
};

// Desbloquear audio en el primer clic
document.addEventListener('click', function unlockAudio() {
  console.log('👆 Evento de clic detectado, desbloqueando audio...');
  
  // Intentar reproducir y pausar rápidamente para desbloquear
  const silent = new Audio();
  silent.play().then(() => {
    silent.pause();
    console.log('🔓 Audio desbloqueado por interacción del usuario');
    
    // Precargamos los sonidos reales
    squirtleAudio.load();
    notificationAudio.load();
    
    // Eliminar el evento después del primer clic
    document.removeEventListener('click', unlockAudio);
  }).catch(err => {
    console.error('❌ No se pudo desbloquear el audio:', err);
  });
});

console.log('🎵 Sistema de notificaciones de audio v2 cargado correctamente');
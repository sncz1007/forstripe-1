// Sistema muy simple para reproducir sonidos
console.log('Cargando sistema básico de reproducción de sonido');

// Función global para reproducir cualquier sonido
window.playAudio = function(audioPath) {
  const audio = new Audio(audioPath);
  audio.volume = 1.0;
  
  try {
    console.log('Reproduciendo: ' + audioPath);
    audio.play().catch(err => {
      console.error('Error reproduciendo sonido: ' + err.message);
      
      // Si falla por falta de interacción del usuario, mostramos un mensaje visual
      if (err.name === 'NotAllowedError') {
        const div = document.createElement('div');
        div.textContent = 'Click para habilitar sonidos';
        div.style.position = 'fixed';
        div.style.bottom = '10px';
        div.style.right = '10px';
        div.style.backgroundColor = '#3498db';
        div.style.color = 'white';
        div.style.padding = '10px';
        div.style.borderRadius = '5px';
        div.style.zIndex = '9999';
        div.style.cursor = 'pointer';
        
        div.onclick = function() {
          audio.play().then(() => {
            document.body.removeChild(div);
          }).catch(() => {
            console.error('Aún no se puede reproducir audio');
          });
        };
        
        document.body.appendChild(div);
        
        // Auto eliminar después de 5 segundos
        setTimeout(() => {
          if (document.body.contains(div)) {
            document.body.removeChild(div);
          }
        }, 5000);
      }
    });
  } catch (err) {
    console.error('Error general reproduciendo audio: ' + err.message);
  }
};
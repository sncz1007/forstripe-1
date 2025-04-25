/**
 * Declaración de tipos para la funcionalidad de audio
 */

interface Window {
  /**
   * Reproduce un archivo de audio a través de los altavoces
   * @param audioPath Ruta al archivo de audio a reproducir
   */
  playAudio: (audioPath: string) => void;
}
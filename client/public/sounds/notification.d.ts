/**
 * Type declarations for the notification.js audio system
 */

// Extend the global Window interface to include our custom audio methods
interface Window {
  /**
   * Plays the Squirtle sound through computer speakers
   * @returns A promise that resolves when the sound finishes playing
   */
  playSquirtleSound(): Promise<boolean>;
  
  /**
   * Plays the payment completed notification sound through computer speakers
   * @returns A promise that resolves when the sound finishes playing
   */
  playPaymentCompletedSound(): Promise<boolean>;
}

// Export interfaces for direct import in TS files
export interface NotificationAudio {
  /**
   * Plays a sound file from the specified URL
   * @param soundUrl The URL of the sound file to play
   * @returns A promise that resolves when the sound finishes playing
   */
  playSound(soundUrl: string): Promise<boolean>;
  
  /**
   * Plays the Squirtle sound through computer speakers
   * @returns A promise that resolves when the sound finishes playing
   */
  playSquirtleSound(): Promise<boolean>;
  
  /**
   * Plays the payment completed notification sound through computer speakers
   * @returns A promise that resolves when the sound finishes playing
   */
  playPaymentCompletedSound(): Promise<boolean>;
}
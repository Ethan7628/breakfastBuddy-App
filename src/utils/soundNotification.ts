export const playNotificationSound = () => {
  // Create a simple notification sound using Web Audio API
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Create oscillator for a pleasant notification sound
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Set frequency for a pleasant notification tone
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
  oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
  
  // Set volume envelope
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  
  // Play sound
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
};
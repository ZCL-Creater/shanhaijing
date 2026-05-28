import { AudioManager } from '../audio/AudioManager';

export class MuteButton {
  static init() {
    const btn = document.getElementById('mute-btn');
    if (!btn) return;

    // 读取并应用静音状态
    AudioManager.loadMuteState();
    btn.textContent = AudioManager.isMuted ? '🔇' : '🔊';

    btn.addEventListener('click', () => {
      AudioManager.toggleMute();
      btn.textContent = AudioManager.isMuted ? '🔇' : '🔊';
    });
  }
}

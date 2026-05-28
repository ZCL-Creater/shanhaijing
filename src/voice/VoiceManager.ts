/**
 * 语音管理器 —— 使用浏览器原生 Web Speech API
 *
 * 不依赖任何外部服务，纯浏览器端 TTS。
 * 每位 NPC 拥有独立声线配置（音调 pitch / 语速 rate）。
 */

export interface VoiceOptions {
  pitch: number   // 音调: 0.5 ~ 2（默认 1）
  rate: number    // 语速: 0.5 ~ 2（默认 1）
  voiceName?: string
}

export class VoiceManager {
  private static voicesLoaded = false

  /**
   * 预加载浏览器声线列表（游戏启动时调用一次）
   * 部分浏览器异步加载 voices，需要在 onvoiceschanged 之后才能获取全部列表
   */
  static init(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      this.voicesLoaded = true
    }

    // 监听异步加载完成
    window.speechSynthesis.onvoiceschanged = () => {
      this.voicesLoaded = true
    }
  }

  /**
   * 使用合成语音朗读文本
   *
   * @param text   需要朗读的文本
   * @param pitch  音调（0.5-2，默认 1）
   * @param rate   语速（0.5-2，默认 1）
   * @param voiceName 可选：尝试匹配的声线名称（如 'Tingting'）
   */
  static speak(
    text: string,
    pitch: number = 1,
    rate: number = 1,
    voiceName?: string,
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    // 停止当前正在播放的语音
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.pitch = Math.max(0.5, Math.min(2, pitch))
    utterance.rate = Math.max(0.5, Math.min(2, rate))

    // 可选：尝试指定声线（如果浏览器支持）
    if (voiceName) {
      const voices = window.speechSynthesis.getVoices()
      const targetVoice = voices.find(v => v.name.includes(voiceName))
      if (targetVoice) {
        utterance.voice = targetVoice
      }
    }

    window.speechSynthesis.speak(utterance)
  }

  /**
   * 立即停止所有语音
   */
  static stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }
}

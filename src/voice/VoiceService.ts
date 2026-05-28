/**
 * 语音合成服务
 *
 * 使用浏览器原生 window.speechSynthesis API，
 * 当 NPC 回复时自动以中文女声朗读回复内容。
 *
 * 特点：
 * - 优先匹配中文女声音色
 * - 自动取消上一次未播完的语音
 * - 静默降级：不支持 TTS 的浏览器无感跳过
 */

export class VoiceService {
  private synth: SpeechSynthesis | null = null
  private selectedVoice: SpeechSynthesisVoice | null = null
  private initialized = false

  constructor() {
    // 仅在浏览器环境 + 支持 SpeechSynthesis 时初始化
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis
      this.initVoice()
    }
  }

  /**
   * 初始化音色选择
   * 优先选择中文女声 → 中文任意声 → 无声（静默降级）
   */
  private initVoice(): void {
    if (!this.synth) return

    const voices = this.synth.getVoices()

    if (voices.length > 0) {
      this.pickVoice(voices)
      this.initialized = true
    }

    // 部分浏览器异步加载音色列表，监听 voichanged 事件
    this.synth.onvoiceschanged = () => {
      if (this.initialized) return // 避免重复选中
      const freshVoices = this.synth!.getVoices()
      this.pickVoice(freshVoices)
      this.initialized = true
    }
  }

  /**
   * 从音色列表中选择最合适的中文女声
   */
  private pickVoice(voices: SpeechSynthesisVoice[]): void {
    // 策略1：zh-CN + 女声关键词（支持常见浏览器实现）
    const zhFemale = voices.find(
      (v) =>
        v.lang.startsWith('zh') &&
        (v.name.includes('Female') ||
          v.name.includes('Tingting') || // Windows 简体中文女声
          v.name.includes('Yaoyao') ||   // macOS 普通话女声
          v.name.includes('Xiaoxiao') || // 常见引擎女声
          v.name.includes('female')),
    )

    // 策略2：任意中文音色
    const zhAny = voices.find((v) => v.lang.startsWith('zh'))

    // 策略3：回退到默认音色（不设 voice，让浏览器自行选择）
    this.selectedVoice = zhFemale || zhAny || null
  }

  /**
   * 朗读文本（自动取消上一次未播完的语音）
   *
   * @param text 需要朗读的中文文本
   * @param options 可选参数（语速、音调、音量）
   */
  speak(
    text: string,
    options?: { rate?: number; pitch?: number; volume?: number },
  ): void {
    if (!this.synth) return

    // 取消上一次未播完的语音
    this.synth.cancel()

    const utterance = new SpeechSynthesisUtterance(text)

    // 应用音色
    utterance.voice = this.selectedVoice

    // 设置语音参数
    utterance.rate = options?.rate ?? 1.0    // 语速（0.1-10）
    utterance.pitch = options?.pitch ?? 1.1  // 音调（0-2），稍高更接近女声
    utterance.volume = options?.volume ?? 1.0
    utterance.lang = 'zh-CN'

    this.synth.speak(utterance)
  }

  /**
   * 立即停止所有语音
   */
  stop(): void {
    this.synth?.cancel()
  }
}

/** 全局单例 */
export const voiceService = new VoiceService()

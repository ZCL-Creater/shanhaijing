/**
 * 结局场景
 * 当玩家走进传送阵时播放结局动画
 */
export class EndingScene {
  private overlay: HTMLDivElement
  private container: HTMLDivElement
  private textEl: HTMLDivElement
  private btnEl: HTMLButtonElement
  private titleEl: HTMLHeadingElement
  private typewriterTimer: number | null = null
  private backdropEl: HTMLDivElement

  /** 是否正在播放 */
  private playing = false

  /** 结局文本段落 */
  private readonly textSegments: string[] = [
    '我缓缓睁开眼，发现自己躺在遗迹之中。',
    '周遭的一切，与我昏睡前一模一样——仿佛那些山海经的奇遇，不过是一场漫长的幻梦。',
    '我几乎要说服自己，那只是一场梦。',
    '可就在我准备起身时，却猛然发觉——自己手中正紧紧攥着一枚泛着微光的传送令牌。',
    '我怔怔地望着那枚令牌，久久无言。',
    '那一刻，我明白了。',
    '原来，一切都不是梦。我确确实实走过了那片山河，见过了那些神兽，也终于……回到了这里。',
    '我紧紧握住令牌，万千感慨如潮水般涌上心头。',
  ]

  constructor() {
    this.backdropEl = this.createBackdrop()
    this.overlay = this.createOverlay()
    this.container = this.createContainer()
    this.titleEl = this.createTitle()
    this.textEl = this.createText()
    this.btnEl = this.createButton()

    this.container.appendChild(this.titleEl)
    this.container.appendChild(this.textEl)
    this.container.appendChild(this.btnEl)
    this.overlay.appendChild(this.container)

    this.btnEl.addEventListener('click', () => this.onClose())
  }

  private createBackdrop(): HTMLDivElement {
    const el = document.createElement('div')
    el.id = 'ending-backdrop'
    Object.assign(el.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      zIndex: '199',
      display: 'none',
      background: '#050510',
    })
    return el
  }

  private createOverlay(): HTMLDivElement {
    const el = document.createElement('div')
    el.id = 'ending-overlay'
    Object.assign(el.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      zIndex: '200',
      display: 'none',
      alignItems: 'flex-start',
      justifyContent: 'center',
      overflow: 'hidden',
      background: '#050510',
      fontFamily: "'STKaiti', 'KaiTi', '楷体', 'SimSun', serif",
    })
    return el
  }

  private createContainer(): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'ending-container'
    Object.assign(el.style, {
      textAlign: 'center',
      padding: '6vh 32px 20px',
      width: '90%',
      maxWidth: '800px',
    })
    return el
  }

  private createTitle(): HTMLHeadingElement {
    const el = document.createElement('h1')
    el.textContent = '✦  归途  ✦'
    el.style.cssText = `
      font-size: 2rem;
      color: #f0d89c;
      text-shadow: 0 0 30px rgba(240,216,156,0.6), 0 0 60px rgba(201,168,91,0.3);
      letter-spacing: 0.3em;
      margin-bottom: 1.2rem;
      opacity: 0;
      transition: opacity 1.5s ease;
    `
    return el
  }

  private createText(): HTMLDivElement {
    const el = document.createElement('div')
    el.id = 'ending-text'
    el.style.cssText = `
      max-width: 720px;
      margin: 0 auto 1rem;
      opacity: 0;
      transition: opacity 1s ease;
    `
    return el
  }

  private createButton(): HTMLButtonElement {
    const el = document.createElement('button')
    el.textContent = '游戏结束，谢谢游玩'
    el.style.cssText = `
      display: inline-block;
      padding: 14px 48px;
      font-size: 1.1rem;
      font-family: inherit;
      color: #1a1a2e;
      background: linear-gradient(135deg, #f0d89c, #c9a85b);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      letter-spacing: 0.2em;
      font-weight: bold;
      box-shadow: 0 4px 20px rgba(201,168,91,0.4), inset 0 1px 0 rgba(255,255,255,0.3);
      opacity: 0;
      transition: all 0.3s ease;
      pointer-events: none;
    `
    el.addEventListener('mouseenter', () => {
      el.style.transform = 'scale(1.05)'
      el.style.boxShadow = '0 6px 30px rgba(201,168,91,0.6), inset 0 1px 0 rgba(255,255,255,0.3)'
    })
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'scale(1)'
      el.style.boxShadow = '0 4px 20px rgba(201,168,91,0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
    })
    return el
  }

  /** 结局关闭后的回调 */
  private onCompleteCallback: (() => void) | null = null

  /**
   * 播放结局动画
   * @param onComplete 结局关闭后的回调
   */
  play(onComplete?: () => void): void {
    if (this.playing) return
    this.playing = true
    this.onCompleteCallback = onComplete || null

    // 挂载到页面
    if (!this.overlay.parentNode) {
      document.body.appendChild(this.backdropEl)
      document.body.appendChild(this.overlay)
    }

    // 显示遮罩
    this.backdropEl.style.display = 'block'
    this.overlay.style.display = 'flex'
    // 强制重排
    void this.overlay.offsetWidth

    // 清空之前的内容
    this.textEl.innerHTML = ''
    this.titleEl.style.opacity = '0'
    this.btnEl.style.opacity = '0'
    this.btnEl.style.pointerEvents = 'none'

    // 阶段1: 显示标题
    setTimeout(() => {
      this.titleEl.style.opacity = '1'
    }, 400)

    // 阶段2: 逐段显示结局文字（打字机效果），打完后再显示按钮
    setTimeout(() => {
      this.textEl.style.opacity = '1'
      this.showSegments(0, () => {
        // 阶段3: 打字完成后显示按钮
        this.btnEl.style.opacity = '1'
        this.btnEl.style.pointerEvents = 'auto'
      })
    }, 1800)
  }

  /**
   * 逐段显示剧情文字，每段带打字机效果
   */
  private showSegments(segIndex: number, onDone?: () => void): void {
    if (segIndex >= this.textSegments.length) {
      onDone?.()
      return
    }

    const segment = this.textSegments[segIndex]

    // 创建这一段的 DOM 元素
    const p = document.createElement('p')
    p.className = 'ending-segment'
    Object.assign(p.style, {
      fontSize: '1.1rem',
      color: '#c8d4e0',
      lineHeight: '1.5',
      letterSpacing: '0.08em',
      textAlign: 'center',
      margin: '0 0 0.6em',
      opacity: '0',
      transition: 'opacity 0.5s ease',
    })
    this.textEl.appendChild(p)

    // 淡入
    requestAnimationFrame(() => {
      p.style.opacity = '1'
    })

    // 打字机效果
    this.typewriterEffect(p, segment, 0, () => {
      setTimeout(() => {
        this.showSegments(segIndex + 1, onDone)
      }, 350)
    })
  }

  /**
   * 打字机效果：逐字显示文本
   */
  private typewriterEffect(
    el: HTMLParagraphElement,
    text: string,
    index: number,
    onDone: () => void,
  ): void {
    if (index < text.length) {
      el.textContent = text.substring(0, index + 1)
      const ch = text[index]
      const delay = ch === '…' ? 180 : ch === '，' || ch === '。' || ch === '—' ? 120 : 45
      this.typewriterTimer = window.setTimeout(() => {
        this.typewriterEffect(el, text, index + 1, onDone)
      }, delay)
    } else {
      onDone()
    }
  }

  /**
   * 关闭结局场景
   */
  private onClose(): void {
    // 先隐藏文字内容
    this.container.style.transition = 'opacity 0.3s ease'
    this.container.style.opacity = '0'

    // backdrop 保持不透明纯黑，overlay 在上层淡出
    setTimeout(() => {
      this.overlay.style.transition = 'opacity 0.8s ease'
      this.overlay.style.opacity = '0'
    }, 300)

    setTimeout(() => {
      this.overlay.style.display = 'none'
      this.overlay.style.opacity = '1'
      this.overlay.style.transition = ''
      this.container.style.opacity = '1'
      this.container.style.transition = ''
      this.playing = false
      // 触发回调（跳转到初始页面）⚠ backdrop 不隐藏，由 openingScene 接管
      if (this.onCompleteCallback) {
        this.onCompleteCallback()
        this.onCompleteCallback = null
      }
    }, 1200)
  }

  /**
   * 隐藏底层遮罩（由 OpeningScene 接管时调用）
   */
  hideBackdrop(): void {
    this.backdropEl.style.display = 'none'
  }

  /**
   * 销毁场景
   */
  destroy(): void {
    if (this.typewriterTimer !== null) {
      clearTimeout(this.typewriterTimer)
    }
    if (this.backdropEl.parentNode) {
      this.backdropEl.parentNode.removeChild(this.backdropEl)
    }
    if (this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay)
    }
    this.playing = false
  }
}

/** 全局单例 */
export const endingScene = new EndingScene()

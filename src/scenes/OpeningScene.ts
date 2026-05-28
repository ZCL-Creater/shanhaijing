/**
 * 开场剧情场景
 * 游戏启动时展示考古学家发现古玉简、被吸入山海经世界的故事
 * 逐句显示文字，完毕后出现"开始旅程"按钮
 */
import { endingScene } from './EndingScene'

export class OpeningScene {
  private overlay: HTMLDivElement
  private container: HTMLDivElement
  private titleEl: HTMLHeadingElement
  private textEl: HTMLDivElement
  private btnEl: HTMLButtonElement

  private playing = false
  private typewriterTimer: number | null = null

  /** 开场剧情文本段落 */
  private readonly textSegments: string[] = [
    '我是小钟叔，是一名考古学家……',
    '在一次挖掘中，我触碰了一枚刻满奇异符文的玉简……',
    '瞬间，天旋地转，我被拉入了一个由《山海经》构建的古老世界。',
    '我还未曾站稳，便见一头巨龙盘踞于一片苍茫无边的水域之上。它的鳞甲泛着青铜色的光泽，龙须如风拂动，目光如深渊般沉寂，静静凝视着闯入这片天地的我。',
    '那一刻，我既为眼前这从未见过的壮阔景象感到震颤，又隐约意识到——我误入了一个不属于我的世界。',
  ]

  /** 当开场结束后调用的回调 */
  private onCompleteCallback: (() => void) | null = null

  constructor() {
    this.overlay = this.createOverlay()
    this.container = this.createContainer()
    this.titleEl = this.createTitle()
    this.textEl = this.createTextContainer()
    this.btnEl = this.createButton()

    this.container.appendChild(this.titleEl)
    this.container.appendChild(this.textEl)
    this.container.appendChild(this.btnEl)
    this.overlay.appendChild(this.container)

    this.btnEl.addEventListener('click', () => this.onComplete())
  }

  /** 设置开场结束回调 */
  setOnComplete(cb: () => void): void {
    this.onCompleteCallback = cb
  }

  private createOverlay(): HTMLDivElement {
    const el = document.createElement('div')
    el.id = 'opening-overlay'
    Object.assign(el.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      zIndex: '300',
      display: 'none',
      alignItems: 'flex-start',
      justifyContent: 'center',
      overflowY: 'auto',
      paddingTop: '7vh',
      background: 'radial-gradient(ellipse at center, rgb(10,15,30) 0%, rgb(5,8,18) 100%)',
      fontFamily: "'STKaiti', 'KaiTi', '楷体', 'SimSun', serif",
    })
    return el
  }

  private createContainer(): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'opening-container'
    Object.assign(el.style, {
      textAlign: 'center',
      padding: '40px 32px',
      maxWidth: '680px',
      width: '90%',
    })
    return el
  }

  private createTitle(): HTMLHeadingElement {
    const el = document.createElement('h1')
    el.textContent = '缘 起'
    el.style.cssText = `
      font-size: 2.2rem;
      color: #f0d89c;
      text-shadow: 0 0 30px rgba(240,216,156,0.5), 0 0 60px rgba(201,168,91,0.2);
      letter-spacing: 0.4em;
      margin-bottom: 2.5rem;
      opacity: 0;
      transition: opacity 1.5s ease;
    `
    return el
  }

  private createTextContainer(): HTMLDivElement {
    const el = document.createElement('div')
    el.id = 'opening-text'
    Object.assign(el.style, {
      textAlign: 'left',
      minHeight: '180px',
      marginBottom: '2rem',
    })
    return el
  }

  private createButton(): HTMLButtonElement {
    const el = document.createElement('button')
    el.textContent = '踏入传送阵'
    el.id = 'opening-start-btn'
    el.style.cssText = `
      display: inline-block;
      padding: 14px 56px;
      font-size: 1.3rem;
      font-family: inherit;
      color: #1a1a2e;
      background: linear-gradient(135deg, #f0d89c, #c9a85b);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      letter-spacing: 0.3em;
      font-weight: bold;
      box-shadow: 0 4px 20px rgba(201,168,91,0.4), inset 0 1px 0 rgba(255,255,255,0.3);
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s ease;
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

  /**
   * 播放开场剧情
   */
  play(): void {
    if (this.playing) return
    this.playing = true

    // 接管时隐藏结局场景的纯黑遮罩
    endingScene.hideBackdrop()

    if (!this.overlay.parentNode) {
      document.body.appendChild(this.overlay)
    }

    this.overlay.style.display = 'flex'
    // 整体淡入
    this.overlay.style.opacity = '0'
    this.overlay.style.transition = 'opacity 0.8s ease'

    // 清空之前的内容
    this.textEl.innerHTML = ''
    this.titleEl.style.opacity = '0'
    this.btnEl.style.opacity = '0'
    this.btnEl.style.pointerEvents = 'none'

    void this.overlay.offsetWidth

    // 整体淡入
    requestAnimationFrame(() => {
      this.overlay.style.opacity = '1'
    })

    // 阶段1：显示标题
    setTimeout(() => {
      this.titleEl.style.opacity = '1'
    }, 300)

    // 阶段2：逐段显示文字
    setTimeout(() => {
      this.showSegments(0)
    }, 1600)
  }

  /**
   * 逐段显示剧情文字，每段带打字机效果
   */
  private showSegments(segIndex: number): void {
    if (segIndex >= this.textSegments.length) {
      // 所有段落显示完毕，短暂停留后自动进入传送阵
      setTimeout(() => this.onComplete(), 600)
      return
    }

    const segment = this.textSegments[segIndex]

    // 创建这一段的 DOM 元素
    const p = document.createElement('p')
    p.className = 'opening-segment'
    Object.assign(p.style, {
      fontSize: '1.15rem',
      color: '#c8d4e0',
      lineHeight: '2.2',
      letterSpacing: '0.08em',
      margin: '0 0 0.8em',
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
      // 这段打完，稍停后打下一段
      setTimeout(() => {
        this.showSegments(segIndex + 1)
      }, 400)
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
      const delay = text[index] === '…' ? 180 : text[index] === '，' || text[index] === '。' ? 120 : 45
      this.typewriterTimer = window.setTimeout(() => {
        this.typewriterEffect(el, text, index + 1, onDone)
      }, delay)
    } else {
      onDone()
    }
  }

  /**
   * 显示"开始旅程"按钮
   */
  private showStartButton(): void {
    this.btnEl.style.opacity = '1'
    this.btnEl.style.pointerEvents = 'auto'
  }

  /**
   * 点击"开始旅程"或文本播完后，逐层淡出
   */
  private onComplete(): void {
    // 阶段1：先淡出文字内容（0.4s 延迟起）
    this.container.style.transition = 'opacity 0.6s ease'
    this.container.style.opacity = '0'

    // 阶段2：整体背景淡出（稍延迟，更缓慢）
    setTimeout(() => {
      this.overlay.style.transition = 'opacity 1.2s ease'
      this.overlay.style.opacity = '0'
    }, 200)

    setTimeout(() => {
      this.overlay.style.display = 'none'
      this.overlay.style.opacity = '1'
      this.overlay.style.transition = ''
      this.container.style.opacity = '1'
      this.container.style.transition = ''
      this.playing = false

      if (this.onCompleteCallback) {
        this.onCompleteCallback()
      }
    }, 1600)
  }

  /**
   * 销毁场景
   */
  destroy(): void {
    if (this.typewriterTimer !== null) {
      clearTimeout(this.typewriterTimer)
    }
    if (this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay)
    }
    this.playing = false
  }
}

/** 全局单例 */
export const openingScene = new OpeningScene()

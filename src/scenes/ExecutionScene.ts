/**
 * 处决场景
 * 当玩家在同一NPC处问答失败3次时触发，显示NPC专属处决结局文字
 */
export class ExecutionScene {
  private overlay: HTMLDivElement
  private blackCurtain: HTMLDivElement
  private container: HTMLDivElement
  private titleEl: HTMLHeadingElement
  private npcNameEl: HTMLHeadingElement
  private textEl: HTMLParagraphElement
  private btnEl: HTMLButtonElement

  /** 是否正在播放 */
  private playing = false

  /** 结局关闭后的回调 */
  private onCompleteCallback: (() => void) | null = null

  /** NPC 处决文字映射 */
  private readonly EXECUTION_TEXTS: Record<string, string> = {
    '应龙':
      '你沉入东海之底，海水灌入你的口鼻。龙族的长啸在深海中回荡，你的意识逐渐消散，化为这片古老海洋中一缕无人知晓的幽魂。千百年后，渔民会在月夜听到海底传来的叹息——那是你与龙族融为一体的低语。',

    '九尾狐':
      '你未能通过九尾狐的考验。她的尾巴轻轻一卷，你便从世界上消失了。你的身体化为一缕青烟，成为她第九条尾巴上的一抹装饰。从此，每当月圆之夜，你都会在她身后轻轻摇曳，成为她妖媚身姿的一部分，永远无法挣脱。',

    '白泽':
      '迷雾吞噬了你的身影。你在这片永无终点的森林中徘徊，意识逐渐模糊，最终与古木的根须融为一体。你的记忆成为了森林的一部分——每当有人踏入迷雾，风会替你传出一声叹息，但没有人能听懂你在说什么。',

    '毕方':
      '毕方的烈焰吞噬了你。你的身体化为灰烬，随风飘散，成为这片土地的第一捧养料。毕方站在你的残骸前，沉默了片刻，然后振翅远去。从此，火焰山谷中多了一棵赤红的巨石——那是你的灵魂在沉默地燃烧。',

    '饕餮':
      '饕餮张开了他那无底洞般的大口。你感觉自己被吸入了无尽的黑暗中，四周只有饥饿的回声。你在虚无中漂流，仿佛穿越了时间的尽头，最终成为饕餮腹中一粒尘埃，连存在过的痕迹都被彻底吞噬。',

    '刑天':
      '刑天的巨斧带着雷霆之势落下。你没有感到疼痛，只看到视野中最后的光亮被一片阴影吞噬。你的身体在巨斧之下化为两段，意识在黑暗中飞速下坠。最后你看到的，是常羊之山那轮永不落下的血色烈日。你的故事，终结于战神的一斧之下。',

    '西王母':
      '昆仑之巅的风雪席卷而来，裹挟着你的身体。你的意识在极寒中逐渐凝固，最终化为山间一缕清风，成为这片圣地的一部分。西王母闭上双眼，仿佛什么也没有发生过。从此，每当有人登顶昆仑，都会感到一阵刺骨的风掠过——那是你最后的叹息。',
  }

  constructor() {
    this.overlay = this.createOverlay()
    this.blackCurtain = this.createBlackCurtain()
    this.container = this.createContainer()
    this.titleEl = this.createTitle()
    this.npcNameEl = this.createNpcName()
    this.textEl = this.createText()
    this.btnEl = this.createButton()

    this.container.appendChild(this.titleEl)
    this.container.appendChild(this.npcNameEl)
    this.container.appendChild(this.textEl)
    this.container.appendChild(this.btnEl)
    this.overlay.appendChild(this.blackCurtain)
    this.overlay.appendChild(this.container)

    this.btnEl.addEventListener('click', () => this.onClose())
  }

  /**
   * 根据 NPC 完整名称（可能包含括号）匹配处决文字
   */
  private getExecutionText(npcName: string): string {
    // 先精确匹配
    if (this.EXECUTION_TEXTS[npcName]) {
      return this.EXECUTION_TEXTS[npcName]
    }
    // 模糊匹配：检查 npcName 是否包含映射中的 key
    for (const key of Object.keys(this.EXECUTION_TEXTS)) {
      if (npcName.includes(key)) {
        return this.EXECUTION_TEXTS[key]
      }
    }
    // 兜底文字
    return '天机已乱，你得罪了太多异兽……\n\n你的灵魂将永远困于这山海经之中，\n再也无法返回现实世界。'
  }

  private createOverlay(): HTMLDivElement {
    const el = document.createElement('div')
    el.id = 'execution-overlay'
    Object.assign(el.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      zIndex: '400',
      display: 'none',
      alignItems: 'flex-start',
      justifyContent: 'center',
      overflowY: 'auto',
      background: 'radial-gradient(ellipse at center, rgba(60,8,8,0.97) 0%, rgba(15,2,2,0.99) 100%)',
      fontFamily: "'STKaiti', 'KaiTi', '楷体', 'SimSun', serif",
    })
    return el
  }

  /** 纯黑幕布：关闭时通过 opacity 渐变覆盖暗红背景和游戏世界 */
  private createBlackCurtain(): HTMLDivElement {
    const el = document.createElement('div')
    Object.assign(el.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: '#000000',
      opacity: '0',
      transition: 'opacity 0.8s ease',
      pointerEvents: 'none',
    })
    return el
  }

  private createContainer(): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'execution-container'
    Object.assign(el.style, {
      position: 'relative',
      zIndex: '1',
      textAlign: 'center',
      padding: '40px 60px',
      paddingTop: '18vh',
      maxWidth: '720px',
    })
    return el
  }

  private createTitle(): HTMLHeadingElement {
    const el = document.createElement('h1')
    el.textContent = '魂 魄 永 困'
    el.style.cssText = `
      font-size: 3rem;
      color: #ffffff;
      letter-spacing: 0.3em;
      margin-bottom: 0.8rem;
      text-shadow: 0 0 40px rgba(255,255,255,0.4), 0 0 80px rgba(255,255,255,0.15);
      opacity: 0;
      transition: opacity 1.5s ease;
    `
    return el
  }

  private createNpcName(): HTMLHeadingElement {
    const el = document.createElement('h2')
    el.style.cssText = `
      font-size: 1.4rem;
      color: rgba(255,255,255,0.55);
      letter-spacing: 0.15em;
      margin-bottom: 2.2rem;
      font-weight: normal;
      opacity: 0;
      transition: opacity 1s ease;
      transition-delay: 0.4s;
    `
    return el
  }

  private createText(): HTMLParagraphElement {
    const el = document.createElement('p')
    el.id = 'execution-text'
    el.style.cssText = `
      font-size: 1.15rem;
      color: #ffffff;
      line-height: 2.4;
      letter-spacing: 0.08em;
      max-width: 640px;
      margin: 0 auto 2.5rem;
      white-space: pre-line;
      text-align: justify;
      opacity: 0;
      transition: opacity 1s ease;
      transition-delay: 0.8s;
    `
    return el
  }

  private createButton(): HTMLButtonElement {
    const el = document.createElement('button')
    el.textContent = '重新开始旅程'
    el.style.cssText = `
      display: inline-block;
      padding: 14px 52px;
      font-size: 1.15rem;
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
      transition-delay: 1.2s;
      pointer-events: none;
      user-select: none;
      -webkit-user-select: none;
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
   * 播放处决结局动画
   * @param npcName 触发处决的 NPC 名称
   * @param onComplete 场景关闭后的回调（通常为 resetGame）
   */
  play(npcName: string, onComplete?: () => void): void {
    if (this.playing) return
    this.playing = true
    this.onCompleteCallback = onComplete || null

    // 获取 NPC 专属处决文字
    const executionText = this.getExecutionText(npcName)

    // 更新 NPC 名称显示
    this.npcNameEl.textContent = `—— ${npcName} ——`

    // 挂载到页面
    if (!this.overlay.parentNode) {
      document.body.appendChild(this.overlay)
    }

    // 显示遮罩
    this.overlay.style.display = 'flex'
    // 强制重排
    void this.overlay.offsetWidth

    // 阶段1: 显示标题
    setTimeout(() => {
      this.titleEl.style.opacity = '1'
    }, 200)

    // 阶段2: 显示 NPC 名称
    setTimeout(() => {
      this.npcNameEl.style.opacity = '1'
    }, 800)

    // 阶段3: 打字机效果逐字显示处决文字
    setTimeout(() => {
      this.textEl.style.opacity = '1'
      this.typewriterEffect(executionText, 0)
    }, 1400)

    // 阶段4: 显示按钮（根据文字长度动态调整）
    const textDuration = executionText.length * 55 + 2000 // 估算打字时间
    setTimeout(() => {
      this.btnEl.style.opacity = '1'
      this.btnEl.style.pointerEvents = 'auto'
    }, textDuration)
  }

  /**
   * 打字机效果
   */
  private typewriterEffect(text: string, index: number): void {
    if (index < text.length) {
      this.textEl.textContent = text.substring(0, index + 1)
      const char = text[index]
      // 标点符号处稍作停顿，增加节奏感
      const delay = '。！？；：，…'.includes(char) ? 120 : 45
      setTimeout(() => this.typewriterEffect(text, index + 1), delay)
    }
  }

  /**
   * 关闭处决场景
   * 分四个阶段：内容消隐 → 黑色幕布覆盖 → 触发回调（resetGame）→ 移除遮罩
   */
  private onClose(): void {
    // 按钮与背景幕布同步淡出（0.8s，与 blackCurtain 一致）
    this.btnEl.style.transition = 'opacity 0.8s ease'
    this.btnEl.style.transitionDelay = '0s'
    this.btnEl.style.pointerEvents = 'none'
    this.btnEl.style.opacity = '0'

    // 阶段1: 文字内容快速消隐（0.4s）
    this.titleEl.style.transition = 'opacity 0.4s ease'
    this.titleEl.style.opacity = '0'
    this.npcNameEl.style.transition = 'opacity 0.4s ease'
    this.npcNameEl.style.transitionDelay = '0s'
    this.npcNameEl.style.opacity = '0'
    this.textEl.style.transition = 'opacity 0.4s ease'
    this.textEl.style.transitionDelay = '0s'
    this.textEl.style.opacity = '0'

    // 阶段2: 黑色幕布从透明逐渐变为不透明（0.8s）
    //        盖住暗红背景和后面的游戏世界，平滑过渡到纯黑
    this.blackCurtain.style.opacity = '1'

    // 阶段3: 纯黑到位后，触发 resetGame（开始界面在纯黑之上淡入）
    setTimeout(() => {
      if (this.onCompleteCallback) {
        this.onCompleteCallback()
        this.onCompleteCallback = null
      }

      // 阶段4: 等开始界面淡入完成（~900ms）后，移除遮罩和黑色幕布
      setTimeout(() => {
        this.overlay.style.display = 'none'
        this.resetOverlayState()
        this.playing = false
      }, 900)
    }, 900)
  }

  /**
   * 将 overlay 状态还原为初始值，供下次 play() 使用
   */
  private resetOverlayState(): void {
    // 恢复黑色幕布
    this.blackCurtain.style.opacity = '0'

    // 恢复文字元素初始样式（play() 会重新触发淡入）
    this.titleEl.style.transition = 'opacity 1.5s ease'
    this.titleEl.style.transitionDelay = '0s'
    this.titleEl.style.opacity = '0'

    this.npcNameEl.style.transition = 'opacity 1s ease'
    this.npcNameEl.style.transitionDelay = '0.4s'
    this.npcNameEl.style.opacity = '0'

    this.textEl.style.transition = 'opacity 1s ease'
    this.textEl.style.transitionDelay = '0.8s'
    this.textEl.style.opacity = '0'
    this.textEl.textContent = ''

    this.btnEl.style.opacity = '0'
    this.btnEl.style.pointerEvents = 'none'
    this.btnEl.style.transition = 'all 0.3s ease'
    this.btnEl.style.transitionDelay = '1.2s'
  }

  /**
   * 销毁场景
   */
  destroy(): void {
    if (this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay)
    }
    this.playing = false
  }
}

/** 全局单例 */
export const executionScene = new ExecutionScene()

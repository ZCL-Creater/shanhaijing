import { Group, Rect, Polygon, Text, Ellipse } from 'leafer-ui'

export interface NPCConfig {
  name: string
  personality: string      // 性格描述，如 "高傲、狡诈、喜欢试探人心"
  background: string       // 背景故事，如 "被困在青丘山千年的九尾天狐"
  currentDesire: string    // 当前诉求，如 "想找到解除封印的方法"
  x: number
  y: number
  emoji?: string
  bubbleOffsetY?: number   // 对话气泡Y偏移，负值表示在NPC上方（默认-200）
  bubbleOffsetX?: number   // 对话气泡X偏移（默认0居中），负值偏左正值偏右
}

/**
 * NPC 基类
 * 提供对话气泡、距离检测、回复展示等共享逻辑
 * 子类只需实现 createVisual() 绘制外观
 */
export abstract class NPC {
  public name: string
  public personality: string
  public background: string
  public currentDesire: string
  public x: number
  public y: number
  public emoji: string
  public bubbleOffsetY: number
  public bubbleOffsetX: number

  protected group: Group
  protected bubbleGroup: Group
  protected bubbleBg: Rect
  protected bubbleTail: Polygon
  protected bubbleText: Text
  protected visualGroup: Group
  private bubbleTimer: ReturnType<typeof setTimeout> | null = null

  constructor(config: NPCConfig) {
    this.name = config.name
    this.personality = config.personality
    this.background = config.background
    this.currentDesire = config.currentDesire
    this.x = config.x
    this.y = config.y
    this.emoji = config.emoji || '?'
    this.bubbleOffsetY = config.bubbleOffsetY ?? -200
    this.bubbleOffsetX = config.bubbleOffsetX ?? 0

    this.visualGroup = this.createVisual()
    this.bubbleGroup = new Group()

    // 所有气泡坐标基于 bubbleOffsetX/Y 计算
    const baseX = this.bubbleOffsetX
    const baseY = this.bubbleOffsetY

    this.bubbleBg = new Rect({
      x: -48 + baseX,
      y: baseY,
      width: 96,
      height: 32,
      fill: '#faf5e8',
      opacity: 0.93,
      stroke: '#c9a85b',
      strokeWidth: 1.2,
      cornerRadius: 12,
    })

    // 小突起方向根据水平偏移自动调整：偏左则指向右下，偏右则指向左下，居中则指向正下
    const tailDir = baseX < -20 ? 'right' : baseX > 20 ? 'left' : 'down'
    let tailPoints: number[]
    if (tailDir === 'right') {
      // 气泡在左侧，小突起在右边缘指向右
      tailPoints = [baseX + 96, baseY + 10, baseX + 106, baseY + 16, baseX + 96, baseY + 22]
    } else if (tailDir === 'left') {
      // 气泡在右侧，小突起在左边缘指向左
      tailPoints = [baseX, baseY + 10, baseX - 10, baseY + 16, baseX, baseY + 22]
    } else {
      // 居中，小突起在下边缘指向下（默认）
      tailPoints = [baseX - 6, baseY + 32, baseX + 6, baseY + 32, baseX, baseY + 42]
    }

    this.bubbleTail = new Polygon({
      points: tailPoints,
      fill: '#faf5e8',
      stroke: '#c9a85b',
      strokeWidth: 1.2,
      opacity: 0.93,
    })

    this.bubbleText = new Text({
      text: '来聊聊吧...',
      x: -44 + baseX,
      y: baseY + 4,
      width: 88,
      height: 24,
      fontSize: 12,
      fill: '#2a1a0a',
      textAlign: 'center',
      verticalAlign: 'middle',
      fontWeight: 'normal',
      wordWrap: true,
    })

    this.bubbleGroup.add(this.bubbleBg)
    this.bubbleGroup.add(this.bubbleText)
    this.bubbleGroup.visible = false

    this.group = new Group({ x: this.x, y: this.y })
    this.group.add(this.visualGroup)
    this.group.add(this.bubbleGroup)
  }

  /** 子类实现：绘制 NPC 外观 */
  protected abstract createVisual(): Group

  /** 创建名字标签 */
  protected createNameLabel(): Text {
    return new Text({
      text: this.name,
      x: 0,
      y: -84,
      fontSize: 13,
      fill: '#f0d89c',
      textAlign: 'center',
      fontWeight: 'bold',
      opacity: 0.9,
    })
  }

  /** 创建光晕效果 */
  protected createGlow(outerW = 90, outerH = 70, color = '#f0d89c'): Group {
    const g = new Group()
    g.add(
      new Ellipse({
        x: 0, y: -10, width: outerW, height: outerH,
        fill: color, opacity: 0.12,
      }),
    )
    g.add(
      new Ellipse({
        x: 0, y: -10, width: outerW * 0.6, height: outerH * 0.6,
        fill: color, opacity: 0.18,
      }),
    )
    return g
  }

  /** 获取 NPC 的 Leafer Group */
  getGroup(): Group {
    return this.group
  }

  /** 隐藏几何视觉（仅保留气泡对话框），用于切换到图片显示模式 */
  hideGeometricVisual(): void {
    this.visualGroup.visible = false
  }

  /** 每帧检查玩家距离，返回是否在交互范围内 */
  checkProximity(px: number, py: number): boolean {
    const dist = Math.hypot(px - this.x, py - this.y)
    const inRange = dist < 200
    this.bubbleGroup.visible = inRange
    return inRange
  }

  /** 获取当前距离（用于多 NPC 时找最近的） */
  getDistance(px: number, py: number): number {
    return Math.hypot(px - this.x, py - this.y)
  }

  /** 在气泡中显示引导语（玩家靠近时的问候） */
  showGreeting(text: string) {
    if (this.bubbleTimer) clearTimeout(this.bubbleTimer)

    this._updateBubble(text)
    this.bubbleGroup.visible = true

    // 引导语持续显示，不在几秒后消失（因为玩家可能还在观望）
  }

  /** 在气泡中显示 AI 回复 */
  showResponse(text: string) {
    if (this.bubbleTimer) clearTimeout(this.bubbleTimer)

    this._updateBubble(text)
    this.bubbleGroup.visible = true

    this.bubbleTimer = setTimeout(() => {
      this._resetBubble()
    }, 4500)
  }

  /** 更新气泡尺寸以适应文本 */
  private _updateBubble(text: string) {
    const maxCharsPerLine = 28
    const lineHeight = 18
    const paddingX = 16
    const paddingY = 12
    const baseX = this.bubbleOffsetX
    const baseY = this.bubbleOffsetY

    // 按字数估算行数
    const lines = Math.ceil(text.length / maxCharsPerLine)
    const bubbleWidth = Math.min(380, Math.max(96, text.length * 14))
    const bubbleHeight = Math.max(32, lines * lineHeight + paddingY)

    this.bubbleText.text = text
    this.bubbleText.width = bubbleWidth - paddingX
    this.bubbleText.height = bubbleHeight - paddingY
    this.bubbleText.x = -(bubbleWidth - paddingX) / 2 + baseX
    this.bubbleText.y = baseY + (bubbleHeight - 32) / 2 + 4

    this.bubbleBg.width = bubbleWidth
    this.bubbleBg.height = bubbleHeight
    this.bubbleBg.x = -bubbleWidth / 2 + baseX
    this.bubbleBg.y = baseY

    // 调整小三角位置（根据水平偏移自动选择方向）
    const tailDir = baseX < -20 ? 'right' : baseX > 20 ? 'left' : 'down'
    if (tailDir === 'right') {
      // 气泡在左侧，小突起在右边缘指向右
      this.bubbleTail.points = [baseX + bubbleWidth, baseY + bubbleHeight * 0.3,
        baseX + bubbleWidth + 10, baseY + bubbleHeight * 0.5,
        baseX + bubbleWidth, baseY + bubbleHeight * 0.7]
    } else if (tailDir === 'left') {
      // 气泡在右侧，小突起在左边缘指向左
      this.bubbleTail.points = [baseX, baseY + bubbleHeight * 0.3,
        baseX - 10, baseY + bubbleHeight * 0.5,
        baseX, baseY + bubbleHeight * 0.7]
    } else {
      // 居中，小突起在下边缘指向下方NPC头部（默认）
      this.bubbleTail.points = [-6, baseY + bubbleHeight, 6, baseY + bubbleHeight, 0, baseY + bubbleHeight + 10]
    }
  }

  /** 重置气泡为默认状态 */
  private _resetBubble() {
    const baseX = this.bubbleOffsetX
    const baseY = this.bubbleOffsetY

    this.bubbleText.text = '来聊聊吧...'
    this.bubbleText.width = 88
    this.bubbleText.height = 24
    this.bubbleText.x = -44 + baseX
    this.bubbleText.y = baseY + 4

    this.bubbleBg.width = 96
    this.bubbleBg.height = 32
    this.bubbleBg.x = -48 + baseX
    this.bubbleBg.y = baseY

    const tailDir = baseX < -20 ? 'right' : baseX > 20 ? 'left' : 'down'
    if (tailDir === 'right') {
      this.bubbleTail.points = [baseX + 96, baseY + 10, baseX + 106, baseY + 16, baseX + 96, baseY + 22]
    } else if (tailDir === 'left') {
      this.bubbleTail.points = [baseX, baseY + 10, baseX - 10, baseY + 16, baseX, baseY + 22]
    } else {
      this.bubbleTail.points = [baseX - 6, baseY + 32, baseX + 6, baseY + 32, baseX, baseY + 42]
    }
  }

  /** 强制隐藏气泡 */
  hideBubble(): void {
    if (this.bubbleTimer) clearTimeout(this.bubbleTimer)
    this.bubbleGroup.visible = false
  }

  /** 销毁 NPC */
  destroy() {
    if (this.bubbleTimer) clearTimeout(this.bubbleTimer)
  }
}

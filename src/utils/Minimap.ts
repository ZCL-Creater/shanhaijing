/**
 * 小地图组件
 * 在屏幕左上角显示一个 200x200 的缩小版世界地图
 * 使用 Canvas 2D API 绘制
 * 已探索区域绿色，未探索深灰色
 * NPC和地点用不同颜色标记，玩家用闪烁白点表示
 */
import type { AreaConfig } from '../config/areas'

/** NPC/地点在小地图上的标记信息 */
export interface MinimapMarker {
  x: number
  y: number
  name: string
  color: string
  type: 'npc' | 'location'
}

export class Minimap {
  private container: HTMLDivElement
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  /** 小地图尺寸 */
  private readonly SIZE = 200
  /** 世界尺寸 */
  private readonly worldW: number
  private readonly worldH: number
  /** 缩放比例 */
  private scale: number

  /** 玩家位置（外部传入） */
  private playerX = 0
  private playerY = 0

  /** 标记列表 */
  private markers: MinimapMarker[] = []

  /** 传送阵位置（null 表示未激活） */
  private portalX: number | null = null
  private portalY: number | null = null

  /** 传送阵能量脉冲 */
  private energyPulses: Array<{ x: number; y: number; radius: number; opacity: number; maxRadius: number; color: string; lineWidth: number }> = []

  constructor(worldW: number, worldH: number) {
    this.worldW = worldW
    this.worldH = worldH
    this.scale = this.SIZE / worldW

    // 创建容器 div
    this.container = document.createElement('div')
    this.container.id = 'minimap-container'
    Object.assign(this.container.style, {
      position: 'fixed',
      top: '100px',
      left: '20px',
      width: this.SIZE + 'px',
      height: this.SIZE + 'px',
      background: 'rgba(0, 0, 0, 0.7)',
      border: '1px solid rgba(240, 216, 156, 0.35)',
      borderRadius: '8px',
      zIndex: '49',
      overflow: 'hidden',
      backdropFilter: 'blur(6px)',
      display: 'none',
      transition: 'opacity 0.5s ease',
    })

    // 创建 canvas
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.SIZE
    this.canvas.height = this.SIZE
    Object.assign(this.canvas.style, {
      width: this.SIZE + 'px',
      height: this.SIZE + 'px',
    })

    this.ctx = this.canvas.getContext('2d')!
    this.container.appendChild(this.canvas)
  }

  /**
   * 从 AREAS 配置初始化标记
   */
  initFromAreas(areas: AreaConfig[]): void {
    this.markers = areas.map(area => ({
      x: area.x,
      y: area.y,
      name: area.name,
      color: area.color,
      type: 'location' as const,
    }))
  }

  /**
   * 设置 NPC 标记（NPC 名称用不同颜色区分）
   */
  setNPCMarkers(npcs: Array<{ x: number; y: number; name: string; emoji: string }>): void {
    // NPC 颜色映射
    const npcColors: Record<string, string> = {
      '🦊': '#ff8c5a', // 九尾狐 - 橙色
      '🦄': '#88c8e8', // 白泽 - 浅蓝
      '🐉': '#6ab8d8', // 应龙 - 青蓝
      '🦩': '#e86848', // 毕方 - 红色
      '👹': '#c878c8', // 饕餮 - 紫色
      '⚔️': '#b89860', // 刑天 - 土黄
      '👑': '#d8b8f0', // 西王母 - 淡紫
    }

    for (const npc of npcs) {
      this.markers.push({
        x: npc.x,
        y: npc.y,
        name: npc.name.split('（')[0], // 取 NPC 简称
        color: npcColors[npc.emoji] || '#f0d89c',
        type: 'npc',
      })
    }
  }

  /**
   * 挂载到 DOM
   */
  mount(): void {
    if (!this.container.parentNode) {
      document.body.appendChild(this.container)
    }
  }

  /**
   * 显示小地图
   */
  show(): void {
    this.container.style.display = 'block'
  }

  /**
   * 隐藏小地图
   */
  hide(): void {
    this.container.style.display = 'none'
  }

  /**
   * 设置传送阵位置
   */
  setPortalPosition(x: number, y: number): void {
    this.portalX = x
    this.portalY = y
  }

  /**
   * 清除传送阵标记
   */
  clearPortal(): void {
    this.portalX = null
    this.portalY = null
  }

  /**
   * 更新玩家位置
   */
  setPlayerPosition(x: number, y: number): void {
    this.playerX = x
    this.playerY = y
  }

  /**
   * 设置传送阵能量脉冲
   */
  setEnergyPulses(pulses: Array<{ x: number; y: number; radius: number; opacity: number; maxRadius: number; color: string; lineWidth: number }>): void {
    this.energyPulses = pulses
  }

  /**
   * 更新区域发现状态（需要传入 explorePoints 信息）
   */
  updateDiscoveredAreas(explorePoints: Array<{ x: number; y: number; discovered: boolean }>): void {
    // 存储引用以便绘制时使用
    this._explorePoints = explorePoints
  }

  private _explorePoints: Array<{ x: number; y: number; discovered: boolean }> = []

  /**
   * 每帧绘制小地图
   */
  render(): void {
    const ctx = this.ctx
    const s = this.scale
    const size = this.SIZE

    // 清空
    ctx.clearRect(0, 0, size, size)

    // 绘制底色（未探索区域）
    ctx.fillStyle = '#2a2a2a'
    ctx.fillRect(0, 0, size, size)

    // 绘制已探索区域（绿色）
    const EXPLORE_VISUAL_RADIUS = 120 // 在世界中的探索可视范围
    for (const ep of this._explorePoints) {
      if (ep.discovered) {
        ctx.fillStyle = '#3a7a3a'
        ctx.beginPath()
        ctx.arc(ep.x * s, ep.y * s, EXPLORE_VISUAL_RADIUS * s, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 绘制地点标记
    for (const marker of this.markers) {
      const mx = marker.x * s
      const my = marker.y * s

      if (marker.type === 'location') {
        // 地点：小菱形
        ctx.fillStyle = marker.color
        ctx.globalAlpha = 0.7
        ctx.save()
        ctx.translate(mx, my)
        ctx.rotate(Math.PI / 4)
        ctx.fillRect(-3, -3, 6, 6)
        ctx.restore()
        ctx.globalAlpha = 1

        // 名称标签
        ctx.font = '8px STKaiti, KaiTi, 楷体, serif'
        ctx.fillStyle = '#c8b878'
        ctx.globalAlpha = 0.8
        ctx.textAlign = 'center'
        ctx.fillText(marker.name, mx, my - 7)
        ctx.globalAlpha = 1
      } else if (marker.type === 'npc') {
        // NPC：小圆点
        ctx.fillStyle = marker.color
        ctx.globalAlpha = 0.9
        ctx.beginPath()
        ctx.arc(mx, my, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1

        // NPC 名称标签
        ctx.font = '7px STKaiti, KaiTi, 楷体, serif'
        ctx.fillStyle = marker.color
        ctx.globalAlpha = 0.7
        ctx.textAlign = 'center'
        ctx.fillText(marker.name, mx, my + 10)
        ctx.globalAlpha = 1
      }
    }

    // 绘制传送阵能量脉冲
    for (const p of this.energyPulses) {
      const pulsePx = p.x * s
      const pulsePy = p.y * s
      const pulseR = p.radius * s
      ctx.strokeStyle = p.color || '#dab450'
      ctx.globalAlpha = p.opacity * 0.9
      ctx.lineWidth = Math.max(0.5, p.lineWidth * s)
      ctx.beginPath()
      ctx.arc(pulsePx, pulsePy, pulseR, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    // 绘制传送阵（激活后常亮显示）
    if (this.portalX !== null && this.portalY !== null) {
      const portalPx = this.portalX * s
      const portalPy = this.portalY * s
      const portalAlpha = 1.0

      // 传送阵光晕
      ctx.fillStyle = '#dab450'
      ctx.globalAlpha = portalAlpha * 0.5
      ctx.beginPath()
      ctx.arc(portalPx, portalPy, 8, 0, Math.PI * 2)
      ctx.fill()

      // 传送阵内核
      ctx.fillStyle = '#f0d89c'
      ctx.globalAlpha = portalAlpha
      ctx.beginPath()
      ctx.arc(portalPx, portalPy, 3.5, 0, Math.PI * 2)
      ctx.fill()

      // 传送阵十字标记
      ctx.strokeStyle = '#f0d89c'
      ctx.globalAlpha = portalAlpha * 0.8
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(portalPx, portalPy, 5, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(portalPx - 6, portalPy)
      ctx.lineTo(portalPx + 6, portalPy)
      ctx.moveTo(portalPx, portalPy - 6)
      ctx.lineTo(portalPx, portalPy + 6)
      ctx.stroke()

      // 标签
      ctx.font = '7px STKaiti, KaiTi, 楷体, serif'
      ctx.fillStyle = '#f0d89c'
      ctx.globalAlpha = portalAlpha
      ctx.textAlign = 'center'
      ctx.fillText('传送阵', portalPx, portalPy - 11)
      ctx.globalAlpha = 1
    }

    // 绘制玩家位置（常亮白点）
    const px = this.playerX * s
    const py = this.playerY * s

    // 玩家光晕
    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.3
    ctx.beginPath()
    ctx.arc(px, py, 6, 0, Math.PI * 2)
    ctx.fill()

    // 玩家核心点
    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 1.0
    ctx.beginPath()
    ctx.arc(px, py, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    // 绘制视口范围框
    const vw = window.innerWidth
    const vh = window.innerHeight
    const viewX = Math.max(0, Math.min(this.worldW - vw, this.playerX - vw / 2)) * s
    const viewY = Math.max(0, Math.min(this.worldH - vh, this.playerY - vh / 2)) * s
    const viewW = vw * s
    const viewH = vh * s

    ctx.strokeStyle = 'rgba(240, 216, 156, 0.4)'
    ctx.lineWidth = 1
    ctx.strokeRect(viewX, viewY, viewW, viewH)
  }
}

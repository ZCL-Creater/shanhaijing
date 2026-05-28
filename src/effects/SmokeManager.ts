import { Group, Image } from 'leafer-ui'

// ==================== 烟雾素材 ====================
const SMOKE_IMAGES = ['/assets/yanwu1.png', '/assets/yanwu2.png', '/assets/yanwu3.png']

// ==================== 常量 ====================
const GRID_SPACING = 500       // 网格间距（500px → 9x9 = 81 个烟雾对象）
const BG_HALF_W = 480          // 背景图半宽 = 1200 * 0.8 / 2
const BG_HALF_H = 360          // 背景图半高（1200:900 → 960:720，半高 360）

// 边界内不生成烟雾的区域（相对于背景图左上角）
const INNER_OFFSET_LEFT = 100
const INNER_OFFSET_TOP = 100
const INNER_WIDTH = 760        // 860 - 100
const INNER_HEIGHT = 520       // 620 - 100

// ==================== 7 个背景图的中心世界坐标 ====================
// 背景图左上角 world 坐标 = (cx - BG_HALF_W, cy - BG_HALF_H)
const BG_ZONES: { cx: number; cy: number }[] = [
  { cx: 1000, cy: 1500 },   // 青丘之山
  { cx: 500,  cy: 500  },   // 迷雾森林
  { cx: 2000, cy: 2000 },   // 东海之滨
  { cx: 3000, cy: 1500 },   // 火焰山谷
  { cx: 3500, cy: 500  },   // 深渊遗迹
  { cx: 1500, cy: 3500 },   // 常羊之山
  { cx: 3000, cy: 3000 },   // 昆仑之巅
]

export class SmokeManager {
  private layer: Group
  private itemCount = 0

  constructor(layer?: Group) {
    this.layer = layer || new Group()
  }

  // ==================== 判断网格点是否在烟雾生成区域内 ====================
  // 烟雾在背景图边界边缘生成：在背景图范围内但不在内部 (x+100,y+100)~(x+860,y+620) 矩形内
  private isInSmokeZone(gx: number, gy: number): boolean {
    for (const zone of BG_ZONES) {
      // 背景图边界（世界坐标）
      const bgLeft = zone.cx - BG_HALF_W
      const bgTop = zone.cy - BG_HALF_H
      const bgRight = zone.cx + BG_HALF_W
      const bgBottom = zone.cy + BG_HALF_H

      // 内部不生成烟雾的区域（世界坐标）
      const innerLeft = bgLeft + INNER_OFFSET_LEFT
      const innerTop = bgTop + INNER_OFFSET_TOP
      const innerRight = innerLeft + INNER_WIDTH
      const innerBottom = innerTop + INNER_HEIGHT

      // 在背景图边界内，但不在内部清洁区域 → 生成烟雾
      if (gx >= bgLeft && gx <= bgRight && gy >= bgTop && gy <= bgBottom) {
        if (gx < innerLeft || gx > innerRight || gy < innerTop || gy > innerBottom) {
          return true
        }
      }
    }
    return false
  }

  // ==================== 创建单个烟雾对象 ====================
  private createSmokeItem(gx: number, gy: number): void {
    const imgIdx = Math.floor(Math.random() * SMOKE_IMAGES.length)

    // 宽度 400~600px 随机，高度按比例自动缩放
    const w = 400 + Math.random() * 200

    // 网格内随机偏移，避免整齐排列
    const ox = (Math.random() - 0.5) * GRID_SPACING * 0.6
    const oy = (Math.random() - 0.5) * GRID_SPACING * 0.6
    const baseX = gx + ox - w / 2
    const baseY = gy + oy - w * (2 / 3) / 2

    // 浮动参数：每个烟雾独立随机选择浮动方向
    const floatAxis: 'x' | 'y' = Math.random() < 0.5 ? 'x' : 'y'
    const amplitude = 15   // -15 ~ +15px
    const period = 4 + Math.random() * 2    // 4~6 秒
    const phase = Math.random() * period    // 随机初始相位

    // 视觉效果
    const rotation = (Math.random() - 0.5) * 30
    const opacity = 0.4 + Math.random() * 0.2   // 0.4 ~ 0.6
    const flipX = Math.random() < 0.5
    const flipY = Math.random() < 0.5

    const img = new Image({
      url: SMOKE_IMAGES[imgIdx],
      x: baseX,
      y: baseY,
      width: w,
      opacity,
      rotation,
      scaleX: flipX ? -1 : 1,
      scaleY: flipY ? -1 : 1,
      visible: true,
    })
    img.zIndex = 1
    this.layer.add(img)

    // 上下浮动 → y 轴动画
    if (floatAxis === 'y') {
      img.animate(
        [
          { y: baseY },
          { y: baseY - amplitude },
          { y: baseY },
          { y: baseY + amplitude },
        ],
        {
          duration: period * 1000,
          iterations: Infinity,
          easing: 'ease-in-out',
          delay: phase * 1000,
        },
      )
    } else {
      // 左右浮动 → x 轴动画
      img.animate(
        [
          { x: baseX },
          { x: baseX - amplitude },
          { x: baseX },
          { x: baseX + amplitude },
        ],
        {
          duration: period * 1000,
          iterations: Infinity,
          easing: 'ease-in-out',
          delay: phase * 1000,
        },
      )
    }

    this.itemCount++
  }

  // ==================== 初始化：网格化一次性生成所有烟雾 ====================
  init(worldW: number, worldH: number): void {
    for (let gx = 0; gx <= worldW; gx += GRID_SPACING) {
      for (let gy = 0; gy <= worldH; gy += GRID_SPACING) {
        if (!this.isInSmokeZone(gx, gy)) continue

        // 单层：每个网格点只生成 1 个烟雾
        this.createSmokeItem(gx, gy)
      }
    }
    console.log(`🌫️ 烟雾系统初始化完成，共 ${this.itemCount} 个烟雾对象`)
  }

  getLayer(): Group {
    return this.layer
  }
}

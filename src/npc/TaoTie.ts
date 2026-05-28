import { Group, Ellipse, Polygon, Line } from 'leafer-ui'
import { NPC, NPCConfig } from './NPC'

/**
 * 饕餮 NPC
 * 凶兽，贪食无厌，但内心单纯
 * 水墨风格：圆滚滚兽形，巨口
 */
export class TaoTie extends NPC {
  constructor(config: NPCConfig) {
    super(config)
  }

  protected createVisual(): Group {
    const g = new Group()

    // 光晕（暗紫色）
    g.add(this.createGlow(100, 80, '#7060a0'))

    // 身体 —— 圆滚滚的大肚子
    g.add(
      new Ellipse({
        x: 0, y: 0, width: 48, height: 44,
        fill: { type: 'linear', from: { x: 0, y: -22 }, to: { x: 0, y: 22 }, stops: [
          { offset: 0, color: '#4a3058' },
          { offset: 0.5, color: '#3a2048' },
          { offset: 1, color: '#2a1038' },
        ]},
        opacity: 0.85,
      }),
    )

    // 腹部纹路
    for (let i = 0; i < 3; i++) {
      g.add(
        new Ellipse({
          x: 0, y: -5 + i * 10, width: 38, height: 6,
          fill: '#5a4068', opacity: 0.2,
        }),
      )
    }

    // 短发（背上的鬃毛）
    for (let i = 0; i < 7; i++) {
      const angle = -Math.PI * 0.4 + (i / 6) * Math.PI * 0.8
      g.add(
        new Line({
          points: [0, -22, Math.cos(angle) * 24, Math.sin(angle) * 24 - 22, Math.cos(angle) * 36, Math.sin(angle) * 36 - 22],
          curve: true,
          stroke: '#3a2048',
          strokeWidth: 3,
          opacity: 0.45,
          strokeCap: 'round',
        }),
      )
    }

    // 小短腿（四条）
    const legPositions = [
      [-15, 20], [-5, 22], [5, 22], [15, 20],
    ]
    for (const [lx, ly] of legPositions) {
      g.add(
        new Line({
          points: [lx, ly, lx + (lx > 0 ? 4 : -4), ly + 16],
          stroke: '#3a2048',
          strokeWidth: 6,
          opacity: 0.7,
          strokeCap: 'round',
        }),
      )
    }

    // 头部 —— 巨大
    g.add(
      new Ellipse({ x: 0, y: -30, width: 36, height: 28, fill: '#4a3058', opacity: 0.9 }),
    )

    // 巨口 —— 饕餮的标志
    g.add(
      new Ellipse({
        x: 0, y: -24, width: 24, height: 16,
        fill: '#1a0018',
        opacity: 0.85,
      }),
    )
    // 牙齿
    for (let i = 0; i < 6; i++) {
      const tx = -9 + i * 3.6
      g.add(
        new Polygon({
          points: [tx, -32, tx + 1.5, -28, tx + 3, -32],
          fill: '#d8d8d0',
          opacity: 0.8,
        }),
      )
    }

    // 圆滚滚的眼睛
    g.add(new Ellipse({ x: -9, y: -42, width: 8, height: 9, fill: '#f0e8d0', opacity: 0.92 }))
    g.add(new Ellipse({ x: 9, y: -42, width: 8, height: 9, fill: '#f0e8d0', opacity: 0.92 }))
    g.add(new Ellipse({ x: -9, y: -41, width: 4.5, height: 6, fill: '#1a0020', opacity: 0.9 }))
    g.add(new Ellipse({ x: 9, y: -41, width: 4.5, height: 6, fill: '#1a0020', opacity: 0.9 }))

    // 小角
    for (let side = -1; side <= 1; side += 2) {
      g.add(
        new Polygon({
          points: [
            side * 10, -43,
            side * 18, -58,
            side * 12, -45,
          ],
          fill: '#5a4068',
          opacity: 0.8,
        }),
      )
    }

    // 口水滴（贪吃的标志）
    g.add(
      new Ellipse({
        x: 2, y: -16, width: 4, height: 8,
        fill: '#8ac0e8', opacity: 0.4,
      }),
    )

    // 尾巴（短短卷曲）
    g.add(
      new Line({
        points: [16, 14, 26, 8, 20, -4],
        curve: true,
        stroke: '#4a3058',
        strokeWidth: 5,
        opacity: 0.5,
        strokeCap: 'round',
      }),
    )

    // 名字标签
    g.add(this.createNameLabel())

    return g
  }
}

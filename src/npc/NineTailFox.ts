import { Group, Ellipse, Polygon, Line } from 'leafer-ui'
import { NPC, NPCConfig } from './NPC'

/**
 * 九尾狐（涂山氏）NPC
 * 水墨风格狐狸，九尾散开
 */
export class NineTailFox extends NPC {
  constructor(config: NPCConfig) {
    super(config)
  }

  protected createVisual(): Group {
    const g = new Group()

    // 光晕
    g.add(this.createGlow(90, 70, '#f0d89c'))

    // 九尾 —— 水墨线条风格
    const tailBaseColors = [
      '#2a1a0a', '#332210', '#1e1005', '#3a2818',
      '#281808', '#352518', '#1f1208', '#3c2a18', '#231508',
    ]
    const tailLengths = [52, 58, 64, 70, 76, 70, 64, 58, 52]

    for (let i = 0; i < 9; i++) {
      const angle = -Math.PI * 0.55 + (i / 8) * Math.PI * 1.1
      const len = tailLengths[i]
      const sway = (i - 4) * 14

      const startX = 0
      const startY = -4
      const midX = Math.cos(angle + 0.15) * len * 0.5 + sway * 0.3
      const midY = Math.sin(angle + 0.15) * len * 0.5 - 8
      const endX = Math.cos(angle) * len + sway
      const endY = Math.sin(angle) * len - 4

      g.add(
        new Line({
          points: [startX, startY, midX, midY, endX, endY],
          curve: true,
          stroke: tailBaseColors[i],
          strokeWidth: 5 - i * 0.22,
          opacity: 0.45 + i * 0.05,
          strokeCap: 'round',
        }),
      )
    }

    // 身体
    g.add(
      new Ellipse({
        x: 0, y: 0, width: 30, height: 56,
        fill: {
          type: 'linear', from: { x: 0, y: -28 }, to: { x: 0, y: 28 },
          stops: [
            { offset: 0, color: '#4a3020' },
            { offset: 0.5, color: '#3a2510' },
            { offset: 1, color: '#2a1a08' },
          ],
        },
        opacity: 0.85,
      }),
    )

    // 头部
    g.add(
      new Ellipse({ x: 0, y: -34, width: 26, height: 22, fill: '#4a3020', opacity: 0.9 }),
    )

    // 耳朵
    g.add(
      new Polygon({ points: [-10, -44, -18, -66, -2, -48], fill: '#3a2510', opacity: 0.8 }),
    )
    g.add(
      new Polygon({ points: [10, -44, 18, -66, 2, -48], fill: '#3a2510', opacity: 0.8 }),
    )

    // 金色狐瞳
    const eyeW = 6, eyeH = 9
    g.add(new Ellipse({ x: -6.4, y: -38, width: eyeW, height: eyeH, fill: '#f0d89c', opacity: 0.98 }))
    g.add(new Ellipse({ x: 6.4, y: -38, width: eyeW, height: eyeH, fill: '#f0d89c', opacity: 0.98 }))
    g.add(new Ellipse({ x: -6.4, y: -37, width: 3, height: 5, fill: '#1a0a00', opacity: 0.92 }))
    g.add(new Ellipse({ x: 6.4, y: -37, width: 3, height: 5, fill: '#1a0a00', opacity: 0.92 }))

    // 鼻子
    g.add(
      new Ellipse({ x: 0, y: -31, width: 4.4, height: 3.6, fill: '#1a0800', opacity: 0.82 }),
    )

    // 名字标签
    g.add(this.createNameLabel())

    return g
  }
}

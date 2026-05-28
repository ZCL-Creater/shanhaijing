import { Group, Ellipse, Polygon, Line } from 'leafer-ui'
import { NPC, NPCConfig } from './NPC'

/**
 * 应龙 NPC
 * 龙族，呼风唤雨，曾助黄帝战蚩尤
 * 水墨风格：蜿蜒龙形，带双翼
 */
export class YingLong extends NPC {
  constructor(config: NPCConfig) {
    super(config)
  }

  protected createVisual(): Group {
    const g = new Group()

    // 光晕（青蓝色）
    g.add(this.createGlow(110, 85, '#6a9cb8'))

    // 龙尾 —— 蜿蜒曲线
    const tailPts: number[] = [0, 24]
    for (let i = 1; i <= 8; i++) {
      const t = i / 8
      const tx = Math.sin(t * Math.PI * 2.5) * 30
      const ty = 24 + t * 56
      tailPts.push(tx, ty)
    }
    g.add(
      new Line({
        points: tailPts,
        curve: true,
        stroke: '#3a6078',
        strokeWidth: 9,
        opacity: 0.6,
        strokeCap: 'round',
      }),
    )
    // 尾鳍
    const tailTip = 24 + 56
    g.add(
      new Polygon({
        points: [
          Math.sin(Math.PI * 2.5) * 30 - 12, tailTip - 6,
          Math.sin(Math.PI * 2.5) * 30, tailTip,
          Math.sin(Math.PI * 2.5) * 30 + 12, tailTip - 6,
        ],
        fill: '#3a6078',
        opacity: 0.5,
      }),
    )

    // 双翼（巨大的翅膀）
    for (let side = -1; side <= 1; side += 2) {
      const wingPts: number[] = [side * 10, -8]
      for (let i = 1; i <= 5; i++) {
        const t = i / 5
        wingPts.push(
          side * (12 + t * 48),
          -8 - t * 52,
        )
      }
      g.add(
        new Line({
          points: wingPts,
          curve: true,
          stroke: '#5a8098',
          strokeWidth: 5,
          opacity: 0.4,
          strokeCap: 'round',
        }),
      )
      // 翼膜
      g.add(
        new Polygon({
          points: [
            side * 10, -8,
            side * 60, -60,
            side * 55, -48,
            side * 10, -4,
          ],
          fill: '#4a7088',
          opacity: 0.12,
        }),
      )
    }

    // 身体
    g.add(
      new Ellipse({
        x: 0, y: 0, width: 28, height: 50,
        fill: { type: 'linear', from: { x: 0, y: -25 }, to: { x: 0, y: 25 }, stops: [
          { offset: 0, color: '#3a6070' },
          { offset: 0.5, color: '#2a4a5a' },
          { offset: 1, color: '#1a3040' },
        ]},
        opacity: 0.85,
      }),
    )

    // 龙鳞纹理
    for (let r = 0; r < 4; r++) {
      g.add(
        new Ellipse({
          x: 0, y: -10 + r * 12, width: 22, height: 6,
          fill: '#4a8090', opacity: 0.18,
        }),
      )
    }

    // 头部 —— 龙首
    g.add(
      new Ellipse({ x: 0, y: -30, width: 26, height: 20, fill: '#3a6070', opacity: 0.9 }),
    )

    // 龙角
    for (let side = -1; side <= 1; side += 2) {
      g.add(
        new Polygon({
          points: [
            side * 6, -40,
            side * 16, -60,
            side * 2, -44,
          ],
          fill: '#2a4a5a',
          opacity: 0.85,
        }),
      )
    }

    // 龙须
    for (let side = -1; side <= 1; side += 2) {
      g.add(
        new Line({
          points: [side * 8, -28, side * 24, -18, side * 34, -24],
          curve: true,
          stroke: '#6a8a98',
          strokeWidth: 1.8,
          opacity: 0.5,
          strokeCap: 'round',
        }),
      )
    }

    // 眼睛 —— 深沉悲悯
    g.add(new Ellipse({ x: -7, y: -34, width: 6, height: 7, fill: '#a0d0e0', opacity: 0.95 }))
    g.add(new Ellipse({ x: 7, y: -34, width: 6, height: 7, fill: '#a0d0e0', opacity: 0.95 }))
    g.add(new Ellipse({ x: -7, y: -33, width: 3, height: 4.5, fill: '#0a1a2a', opacity: 0.9 }))
    g.add(new Ellipse({ x: 7, y: -33, width: 3, height: 4.5, fill: '#0a1a2a', opacity: 0.9 }))

    // 名字标签
    g.add(this.createNameLabel())

    return g
  }
}

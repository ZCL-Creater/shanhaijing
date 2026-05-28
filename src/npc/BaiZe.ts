import { Group, Ellipse, Polygon, Line } from 'leafer-ui'
import { NPC, NPCConfig } from './NPC'

/**
 * 白泽 NPC
 * 神兽，能言善语，通晓万物
 * 水墨风格：白色独角神兽形态
 */
export class BaiZe extends NPC {
  constructor(config: NPCConfig) {
    super(config)
  }

  protected createVisual(): Group {
    const g = new Group()

    // 光晕（银白色）
    g.add(this.createGlow(96, 75, '#d4d8e0'))

    // 鬃毛 —— 祥云般的白色线条
    for (let i = 0; i < 7; i++) {
      const angle = -Math.PI * 0.7 + (i / 6) * Math.PI * 1.4
      const len = 42 + i * 5
      g.add(
        new Line({
          points: [
            0, -6,
            Math.cos(angle + 0.2) * len * 0.5, Math.sin(angle + 0.2) * len * 0.5 - 4,
            Math.cos(angle) * len, Math.sin(angle) * len - 2,
          ],
          curve: true,
          stroke: '#e8e4d8',
          strokeWidth: 3.5 - i * 0.2,
          opacity: 0.5 + i * 0.06,
          strokeCap: 'round',
        }),
      )
    }

    // 独角
    g.add(
      new Polygon({
        points: [0, -52, -6, -82, 6, -82],
        fill: { type: 'linear', from: { x: 0, y: -82 }, to: { x: 0, y: -52 }, stops: [
          { offset: 0, color: '#f5e8c8' },
          { offset: 1, color: '#d4c898' },
        ]},
        opacity: 0.9,
      }),
    )

    // 身体
    g.add(
      new Ellipse({
        x: 0, y: 0, width: 34, height: 52,
        fill: { type: 'linear', from: { x: 0, y: -26 }, to: { x: 0, y: 26 }, stops: [
          { offset: 0, color: '#ece8dc' },
          { offset: 0.6, color: '#e0d8c8' },
          { offset: 1, color: '#c8c0b0' },
        ]},
        opacity: 0.88,
      }),
    )

    // 头部
    g.add(
      new Ellipse({ x: 0, y: -32, width: 28, height: 24, fill: '#ece8dc', opacity: 0.92 }),
    )

    // 耳朵
    g.add(
      new Polygon({ points: [-11, -42, -19, -58, -4, -46], fill: '#d8d0c0', opacity: 0.8 }),
    )
    g.add(
      new Polygon({ points: [11, -42, 19, -58, 4, -46], fill: '#d8d0c0', opacity: 0.8 }),
    )

    // 眼睛 —— 智慧的深蓝
    g.add(new Ellipse({ x: -7, y: -35, width: 6, height: 8, fill: '#4a6080', opacity: 0.95 }))
    g.add(new Ellipse({ x: 7, y: -35, width: 6, height: 8, fill: '#4a6080', opacity: 0.95 }))
    g.add(new Ellipse({ x: -7, y: -34, width: 3, height: 5, fill: '#1a1a2a', opacity: 0.9 }))
    g.add(new Ellipse({ x: 7, y: -34, width: 3, height: 5, fill: '#1a1a2a', opacity: 0.9 }))

    // 鼻子
    g.add(
      new Ellipse({ x: 0, y: -29, width: 4.5, height: 3.5, fill: '#a89888', opacity: 0.8 }),
    )

    // 四条祥云纹路（身体侧面）
    for (let i = 0; i < 2; i++) {
      const sx = i === 0 ? -14 : 14
      g.add(
        new Line({
          points: [sx, -10, sx + (i === 0 ? -8 : 8), -18, sx, -26],
          curve: true,
          stroke: '#c8c0b0',
          strokeWidth: 2.5,
          opacity: 0.5,
          strokeCap: 'round',
        }),
      )
    }

    // 尾巴
    g.add(
      new Line({
        points: [0, 24, 12, 38, 6, 54, -12, 60],
        curve: true,
        stroke: '#e8e4d8',
        strokeWidth: 7,
        opacity: 0.55,
        strokeCap: 'round',
      }),
    )

    // 名字标签
    g.add(this.createNameLabel())

    return g
  }
}

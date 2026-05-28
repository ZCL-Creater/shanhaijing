import { Group, Ellipse, Polygon, Line } from 'leafer-ui'
import { NPC, NPCConfig } from './NPC'

/**
 * 毕方 NPC
 * 神鸟，形似鹤但只有一足，身披火焰
 * 水墨风格：单足神鸟，赤羽环绕
 */
export class BiFang extends NPC {
  constructor(config: NPCConfig) {
    super(config)
  }

  protected createVisual(): Group {
    const g = new Group()

    // 光晕（橙红色）
    g.add(this.createGlow(90, 80, '#e07850'))

    // 火焰羽翼（散开）
    const flameColors = ['#d04030', '#c83828', '#d84838', '#c03020', '#d85040']
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI * 0.35 + (i / 9) * Math.PI * 0.7
      const len = 48 + i * 4
      g.add(
        new Line({
          points: [
            0, -6,
            Math.cos(angle + 0.1) * len * 0.6, Math.sin(angle + 0.1) * len * 0.6 - 4,
            Math.cos(angle) * len, Math.sin(angle) * len,
          ],
          curve: true,
          stroke: flameColors[i % flameColors.length],
          strokeWidth: 4.5 - i * 0.3,
          opacity: 0.5 + i * 0.04,
          strokeCap: 'round',
        }),
      )
    }

    // 身体 —— 修长的鸟身
    g.add(
      new Ellipse({
        x: 0, y: 0, width: 24, height: 48,
        fill: { type: 'linear', from: { x: 0, y: -24 }, to: { x: 0, y: 24 }, stops: [
          { offset: 0, color: '#e05040' },
          { offset: 0.4, color: '#d04030' },
          { offset: 1, color: '#a02018' },
        ]},
        opacity: 0.85,
      }),
    )

    // 腹部亮色区域
    g.add(
      new Ellipse({
        x: 0, y: 6, width: 16, height: 28,
        fill: '#e8a090', opacity: 0.35,
      }),
    )

    // 单腿
    g.add(
      new Line({
        points: [0, 24, 0, 48, -2, 52],
        curve: false,
        stroke: '#c04030',
        strokeWidth: 5,
        opacity: 0.75,
        strokeCap: 'round',
      }),
    )
    // 脚爪
    g.add(
      new Polygon({
        points: [-2, 52, -10, 56, 0, 54, 8, 56, 2, 52],
        fill: '#c04030',
        opacity: 0.7,
      }),
    )

    // 头部
    g.add(
      new Ellipse({ x: 0, y: -30, width: 22, height: 18, fill: '#e05040', opacity: 0.9 }),
    )

    // 冠羽
    for (let i = 0; i < 5; i++) {
      g.add(
        new Line({
          points: [(i - 2) * 4, -39, (i - 2) * 5, -56, (i - 2) * 3, -62],
          curve: true,
          stroke: '#f06040',
          strokeWidth: 2.2,
          opacity: 0.7,
          strokeCap: 'round',
        }),
      )
    }

    // 喙
    g.add(
      new Polygon({
        points: [0, -35, 0, -46, 4, -38],
        fill: '#d8a020',
        opacity: 0.9,
      }),
    )

    // 眼睛 —— 金色
    g.add(new Ellipse({ x: -5, y: -32, width: 5, height: 6.5, fill: '#f0d060', opacity: 0.95 }))
    g.add(new Ellipse({ x: 5, y: -32, width: 5, height: 6.5, fill: '#f0d060', opacity: 0.95 }))
    g.add(new Ellipse({ x: -5, y: -31, width: 2.5, height: 4, fill: '#1a0800', opacity: 0.9 }))
    g.add(new Ellipse({ x: 5, y: -31, width: 2.5, height: 4, fill: '#1a0800', opacity: 0.9 }))

    // 火焰点缀
    for (let i = 0; i < 6; i++) {
      const fx = (Math.random() - 0.5) * 40
      const fy = -50 + Math.random() * 40
      g.add(
        new Ellipse({
          x: fx, y: fy, width: 4 + Math.random() * 6, height: 3 + Math.random() * 5,
          fill: '#f8a030', opacity: 0.3 + Math.random() * 0.25,
        }),
      )
    }

    // 名字标签
    g.add(this.createNameLabel())

    return g
  }
}

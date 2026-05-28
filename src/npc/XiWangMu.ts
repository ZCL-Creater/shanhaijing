import { Group, Ellipse, Polygon, Line } from 'leafer-ui'
import { NPC, NPCConfig } from './NPC'

/**
 * 西王母 NPC
 * 古神，瑶池之主，掌管不死药
 * 水墨风格：威严华贵女神形态
 */
export class XiWangMu extends NPC {
  constructor(config: NPCConfig) {
    super(config)
  }

  protected createVisual(): Group {
    const g = new Group()

    // 光晕（紫金色）
    g.add(this.createGlow(100, 90, '#c0a0d0'))

    // ===== 祥云宝座（底座）=====
    for (let i = 0; i < 3; i++) {
      g.add(
        new Ellipse({
          x: 0, y: 30 + i * 6, width: 36 - i * 8, height: 10 - i * 2,
          fill: '#d8c8f0', opacity: 0.15 + i * 0.08,
        }),
      )
    }

    // ===== 裙摆（华丽长裙）=====
    g.add(
      new Polygon({
        points: [-24, 10, -32, 38, -18, 30, 0, 40, 18, 30, 32, 38, 24, 10],
        fill: { type: 'linear', from: { x: 0, y: 10 }, to: { x: 0, y: 40 }, stops: [
          { offset: 0, color: '#6040a0' },
          { offset: 0.5, color: '#5038a0' },
          { offset: 1, color: '#4038b0' },
        ]},
        opacity: 0.7,
      }),
    )

    // 裙摆金边纹路
    g.add(
      new Line({
        points: [-24, 10, -28, 24, -12, 28, 0, 36, 12, 28, 28, 24, 24, 10],
        curve: true,
        stroke: '#d8b860',
        strokeWidth: 1.5,
        opacity: 0.45,
        strokeCap: 'round',
      }),
    )

    // ===== 身体（上半身）=====
    g.add(
      new Ellipse({
        x: 0, y: -4, width: 26, height: 32,
        fill: { type: 'linear', from: { x: 0, y: -20 }, to: { x: 0, y: 12 }, stops: [
          { offset: 0, color: '#e8d8f0' },
          { offset: 0.6, color: '#d0c0e8' },
          { offset: 1, color: '#6040a0' },
        ]},
        opacity: 0.82,
      }),
    )

    // 衣襟
    g.add(
      new Line({
        points: [0, 8, 0, -18],
        stroke: '#b8a0d0',
        strokeWidth: 1.5,
        opacity: 0.4,
      }),
    )

    // ===== 头部 =====
    g.add(
      new Ellipse({ x: 0, y: -26, width: 24, height: 22, fill: '#ece0f0', opacity: 0.9 }),
    )

    // 发髻
    g.add(
      new Ellipse({
        x: 0, y: -42, width: 20, height: 14,
        fill: '#302040', opacity: 0.75,
      }),
    )

    // 华胜（神冠）
    g.add(
      new Polygon({
        points: [-10, -48, 0, -60, 10, -48, 6, -44, -6, -44],
        fill: '#d8b860',
        opacity: 0.8,
      }),
    )
    // 冠上明珠
    g.add(
      new Ellipse({
        x: 0, y: -66, width: 8, height: 8,
        fill: '#f0e0ff', opacity: 0.9,
      }),
    )

    // 长发（两侧垂落）
    for (let side = -1; side <= 1; side += 2) {
      g.add(
        new Line({
          points: [side * 10, -22, side * 14, -10, side * 16, 2],
          curve: true,
          stroke: '#302040',
          strokeWidth: 4,
          opacity: 0.5,
          strokeCap: 'round',
        }),
      )
    }

    // 眼睛 —— 深邃威严
    g.add(new Ellipse({ x: -6, y: -29, width: 5.5, height: 7, fill: '#483890', opacity: 0.92 }))
    g.add(new Ellipse({ x: 6, y: -29, width: 5.5, height: 7, fill: '#483890', opacity: 0.92 }))
    g.add(new Ellipse({ x: -6, y: -28, width: 2.5, height: 4.5, fill: '#100820', opacity: 0.9 }))
    g.add(new Ellipse({ x: 6, y: -28, width: 2.5, height: 4.5, fill: '#100820', opacity: 0.9 }))

    // 眉心坠
    g.add(
      new Ellipse({ x: 0, y: -30, width: 3, height: 3, fill: '#f0d860', opacity: 0.85 }),
    )

    // ===== 披帛（飘带）=====
    for (let side = -1; side <= 1; side += 2) {
      g.add(
        new Line({
          points: [side * 12, -8, side * 28, -16, side * 38, -2, side * 42, 10],
          curve: true,
          stroke: '#c8a8e0',
          strokeWidth: 3.5,
          opacity: 0.35,
          strokeCap: 'round',
        }),
      )
    }

    // 名字标签
    g.add(this.createNameLabel())

    return g
  }
}

import { Group, Ellipse, Polygon, Line, Rect } from 'leafer-ui'
import { NPC, NPCConfig } from './NPC'

/**
 * 刑天 NPC
 * 无头战神，以乳为目、以脐为口，勇猛执着
 * 水墨风格：魁梧无头战士形态
 */
export class XingTian extends NPC {
  constructor(config: NPCConfig) {
    super(config)
  }

  protected createVisual(): Group {
    const g = new Group()

    // 光晕（古铜色）
    g.add(this.createGlow(100, 90, '#c89860'))

    // ===== 身体（魁梧的躯干）=====
    g.add(
      new Ellipse({
        x: 0, y: 0, width: 42, height: 54,
        fill: { type: 'linear', from: { x: 0, y: -27 }, to: { x: 0, y: 27 }, stops: [
          { offset: 0, color: '#8b6030' },
          { offset: 0.3, color: '#7a5028' },
          { offset: 0.7, color: '#6a4020' },
          { offset: 1, color: '#5a3018' },
        ]},
        opacity: 0.88,
      }),
    )

    // 胸肌线条
    g.add(
      new Line({
        points: [-14, -6, 0, 2, 14, -6],
        curve: true,
        stroke: '#5a3018',
        strokeWidth: 2,
        opacity: 0.3,
      }),
    )

    // ===== 以乳为目（胸部两只眼睛）=====
    for (let side = -1; side <= 1; side += 2) {
      // 眼眶
      g.add(
        new Ellipse({
          x: side * 10, y: -6, width: 10, height: 12,
          fill: '#f8e8c0', opacity: 0.9,
        }),
      )
      // 瞳孔 —— 燃烧的战意
      g.add(
        new Ellipse({
          x: side * 10, y: -5, width: 5, height: 7,
          fill: '#d84020', opacity: 0.95,
        }),
      )
    }

    // ===== 以脐为口（腹部一张嘴）=====
    g.add(
      new Ellipse({
        x: 0, y: 14, width: 16, height: 8,
        fill: '#2a1010', opacity: 0.85,
      }),
    )
    // 牙齿
    for (let i = 0; i < 4; i++) {
      g.add(
        new Polygon({
          points: [
            -6 + i * 4, 10,
            -4.5 + i * 4, 14,
            -3 + i * 4, 10,
          ],
          fill: '#c8c0b0',
          opacity: 0.7,
        }),
      )
    }

    // ===== 断颈（无头）=====
    g.add(
      new Ellipse({
        x: 0, y: -31, width: 22, height: 8,
        fill: '#4a2010', opacity: 0.7,
      }),
    )

    // ===== 手臂（粗壮）=====
    for (let side = -1; side <= 1; side += 2) {
      // 上臂
      g.add(
        new Line({
          points: [side * 20, -12, side * 30, -8, side * 44, 4],
          curve: true,
          stroke: '#7a5028',
          strokeWidth: 10,
          opacity: 0.7,
          strokeCap: 'round',
        }),
      )
      // 前臂
      g.add(
        new Line({
          points: [side * 44, 4, side * 48, 12, side * 50, 24],
          curve: true,
          stroke: '#6a4020',
          strokeWidth: 9,
          opacity: 0.65,
          strokeCap: 'round',
        }),
      )
      // 拳头
      g.add(
        new Ellipse({
          x: side * 50, y: 24, width: 10, height: 12,
          fill: '#6a4020', opacity: 0.8,
        }),
      )
    }

    // ===== 双腿 =====
    for (let side = -1; side <= 1; side += 2) {
      g.add(
        new Line({
          points: [side * 10, 26, side * 12, 40, side * 10, 52],
          curve: true,
          stroke: '#7a5028',
          strokeWidth: 11,
          opacity: 0.7,
          strokeCap: 'round',
        }),
      )
      // 脚
      g.add(
        new Ellipse({
          x: side * 10, y: 52, width: 16, height: 8,
          fill: '#5a3018', opacity: 0.75,
        }),
      )
    }

    // ===== 干盾（左臂持）=====
    g.add(
      new Rect({
        x: -52, y: -22, width: 16, height: 30,
        fill: '#7a6060', opacity: 0.7,
        cornerRadius: 3,
        stroke: '#5a4040', strokeWidth: 2,
      }),
    )

    // ===== 战纹（身体上的纹路）=====
    for (let i = 0; i < 4; i++) {
      g.add(
        new Line({
          points: [-16 + i * 2, -18 + i * 6, 0, -14 + i * 6, 16 - i * 2, -18 + i * 6],
          curve: true,
          stroke: '#d8b878',
          strokeWidth: 1.5,
          opacity: 0.25,
        }),
      )
    }

    // 名字标签
    g.add(this.createNameLabel())

    return g
  }
}

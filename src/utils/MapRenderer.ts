import { Rect, Ellipse, Group, Text } from 'leafer-ui'
import type { AreaConfig } from '../config/areas'

/**
 * MapRenderer - 负责绘制地图上的地点区域和地面装饰
 */
export class MapRenderer {
  /** 区域标记的默认大小 */
  private static readonly AREA_SIZE = 140

  /**
   * 在地面图层上绘制地点区域标记
   * 每个区域是一个带半透明颜色和边框的矩形，代表该地点的"地面区域"
   */
  static drawAreaMarkers(areas: AreaConfig[], layer: Group): Group[] {
    const markers: Group[] = []

    for (const area of areas) {
      const size = MapRenderer.AREA_SIZE
      const marker = new Group({ x: area.x, y: area.y })

      // 外层光晕（更大更淡的矩形）
      const glow = new Rect({
        x: -size / 2 - 10,
        y: -size / 2 - 10,
        width: size + 20,
        height: size + 20,
        fill: area.color,
        opacity: 0.08,
        cornerRadius: 12,
      })
      marker.add(glow)

      // 内层边框装饰（虚线效果用四个角的短线模拟）
      const cornerLength = 20
      const corners = [
        // 左上角
        { x: -size / 2, y: -size / 2, width: cornerLength, height: 3 },
        { x: -size / 2, y: -size / 2, width: 3, height: cornerLength },
        // 右上角
        { x: size / 2 - cornerLength, y: -size / 2, width: cornerLength, height: 3 },
        { x: size / 2 - 3, y: -size / 2, width: 3, height: cornerLength },
        // 左下角
        { x: -size / 2, y: size / 2 - 3, width: cornerLength, height: 3 },
        { x: -size / 2, y: size / 2 - cornerLength, width: 3, height: cornerLength },
        // 右下角
        { x: size / 2 - cornerLength, y: size / 2 - 3, width: cornerLength, height: 3 },
        { x: size / 2 - 3, y: size / 2 - cornerLength, width: 3, height: cornerLength },
      ]

      for (const c of corners) {
        marker.add(
          new Rect({
            ...c,
            fill: area.color,
            opacity: 0.6,
          }),
        )
      }

      // 主体区域（半透明填充 + 边框）
      const areaRect = new Rect({
        x: -size / 2,
        y: -size / 2,
        width: size,
        height: size,
        fill: area.color,
        opacity: 0.15,
        stroke: area.color,
        strokeWidth: 1.5,
        cornerRadius: 8,
      })
      marker.add(areaRect)

      // 地点名称标签
      const nameLabel = new Text({
        text: area.name,
        x: 0,
        y: size / 2 + 12,
        fontSize: 12,
        fill: '#c8b878',
        textAlign: 'center',
        fontWeight: 'bold',
        opacity: 0.8,
      })
      marker.add(nameLabel)

      layer.add(marker)
      markers.push(marker)
    }

    return markers
  }

  /**
   * 在已发现的地点区域绘制高亮效果
   */
  static highlightDiscoveredArea(
    area: AreaConfig,
    layer: Group,
  ): Group {
    const size = MapRenderer.AREA_SIZE
    const highlight = new Group({ x: area.x, y: area.y })

    // 高亮环
    highlight.add(
      new Rect({
        x: -size / 2 - 4,
        y: -size / 2 - 4,
        width: size + 8,
        height: size + 8,
        fill: 'transparent',
        stroke: '#e8d870',
        strokeWidth: 2.5,
        cornerRadius: 10,
        opacity: 0.7,
      }),
    )

    // 中心闪烁点
    highlight.add(
      new Ellipse({
        x: -4,
        y: -4,
        width: 8,
        height: 8,
        fill: '#e8d870',
        opacity: 0.8,
      }),
    )

    layer.add(highlight)
    return highlight
  }

  /**
   * 绘制地面纹理装饰（草斑、花斑等）
   * 可用在地面层上增加随机细节
   */
  static drawGroundTexture(
    worldW: number,
    worldH: number,
    layer: Group,
  ): void {
    // 深色草斑
    for (let i = 0; i < 200; i++) {
      const gx = Math.random() * worldW
      const gy = Math.random() * worldH
      layer.add(
        new Ellipse({
          x: gx,
          y: gy,
          width: 15 + Math.random() * 50,
          height: 10 + Math.random() * 35,
          fill: Math.random() > 0.5 ? '#4a7a3a' : '#6a9a5a',
          opacity: 0.3 + Math.random() * 0.3,
        }),
      )
    }

    // 浅色花斑
    for (let i = 0; i < 80; i++) {
      const gx = Math.random() * worldW
      const gy = Math.random() * worldH
      layer.add(
        new Ellipse({
          x: gx,
          y: gy,
          width: 4 + Math.random() * 10,
          height: 4 + Math.random() * 10,
          fill: '#d4c89c',
          opacity: 0.4 + Math.random() * 0.3,
        }),
      )
    }
  }
}

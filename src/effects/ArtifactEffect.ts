import { Image } from 'leafer-ui'

/** 世界尺寸常量（与 main.ts 保持一致） */
const WORLD_W = 4000
const WORLD_H = 4000

export class ArtifactEffect {
  static play(leafer: any, playerX: number, playerY: number) {
    try {
      // 将世界坐标转换为屏幕坐标
      const vw = leafer.width as number
      const vh = leafer.height as number
      let cx = playerX - vw / 2
      let cy = playerY - vh / 2
      cx = Math.max(0, Math.min(WORLD_W - vw, cx))
      cy = Math.max(0, Math.min(WORLD_H - vh, cy))

      const screenX = playerX - cx
      const screenY = playerY - cy

      // 动画参数
      const duration = 1500
      const startY = screenY - 120
      const endY = screenY

      // 创建灵印图片
      const artifact = new Image({
        url: '/assets/lingyin.png',
        width: 60,
        height: 60,
        x: screenX - 30,
        y: startY,
        zIndex: 999,
      })

      leafer.add(artifact)

      // 立即开始动画
      const startTime = Date.now()
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        const eased = 1 - Math.pow(1 - progress, 3)
        artifact.y = startY + (endY - startY) * eased
        const scale = 1 - progress * 0.3
        artifact.scaleX = scale
        artifact.scaleY = scale

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          // 动画结束
          artifact.opacity = 0
          document.dispatchEvent(new CustomEvent('portalActivated'))
          setTimeout(() => {
            try { leafer.remove(artifact) } catch (_) { /* ignore */ }
          }, 500)
        }
      }
      animate()
    } catch (err) {
      console.error('[ArtifactEffect] 动画播放失败:', err)
      // 即使动画失败，也要激活传送阵
      document.dispatchEvent(new CustomEvent('portalActivated'))
    }
  }
}

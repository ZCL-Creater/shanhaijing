/**
 * 物品栏系统
 * 管理收集到的灵印，当 7 枚灵印集齐时触发传送阵事件
 */
import type { RewardItem } from '../types/quest'

/** 传送阵触发回调 */
export type TeleportCallback = () => void

export class Inventory {
  /** 收集到的灵印列表 */
  private _collectedArtifacts: RewardItem[] = []

  /** 传送阵触发回调列表 */
  private onTeleportReadyCallbacks: TeleportCallback[] = []

  /** 传送阵是否已触发 */
  private teleportTriggered = false

  /** 获取已收集灵印 */
  get collectedArtifacts(): ReadonlyArray<RewardItem> {
    return this._collectedArtifacts
  }

  /** 获取收集数量 */
  get count(): number {
    return this._collectedArtifacts.length
  }

  /** 目标数量 */
  get targetCount(): number {
    return 7
  }

  /**
   * 添加一个灵印
   * @returns 是否集齐了全部 7 枚
   */
  addArtifact(artifact: RewardItem): boolean {
    if (this._collectedArtifacts.includes(artifact)) return false
    this._collectedArtifacts.push(artifact)

    // 当集齐 7 枚灵印时触发传送阵事件
    if (this._collectedArtifacts.length === 7 && !this.teleportTriggered) {
      this.teleportTriggered = true
      for (const cb of this.onTeleportReadyCallbacks) {
        cb()
      }
      return true
    }
    return false
  }

  /**
   * 检查是否集齐
   */
  isComplete(): boolean {
    return this._collectedArtifacts.length >= 7
  }

  /**
   * 是否已触发传送阵
   */
  isTeleportTriggered(): boolean {
    return this.teleportTriggered
  }

  /**
   * 注册传送阵就绪回调
   */
  onTeleportReady(callback: TeleportCallback): void {
    this.onTeleportReadyCallbacks.push(callback)
  }

  /**
   * 重置物品栏
   */
  reset(): void {
    this._collectedArtifacts = []
    this.teleportTriggered = false
  }
}

/** 全局单例 */
export const inventory = new Inventory()

/**
 * 任务管理器
 * 管理所有 NPC 对应的任务生命周期
 * 同时提供对话失败追踪与灵印收集的静态工具方法
 */
import type { Quest, QuestStatus, RewardItem } from '../types/quest'
import { NPC_ARTIFACT_MAP } from '../types/quest'

/** 任务状态变更回调 */
export type QuestCallback = (quest: Quest) => void

export class QuestManager {
  // ============================================================
  //  静态属性：对话失败 & 灵印收集系统
  // ============================================================

  /** 存储每个NPC的对话失败次数 */
  static failCounts: { [npcName: string]: number } = {}

  /** 存储已获得的灵印 */
  static collectedArtifacts: string[] = []

  /** 是否已见过西王母（被赶走过） */
  static hasMetXiwangmu = false

  /** 是否为永远困在山海经状态 */
  static isTrappedForever = false

  /** Bad Ending 处决台词 */
  static badEndingMessage = ''

  /** Bad Ending 触发 NPC 名称 */
  static badEndingNpcName = ''

  // ============================================================
  //  静态方法
  // ============================================================

  /**
   * 检查是否应该触发"永远困在山海经"
   * @returns true 表示玩家已触发被困结局
   */
  static checkTrapped(npcName: string): boolean {
    if (!this.failCounts[npcName]) this.failCounts[npcName] = 0
    this.failCounts[npcName]++
    if (this.failCounts[npcName] >= 3) {
      // 不在此处立即触发 Bad Ending，交由 DialogUI 在玩家读完处决台词后延迟触发
      return true
    }
    return false
  }

  /**
   * 触发 Bad Ending
   * @param message 处决台词（由当前 NPC 提供）
   * @param npcName 触发处决的 NPC 名称
   */
  static triggerBadEnding(message: string, npcName?: string) {
    this.badEndingMessage = message
    if (npcName) {
      this.badEndingNpcName = npcName
    }
    this.isTrappedForever = true
  }

  /**
   * 检查是否可以见西王母
   * @returns 收集满 6 枚灵印后才可以见西王母
   */
  static canVisitXiwangmu(): boolean {
    return this.collectedArtifacts.length >= 6
  }

  /**
   * 收集灵印
   * @param npcName NPC 名称（用于去重）
   */
  static collectArtifact(npcName: string) {
    if (!this.collectedArtifacts.includes(npcName)) {
      this.collectedArtifacts.push(npcName)
    }
  }

  /**
   * 重置所有静态状态（用于重新开始游戏）
   */
  static reset() {
    this.failCounts = {}
    this.collectedArtifacts = []
    this.hasMetXiwangmu = false
    this.isTrappedForever = false
    this.badEndingMessage = ''
    this.badEndingNpcName = ''
  }

  // ============================================================
  //  实例属性与方法（任务生命周期管理）
  // ============================================================

  private quests: Map<string, Quest> = new Map()

  /** 任务完成回调列表 */
  private onQuestCompletedCallbacks: QuestCallback[] = []
  /** 任务开始回调列表 */
  private onQuestStartedCallbacks: QuestCallback[] = []

  /**
   * 初始化所有 NPC 对应的任务
   * @param npcNames NPC 名称列表
   */
  init(npcNames: string[]): void {
    this.quests.clear()
    for (const name of npcNames) {
      const artifact = NPC_ARTIFACT_MAP[name] || `未知灵印`
      this.quests.set(name, {
        id: `quest_${name}`,
        name: `探索${name}的秘境`,
        npcId: name,
        description: `与${name}对话，完成交流后可获得「${artifact}」。`,
        isCompleted: false,
        status: 'pending',
        rewardItem: artifact,
      })
    }
  }

  /**
   * 获取某个 NPC 对应的任务
   */
  getQuest(npcName: string): Quest | undefined {
    return this.quests.get(npcName)
  }

  /**
   * 获取所有任务
   */
  getAllQuests(): Quest[] {
    return Array.from(this.quests.values())
  }

  /**
   * 获取已完成任务数量
   */
  getCompletedCount(): number {
    let count = 0
    for (const q of this.quests.values()) {
      if (q.status === 'completed') count++
    }
    return count
  }

  /**
   * 获取任务总数
   */
  getTotalCount(): number {
    return this.quests.size
  }

  /**
   * 将任务设为"进行中"（玩家与 NPC 开始对话时调用）
   */
  startQuest(npcName: string): Quest | undefined {
    const quest = this.quests.get(npcName)
    if (!quest || quest.status !== 'pending') return quest
    quest.status = 'in_progress'
    for (const cb of this.onQuestStartedCallbacks) {
      cb(quest)
    }
    return quest
  }

  /**
   * 完成任务（对话成功后调用），返回获得的灵印名称
   */
  completeQuest(npcName: string): RewardItem | null {
    const quest = this.quests.get(npcName)
    if (!quest || quest.status === 'completed') return null
    quest.status = 'completed'
    quest.isCompleted = true
    for (const cb of this.onQuestCompletedCallbacks) {
      cb(quest)
    }
    return quest.rewardItem
  }

  /**
   * 注册任务完成回调
   */
  onQuestCompleted(callback: QuestCallback): void {
    this.onQuestCompletedCallbacks.push(callback)
  }

  /**
   * 注册任务开始回调
   */
  onQuestStarted(callback: QuestCallback): void {
    this.onQuestStartedCallbacks.push(callback)
  }

  /**
   * 重置所有任务（实例状态）
   * 注意：此方法与静态 reset() 互不冲突，分别操作实例和静态状态
   */
  reset(): void {
    this.quests.clear()
  }
}

/** 全局单例 */
export const questManager = new QuestManager()

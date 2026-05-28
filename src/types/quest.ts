/**
 * 任务系统类型定义
 */

/** 任务状态 */
export type QuestStatus = 'pending' | 'in_progress' | 'completed'

/** 任务奖励物品 */
export type RewardItem = string

/** 任务定义 */
export interface Quest {
  /** 任务唯一标识 */
  id: string
  /** 任务名称 */
  name: string
  /** 对应的 NPC 名称 */
  npcId: string
  /** 任务描述 */
  description: string
  /** 是否已完成 */
  isCompleted: boolean
  /** 完成状态 */
  status: QuestStatus
  /** 完成任务获得的奖励：灵印名称 */
  rewardItem: RewardItem
}

/** NPC 到灵印的映射表 */
export const NPC_ARTIFACT_MAP: Record<string, string> = {
  '九尾狐（涂山氏）': '青丘灵印',
  '白泽': '白泽灵印',
  '应龙': '应龙灵印',
  '毕方': '毕方灵印',
  '饕餮': '饕餮灵印',
  '刑天': '刑天灵印',
  '西王母': '昆仑灵印',
}

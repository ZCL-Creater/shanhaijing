/**
 * NPC 声线配置
 *
 * 每位异兽 NPC 拥有独立的音调（pitch）和语速（rate），
 * 通过调整这两个参数使朗读效果贴合角色性格。
 *
 * pitch：0.5（低沉）~ 2（尖细），默认 1
 * rate ：0.5（慢） ~ 2（快），默认 1
 */

export interface NPCVoiceConfig {
  pitch: number
  rate: number
  voiceName?: string
}

/** NPC 名称 → 声线参数映射 */
export const NPC_VOICE_CONFIG: Record<string, NPCVoiceConfig> = {
  '九尾狐（涂山氏）': { pitch: 1.2, rate: 0.9 },   // 声音尖细、妖媚
  '白泽':             { pitch: 0.8, rate: 0.8 },   // 声音低沉、沉稳
  '应龙':             { pitch: 0.7, rate: 0.9 },   // 声音厚重、威严
  '毕方':             { pitch: 1.1, rate: 1.4 },   // 声音高亢、语速快
  '饕餮':             { pitch: 0.6, rate: 0.7 },   // 声音粗犷、缓慢
  '刑天':             { pitch: 0.5, rate: 0.8 },   // 声音浑厚、有力
  '西王母':           { pitch: 0.9, rate: 0.6 },   // 声音空灵、舒缓
}

/**
 * 根据 NPC 完整名称获取声线配置
 * 如果找不到精确匹配，返回默认值
 */
export function getNPCVoice(npcName: string): NPCVoiceConfig {
  return NPC_VOICE_CONFIG[npcName] ?? { pitch: 1, rate: 1 }
}

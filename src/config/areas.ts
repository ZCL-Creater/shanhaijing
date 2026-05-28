/**
 * 游戏地点配置
 * 统一管理7个地点和对应NPC的坐标、名称等信息
 */

export interface AreaConfig {
  /** 地点名称 */
  name: string
  /** 对应的 NPC 名称 */
  npcName: string
  /** 世界坐标 X */
  x: number
  /** 世界坐标 Y */
  y: number
  /** 是否已被发现 */
  discovered: boolean
  /** 区域主题色（用于绘制地面标记） */
  color: string
  /** 地点描述 */
  description: string
  /** 背景图文件名（位于 public/assets/ 下） */
  background: string
  /** NPC 角色图文件名（位于 public/assets/ 下） */
  npcImage: string
  /** 地点覆盖范围半径 */
  areaSize: number
  /** 背景图缩放比例 */
  backgroundScale: number
}

export type AreaId = 'qingqiu' | 'miwu' | 'donghai' | 'huoyan' | 'shenyuan' | 'changyang' | 'kunlun'

export const AREAS: Record<AreaId, AreaConfig> = {
  miwu: {
    name: '巨树森林',
    npcName: '白泽',
    x: 1300,
    y: 900,
    discovered: false,
    color: '#98b8c8',
    description: '终年雾气弥漫的古老巨树森林，白泽在此隐居观星。',
    background: 'wusen.png',
    npcImage: 'baize.png',
    areaSize: 1500,
    backgroundScale: 0.8,
  },
  qingqiu: {
    name: '青丘之山',
    npcName: '九尾狐（涂山氏）',
    x: 800,
    y: 2000,
    discovered: false,
    color: '#e8a8b0',
    description: '九尾天狐的故乡，粉色桃花常开不败，山间灵气缭绕。',
    background: 'qingqiu.png',
    npcImage: 'jiuweihu.png',
    areaSize: 1500,
    backgroundScale: 0.8,
  },
  donghai: {
    name: '东海之滨',
    npcName: '应龙',
    x: 2000,
    y: 2000,
    discovered: false,
    color: '#68a8d8',
    description: '浩瀚东海中央的龙神秘境，应龙在此守护息壤，呼风唤雨。',
    background: 'donghai.png',
    npcImage: 'yinglong.png',
    areaSize: 1500,
    backgroundScale: 0.8,
  },
  huoyan: {
    name: '火焰山谷',
    npcName: '毕方',
    x: 3200,
    y: 2000,
    discovered: false,
    color: '#e8c880',
    description: '烈焰翻涌的赤红山谷，赤焰神鸟毕方在火山熔岩中的巢穴。',
    background: 'huoyan.png',
    npcImage: 'bifang.png',
    areaSize: 1500,
    backgroundScale: 0.8,
  },
  shenyuan: {
    name: '废墟遗迹',
    npcName: '饕餮',
    x: 3200,
    y: 800,
    discovered: false,
    color: '#c898c8',
    description: '远古神战留下的废墟遗迹，饕餮在此游荡觅食。',
    background: 'shenyuan.png',
    npcImage: 'taotie.png',
    areaSize: 1500,
    backgroundScale: 0.8,
  },
  changyang: {
    name: '常羊之山',
    npcName: '刑天',
    x: 800,
    y: 3200,
    discovered: false,
    color: '#b89880',
    description: '青石旗帜下战神刑天与黄帝大战之地，至今斧痕犹存。',
    background: 'changyang.png',
    npcImage: 'xingtian.png',
    areaSize: 1500,
    backgroundScale: 0.8,
  },
  kunlun: {
    name: '昆仑之巅',
    npcName: '西王母',
    x: 3200,
    y: 3200,
    discovered: false,
    color: '#d8c8e8',
    description: '金色雪山下西王母的仙境居所，蟠桃仙果千年一熟。',
    background: 'kunlun.png',
    npcImage: 'xiwangmu.png',
    areaSize: 1500,
    backgroundScale: 0.8,
  },
}

/** 所有地点的数组形式，方便遍历 */
export const AREA_LIST: AreaConfig[] = Object.values(AREAS)

/** 地点总数 */
export const AREA_COUNT = AREA_LIST.length

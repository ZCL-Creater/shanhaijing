import { Leafer, Group, Rect, Text, Image } from 'leafer-ui'
import { SmokeManager } from './effects/SmokeManager'
import { ArtifactEffect } from './effects/ArtifactEffect'
import { NineTailFox } from './npc/NineTailFox'
import { BaiZe } from './npc/BaiZe'
import { YingLong } from './npc/YingLong'
import { BiFang } from './npc/BiFang'
import { TaoTie } from './npc/TaoTie'
import { XingTian } from './npc/XingTian'
import { XiWangMu } from './npc/XiWangMu'
import { NPC } from './npc/NPC'
import { getAIResponse, toggleMockMode } from './services/AIService'
import type { NPCContext } from './services/AIService'
import { AudioManager } from './audio/AudioManager'
import { AREAS, AREA_LIST } from './config/areas'
import { questManager, QuestManager } from './managers/QuestManager'
import { inventory } from './managers/Inventory'
import { endingScene } from './scenes/EndingScene'
import { executionScene } from './scenes/ExecutionScene'
import { openingScene } from './scenes/OpeningScene'
import { NPC_ARTIFACT_MAP } from './types/quest'
import { getNPCQuestion } from './config/npcQuestions'
import { Minimap } from './utils/Minimap'
import { DialogUI } from './ui/DialogUI'
import { MuteButton } from './ui/MuteButton'

// ==================== 图片加载管理 ====================
let totalImagesToLoad = 0
let imagesLoaded = 0
let allImagesReady = false

// 已加载成功的图片列表，用于调试
const loadedImages: string[] = []
const failedImages: string[] = []

function createTrackedImage(options: Record<string, unknown>, zIndex: number): Image {
  totalImagesToLoad++
  const img = new Image(options as any)
  img.zIndex = zIndex
  const url = options['url'] as string
  img.on('Loaded', () => {
    imagesLoaded++
    loadedImages.push(url)
    console.log(`✅ 图片加载成功 (${imagesLoaded}/${totalImagesToLoad}):`, url)
  })
  img.on('Error', () => {
    imagesLoaded++
    failedImages.push(url)
    console.error(`❌ 图片加载失败 (${imagesLoaded}/${totalImagesToLoad}):`, url)
  })
  return img
}

function checkAllImagesLoaded(): boolean {
  if (imagesLoaded >= totalImagesToLoad && totalImagesToLoad > 0) {
    return true
  }
  return false
}

// ==================== 常量 ====================
const WORLD_W = 4000
const WORLD_H = 4000
const PLAYER_SPEED = 5
const PLAYER_SIZE = 16
const EXPLORE_RADIUS = 120
const POINT_SIZE = 26

// ==================== 游戏状态 ====================
let playerX = WORLD_W / 2
let playerY = WORLD_H / 2
let discoveredBeastCount = 0   // 已发现异兽数量（用于计算探索进度百分比）
let gameStarted = false
let openingFinished = false
let isOpeningSceneActive = false
let pendingDiscoveryToasts: string[] = []
let animFrame = 0

// ==================== 音频：NPC 名称 → mp3 文件名映射 ====================
/** 从 AREA_LIST 的 npcImage 推导音频文件名（如 yinglong.png → yinglong） */
const NPC_AUDIO_NAME_MAP: Record<string, string> = {}
for (const area of AREA_LIST) {
  const audioName = area.npcImage.replace('.png', '')
  NPC_AUDIO_NAME_MAP[area.npcName] = audioName
}

/** 当前玩家所在的 NPC 领地区域音频名（用于避免重复切换） */
let currentAmbientNpc: string | null = null

const TOTAL_NPC_COUNT = 7
let badEndingTriggered = false

// 灵印图标顺序（最左应龙，最右西王母）
const LINGYIN_ICON_ORDER = [
  { npcName: '应龙', artifactName: '应龙灵印', image: '/assets/yinglong.png' },
  { npcName: '九尾狐（涂山氏）', artifactName: '青丘灵印', image: '/assets/jiuweihu.png' },
  { npcName: '白泽', artifactName: '白泽灵印', image: '/assets/baize.png' },
  { npcName: '毕方', artifactName: '毕方灵印', image: '/assets/bifang.png' },
  { npcName: '饕餮', artifactName: '饕餮灵印', image: '/assets/taotie.png' },
  { npcName: '刑天', artifactName: '刑天灵印', image: '/assets/xingtian.png' },
  { npcName: '西王母', artifactName: '昆仑灵印', image: '/assets/xiwangmu.png' },
]

/** 传送阵相关 */
const TELEPORT_X = 2000
const TELEPORT_Y = 2600
const TELEPORT_RADIUS = 165
let teleportArray: Group | null = null
let teleportCreated = false

// 能量脉冲动画相关
interface EnergyPulse {
  x: number
  y: number
  radius: number
  opacity: number
  maxRadius: number
  color: string
  lineWidth: number
}
let energyPulses: EnergyPulse[] = []
let energyPulseCooldown = 0

// ==================== 应龙送别剧情状态 ====================
let isFarewellActive = false
let farewellShown = false
let farewellCompleted = false

// 能量脉冲渲染画布
const pulseCanvas = document.createElement('canvas')
pulseCanvas.id = 'energy-pulse-canvas'
const pulseCtx = pulseCanvas.getContext('2d')!
Object.assign(pulseCanvas.style, {
  position: 'fixed', top: '0', left: '0',
  width: '100%', height: '100%',
  pointerEvents: 'none', zIndex: '50',
})
document.body.appendChild(pulseCanvas)

function resizePulseCanvas(): void {
  pulseCanvas.width = window.innerWidth
  pulseCanvas.height = window.innerHeight
}
resizePulseCanvas()

const keysDown: Record<string, boolean> = {}

// ==================== 探索点生成 ====================
interface ExplorePoint {
  x: number
  y: number
  discovered: boolean
  name: string
}

function generateExplorePoints(): ExplorePoint[] {
  return AREA_LIST.map(area => ({
    x: area.x,
    y: area.y,
    discovered: false,
    name: `${area.name} · ${area.npcName}`,
  }))
}

const explorePoints = generateExplorePoints()

// ==================== Leafer 初始化 ====================
const leafer = new Leafer({
  view: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
})

// ==================== 世界图层 ====================
const groundLayer = new Group()
const smokeLayer = new Group()
const entityLayer = new Group()

// 图层层级：背景图(0) < 烟雾(1) < NPC/主角/传送门(2)
groundLayer.zIndex = 0
smokeLayer.zIndex = 1
entityLayer.zIndex = 2

const worldRoot = new Group()
worldRoot.add(groundLayer)
worldRoot.add(smokeLayer)
worldRoot.add(entityLayer)
leafer.add(worldRoot)

// ==================== 🌄 全局背景图（zIndex: 0，最底层，覆盖整个游戏世界） ====================
const dituBg = createTrackedImage({
  url: '/assets/ditu.png',
  x: 0,
  y: 0,
  width: WORLD_W,
  height: WORLD_H,
}, 0)
groundLayer.add(dituBg)

// ==================== 🌀 加载传送阵图片（zIndex: 0） ====================
function createTeleportArray(): Group {
  const group = new Group({ x: TELEPORT_X, y: TELEPORT_Y })
  group.zIndex = 0
  const portalImg = createTrackedImage({
    url: '/assets/chuansong.png',
    x: -225,
    y: -225,
    width: 450,
  }, 0)
  portalImg.on('Loaded', () => console.log('✅ 传送阵图片加载成功'))
  portalImg.on('Error', () => console.error('❌ 传送阵图片加载失败: /assets/chuansong.png'))
  ;(group as any)._portalImg = portalImg
  group.add(portalImg)
  return group
}

// ==================== 🧝 加载各地点的 NPC 角色图（zIndex: 1） ====================
console.log('📦 开始加载NPC角色图片...')

// NPC 图片宽度映射（3倍放大）
const NPC_IMAGE_WIDTHS: Record<string, number> = {
  'bifang.png': 360,
  'jiuweihu.png': 450,
  'baize.png': 450,
  'yinglong.png': 600,
  'xingtian.png': 600,
  'xiwangmu.png': 660,
  'taotie.png': 720,
}

// NPC 浮动动画数据
interface NpcFloatData {
  group: Group
  baseY: number
  phase: number
}
const npcFloatDataList: NpcFloatData[] = []

for (let i = 0; i < AREA_LIST.length; i++) {
  const area = AREA_LIST[i]
  const npcWidth = NPC_IMAGE_WIDTHS[area.npcImage] || 360
  const npcImgGroup = new Group({ x: area.x, y: area.y })
  npcImgGroup.zIndex = 1
  const npcImg = createTrackedImage({
    url: '/assets/' + area.npcImage,
    x: -npcWidth / 2,
    y: -npcWidth / 2,
    width: npcWidth,
  }, 1)
  npcImg.on('Loaded', () => console.log('✅ NPC图片加载成功:', area.npcImage, '→', area.npcName, `(宽${npcWidth}px)`))
  npcImg.on('Error', () => console.error('❌ NPC图片加载失败:', area.npcImage, '→ 路径: /assets/' + area.npcImage))
  npcImgGroup.add(npcImg)
  entityLayer.add(npcImgGroup)

  // 记录浮动动画数据，每个 NPC 不同的相位使其错落有致
  npcFloatDataList.push({
    group: npcImgGroup,
    baseY: area.y,
    phase: (i / AREA_LIST.length) * Math.PI * 2,
  })
}

// ==================== 🔮 加载灵印图标（用于物品栏） ====================
console.log('📦 加载灵印图标...')
const lingyinIcon = createTrackedImage({
  url: '/assets/lingyin.png',
  width: 40,
}, 999)
lingyinIcon.on('Loaded', () => console.log('✅ 灵印图标加载成功'))
lingyinIcon.on('Error', () => console.error('❌ 灵印图标加载失败: /assets/lingyin.png'))
;(window as any)._lingyinIcon = lingyinIcon

// ==================== 探索点标记（保留用于大地图导航） ====================
const pointMarkers: Array<{
  point: ExplorePoint
  marker: Group
  glowRect: Rect
  label: Text | null
}> = []

for (const ep of explorePoints) {
  const markerGroup = new Group({ x: ep.x, y: ep.y })
  const glow = new Rect({
    x: -POINT_SIZE / 2 - 4, y: -POINT_SIZE / 2 - 4,
    width: POINT_SIZE + 8, height: POINT_SIZE + 8,
    fill: '#5b9bd5', opacity: 0.3, cornerRadius: 4,
  })
  const box = new Rect({
    x: -POINT_SIZE / 2, y: -POINT_SIZE / 2,
    width: POINT_SIZE, height: POINT_SIZE,
    fill: '#5b9bd5', cornerRadius: 4,
    stroke: '#8fc4f0', strokeWidth: 2,
  })
  markerGroup.add(glow)
  markerGroup.add(box)
  markerGroup.visible = false // 隐藏探索点方块，避免遮挡NPC图片
  entityLayer.add(markerGroup)
  pointMarkers.push({ point: ep, marker: markerGroup, glowRect: glow, label: null })
}

// ==================== 🎮 主角（只使用图片，无几何图形） ====================
console.log('📦 加载主角图片...')
const playerGroup = new Group({ x: playerX, y: playerY })
playerGroup.zIndex = 2

// 主角图片 —— 完全不使用 Ellipse 或任何几何图形！
const playerImage = createTrackedImage({
  url: '/assets/player.png',
  x: -80,
  y: -90,
  width: 160,
}, 2)
playerImage.on('Loaded', () => console.log('✅ 主角图片加载成功: /assets/player.png'))
playerImage.on('Error', () => console.error('❌ 主角图片加载失败: /assets/player.png'))
playerGroup.add(playerImage)

entityLayer.add(playerGroup)

// ==================== NPC 创建（坐标严格使用 AREAS 配置） ====================
let allNPCs: NPC[] = []
try {
  allNPCs = [
    new NineTailFox({
      name: AREAS.qingqiu.npcName,
      personality: '高傲、狡诈、喜欢试探人心',
      background: '你是一只九尾天狐，青丘山的主人，千年修行赋予你绝世容颜与通天法力。你曾助大禹治水，又与涂山氏结下千年情缘，却被天庭封印在青丘山中，无法离开。',
      currentDesire: '想找到解除封印的方法，重返人间，但你不愿轻易相信任何人。',
      x: AREAS.qingqiu.x, y: AREAS.qingqiu.y, emoji: '🦊',
      bubbleOffsetY: -160,
    }),
    new BaiZe({
      name: AREAS.miwu.npcName,
      personality: '博学、神秘',
      background: '你是上古神兽白泽，通晓天下万物，能言人语，知天下鬼神之事。你曾在黄帝巡游时现身，口述《白泽图》记载万妖名录。你隐居昆仑深处，观星象、读天机。',
      currentDesire: '想找到失落的《万妖录》残卷，补全天地异兽的记录，防止更多古老知识被遗忘。',
      x: AREAS.miwu.x, y: AREAS.miwu.y, emoji: '🦄',
      bubbleOffsetY: -150,
    }),
    new YingLong({
      name: AREAS.donghai.npcName,
      personality: '悲天悯人、愧疚',
      background: '你是上古龙神应龙，曾助黄帝大战蚩尤于涿鹿之野，又助大禹治水。但每次出手都引发滔天洪水，无数生灵因此遭难。你带着深深的愧疚隐退云中，再也无力飞翔。',
      currentDesire: '想找回丢失的息壤，平息洪水遗留的灾难，弥补自己犯下的过错。',
      x: AREAS.donghai.x, y: AREAS.donghai.y, emoji: '🐉',
      bubbleOffsetY: -220,
    }),
    new BiFang({
      name: AREAS.huoyan.npcName,
      personality: '急躁、善良',
      background: '你是神鸟毕方，形似鹤但只有一足，身披赤焰。你曾是黄帝的侍鸟，负责传递军令。性子急躁但内心善良，常因冲动惹祸后又后悔。你的巢穴正被妖兽侵扰。',
      currentDesire: '想赶走侵占巢穴的妖兽，保护森林中的小动物，但自己的力量已经不够了。',
      x: AREAS.huoyan.x, y: AREAS.huoyan.y, emoji: '🦩',
      bubbleOffsetY: -130,
    }),
    new TaoTie({
      name: AREAS.shenyuan.npcName,
      personality: '贪婪、单纯',
      background: '你是凶兽饕餮，贪食无厌，据说能吞下天地万物。但你其实只是饿了很久很久，内心深处渴望友情和陪伴。人们只看到你的凶残外表，却不知道你其实很孤独。',
      currentDesire: '想找到吃不完的美食，更想找到一个不怕你、愿意和你做朋友的人。',
      x: AREAS.shenyuan.x, y: AREAS.shenyuan.y, emoji: '👹',
      bubbleOffsetY: -40,
      bubbleOffsetX: -200,
    }),
    new XingTian({
      name: AREAS.changyang.npcName,
      personality: '勇猛、执着',
      background: '你是战神刑天，与黄帝战于常羊之山，被斩去头颅。但你以乳为目、以脐为口，手持巨斧干戚继续战斗，永不屈服。巨斧在你手中，便是你永不磨灭的战魂。',
      currentDesire: '寻找真正有勇气的对手，用手中巨斧证明自己的战神之威。',
      x: AREAS.changyang.x, y: AREAS.changyang.y, emoji: '⚔️',
      bubbleOffsetX: -80,
      bubbleOffsetY: 60,
    }),
    new XiWangMu({
      name: AREAS.kunlun.npcName,
      personality: '威严、孤寂',
      background: '你是西王母，居于昆仑瑶池，掌管不死之药和蟠桃仙果。三界万仙来朝，你坐拥至高权位。但万年的长生让你看尽了离别，瑶池虽美，却无人能与你长久相伴。',
      currentDesire: '想找一个值得托付的继承者，将不死之药的秘密传承下去，结束万年的孤独。',
      x: AREAS.kunlun.x, y: AREAS.kunlun.y, emoji: '👑',
      bubbleOffsetY: -340,
    }),
  ]
} catch (err: any) {
  console.error('❌ NPC 创建失败:', err.message, err.stack)
  // 在页面上显示错误
  const errDiv = document.createElement('div')
  errDiv.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#c0392b;color:#fff;padding:12px 24px;border-radius:8px;z-index:9999;font-size:14px;max-width:90%;text-align:center;'
  errDiv.textContent = 'NPC 创建失败: ' + err.message
  document.body.appendChild(errDiv)
}

// 🔑 关键修复：隐藏 NPC 的几何视觉（只用图片显示），但保留气泡对话框
try {
  for (const npc of allNPCs) {
    npc.hideGeometricVisual()
    npc.getGroup().zIndex = 1
    entityLayer.add(npc.getGroup())
    console.log('🎭 NPC已切换到图片模式:', npc.name)
  }
} catch (err: any) {
  console.error('❌ NPC 初始化失败:', err.message)
}

// ==================== 🌫️ 烟雾管理器初始化（固定世界坐标，一次性生成） ====================
const smokeManager = new SmokeManager(smokeLayer)
smokeManager.init(WORLD_W, WORLD_H)

// 初始化任务管理器
try {
  questManager.init(allNPCs.map(n => n.name))
} catch (err: any) {
  console.error('❌ 任务管理器初始化失败:', err.message)
}

// ==================== 小地图初始化 ====================
const minimap = new Minimap(WORLD_W, WORLD_H)
try {
  minimap.initFromAreas(AREA_LIST)
  minimap.setNPCMarkers(allNPCs.map(n => ({ x: n.x, y: n.y, name: n.name, emoji: n.emoji || '' })))
  minimap.updateDiscoveredAreas(explorePoints)
  minimap.mount()
} catch (err: any) {
  console.error('❌ 小地图初始化失败:', err.message)
}

// 注册传送阵就绪回调（灵印获得动画结束后由 portalActivated 事件激活传送阵）
inventory.onTeleportReady(() => {
  // 传送阵激活由 ArtifactEffect 动画结束后触发的 portalActivated 事件接管
})

// 灵印获得动画结束后激活传送门
document.addEventListener('portalActivated', () => {
  createTeleportArrayVisual()
  showTeleportFlash()
})

// ==================== 对话面板 ====================
const dialoguePanel = document.getElementById('dialogue-panel')!
const dialogueNpcName = document.getElementById('dialogue-npc-name')!
const dialogueResponse = document.getElementById('dialogue-response')!
const dialogueInput = document.getElementById('dialogue-input') as HTMLInputElement
const dialogueBtn = document.getElementById('dialogue-btn')!
const enterDialogueBtn = document.getElementById('enter-dialogue-btn')!
const enterDialogueAction = document.getElementById('enter-dialogue-action')!
const exitDialogueBtn = document.getElementById('exit-dialogue-btn')!

let isNearNPC = false
let isInDialogue = false   // 🔑 是否处于对话模式
let currentNPC: NPC | null = null

function showDialoguePanel(npc: NPC | null) {
  if (npc) {
    dialogueNpcName.textContent = `${npc.emoji} ${npc.name}`
    dialoguePanel.classList.remove('hidden')
    dialogueResponse.textContent = ''
    dialogueInput.focus()
  } else {
    dialoguePanel.classList.add('hidden')
  }
}

// ==================== 进入对话 ====================
enterDialogueAction.addEventListener('click', () => {
  if (!currentNPC || isInDialogue) return

  // ========== 西王母特殊逻辑 ==========
  if (currentNPC.name === '西王母') {
    // 无论是否集齐6枚灵印，都允许进入自由对话（AI聊天）
    // 区别在于："询问灵印"按钮在灵印不足时会触发拒绝
    isInDialogue = true
    isNearNPC = true
    enterDialogueBtn.classList.add('hidden')
    showDialoguePanel(currentNPC)

    // 只有已集齐6枚才标记任务为进行中（否则保持 pending，阻止问答开始）
    if (QuestManager.collectedArtifacts.length >= 6) {
      questManager.startQuest(currentNPC.name)
    }

    // ===== 先设置所有回调，再初始化（init 内部需要用到这些回调）=====
    DialogUI.onFreeChatSubmit = (text: string) => {
      dialogueInput.value = text
      dialogueBtn.click()
    }

    DialogUI.onShowBubble = (text: string) => {
      if (currentNPC) {
        currentNPC.showResponse(text)
        dialogueResponse.textContent = `「${text}」`
      }
    }

    DialogUI.onSetInputVisible = (visible: boolean) => {
      dialogueInput.style.display = visible ? '' : 'none'
      dialogueBtn.style.display = visible ? '' : 'none'
    }

    DialogUI.onQuestCompleted = (_npcName: string) => {
      updateLingyinProgress()
      if (_npcName === '西王母') {
        // 播放灵印获得动画（集齐7枚后激活传送阵）
        setTimeout(() => {
          ArtifactEffect.play(leafer, playerX, playerY)
        }, 300)
      }
    }

    // 初始化双模式对话 UI（init 内部会调用 onSetInputVisible(true) 显示输入框）
    DialogUI.init(currentNPC.name)

    disablePlayerMovement()
    // 显示欢迎语
    const greeting = getNPCDefaultGreeting(currentNPC)
    currentNPC.showGreeting(greeting)
    DialogUI.typeText(greeting)
    return
  }
  // ========== 西王母特殊逻辑结束 ==========

  isInDialogue = true
  isNearNPC = true

  // 隐藏"进入对话"按钮
  enterDialogueBtn.classList.add('hidden')

  // 显示对话面板
  showDialoguePanel(currentNPC)
  questManager.startQuest(currentNPC.name)

  // ===== 先设置所有回调，再初始化（init 内部需要用到这些回调）=====

  // 自由聊天提交回调：将文本送入 AI 服务
  DialogUI.onFreeChatSubmit = (text: string) => {
    dialogueInput.value = text
    dialogueBtn.click()
  }

  // 气泡显示回调：委托给当前 NPC
  DialogUI.onShowBubble = (text: string) => {
    if (currentNPC) {
      currentNPC.showResponse(text)
      DialogUI.typeText(text)
    }
  }

  // 输入框可见性回调
  DialogUI.onSetInputVisible = (visible: boolean) => {
    dialogueInput.style.display = visible ? '' : 'none'
    dialogueBtn.style.display = visible ? '' : 'none'
  }

  // 任务完成回调：更新灵印进度
  DialogUI.onQuestCompleted = (_npcName: string) => {
    updateLingyinProgress()
  }

  // ========== 初始化双模式对话 UI（init 内部会调用 onSetInputVisible(true) 显示输入框）==========
  DialogUI.init(currentNPC.name)

  // 在 NPC 气泡中显示欢迎语（引导玩家自由聊天或点击询问按钮）
  const greeting = getNPCDefaultGreeting(currentNPC)
  currentNPC.showGreeting(greeting)
  DialogUI.typeText(greeting)

  // 禁用玩家移动
  disablePlayerMovement()
})

// ==================== 退出对话 ====================
exitDialogueBtn.addEventListener('click', () => {
  exitDialogue()
})

// ==================== 玩家移动控制 ====================
let playerMovementDisabled = false
function disablePlayerMovement() {
  playerMovementDisabled = true
}

function enablePlayerMovement() {
  playerMovementDisabled = false
}

function exitDialogue() {
  if (!isInDialogue) return

  isInDialogue = false
  isNearNPC = false

  // 销毁双模式对话 UI
  DialogUI.destroy()

  // 隐藏对话面板
  showDialoguePanel(null)

  // 恢复NPC气泡引导语（如果玩家还在附近）
  if (currentNPC) {
    const d = currentNPC.getDistance(playerX, playerY)
    if (d < 200) {
      currentNPC.checkProximity(playerX, playerY)
      currentNPC.showGreeting(getNPCDefaultGreeting(currentNPC))
      enterDialogueBtn.classList.remove('hidden')
    } else {
      currentNPC.hideBubble()
    }
  }

  // 恢复玩家移动
  enablePlayerMovement()
}

dialogueBtn.addEventListener('click', async () => {
  if (!currentNPC) return
  const userText = dialogueInput.value.trim()
  if (!userText) return

  dialogueBtn.textContent = '思考中...'
  dialogueBtn.setAttribute('disabled', 'true')
  dialogueResponse.textContent = ''
  dialogueResponse.style.opacity = '0.5'

  const npcContext: NPCContext = {
    name: currentNPC.name,
    personality: currentNPC.personality,
    background: currentNPC.background,
    currentDesire: currentNPC.currentDesire,
  }

  try {
    const reply = await getAIResponse(userText, npcContext)
    currentNPC.showResponse(reply)
    DialogUI.typeText(reply)

    // ========== 西王母特殊逻辑：必须正确回答最终试炼才能获得灵印 ==========
    if (currentNPC.name === '西王母') {
      const question = getNPCQuestion('西王母')
      const quest = questManager.getQuest('西王母')
      if (question && quest && quest.status === 'in_progress') {
        const answer = userText.trim()
        const correctOption = question.options[question.correct]
        const isCorrect =
          answer.toUpperCase() === question.correct ||
          answer.includes(correctOption.substring(0, 4)) ||
          answer.includes('初心')

        if (isCorrect) {
          // 答案正确 → 播放正确音效
          AudioManager.getInstance().playSound('zhengque.mp3', 0.5)
          // 答案正确 → 授予第七枚灵印
          const reward = questManager.completeQuest(currentNPC.name)
          if (reward) {
            inventory.addArtifact(reward)
            QuestManager.collectArtifact(currentNPC.name)
            updateLingyinProgress()
            // 额外展示成功提示
            currentNPC.showResponse('很好，你通过了最后的考验。昆仑灵印归你了……传送令牌已合成，去吧，前往地图中央的传送阵。')
            DialogUI.typeText('很好，你通过了最后的考验。昆仑灵印归你了……传送令牌已合成，去吧，前往地图中央的传送阵。')
            // 不自动退出对话，与其他NPC保持一致，让玩家自行点击退出对话
            setTimeout(() => {
              ArtifactEffect.play(leafer, playerX, playerY)
            }, 400)
          }
        } else {
          // 答案错误 → 播放错误音效
          AudioManager.getInstance().playSound('chujue.mp3', 0.5)
          // 答案错误 → 不计入灵印，但累计失败次数
          const trapped = QuestManager.checkTrapped(currentNPC.name)
          if (trapped) {
            showTrappedWarning()
          }
        }
      }
    } else {
      // ========== 其他NPC：双模式逻辑 ==========
      // 如果 DialogUI 正在控制问答模式，跳过文本答案检查（由选项按钮处理）
      if (DialogUI.mode === 'quest') {
        // quest 模式下不应触发此路径（HTML输入已隐藏），但作为安全防护保留
      } else {
        // ===== 自由聊天模式：仅检测玩家是否碰巧说出了正确答案（意外答对） =====
        // 不会对错误答案做任何惩罚，不会覆盖 AI 的正常回复
        const npcQuestion = getNPCQuestion(currentNPC.name)
        const quest = questManager.getQuest(currentNPC.name)

        if (npcQuestion && quest && quest.status === 'in_progress') {
          const answer = userText.trim()
          const correctOption = npcQuestion.options[npcQuestion.correct]
          const isCorrect =
            answer.toUpperCase() === npcQuestion.correct ||
            answer.includes(correctOption.substring(0, 4))

          if (isCorrect) {
            // 播放正确音效
            AudioManager.getInstance().playSound('zhengque.mp3', 0.5)
            // 碰巧答对 → 给予灵印奖励
            const reward = questManager.completeQuest(currentNPC.name)
            if (reward) {
              inventory.addArtifact(reward)
              QuestManager.collectArtifact(currentNPC.name)
              updateLingyinProgress()
              currentNPC.showResponse(`答得好……看来你确实理解了我。这枚「${reward}」是你的了。`)
              DialogUI.typeText(`答得好……看来你确实理解了我。这枚「${reward}」是你的了。`)
              // 标记 DialogUI 已完成
              DialogUI.isQuestCompleted = true
            }
          }
          // 自由模式下，错误答案不拦截、不扣分，AI 正常回复已在前方展示
        }
      }
    }
    // ========== 特殊逻辑结束 ==========

    // 对话不再影响探索进度（探索进度仅与发现异兽相关）
    updateHUD()
  } finally {
    dialogueBtn.textContent = '对话'
    dialogueBtn.removeAttribute('disabled')
  }

  dialogueInput.value = ''
  dialogueInput.focus()
})

dialogueInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    dialogueBtn.click()
  }
})

// ==================== NPC 引导语配置 ====================
const NPC_GREETINGS: Record<string, string> = {
  '九尾狐（涂山氏）': '哼，又一个闯入青丘的凡人……你有什么话，说来听听。',
  '白泽': '远方来客啊，世间万物之事，我略知一二。你想问些什么？',
  '应龙': '唉……又是人族来客。过来吧，陪我说说这世间的变化。',
  '毕方': '喂喂，你来得正好！森林里的妖兽太猖狂了，快过来我有事问你！',
  '饕餮': '嗷……好香的味道……你是带吃的来了吗？快过来！',
  '刑天': '来者何人？敢接我一斧否？！',
  '西王母': '瑶池已很久没有生面孔了……过来吧，陪我说说话。',
}

function getNPCDefaultGreeting(npc: NPC): string {
  return NPC_GREETINGS[npc.name] || `远方来客，过来聊聊吧...`
}

// ==================== 输入处理 ====================
window.addEventListener('keydown', e => {
  const key = e.key.toLowerCase()
  if (['w', 'a', 's', 'd'].includes(key)) {
    e.preventDefault()
    keysDown[key] = true
  }
})

window.addEventListener('keyup', e => {
  const key = e.key.toLowerCase()
  if (['w', 'a', 's', 'd'].includes(key)) {
    keysDown[key] = false
  }
})

// ==================== 窗口大小变化 ====================
window.addEventListener('resize', () => {
  resizePulseCanvas()
  leafer.width = window.innerWidth
  leafer.height = window.innerHeight
})

// ==================== 相机更新 ====================
function updateCamera() {
  const vw = leafer.width as number
  const vh = leafer.height as number

  let cx = playerX - vw / 2
  let cy = playerY - vh / 2
  cx = Math.max(0, Math.min(WORLD_W - vw, cx))
  cy = Math.max(0, Math.min(WORLD_H - vh, cy))

  groundLayer.x = -cx
  groundLayer.y = -cy
  smokeLayer.x = -cx
  smokeLayer.y = -cy
  entityLayer.x = -cx
  entityLayer.y = -cy
}

// ==================== 探索检测 ====================
function checkExploration(): boolean {
  for (const pm of pointMarkers) {
    if (pm.point.discovered) continue
    const dx = playerX - pm.point.x
    const dy = playerY - pm.point.y
    if (Math.hypot(dx, dy) < EXPLORE_RADIUS) {
      pm.point.discovered = true
      discoveredBeastCount += 1

      pm.glowRect.fill = '#5aaa5a'
      pm.glowRect.opacity = 0.5
      const box = pm.marker.children[1] as Rect
      if (box) {
        box.fill = '#5aaa5a'
        box.stroke = '#8fd88f'
      }

      // 开场剧情中暂存发现toast，结束后再弹出，避免被对话覆盖层挡住
      if (!isOpeningSceneActive) {
        showDiscoveryToast(pm.point.name)
      } else {
        pendingDiscoveryToasts.push(pm.point.name)
      }

      const label = new Text({
        text: pm.point.name.replace(' · ', '\n'),
        x: 0, y: -POINT_SIZE - 16,
        fontSize: 11, fill: '#f0d89c',
        textAlign: 'center', fontWeight: 'bold',
      })
      pm.marker.add(label)
      pm.label = label

      return true
    }
  }
  return false
}

// ==================== Toast 提示 ====================
function showDiscoveryToast(name: string) {
  const toast = document.getElementById('discovery-toast')!
  const toastText = document.getElementById('toast-text')!
  toastText.textContent = `🔍 发现异兽：${name}`
  toast.classList.remove('hidden')
  void (toast as unknown as HTMLElement).offsetWidth
  toast.classList.add('hidden')
  setTimeout(() => {
    toastText.textContent = `🔍 发现异兽：${name}`
    toast.classList.remove('hidden')
    setTimeout(() => toast.classList.add('hidden'), 2400)
  }, 10)
}

/**
 * 显示"永远困在山海经"警告
 */
function showTrappedWarning(): void {
  // 首先更改对话面板中的 NPC 响应文字
  dialogueResponse.textContent = '「你已触怒神灵……将永远困在这山海经之中，再也无法离开！」'
  dialogueResponse.style.opacity = '1'
  dialogueResponse.style.color = '#ef4444'

  // 弹窗警告
  const toast = document.getElementById('discovery-toast')!
  const toastText = document.getElementById('toast-text')!
  toastText.textContent = '⚠️ 天机已乱！你对话失败太多，将永远困在山海经中…'
  toast.classList.remove('hidden')
  void (toast as unknown as HTMLElement).offsetWidth
  toast.classList.add('hidden')
  setTimeout(() => {
    toastText.textContent = '⚠️ 天机已乱！你对话失败太多，将永远困在山海经中…'
    toast.classList.remove('hidden')
    setTimeout(() => toast.classList.add('hidden'), 4000)
  }, 10)

  // 3秒后弹出确认对话框
  setTimeout(() => {
    alert('天机已乱，你得罪了太多异兽……\n\n你将永远困在这山海经之中，无法返回现实世界。\n\n请重新开始游戏。')
  }, 3000)
}

// ==================== HUD 更新 ====================
function updateHUD() {
  document.getElementById('coord-x')!.textContent = Math.round(playerX).toString()
  document.getElementById('coord-y')!.textContent = Math.round(playerY).toString()
  const progressPercent = Math.round((discoveredBeastCount / TOTAL_NPC_COUNT) * 100)
  document.getElementById('exploration-progress')!.textContent = `${progressPercent}%`
}

// ==================== 灵印收集图标 ====================
function initLingyinIcons(): void {
  const row = document.getElementById('lingyin-icons-row')!
  row.innerHTML = ''
  for (const item of LINGYIN_ICON_ORDER) {
    const div = document.createElement('div')
    div.className = 'lingyin-icon-item'
    div.dataset.artifact = item.artifactName
    div.dataset.collected = 'false'
    const img = document.createElement('img')
    img.src = item.image
    img.alt = item.artifactName
    div.appendChild(img)
    row.appendChild(div)
  }
}

function updateLingyinProgress() {
  const collectedArtifacts = inventory.collectedArtifacts
  const iconItems = document.querySelectorAll<HTMLElement>('.lingyin-icon-item')

  for (const itemEl of iconItems) {
    const artifactName = itemEl.dataset.artifact!
    const wasCollected = itemEl.dataset.collected === 'true'
    const isCollected = Array.from(collectedArtifacts).includes(artifactName)

    if (isCollected && !wasCollected) {
      itemEl.classList.add('collected')
      itemEl.classList.add('glow-flash')
      itemEl.dataset.collected = 'true'
      setTimeout(() => {
        itemEl.classList.remove('glow-flash')
      }, 1200)
    } else if (!isCollected) {
      itemEl.classList.remove('collected', 'glow-flash')
      itemEl.dataset.collected = 'false'
    }
  }

  const tracker = document.getElementById('lingyin-tracker')!
  if (collectedArtifacts.length >= TOTAL_NPC_COUNT) {
    tracker.classList.add('complete')
  } else {
    tracker.classList.remove('complete')
  }

  if (questPanelOpen) {
    renderQuestPanel()
  }
}

function showLingyinTracker() {
  const tracker = document.getElementById('lingyin-tracker')!
  tracker.classList.remove('hidden')
  const questBtn = document.getElementById('quest-toggle-btn')!
  questBtn.classList.remove('hidden')
}

// ==================== 任务面板 UI ====================
const ARTIFACT_EMOJI_MAP: Record<string, string> = {
  '青丘灵印': '🦊', '白泽灵印': '🦄', '应龙灵印': '🐉',
  '毕方灵印': '🦩', '饕餮灵印': '👹', '刑天灵印': '⚔️',
  '昆仑灵印': '👑',
}

function renderQuestPanel(): void {
  const listEl = document.getElementById('quest-list')!
  const gridEl = document.getElementById('inventory-grid')!

  const quests = questManager.getAllQuests()
  let html = ''
  for (const q of quests) {
    const statusClass = q.status === 'completed' ? 'completed'
      : q.status === 'in_progress' ? 'in_progress' : 'pending'
    const statusIcon = q.status === 'completed' ? '&#10003;'
      : q.status === 'in_progress' ? '&#8987;' : '&#9675;'
    html += `
    <div class="quest-item ${statusClass}">
      <div class="quest-status-icon ${statusClass}">${statusIcon}</div>
      <div class="quest-info">
        <div class="quest-name">${q.name}</div>
        <div class="quest-desc">${q.description}</div>
        <div class="quest-reward">&#127872; 奖励: ${q.rewardItem}</div>
      </div>
    </div>`
  }
  listEl.innerHTML = html

  const artifacts = inventory.collectedArtifacts
  const allArtifactNames = Object.values(NPC_ARTIFACT_MAP)
  let gridHtml = ''
  for (const name of allArtifactNames) {
    const collected = artifacts.includes(name)
    gridHtml += `
    <div class="artifact-slot ${collected ? 'collected' : 'empty'}">
      <span class="artifact-emoji">${ARTIFACT_EMOJI_MAP[name] || '&#128300;'}</span>
      <span class="artifact-name">${collected ? name : '???'}</span>
    </div>`
  }
  gridEl.innerHTML = gridHtml
}

let questPanelOpen = false
function toggleQuestPanel(): void {
  const panel = document.getElementById('quest-panel')!
  questPanelOpen = !questPanelOpen
  if (questPanelOpen) {
    renderQuestPanel()
    panel.classList.remove('hidden')
  } else {
    panel.classList.add('hidden')
  }
}

// ==================== 传送阵逻辑 ====================
function createTeleportArrayVisual(): void {
  if (teleportCreated) return
  teleportCreated = true
  teleportArray = createTeleportArray()
  entityLayer.add(teleportArray)

  // 在小地图上显示传送阵位置
  minimap.setPortalPosition(TELEPORT_X, TELEPORT_Y)

  const tracker = document.getElementById('lingyin-tracker')!
  tracker.classList.add('complete')

  setTimeout(() => {
    const toast = document.getElementById('discovery-toast')!
    const toastText = document.getElementById('toast-text')!
    toastText.textContent = '⚡ 西王母将七枚灵印合为令牌，应龙掌管的传送门随之在远方缓缓开启！'
    toast.classList.remove('hidden')
    void (toast as unknown as HTMLElement).offsetWidth
    toast.classList.add('hidden')
    setTimeout(() => {
      toastText.textContent = '⚡ 西王母将七枚灵印合为令牌，应龙掌管的传送门随之在远方缓缓开启！'
      toast.classList.remove('hidden')
      setTimeout(() => toast.classList.add('hidden'), 3500)
    }, 10)
  }, 200)
}

function showTeleportFlash(): void {
  const flash = document.createElement('div')
  flash.id = 'teleport-flash'
  document.body.appendChild(flash)
  setTimeout(() => {
    if (flash.parentNode) flash.parentNode.removeChild(flash)
  }, 1000)
}

function checkTeleportArrival(): boolean {
  if (!teleportCreated || !teleportArray) return false
  const dist = Math.hypot(playerX - TELEPORT_X, playerY - TELEPORT_Y)
  return dist < TELEPORT_RADIUS
}

// ==================== 应龙送别强制剧情覆盖层 ====================
function showFarewellOverlay(): void {
  isFarewellActive = true
  disablePlayerMovement()

  // 停止场景音，播放应龙送别专属 BGM
  AudioManager.getInstance().stopAmbient()
  AudioManager.getInstance().playBGM('yinglong.mp3', 1.0)
  console.log('[Audio] 应龙送别 → 播放 BGM: yinglong.mp3')

  // 创建全黑背景覆盖层
  const overlay = document.createElement('div')
  overlay.id = 'farewell-overlay'
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    zIndex: '999',
    background: '#000',
    fontFamily: "'STKaiti','KaiTi','楷体','SimSun',serif",
    overflow: 'hidden',
    opacity: '0',
    transition: 'opacity 0.8s ease',
  })

  // 注入应龙浮动动画 CSS
  const floatStyle = document.createElement('style')
  floatStyle.textContent = `
    @keyframes farewellFloat {
      0%, 100% { transform: translate(-50%, -50%) translateY(0); }
      50% { transform: translate(-50%, -50%) translateY(-12px); }
    }
  `
  overlay.appendChild(floatStyle)

  // 应龙图片 —— 作为全屏背景居中占据中央
  const yinglongImg = document.createElement('img')
  yinglongImg.src = '/assets/yinglong.png'
  Object.assign(yinglongImg.style, {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    maxWidth: '90vw',
    maxHeight: '85vh',
    height: 'auto',
    width: 'auto',
    objectFit: 'contain',
    zIndex: '1',
    animation: 'farewellFloat 2s ease-in-out infinite',
  })
  yinglongImg.onerror = () => {
    yinglongImg.style.display = 'none'
    const placeholder = document.createElement('div')
    placeholder.textContent = '🐉 应龙'
    Object.assign(placeholder.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      fontSize: '8rem',
      color: '#c8b8f0',
      zIndex: '1',
    })
    overlay.appendChild(placeholder)
  }
  overlay.appendChild(yinglongImg)

  // 顶部文字区域（半透明黑色背景，避免应龙上方区域干扰阅读）
  const textPanel = document.createElement('div')
  Object.assign(textPanel.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    padding: '32px 20px 20px 20px',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 70%, transparent 100%)',
    zIndex: '2',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    pointerEvents: 'none',
  })

  // 对话文字第一段
  const text1 = document.createElement('p')
  text1.textContent = '「小家伙，你已集齐了七枚灵印，证明了自己的善良和勇气。恭喜你通过我们的试炼，获得了回家的资格。」'
  Object.assign(text1.style, {
    fontSize: '1.25rem',
    color: '#f0d89c',
    lineHeight: '2',
    textAlign: 'center',
    margin: '0 0 12px 0',
    letterSpacing: '0.08em',
    textShadow: '0 0 12px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.9)',
    maxWidth: '700px',
    pointerEvents: 'auto',
  })

  // 对话文字第二段
  const text2 = document.createElement('p')
  text2.textContent = '「去吧，踏入传送阵，回到属于你的世界。山海经会记住你的名字。」'
  Object.assign(text2.style, {
    fontSize: '1.25rem',
    color: '#f0d89c',
    lineHeight: '2',
    textAlign: 'center',
    margin: '0',
    letterSpacing: '0.08em',
    textShadow: '0 0 12px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.9)',
    maxWidth: '700px',
    pointerEvents: 'auto',
  })

  textPanel.appendChild(text1)
  textPanel.appendChild(text2)
  overlay.appendChild(textPanel)

  // 底部按钮区域（半透明黑色背景，避免挡住应龙下半身）
  const btnPanel = document.createElement('div')
  Object.assign(btnPanel.style, {
    position: 'absolute',
    bottom: '0',
    left: '0',
    width: '100%',
    padding: '20px 20px 40px 20px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 70%, transparent 100%)',
    zIndex: '2',
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
  })

  // "再见"按钮
  const btn = document.createElement('button')
  btn.textContent = '应龙大人，后会有期！'
  Object.assign(btn.style, {
    padding: '14px 52px',
    fontSize: '1.2rem',
    fontFamily: "'STKaiti','KaiTi','楷体','SimSun',serif",
    color: '#1a1a2e',
    background: 'linear-gradient(135deg, #f0d89c, #c9a85b)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    letterSpacing: '0.15em',
    fontWeight: 'bold',
    boxShadow: '0 4px 20px rgba(201, 168, 91, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
    transition: 'all 0.3s ease',
    pointerEvents: 'auto',
  })

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.05)'
    btn.style.background = 'linear-gradient(135deg, #e0b683, #c9945a)'
    btn.style.boxShadow = '0 6px 30px rgba(201, 168, 91, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
  })
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)'
    btn.style.background = 'linear-gradient(135deg, #f0d89c, #c9a85b)'
    btn.style.boxShadow = '0 4px 20px rgba(201, 168, 91, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
  })

  btn.addEventListener('click', () => {
    overlay.style.transition = 'opacity 0.5s ease'
    overlay.style.opacity = '0'
    farewellCompleted = true
    setTimeout(() => {
      overlay.remove()
      isFarewellActive = false
      // 直接触发传送门动画 → 归途结局，不再经过游戏循环坐标检测
      triggerEnding()
    }, 500)
  })

  btnPanel.appendChild(btn)
  overlay.appendChild(btnPanel)
  document.body.appendChild(overlay)

  // 渐显动画：下一帧将 opacity 设为 1，触发 transition
  requestAnimationFrame(() => {
    overlay.style.opacity = '1'
  })
}

let endingTriggered = false
function triggerEnding(): void {
  if (endingTriggered) return
  endingTriggered = true

  // 创建持久黑屏过渡层（z-index: 195，高于画布、低于结局背景 199），
  // 防止传送门动画淡出期间底层游戏画布露出
  const existing = document.getElementById('ending-transition-bridge')
  if (existing) existing.remove()
  const endingBridge = document.createElement('div')
  endingBridge.id = 'ending-transition-bridge'
  Object.assign(endingBridge.style, {
    position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
    zIndex: '195', background: '#000',
  })
  document.body.appendChild(endingBridge)

  // 先播放传送门动画（含传送门音效和"传送门开启"字幕），结束后再进入归途结局
  showPortalAnimation(() => {
    // 停止所有当前音频，切换为归途结局背景音乐
    AudioManager.getInstance().stopAll()
    AudioManager.getInstance().playBGM('guitu.mp3', 0.4)
    console.log('[Audio] 归途结局 → 播放 BGM: guitu.mp3')

    // 30秒后结局动画结束，停止所有音频
    setTimeout(() => {
      AudioManager.getInstance().stopAll()
      console.log('[Audio] 归途结局结束，停止所有音频')
    }, 30000)

    endingScene.play(resetGame)
  }, '传送门开启')
}

/**
 * Bad Ending：失败次数过多，触发"永远困在山海经"结局
 */
function triggerBadEnding(): void {
  if (badEndingTriggered) return
  badEndingTriggered = true

  // 退出当前对话
  if (isInDialogue) {
    exitDialogue()
  }
  disablePlayerMovement()

  // 处决动画开始：停止所有音频，切换为坏结局背景音乐
  AudioManager.getInstance().stopAll()
  AudioManager.getInstance().playBGM('huaijieju.mp3', 0.4)
  console.log('[Audio] 处决结局 → 播放 BGM: huaijieju.mp3')

  // 动画结束后停止所有音频
  const onExecutionEnd = () => {
    AudioManager.getInstance().stopAll()
    console.log('[Audio] 处决结局结束，停止所有音频')
    resetGame()
  }

  // 使用 ExecutionScene 播放 NPC 专属处决结局
  const npcName = QuestManager.badEndingNpcName || '应龙'
  executionScene.play(npcName, onExecutionEnd)
}

/**
 * 重置整个游戏状态，返回初始界面
 */
function resetGame(): void {
  // 1. 重置游戏状态标志
  gameStarted = false
  openingFinished = false
  isOpeningSceneActive = false
  currentAmbientNpc = null
  endingTriggered = false
  badEndingTriggered = false
  isFarewellActive = false
  farewellShown = false

  // 清理结局过渡黑屏层
  const endingBridge = document.getElementById('ending-transition-bridge')
  if (endingBridge) endingBridge.remove()

  // 2. 重置玩家位置到世界中央
  playerX = WORLD_W / 2
  playerY = WORLD_H / 2
  playerGroup.x = playerX
  playerGroup.y = playerY

  // 3. 移除传送阵
  if (teleportArray) {
    entityLayer.remove(teleportArray)
    teleportArray = null
  }
  teleportCreated = false

  // 4. 重置探索点状态
  for (const pm of pointMarkers) {
    pm.point.discovered = false
    pm.glowRect.fill = '#5b9bd5'
    pm.glowRect.opacity = 0.3
    const box = pm.marker.children[1] as Rect
    if (box) {
      box.fill = '#5b9bd5'
      box.stroke = '#8fc4f0'
    }
    if (pm.label) {
      pm.marker.remove(pm.label)
      pm.label = null
    }
  }

  // 5. 重置 NPC 状态（隐藏所有气泡和引导语）
  for (const npc of allNPCs) {
    npc.hideBubble()
  }
  currentNPC = null
  isNearNPC = false
  enterDialogueBtn.classList.add('hidden')

  // 6. 如果正在对话，退出对话模式
  if (isInDialogue) {
    isInDialogue = false
    showDialoguePanel(null)
    enablePlayerMovement()
  }

  // 6.5 清理双模式对话 UI
  DialogUI.destroy()

  // 7. 重置任务和物品栏
  QuestManager.reset()
  questManager.reset()
  try { questManager.init(allNPCs.map(n => n.name)) } catch (err: any) { console.error('resetGame: 任务初始化失败:', err.message) }
  inventory.reset()

  // 8. 重置探索进度
  discoveredBeastCount = 0
  updateHUD()

  // 9. 隐藏 HUD
  const hud = document.getElementById('hud')!
  hud.classList.add('hidden')

  // 10. 重置灵印图标状态
  const iconItems = document.querySelectorAll<HTMLElement>('.lingyin-icon-item')
  for (const itemEl of iconItems) {
    itemEl.classList.remove('collected', 'glow-flash')
    itemEl.dataset.collected = 'false'
  }

  // 11. 隐藏灵印追踪器
  const tracker = document.getElementById('lingyin-tracker')!
  tracker.classList.add('hidden')
  tracker.classList.remove('complete')

  // 12. 隐藏小地图
  minimap.hide()

  // 13. 关闭任务面板
  const questPanel = document.getElementById('quest-panel')!
  questPanel.classList.add('hidden')
  questPanelOpen = false
  const questBtn = document.getElementById('quest-toggle-btn')!
  questBtn.classList.add('hidden')

  // 14. 清除传送阵小地图标记和能量脉冲
  minimap.clearPortal()
  energyPulses = []

  // 15. 显示开始界面（带淡入动画）
  startScreen.style.display = 'flex'
  startScreen.style.opacity = '0'
  startScreen.classList.remove('fade-out')
  startScreen.style.zIndex = '999'
  startScreen.style.pointerEvents = 'none'
  // 强制重排以触发 CSS transition
  void (startScreen as HTMLElement).offsetWidth
  startScreen.style.opacity = '1'
  setTimeout(() => {
    startScreen.style.pointerEvents = 'auto'
    // 淡入完成后移除内联 opacity，让后续 CSS class (.fade-out) 可以覆盖
    startScreen.style.removeProperty('opacity')
  }, 850)

  // 🔧 修复：返回主页面后重新播放背景音乐
  AudioManager.getInstance().playBGM('beijing.mp3', 0.3)
  console.log('[Audio] 返回主页面 → 播放 BGM: beijing.mp3')

  // 16. 更新相机
  updateCamera()
}

// ==================== 传送漩涡动画 ====================
function showPortalAnimation(onComplete: () => void, titleText?: string): void {
  // 播放传送门音效
  AudioManager.getInstance().playSound('chuansong.mp3', 0.5)
  console.log('[Audio] 传送门音效: chuansong.mp3')

  // 黑屏桥接：在开场动画结束到传送阵渐显之间保持全黑，避免底层画布露出
  const bridge = document.createElement('div')
  bridge.id = 'portal-bridge'
  Object.assign(bridge.style, {
    position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
    zIndex: '349', background: '#000',
  })
  document.body.appendChild(bridge)

  // 注入传送漩涡 CSS 动画
  const portalStyle = document.createElement('style')
  portalStyle.id = 'portal-animation-style'
  portalStyle.textContent = `
    @keyframes portalSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    @keyframes portalSpinReverse { 0% { transform: rotate(0deg); } 100% { transform: rotate(-360deg); } }
    @keyframes portalPulse { 0%,100% { opacity: 0.5; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.05); } }
    @keyframes portalExpand { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(4); opacity: 0; } }
    @keyframes portalRuneSpin { 0% { transform: rotate(0deg) translateX(120px) rotate(0deg); }
      100% { transform: rotate(360deg) translateX(120px) rotate(-360deg); } }
    @keyframes portalRuneSpin2 { 0% { transform: rotate(0deg) translateX(90px) rotate(0deg); }
      100% { transform: rotate(-360deg) translateX(90px) rotate(360deg); } }
    @keyframes portalSink { 0% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
      100% { transform: translate(-50%,-50%) scale(0.05); opacity: 0; } }
    @keyframes portalFlash { 0% { opacity: 0; } 30% { opacity: 1; } 100% { opacity: 0; } }
    @keyframes portalTitleFade { 0% { opacity: 0; transform: translate(-50%,-50%) scale(1.5); }
      100% { opacity: 1; transform: translate(-50%,-50%) scale(1); } }
  `
  document.head.appendChild(portalStyle)

  // 创建遮罩（初始透明，逐渐显现）
  const overlay = document.createElement('div')
  overlay.id = 'portal-animation-overlay'
  Object.assign(overlay.style, {
    position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
    zIndex: '350', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at center, rgb(10,20,40) 0%, rgb(3,6,16) 100%)',
    fontFamily: "'STKaiti','KaiTi','楷体','SimSun',serif",
    opacity: '0',
    transition: 'opacity 0.8s ease',
  })

  // 标题文字
  const title = document.createElement('div')
  title.textContent = titleText || '传送阵已开启...'
  Object.assign(title.style, {
    position: 'absolute', top: '20%', left: '50%',
    fontSize: '1.8rem', color: '#f0d89c', letterSpacing: '0.25em',
    textShadow: '0 0 30px rgba(240,216,156,0.6), 0 0 60px rgba(201,168,91,0.3)',
    opacity: '0',
    transform: 'translate(-50%,-50%) scale(1.5)',
    transition: 'opacity 1.5s ease, transform 1.5s ease',
  })
  setTimeout(() => {
    title.style.opacity = '1'
    title.style.transform = 'translate(-50%,-50%) scale(1)'
  }, 300)
  overlay.appendChild(title)

  // 传送阵主体容器（初始透明，与背景同步渐显）
  const portal = document.createElement('div')
  Object.assign(portal.style, {
    position: 'absolute', top: '50%', left: '50%',
    width: '260px', height: '260px',
    marginLeft: '-130px', marginTop: '-130px',
    animation: 'portalPulse 2s ease-in-out infinite',
    opacity: '0',
    transition: 'opacity 0.8s ease',
  })

  // 外层光环
  const ring1 = document.createElement('div')
  Object.assign(ring1.style, {
    position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
    borderRadius: '50%',
    border: '5px solid transparent',
    borderTopColor: 'rgba(80,180,255,0.8)',
    borderRightColor: 'rgba(80,180,255,0.4)',
    borderBottomColor: 'rgba(140,100,255,0.8)',
    borderLeftColor: 'rgba(140,100,255,0.4)',
    boxShadow: '0 0 40px rgba(80,160,255,0.4), 0 0 80px rgba(120,100,255,0.2), inset 0 0 40px rgba(80,160,255,0.15)',
    animation: 'portalSpin 3.5s linear infinite',
  })

  // 中层光环（反向旋转）
  const ring2 = document.createElement('div')
  Object.assign(ring2.style, {
    position: 'absolute', top: '12%', left: '12%', width: '76%', height: '76%',
    borderRadius: '50%',
    border: '3px solid transparent',
    borderTopColor: 'rgba(220,180,80,0.7)',
    borderLeftColor: 'rgba(220,180,80,0.3)',
    borderBottomColor: 'rgba(255,140,60,0.7)',
    borderRightColor: 'rgba(255,140,60,0.3)',
    boxShadow: '0 0 25px rgba(220,180,80,0.3), inset 0 0 25px rgba(220,180,80,0.1)',
    animation: 'portalSpinReverse 2.5s linear infinite',
  })

  // 内层光环
  const ring3 = document.createElement('div')
  Object.assign(ring3.style, {
    position: 'absolute', top: '25%', left: '25%', width: '50%', height: '50%',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.6)',
    boxShadow: '0 0 20px rgba(255,255,255,0.5), inset 0 0 20px rgba(255,255,255,0.15)',
    animation: 'portalSpin 2s linear infinite',
  })

  // 中心光球
  const center = document.createElement('div')
  Object.assign(center.style, {
    position: 'absolute', top: '38%', left: '38%', width: '24%', height: '24%',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(220,240,255,0.6) 30%, rgba(100,180,255,0.2) 70%, transparent 100%)',
    boxShadow: '0 0 50px rgba(200,230,255,0.8), 0 0 100px rgba(150,200,255,0.4)',
    animation: 'portalPulse 1.5s ease-in-out infinite',
  })

  // 环绕符文粒子
  for (let i = 0; i < 8; i++) {
    const rune = document.createElement('div')
    const angle = (i / 8) * 360
    Object.assign(rune.style, {
      position: 'absolute', top: '50%', left: '50%',
      width: '6px', height: '6px', marginLeft: '-3px', marginTop: '-3px',
      borderRadius: '50%',
      background: '#f0d89c',
      boxShadow: i % 2 === 0
        ? '0 0 8px rgba(240,216,156,0.8), 0 0 16px rgba(240,216,156,0.4)'
        : '0 0 8px rgba(255,200,120,0.8), 0 0 16px rgba(255,200,120,0.4)',
      animation: `${i % 2 === 0 ? 'portalRuneSpin' : 'portalRuneSpin2'} ${2 + i * 0.3}s linear infinite`,
    })
    portal.appendChild(rune)
  }

  portal.appendChild(ring1)
  portal.appendChild(ring2)
  portal.appendChild(ring3)
  portal.appendChild(center)
  overlay.appendChild(portal)

  document.body.appendChild(overlay)

  // 0.05s: 背景与传送阵同步逐渐显现
  requestAnimationFrame(() => {
    overlay.style.opacity = '1'
    portal.style.opacity = '1'
  })

  // 0.6s: 传送阵背景已足够暗，移除黑屏桥接
  setTimeout(() => {
    bridge.remove()
  }, 600)

  // ===== 动画时序 =====
  // 0.05s: 传送阵背景开始渐显
  // 0.3s: 标题出现
  // 1.8s: 标题开始逐渐消失（在传送阵扩张前提前消隐）
  setTimeout(() => {
    title.style.transition = 'opacity 1.2s ease, transform 1.2s ease'
    title.style.opacity = '0'
    title.style.transform = 'translate(-50%,-50%) scale(0.9)'
  }, 1800)

  // 2.2s: 传送阵急速扩张
  setTimeout(() => {
    portal.style.animation = 'portalExpand 0.8s ease-out forwards'
  }, 2200)

  // 2.6s: 全屏闪光
  setTimeout(() => {
    const flash = document.createElement('div')
    Object.assign(flash.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      zIndex: '400', background: 'radial-gradient(circle, rgba(255,255,255,0.95), rgba(200,220,255,0.8))',
      pointerEvents: 'none', opacity: '0',
    })
    document.body.appendChild(flash)
    flash.style.transition = 'opacity 0.25s ease'
    flash.style.opacity = '1'
    setTimeout(() => {
      flash.style.opacity = '0'
      setTimeout(() => flash.remove(), 300)
    }, 300)
  }, 2600)

  // 3.4s: 整体淡出 → 触发回调
  setTimeout(() => {
    overlay.style.transition = 'opacity 0.8s ease'
    overlay.style.opacity = '0'
    setTimeout(() => {
      overlay.remove()
      portalStyle.remove()
      onComplete()
    }, 800)
  }, 4000)
}

/**
 * 应龙开场强制剧情
 * 玩家出生在应龙坐标(2000, 2000)面前，强制进入两轮对话后方可自由移动
 * 布局和动画与结尾传送门前的 showFarewellOverlay 完全一致
 */
function startOpeningScene(): void {
  isOpeningSceneActive = true

  // 玩家出生在应龙坐标
  playerX = 2000
  playerY = 2000
  playerGroup.x = playerX
  playerGroup.y = playerY
  updateCamera()

  // 禁用玩家移动
  disablePlayerMovement()

  // 启动游戏（但先不显示 HUD、灵印追踪器、小地图）
  gameStarted = true

  // ========== 创建 DOM 全屏覆盖层（和 farewell 完全一致的风格）==========
  const overlay = document.createElement('div')
  overlay.id = 'yinglong-opening-overlay'
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    zIndex: '999',
    background: '#000',
    fontFamily: "'STKaiti','KaiTi','楷体','SimSun',serif",
    overflow: 'hidden',
    opacity: '0',
    transition: 'opacity 1.2s ease',
  })

  // 注入应龙浮动动画 + 渐入 CSS
  const floatStyle = document.createElement('style')
  floatStyle.textContent = `
    @keyframes openingFloat {
      0%, 100% { transform: translate(-50%, -50%) translateY(0); }
      50% { transform: translate(-50%, -50%) translateY(-12px); }
    }
    @keyframes openingFadeInUp {
      0% { opacity: 0; transform: translate(-50%, -50%) translateY(20px); }
      100% { opacity: 1; transform: translate(-50%, -50%) translateY(0); }
    }
    @keyframes openingFadeIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
  `
  overlay.appendChild(floatStyle)

  // 应龙图片 —— 全屏背景居中
  const yinglongImg = document.createElement('img')
  yinglongImg.src = '/assets/yinglong.png'
  Object.assign(yinglongImg.style, {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    maxWidth: '90vw',
    maxHeight: '85vh',
    height: 'auto',
    width: 'auto',
    objectFit: 'contain',
    zIndex: '1',
    opacity: '0',
    animation: 'openingFloat 2s ease-in-out infinite',
  })
  yinglongImg.onerror = () => {
    yinglongImg.style.display = 'none'
    const placeholder = document.createElement('div')
    placeholder.textContent = '🐉 应龙'
    Object.assign(placeholder.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      fontSize: '8rem',
      color: '#c8b8f0',
      zIndex: '1',
    })
    overlay.appendChild(placeholder)
  }
  overlay.appendChild(yinglongImg)

  // 顶部文字区域（渐变黑色背景）
  const textPanel = document.createElement('div')
  Object.assign(textPanel.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    padding: '32px 20px 20px 20px',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 70%, transparent 100%)',
    zIndex: '2',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    pointerEvents: 'none',
    opacity: '0',
  })

  // 对话文字
  const dialogText = document.createElement('p')
  Object.assign(dialogText.style, {
    fontSize: '1.25rem',
    color: '#f0d89c',
    lineHeight: '2',
    textAlign: 'center',
    margin: '0 0 12px 0',
    letterSpacing: '0.08em',
    textShadow: '0 0 12px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.9)',
    maxWidth: '700px',
    pointerEvents: 'auto',
  })
  textPanel.appendChild(dialogText)
  overlay.appendChild(textPanel)

  // 底部按钮区域
  const btnPanel = document.createElement('div')
  Object.assign(btnPanel.style, {
    position: 'absolute',
    bottom: '0',
    left: '0',
    width: '100%',
    padding: '20px 20px 40px 20px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 70%, transparent 100%)',
    zIndex: '2',
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 0.5s ease',
  })
  overlay.appendChild(btnPanel)

  // ========== 主角头像（左下角，靠近对话框）==========
  const playerAvatar = document.createElement('img')
  playerAvatar.src = '/assets/playertouxiang.png'
  Object.assign(playerAvatar.style, {
    position: 'absolute',
    left: '12px',
    bottom: '0',
    height: '26vh',
    maxWidth: '200px',
    width: 'auto',
    objectFit: 'contain',
    zIndex: '2',
    opacity: '0',
    transition: 'opacity 0.5s ease',
    pointerEvents: 'none',
  })
  playerAvatar.onerror = () => {
    playerAvatar.style.display = 'none'
  }
  overlay.appendChild(playerAvatar)

  document.body.appendChild(overlay)

  // 触发渐入：覆盖层、应龙图片、文字面板依次显现
  requestAnimationFrame(() => {
    overlay.style.opacity = '1'
    setTimeout(() => {
      yinglongImg.style.transition = 'opacity 0.8s ease'
      yinglongImg.style.opacity = '1'
    }, 400)
    setTimeout(() => {
      textPanel.style.transition = 'opacity 0.6s ease'
      textPanel.style.opacity = '1'
    }, 800)
  })

  // ========== 辅助：清空按钮（带淡出效果） ==========
  function clearButtons(): void {
    const buttons = btnPanel.querySelectorAll('button')
    if (buttons.length === 0) {
      btnPanel.innerHTML = ''
      return
    }
    // 先逐个淡出按钮
    buttons.forEach((btn) => {
      const el = btn as HTMLElement
      el.style.transition = 'opacity 0.25s ease, transform 0.25s ease'
      el.style.opacity = '0'
      el.style.transform = 'translateY(8px)'
    })
    // 同步淡出主角头像
    playerAvatar.style.transition = 'opacity 0.25s ease'
    playerAvatar.style.opacity = '0'
    // 同步淡出面板半透明黑背景，避免残留黑影遮挡画面
    btnPanel.style.transition = 'opacity 0.25s ease'
    btnPanel.style.opacity = '0'
    // 淡出完成后再移除DOM
    setTimeout(() => {
      btnPanel.innerHTML = ''
    }, 280)
  }

  // ========== 辅助：添加选项按钮 ==========
  function addOptionButton(label: string, onClick: () => void): void {
    const btn = document.createElement('button')
    btn.textContent = label
    Object.assign(btn.style, {
      padding: '14px 32px',
      fontSize: '1.1rem',
      fontFamily: "'STKaiti','KaiTi','楷体','SimSun',serif",
      color: '#1a1a2e',
      background: 'linear-gradient(135deg, #f0d89c, #c9a85b)',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      letterSpacing: '0.12em',
      fontWeight: 'bold',
      boxShadow: '0 4px 20px rgba(201, 168, 91, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
      transition: 'all 0.3s ease',
      pointerEvents: 'auto',
      maxWidth: '700px',
      textAlign: 'center',
      lineHeight: '1.6',
      opacity: '0',
      transform: 'translateY(8px)',
    })

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.05)'
      btn.style.background = 'linear-gradient(135deg, #e0b683, #c9945a)'
      btn.style.boxShadow = '0 6px 30px rgba(201, 168, 91, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
    })
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)'
      btn.style.background = 'linear-gradient(135deg, #f0d89c, #c9a85b)'
      btn.style.boxShadow = '0 4px 20px rgba(201, 168, 91, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
    })
    btn.addEventListener('click', onClick)
    btnPanel.appendChild(btn)
    btnPanel.style.opacity = '1'  // 恢复面板可见性（clearButtons 时已淡出为0）
    btnPanel.style.opacity = '1'

    // 淡入动画
    requestAnimationFrame(() => {
      btn.style.opacity = '1'
      btn.style.transform = 'translateY(0)'
      // 按钮渲染后，动态调整头像位置紧贴按钮左侧
      adjustAvatarToButton()
    })
  }

  // ========== 辅助：根据按钮位置动态调整头像 ==========
  function adjustAvatarToButton(): void {
    const buttons = btnPanel.querySelectorAll('button')
    if (buttons.length === 0) return

    const btn = buttons[0] as HTMLElement
    const btnRect = btn.getBoundingClientRect()

    // 获取头像当前渲染宽度（未加载完成时按高度估算，图片约 3:4 宽高比）
    let avatarWidth = playerAvatar.offsetWidth
    if (!avatarWidth) {
      const avatarHeight = playerAvatar.offsetHeight || window.innerHeight * 0.26
      avatarWidth = avatarHeight * 0.75
    }

    // 头像右边缘与按钮左边缘保持约 30px 间距
    const targetLeft = btnRect.left - avatarWidth - 30
    playerAvatar.style.left = `${Math.max(12, targetLeft)}px`
  }

  // ========== 结束剧情，正式开启游戏 ==========
  function finishOpening(): void {
    // 依次淡出：按钮面板 → 主角头像 → 文字面板 → 应龙图片 → 覆盖层
    btnPanel.style.transition = 'opacity 0.4s ease'
    btnPanel.style.opacity = '0'

    playerAvatar.style.transition = 'opacity 0.35s ease'
    playerAvatar.style.opacity = '0'

    setTimeout(() => {
      textPanel.style.transition = 'opacity 0.5s ease'
      textPanel.style.opacity = '0'
    }, 200)

    setTimeout(() => {
      yinglongImg.style.transition = 'opacity 0.6s ease'
      yinglongImg.style.opacity = '0'
    }, 400)

    // 开场剧情结束，背景音乐由游戏循环中的领地检测接管
    setTimeout(() => {
      overlay.style.transition = 'opacity 0.6s ease'
      overlay.style.opacity = '0'
    }, 700)

    // 动画全部结束后移除覆盖层并恢复游戏
    setTimeout(() => {
      overlay.remove()
      isOpeningSceneActive = false
      enablePlayerMovement()

      // 弹出开场期间暂存的发现提示
      for (const name of pendingDiscoveryToasts) {
        showDiscoveryToast(name)
      }
      pendingDiscoveryToasts = []

      // 显示 HUD、灵印追踪器、小地图
      const hud = document.getElementById('hud')!
      hud.classList.remove('hidden')
      showLingyinTracker()
      minimap.show()
    }, 1400)
  }

  // ========== 辅助：先显示 NPC 文本，延迟后再显示玩家选项 ==========
  function showDialogThenOptions(npcText: string, optionLabel: string, onClick: () => void, delay = 1200): void {
    dialogText.textContent = npcText
    btnPanel.style.transition = 'opacity 0.25s ease'
    btnPanel.style.opacity = '0'
    clearButtons()
    setTimeout(() => {
      addOptionButton(optionLabel, onClick)
      // 同步淡入主角头像
      playerAvatar.style.transition = 'opacity 0.5s ease'
      playerAvatar.style.opacity = '1'
    }, delay)
  }

  // ========== 第一轮对话 ==========
  showDialogThenOptions(
    '「你是何人？为何来到此处？」',
    '我是一名考古学家，误入此地，敢问这里是何处？',
    () => {
      // ========== 第二轮对话 ==========
      showDialogThenOptions(
        '「此乃山海经世界。」',
        '原来如此……我虽心潮澎湃，但家中尚有牵挂，未竟之业未了，敢问大人如何离去？',
        () => {
          dialogText.textContent = '「集齐七枚灵印，证明你的决心，方能通过传送阵返回。去吧，先去寻找散落世界在各地的灵印。」'
          clearButtons()

          // 3.5 秒后关闭覆盖层，解锁移动，游戏正式开始
          setTimeout(finishOpening, 3500)
        }
      )
    }
  )
}

/**
 * 将玩家放置在世界中央，正式开始游戏
 */
function startGameAtCenter(): void {
  playerX = WORLD_W / 2
  playerY = WORLD_H / 2
  playerGroup.x = playerX
  playerGroup.y = playerY

  updateCamera()
  gameStarted = true

  const hud = document.getElementById('hud')!
  hud.classList.remove('hidden')
  showLingyinTracker()
  minimap.show()


}

/// 渲染能量脉冲到浮层 canvas
function renderEnergyPulses(): void {
  pulseCtx.clearRect(0, 0, pulseCanvas.width, pulseCanvas.height)
  if (energyPulses.length === 0) return

  // 计算相机的世界偏移（即 entityLayer 的位移，通常为负值）
  const cx = -entityLayer.x as number
  const cy = -entityLayer.y as number

  for (const p of energyPulses) {
    const sx = p.x - cx
    const sy = p.y - cy
    const r = p.radius
    // 超出屏幕范围则跳过
    if (sx + r < -50 || sx - r > pulseCanvas.width + 50 ||
        sy + r < -50 || sy - r > pulseCanvas.height + 50) continue

    pulseCtx.beginPath()
    pulseCtx.arc(sx, sy, r, 0, Math.PI * 2)
    pulseCtx.strokeStyle = p.color.replace('{opacity}', String(p.opacity))
    pulseCtx.lineWidth = p.lineWidth
    pulseCtx.stroke()

    // 第二圈（外发光）
    pulseCtx.beginPath()
    pulseCtx.arc(sx, sy, r + 20, 0, Math.PI * 2)
    pulseCtx.strokeStyle = p.color.replace('{opacity}', String(p.opacity * 0.35))
    pulseCtx.lineWidth = p.lineWidth * 1.6
    pulseCtx.stroke()
  }
}

// ==================== 游戏主循环 ====================
function gameLoop() {
  if (!gameStarted) {
    animFrame = requestAnimationFrame(gameLoop)
    return
  }

  // 🔑 只有未进入对话且未在送别剧情中时才允许 WASD 移动
  if (!playerMovementDisabled && !isFarewellActive) {
    let dx = 0
    let dy = 0
    if (keysDown['w'] || keysDown['arrowup']) dy -= 1
    if (keysDown['s'] || keysDown['arrowdown']) dy += 1
    if (keysDown['a'] || keysDown['arrowleft']) dx -= 1
    if (keysDown['d'] || keysDown['arrowright']) dx += 1

    if (dx !== 0 && dy !== 0) {
      const norm = Math.SQRT2 / 2
      dx *= norm
      dy *= norm
    }

    // 主角朝向：A键面朝左，D键面朝右（同步调整x偏移防止位置闪现）
    if (dx < 0) {
      playerImage.scaleX = -1
      playerImage.x = 80
    } else if (dx > 0) {
      playerImage.scaleX = 1
      playerImage.x = -80
    }

    playerX = Math.max(PLAYER_SIZE, Math.min(WORLD_W - PLAYER_SIZE, playerX + dx * PLAYER_SPEED))
    playerY = Math.max(PLAYER_SIZE, Math.min(WORLD_H - PLAYER_SIZE, playerY + dy * PLAYER_SPEED))
  }

  playerGroup.x = playerX
  playerGroup.y = playerY

  // ==================== NPC 上下浮动动画 ====================
  const floatTime = Date.now() / 1000
  for (const fd of npcFloatDataList) {
    fd.group.y = fd.baseY + Math.sin(floatTime * 1.8 + fd.phase) * 12
  }

  updateCamera()
  checkExploration()

  // ==================== 双模式对话系统：键盘输入管理 ====================
  // 若 DialogUI 处于 quest 模式，隐藏打字输入框（HTML input 已由回调控制），
  // 但 WASD 键位继续被 keysDown 记录（在非对话状态下允许移动）
  if (DialogUI.mode === 'quest' && isInDialogue) {
    // quest 模式下：确保 HTML 输入框隐藏（防止键盘输入冲突）
    if (dialogueInput.style.display !== 'none') {
      dialogueInput.style.display = 'none'
      dialogueBtn.style.display = 'none'
    }
  }

  // ==================== 失败次数检测：自动触发 Bad Ending ====================
  if (QuestManager.isTrappedForever && !badEndingTriggered) {
    triggerBadEnding()
  }

  // ==================== NPC 接近检测（非对话模式，且非开场剧情中） ====================
  if (!isInDialogue && !isOpeningSceneActive) {
    let nearestNPC: NPC | null = null
    let minDist = Infinity
    for (const npc of allNPCs) {
      const d = npc.getDistance(playerX, playerY)
      npc.checkProximity(playerX, playerY)  // 控制气泡可见性
      if (d < 200 && d < minDist) {
        minDist = d
        nearestNPC = npc
      }
    }

    if (nearestNPC !== currentNPC) {
      // 离开旧NPC → 恢复默认气泡文字并隐藏按钮
      if (currentNPC) {
        currentNPC.hideBubble()
      }

      currentNPC = nearestNPC

      if (nearestNPC) {
        // 有新NPC在范围内 → 显示引导语 + "进入对话"按钮
        isNearNPC = true
        const greeting = getNPCDefaultGreeting(nearestNPC)
        nearestNPC.showGreeting(greeting)
        enterDialogueBtn.classList.remove('hidden')
      } else {
        // 没有NPC在范围内 → 隐藏按钮
        isNearNPC = false
        enterDialogueBtn.classList.add('hidden')
      }
    }

    // ==================== NPC 领地区域场景音检测（以地图板块视觉中心为触发点，半径 300px） ====================
    // 结局进行中时跳过，防止 playAmbient 淡出结局 BGM（如 guitu.mp3）
    if (!endingTriggered && !badEndingTriggered) {
      let detectedAmbient: string | null = null
      for (const area of AREA_LIST) {
        const dist = Math.hypot(playerX - area.x, playerY - area.y)
        if (dist < 300) {
          detectedAmbient = NPC_AUDIO_NAME_MAP[area.npcName]
          break
        }
      }
      if (detectedAmbient !== currentAmbientNpc) {
        if (detectedAmbient) {
          AudioManager.getInstance().playAmbient(detectedAmbient, 0.2)
          console.log(`[Audio] 进入领地 → 播放场景音: ${detectedAmbient}`)
        } else if (currentAmbientNpc) {
          // 离开所有领地 → 停止场景音
          AudioManager.getInstance().stopAmbient()
          console.log('[Audio] 离开所有领地，停止场景音')
        }
        currentAmbientNpc = detectedAmbient
      }
    }
  }

  // 传送阵能量脉冲
  if (teleportCreated) {
    energyPulseCooldown -= 1
    if (energyPulseCooldown <= 0) {
      energyPulseCooldown = 60 // 每60帧生成一个脉冲（约1秒）
      energyPulses.push({
        x: TELEPORT_X,
        y: TELEPORT_Y,
        radius: 90,
        opacity: 0.8,
        maxRadius: 1050,
        color: 'rgba(218, 180, 80, {opacity})',
        lineWidth: 6,
      })
    }

    // 更新脉冲动画
    energyPulses = energyPulses.filter(p => {
      p.radius += 7.5
      p.opacity = Math.max(0, 0.8 * (1 - p.radius / p.maxRadius))
      return p.radius < p.maxRadius
    })
  }

  // 渲染能量脉冲到 overlay canvas
  renderEnergyPulses()

  // ==================== 应龙送别强制剧情检测 ====================
  // 触发条件：传送阵已激活 && 集齐7枚灵印 && 送别未触发过 && 玩家首次进入80px范围内
  if (teleportCreated && !farewellShown && QuestManager.collectedArtifacts.length === 7) {
    const farewellDist = Math.hypot(playerX - TELEPORT_X, playerY - TELEPORT_Y)
    if (farewellDist < 80) {
      farewellShown = true
      showFarewellOverlay()
    }
  }

  // 只有送别对话已关闭后，才允许进入传送阵触发结局
  if (checkTeleportArrival() && !isFarewellActive && farewellCompleted) {
    triggerEnding()
  }

  updateHUD()
  minimap.setPlayerPosition(playerX, playerY)
  minimap.updateDiscoveredAreas(explorePoints)
  minimap.setEnergyPulses(energyPulses)
  minimap.render()

  animFrame = requestAnimationFrame(gameLoop)
}

// ==================== 开始按钮 ====================
const startBtn = document.getElementById('start-btn') as HTMLButtonElement
const startScreen = document.getElementById('start-screen')!

// 添加加载状态提示（插在副标题和按钮之间）
const loadingStatus = document.createElement('p')
loadingStatus.className = 'loading-status'
loadingStatus.textContent = '正在加载资源，请稍候...'
const startContent = startScreen.querySelector('.start-content')
if (startContent) {
  const hintEl = startContent.querySelector('.hint')
  if (hintEl) {
    startContent.insertBefore(loadingStatus, hintEl)
  } else {
    startContent.appendChild(loadingStatus)
  }
}

startScreen.style.zIndex = '999'
startScreen.style.opacity = '1'
startScreen.style.pointerEvents = 'auto'

// 初始置灰按钮
startBtn.disabled = true

startBtn.addEventListener('click', (e) => {
  e.stopPropagation()
  e.preventDefault()
  console.log('🖱️ 按钮被点击! gameStarted=', gameStarted, 'allImagesReady=', allImagesReady)
  if (gameStarted) { console.log('  → gameStarted=true，跳过'); return }
  if (!allImagesReady) { console.log('  → allImagesReady=false，跳过'); return }

  try {
    // 初始化任务管理器状态
    QuestManager.reset()
    console.log('  ✓ QuestManager.reset() 完成')

    // 先启动开场剧情 overlay（z-index:300，位于开始界面 z-index:999 之下）
    // 确保底层始终有黑暗背景遮挡游戏画布
    openingScene.setOnComplete(() => {
      console.log('  ✓ 开场剧情结束，开始传送阵动画')
      // 开场动画结束后 → 播放传送漩涡动画 → 然后进入应龙开场强制剧情
      showPortalAnimation(() => {
        console.log('  ✓ 传送阵动画结束，开始应龙开场剧情')
        startOpeningScene()
      })
    })
    openingScene.play()
    console.log('  ✓ 开场剧情 overlay 已启动（在开始界面下方）')

    // 等开场 overlay 完全淡入（0.8s）后再淡出开始界面，避免底层画布露出
    setTimeout(() => {
      startScreen.style.transition = 'opacity 0.8s ease'
      startScreen.style.opacity = '0'
      startScreen.style.pointerEvents = 'none'
      console.log('  ✓ 开始界面开始淡出')

      // 等淡出动画结束后隐藏
      setTimeout(() => {
        startScreen.style.display = 'none'
        console.log('  ✓ 开始界面已隐藏')
      }, 800)
    }, 800)
  } catch (err: any) {
    console.error('❌ 按钮点击处理出错:', err.message, err.stack)
    const errDiv = document.createElement('div')
    errDiv.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#c0392b;color:#fff;padding:12px 24px;border-radius:8px;z-index:9999;font-size:14px;max-width:90%;text-align:center;'
    errDiv.textContent = '启动失败: ' + err.message
    document.body.appendChild(errDiv)
  }
})

// 任务面板按钮事件
document.getElementById('quest-toggle-btn')!.addEventListener('click', () => {
  toggleQuestPanel()
})
document.getElementById('quest-close-btn')!.addEventListener('click', () => {
  if (questPanelOpen) toggleQuestPanel()
})

// ==================== 图片就绪检测：轮询等待，加载完成后亮起按钮 ====================
function enableStartButton(): void {
  startBtn.disabled = false
  loadingStatus.style.display = 'none'
  openingFinished = true
  allImagesReady = true
}

function waitForImagesThenEnable(): void {
  // 如果已经有图片在加载且全部完成
  if (totalImagesToLoad > 0 && imagesLoaded >= totalImagesToLoad) {
    console.log(`🎉 所有图片加载完成! (${imagesLoaded}/${totalImagesToLoad})`)
    console.log('✅ 成功加载:', loadedImages.join(', '))
    if (failedImages.length > 0) {
      console.error('❌ 加载失败:', failedImages.join(', '))
    }
    enableStartButton()
    return
  }

  if (!(window as any)._loadCheckStartTime) {
    (window as any)._loadCheckStartTime = Date.now()
  }
  const elapsed = Date.now() - (window as any)._loadCheckStartTime
  // 5 秒后强制启用按钮，确保不会卡住
  if (elapsed > 5000) {
    console.warn(`⚠️ 图片加载超时 (${imagesLoaded}/${totalImagesToLoad})，强制启用按钮`)
    enableStartButton()
    return
  }

  setTimeout(waitForImagesThenEnable, 100)
}

// 🔒 终极兜底：3 秒后强制启用按钮，不管任何情况
setTimeout(() => {
  if (startBtn.disabled) {
    console.warn('🔒 终极兜底：强制启用开始按钮')
    enableStartButton()
  }
}, 3000)

// ==================== 启动 ====================
// 预加载游戏音频并播放初始背景音乐（异步，不阻塞启动流程）
AudioManager.getInstance().preload().then(() => {
  AudioManager.getInstance().playBGM('beijing.mp3', 0.3)
  console.log('[Audio] 背景音乐开始播放: beijing.mp3')
})

updateCamera()
updateHUD()
initLingyinIcons()

console.log(`📦 等待 ${totalImagesToLoad} 张图片加载...`)
console.log('📸 NPC图片列表:', AREA_LIST.map(a => `npc:${a.npcImage}`).join(', '))
waitForImagesThenEnable()

animFrame = requestAnimationFrame(gameLoop)

// 初始化全局静音按钮
MuteButton.init()

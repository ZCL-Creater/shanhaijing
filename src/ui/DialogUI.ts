/**
 * DialogUI — 双模式对话界面管理器
 *
 * 自由模式(free)：玩家可自由输入文字与NPC对话，同时显示"询问灵印的事情"按钮
 * 问答模式(quest)：显示A/B/C/D HTML选项按钮，玩家选择答案进行考验
 *
 * 所有交互按钮均使用 HTML DOM 元素，避免被 canvas 的 pointer-events:none 拦截。
 *
 * 文本显示：所有 NPC 对话通过 #dialogue-response 统一以「...」格式逐句显示。
 */

import { NPC_QUESTIONS } from '../config/npcQuestions'
import { QuestManager, questManager } from '../managers/QuestManager'
import { inventory } from '../managers/Inventory'
import { AudioManager } from '../audio/AudioManager'

export class DialogUI {
  // ==================== 状态 ====================

  /** 当前对话模式 */
  static mode: 'free' | 'quest' = 'free'

  /** 当前对话的 NPC 名称 */
  static currentNpc: string = ''

  /** 是否正在进行问答考验 */
  static isQuestActive: boolean = false

  /** 当前 NPC 的问答考验是否已完成 */
  static isQuestCompleted: boolean = false

  // ==================== 逐句序列显示 ====================

  /** 打字机定时器 */
  private static typeTimer: number | null = null

  /** 序列播放定时器 */
  private static sequenceTimer: number | null = null

  /** 当前正在播放的序列（用于中断） */
  private static isPlayingSequence = false

  /**
   * 显示单句文本（带「」格式 + 淡入效果）
   * 这是所有 NPC 文本输出的统一入口。
   */
  static typeText(text: string) {
    // 中断之前的打字/序列
    this.interrupt()

    const el = document.getElementById('dialogue-response')
    if (!el) return

    // 直接替换内容，无延迟无淡入淡出（避免面板空白闪烁露出背后NPC）
    el.textContent = `「${text}」`
    el.style.opacity = '1'
  }

  /**
   * 依次播放多句文本，每句间隔指定毫秒数
   * @param texts   文本数组
   * @param interval 每句之间的间隔(ms)
   * @param onDone  全部播完后的回调
   */
  static playSequence(texts: string[], interval: number = 1200, onDone?: () => void) {
    // 中断之前可能正在进行的序列
    this.interrupt()
    if (texts.length === 0) {
      onDone?.()
      return
    }

    this.isPlayingSequence = true
    let idx = 0

    const showNext = () => {
      if (!this.isPlayingSequence || idx >= texts.length) {
        this.isPlayingSequence = false
        onDone?.()
        return
      }
      this.typeText(texts[idx])
      idx++
      this.sequenceTimer = window.setTimeout(showNext, interval)
    }

    showNext()
  }

  /** 中断当前正在进行的打字或序列 */
  private static interrupt() {
    this.isPlayingSequence = false
    if (this.typeTimer !== null) {
      clearTimeout(this.typeTimer)
      this.typeTimer = null
    }
    if (this.sequenceTimer !== null) {
      clearTimeout(this.sequenceTimer)
      this.sequenceTimer = null
    }
  }

  // ==================== HTML DOM 引用 ====================

  /** "询问灵印的事情"按钮 */
  private static askBtn: HTMLElement | null = null

  /** 问答选项容器 */
  private static optionsContainer: HTMLElement | null = null

  /** A/B/C/D 四个选项按钮 */
  private static optionButtons: HTMLElement[] = []

  // ==================== 外部回调 ====================

  /**
   * 任务完成回调
   * 当玩家在问答模式中选对答案时触发，传入 NPC 名称
   */
  static onQuestCompleted: ((npcName: string) => void) | null = null

  /**
   * 显示气泡回调
   * 将文本委托给当前 NPC 的 showResponse 方法
   */
  static onShowBubble: ((text: string) => void) | null = null

  /**
   * 自由聊天提交回调
   * 当玩家在自由模式下按回车或点击发送时触发，传入输入文本
   */
  static onFreeChatSubmit: ((text: string) => void) | null = null

  /**
   * HTML 输入框与面板可见性控制回调
   * 用于在 quest 模式下隐藏输入框、自由模式下显示
   */
  static onSetInputVisible: ((visible: boolean) => void) | null = null

  // ==================== 初始化 ====================

  /**
   * 初始化对话界面
   * @param npcName 当前 NPC 名称
   */
  static init(npcName: string) {
    // 如果之前已初始化，先清理旧元素
    if (this.askBtn || this.optionsContainer) {
      this.destroy()
    }

    this.currentNpc = npcName
    this.mode = 'free'
    this.isQuestActive = false

    // 检查当前 NPC 是否已完成考验
    this.isQuestCompleted = QuestManager.collectedArtifacts.includes(npcName)

    // ===== 获取 HTML 元素引用 =====
    this.askBtn = document.getElementById('ask-lingyin-btn')
    this.optionsContainer = document.getElementById('quest-options')

    // 绑定"询问灵印"按钮事件
    if (this.askBtn) {
      const newBtn = this.askBtn.cloneNode(true) as HTMLElement
      this.askBtn.parentNode?.replaceChild(newBtn, this.askBtn)
      this.askBtn = newBtn
      newBtn.addEventListener('click', () => this.startQuest())
    }

    // 绑定 A/B/C/D 选项按钮事件
    this.optionButtons = []
    const optionEls = document.querySelectorAll('.quest-option-btn')
    optionEls.forEach((el) => {
      const btn = el.cloneNode(true) as HTMLElement
      el.parentNode?.replaceChild(btn, el)
      const index = parseInt(btn.getAttribute('data-index') || '0', 10)
      btn.addEventListener('click', () => this.handleOptionClick(index))
      this.optionButtons.push(btn)
    })

    // 根据完成状态控制按钮显示
    this.updateAskButtonVisibility()

    // 确保选项容器初始隐藏
    if (this.optionsContainer) {
      this.optionsContainer.classList.add('hidden')
    }

    // ===== 常驻化：初始化时强制显示输入框（确保每次进入对话都能自由聊天）=====
    if (this.onSetInputVisible) {
      this.onSetInputVisible(true)
    }
  }

  // ==================== 问答模式 ====================

  /**
   * 切换到问答模式：显示 A/B/C/D HTML 选项按钮
   * 注意：输入框常驻显示，玩家可随时自由聊天
   */
  static startQuest() {
    if (this.isQuestCompleted) return

    // ===== 西王母特殊逻辑：灵印不足时拒绝并返回自由模式 =====
    if (this.currentNpc === '西王母' && QuestManager.collectedArtifacts.length < 6) {
      this.typeText('你尚未集齐六枚灵印，缘法未至。我不便插手，去吧，完成你的试炼。')
      if (this.onShowBubble) {
        this.onShowBubble('你尚未集齐六枚灵印，缘法未至。我不便插手，去吧，完成你的试炼。')
      }
      // 标记已见过西王母（被赶走），防止后续异常
      QuestManager.hasMetXiwangmu = true
      // 直接返回自由模式，恢复聊天
      this.returnToFreeMode()
      return
    }
    // ===== 西王母特殊逻辑结束 =====

    this.mode = 'quest'
    this.isQuestActive = true

    // 隐藏 HTML 询问按钮（问答进行中，不允许重复触发）
    if (this.askBtn) {
      this.askBtn.classList.add('hidden')
    }

    // 更新选项文字并准备序列播放
    const questionConfig = NPC_QUESTIONS[this.currentNpc]
    if (questionConfig && this.optionsContainer && this.optionButtons.length === 4) {
      const labels = ['A', 'B', 'C', 'D']
      for (let i = 0; i < 4; i++) {
        const key = labels[i] as 'A' | 'B' | 'C' | 'D'
        this.optionButtons[i].textContent = `${key}. ${questionConfig.options[key]}`
      }

      // 立即显示选项容器，与 NPC 回答同时出现，避免布局跳动
      this.optionsContainer?.classList.remove('hidden')

      // ===== 衔接语与问题合并为一句显示 =====
      this.typeText(questionConfig.transition + ' ' + questionConfig.question)
    }

    // 进入 quest 模式：只更新 HTML 面板，不显示 NPC 气泡（问题只在面板中展示）
  }

  /**
   * 处理选项点击
   * @param index 0=A, 1=B, 2=C, 3=D
   */
  static handleOptionClick(index: number) {
    if (!this.isQuestActive || !this.currentNpc) return

    const questionConfig = NPC_QUESTIONS[this.currentNpc]
    if (!questionConfig) return

    const labels = ['A', 'B', 'C', 'D']
    const chosen = labels[index]
    const correct = questionConfig.correct

    if (chosen === correct) {
      // ===== 回答正确 =====
      AudioManager.getInstance().playSound('zhengque.mp3', 0.5)
      this.isQuestActive = false
      this.isQuestCompleted = true

      // 通过统一通道显示成功回复
      this.typeText(questionConfig.successReply)
      if (this.onShowBubble) {
        this.onShowBubble(questionConfig.successReply)
      }

      // 完成任务，获得灵印
      const reward = questManager.completeQuest(this.currentNpc)
      if (reward) {
        inventory.addArtifact(reward)
      }
      QuestManager.collectArtifact(this.currentNpc)

      // 触发外部回调
      if (this.onQuestCompleted) {
        this.onQuestCompleted(this.currentNpc)
      }

      // 选项保留显示，直到用户点击"退出对话"
    } else {
      // ===== 回答错误 =====
      const isTrapped = QuestManager.checkTrapped(this.currentNpc)
      const failCount = QuestManager.failCounts[this.currentNpc] || 0
      const errorReplies = questionConfig.errorReplies

      // 取出对应次数的个性化错误回复（failCount 已经是累加后的值）
      const errorReply = errorReplies
        ? errorReplies[Math.min(failCount - 1, 2)]
        : `回答错误。` // 兜底

      if (this.onShowBubble) {
        this.onShowBubble(errorReply)
      }
      // 通过统一通道显示错误回复
      this.typeText(errorReply)

      if (isTrapped) {
        // failCounts >= 3：触发 Bad Ending → 播放处决音效
        AudioManager.getInstance().playSound('chujue.mp3', 0.5)
        this.isQuestActive = false
        // 提前捕获 NPC 名称，避免延迟期间 currentNpc 被 destroy 清空
        const trappedNpc = this.currentNpc
        // 延迟 3 秒，让玩家先读完处决台词，再触发结局动画
        setTimeout(() => {
          QuestManager.triggerBadEnding(
            errorReplies ? errorReplies[2] : '你的灵魂将永远困于此地...',
            trappedNpc
          )
        }, 3000)
      } else {
        // 第 1 次或第 2 次错误 → 播放错误音效
        AudioManager.getInstance().playSound('cuowu.mp3', 0.5)
      }
      // 非处决情况下选项保留显示，等待玩家再次作答
    }
  }

  // ==================== 返回自由模式 ====================

  /**
   * 返回自由对话模式：隐藏选项，显示输入框
   */
  static returnToFreeMode() {
    this.mode = 'free'
    this.isQuestActive = false

    // 隐藏选项容器
    if (this.optionsContainer) {
      this.optionsContainer.classList.add('hidden')
    }

    // 显示输入框
    if (this.onSetInputVisible) {
      this.onSetInputVisible(true)
    }

    // 更新询问按钮显示
    this.updateAskButtonVisibility()
  }

  /** 根据灵印完成状态控制询问按钮显隐 */
  private static updateAskButtonVisibility() {
    if (!this.askBtn) return
    if (this.isQuestCompleted) {
      this.askBtn.classList.add('hidden')
    } else {
      this.askBtn.classList.remove('hidden')
    }
  }

  // ==================== 清理 ====================

  /**
   * 销毁所有 UI 元素
   */
  static destroy() {
    // 中断序列播放
    this.interrupt()

    // 隐藏 HTML 按钮和选项
    if (this.askBtn) {
      this.askBtn.classList.add('hidden')
      this.askBtn = null
    }
    if (this.optionsContainer) {
      this.optionsContainer.classList.add('hidden')
      this.optionsContainer = null
    }

    this.optionButtons = []

    this.currentNpc = ''
    this.mode = 'free'
    this.isQuestActive = false
    this.isQuestCompleted = false

    this.onQuestCompleted = null
    this.onShowBubble = null
    this.onFreeChatSubmit = null
    this.onSetInputVisible = null
  }
}

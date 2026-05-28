export class AudioManager {
  private static instance: AudioManager;

  private readonly basePath = '/assets/';

  private readonly files = [
    'yinglong.mp3', 'jiuweihu.mp3', 'xingtian.mp3', 'bifang.mp3',
    'taotie.mp3', 'baize.mp3', 'xiwangmu.mp3',
    'chuansong.mp3', 'chujue.mp3', 'zhengque.mp3', 'cuowu.mp3',
    'guitu.mp3', 'huaijieju.mp3', 'beijing.mp3'
  ];

  // 音频缓存：文件名 → Audio 元素（用于 BGM / 场景音等长音频复用）
  private audioCache: Map<string, HTMLAudioElement> = new Map();

  // 当前正在播放的 BGM 与场景音
  private bgmAudio: HTMLAudioElement | null = null;
  private ambientAudio: HTMLAudioElement | null = null;

  // 短音效播放列表（允许重叠）
  private activeSoundAudios: Set<HTMLAudioElement> = new Set();

  // 淡入淡出动画帧 ID
  private fadeAnimations: Map<HTMLAudioElement, number> = new Map();

  // 因浏览器自动播放策略被阻止的音频重试队列
  private pendingRetry: Set<HTMLAudioElement> = new Set();
  private retryListenerAttached = false;

  // Watchdog：每 1.5 秒检查 BGM / Ambient 是否意外停止，自动重启
  private watchdogTimer: number | null = null;

  // 浏览器标签页可见性变化监听：切回前台时恢复被中断的音频
  private visibilityListenerAttached = false;

  // 状态
  public currentBGM: string | null = null;
  public currentAmbient: string | null = null;

  // ──────────────────── 全局静音 ────────────────────

  static isMuted: boolean = false;

  static setMuted(muted: boolean): void {
    AudioManager.isMuted = muted;
    const instance = AudioManager.getInstance();
    instance.audioCache.forEach(audio => {
      audio.muted = muted;
    });
    if (instance.bgmAudio) instance.bgmAudio.muted = muted;
    if (instance.ambientAudio) instance.ambientAudio.muted = muted;
    instance.activeSoundAudios.forEach(audio => {
      audio.muted = muted;
    });
    localStorage.setItem('game_muted', JSON.stringify(muted));
  }

  static toggleMute(): void {
    AudioManager.setMuted(!AudioManager.isMuted);
  }

  static loadMuteState(): void {
    const saved = localStorage.getItem('game_muted');
    if (saved !== null) {
      AudioManager.setMuted(JSON.parse(saved));
    }
  }

  // ──────────────────── 构造 / 单例 ────────────────────

  private constructor() {}

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  // ──────────────────── 预加载 ────────────────────

  /** 预加载所有 MP3 文件，完成后 resolve。加载失败不阻塞整体流程。 */
  async preload(): Promise<void> {
    const promises = this.files.map(
      (file) =>
        new Promise<void>((resolve) => {
          const audio = new Audio(this.basePath + file);
          audio.preload = 'auto';
          audio.muted = AudioManager.isMuted;

          const onReady = () => {
            cleanup();
            resolve();
          };
          const onError = (e: ErrorEvent) => {
            console.warn(`[AudioManager] 预加载失败: ${file}`, e);
            cleanup();
            resolve(); // 不阻塞其他文件
          };

          const cleanup = () => {
            audio.removeEventListener('canplaythrough', onReady);
            audio.removeEventListener('error', onError);
          };

          audio.addEventListener('canplaythrough', onReady, { once: true });
          audio.addEventListener('error', onError as EventListener, { once: true });
          audio.load();
          this.audioCache.set(file, audio);
        })
    );

    await Promise.all(promises);
    console.log('[AudioManager] 预加载完成');
  }

  // ──────────────────── 工具方法 ────────────────────

  /** 获取指定文件的 Audio 元素，优先从缓存中取 */
  private getAudio(file: string): HTMLAudioElement {
    let audio = this.audioCache.get(file);
    if (!audio) {
      audio = new Audio(this.basePath + file);
      audio.preload = 'auto';
      audio.muted = AudioManager.isMuted;
      audio.load();
      this.audioCache.set(file, audio);
    } else {
      // 浏览器可能因内存压力释放了缓存缓冲区，重新触发加载
      if (audio.readyState === 0 || audio.networkState === 3) {
        console.warn(`[AudioManager] 音频缓存失效，重新加载: ${file}`);
        audio.load();
      }
    }
    // 重置播放位置
    audio.currentTime = 0;
    return audio;
  }

  /** 创建全新的 Audio 元素（用于需要重叠的短音效） */
  private createAudio(file: string): HTMLAudioElement {
    const audio = new Audio(this.basePath + file);
    audio.preload = 'auto';
    audio.muted = AudioManager.isMuted;
    audio.load();
    return audio;
  }

  /** 被 playAmbient 淡出前保存的 BGM 信息，用于 stopAmbient 自动恢复 */
  private savedBGM: { file: string; volume: number } | null = null;

  /** 取消某个 Audio 上的淡入淡出动画 */
  private cancelFade(audio: HTMLAudioElement): void {
    const frameId = this.fadeAnimations.get(audio);
    if (frameId !== undefined) {
      cancelAnimationFrame(frameId);
      this.fadeAnimations.delete(audio);
    }
  }

  // ──────────────────── Watchdog 自动恢复 ────────────────────

  /**
   * 每 1.5 秒检查当前 BGM / Ambient 是否意外停止（paused / ended），
   * 如果已停止则自动重新播放。解决部分浏览器 loop 属性不可靠的问题。
   */
  private startWatchdog(): void {
    if (this.watchdogTimer !== null) return;
    this.watchdogTimer = window.setInterval(() => {
      // 检查 BGM
      if (this.bgmAudio) {
        if (this.bgmAudio.paused || this.bgmAudio.ended) {
          console.warn(`[AudioManager] Watchdog 检测到 BGM 停止，自动重启: ${this.currentBGM}`);
          this.bgmAudio.currentTime = 0;
          this.bgmAudio.play().catch(e =>
            console.warn('[AudioManager] Watchdog BGM 重启失败:', e)
          );
        }
      }
      // 检查 Ambient
      if (this.ambientAudio) {
        if (this.ambientAudio.paused || this.ambientAudio.ended) {
          console.warn(`[AudioManager] Watchdog 检测到 Ambient 停止，自动重启: ${this.currentAmbient}`);
          this.ambientAudio.currentTime = 0;
          this.ambientAudio.play().catch(e =>
            console.warn('[AudioManager] Watchdog Ambient 重启失败:', e)
          );
        }
      }
    }, 1500);
  }

  /** 停止 Watchdog（stopAll 时调用） */
  private stopWatchdog(): void {
    if (this.watchdogTimer !== null) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  // ──────────────────── 浏览器标签页可见性恢复 ────────────────────

  /**
   * 监听页面可见性变化，当用户切回前台时，
   * 自动恢复被浏览器后台策略暂停/中断的 BGM / Ambient。
   */
  private attachVisibilityListener(): void {
    if (this.visibilityListenerAttached) return;
    this.visibilityListenerAttached = true;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return; // 切到后台，不管

      console.log('[AudioManager] 页面切回前台，检查音频状态...');

      // 恢复 BGM
      if (this.bgmAudio && (this.bgmAudio.paused || this.bgmAudio.ended)) {
        console.warn(`[AudioManager] BGM 在后台被中断，恢复: ${this.currentBGM}`);
        this.bgmAudio.currentTime = this.bgmAudio.ended ? 0 : this.bgmAudio.currentTime;
        this.bgmAudio.play().catch(e =>
          console.warn('[AudioManager] visibility 恢复 BGM 失败:', e.name)
        );
      }

      // 恢复 Ambient
      if (this.ambientAudio && (this.ambientAudio.paused || this.ambientAudio.ended)) {
        console.warn(`[AudioManager] Ambient 在后台被中断，恢复: ${this.currentAmbient}`);
        this.ambientAudio.currentTime = this.ambientAudio.ended ? 0 : this.ambientAudio.currentTime;
        this.ambientAudio.play().catch(e =>
          console.warn('[AudioManager] visibility 恢复 Ambient 失败:', e.name)
        );
      }
    });
  }

  // ──────────────────── 淡入淡出 ────────────────────

  /**
   * 淡入：音量从 0 渐变到 audio 当前设置的 volume 值（即渐变前先设定好目标音量）。
   * 播放期间会实时使用 audio.volume 作为目标值。
   * 如果浏览器阻止自动播放（NotAllowedError），会自动监听下一次用户交互后重试。
   */
  fadeIn(audio: HTMLAudioElement, duration: number = 1000): void {
    this.cancelFade(audio);
    const targetVolume = audio.volume || 1;
    audio.volume = 0;

    const startFade = () => {
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        audio.volume = Math.max(0, Math.min(1, progress * targetVolume));

        if (progress < 1) {
          this.fadeAnimations.set(audio, requestAnimationFrame(step));
        } else {
          audio.volume = targetVolume;
          this.fadeAnimations.delete(audio);
          this.pendingRetry.delete(audio);
        }
      };

      this.fadeAnimations.set(audio, requestAnimationFrame(step));
    };

    const doPlay = () => {
      audio.play().then(() => {
        // 播放成功，开始淡入
        startFade();
      }).catch((e) => {
        if (e.name === 'NotAllowedError') {
          // 浏览器阻止自动播放，加入待重试队列
          console.warn('[AudioManager] 浏览器阻止自动播放，等待下一次用户交互后重试');
          this.pendingRetry.add(audio);
          this.attachRetryListener();
        } else {
          console.warn('[AudioManager] fadeIn play 失败', e);
        }
      });
    };

    if (!audio.paused) {
      // 已在播放，只需渐变音量
      startFade();
    } else {
      doPlay();
    }
  }

  /** 注册用户交互监听，重试因自动播放策略被阻止的音频 */
  private attachRetryListener(): void {
    if (this.retryListenerAttached) return;
    this.retryListenerAttached = true;

    const retryAll = () => {
      if (this.pendingRetry.size === 0) {
        this.retryListenerAttached = false;
        return;
      }
      console.log(`[AudioManager] 用户交互检测到，重试 ${this.pendingRetry.size} 个被阻止的音频`);
      const toRetry = Array.from(this.pendingRetry);
      this.pendingRetry.clear();
      this.retryListenerAttached = false;

      for (const audio of toRetry) {
        // 音量已在 playBGM 中预设，直接读取作为目标音量
        const targetVolume = audio.volume || 0.3;
        audio.currentTime = 0;
        audio.volume = 0;
        audio.play().then(() => {
          // 播放成功，淡入
          const startTime = performance.now();
          const step = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / 1000, 1);
            audio.volume = Math.max(0, Math.min(1, progress * targetVolume));
            if (progress < 1) {
              this.fadeAnimations.set(audio, requestAnimationFrame(step));
            } else {
              audio.volume = targetVolume;
              this.fadeAnimations.delete(audio);
            }
          };
          this.fadeAnimations.set(audio, requestAnimationFrame(step));
        }).catch((e) => {
          console.warn('[AudioManager] 重试播放仍失败', e);
        });
      }
    };

    document.addEventListener('click', retryAll, { once: true });
    document.addEventListener('touchstart', retryAll, { once: true });
    document.addEventListener('keydown', retryAll, { once: true });
  }

  /**
   * 淡出：音量从当前值渐变到 0，完成后调用 callback。
   */
  fadeOut(audio: HTMLAudioElement, duration: number = 1000, callback?: () => void): void {
    this.cancelFade(audio);
    const startVolume = audio.volume;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      audio.volume = Math.max(0, Math.min(1, startVolume * (1 - progress)));

      if (progress < 1) {
        this.fadeAnimations.set(audio, requestAnimationFrame(step));
      } else {
        audio.volume = 0;
        audio.pause();
        audio.currentTime = 0;
        this.fadeAnimations.delete(audio);
        callback?.();
      }
    };

    this.fadeAnimations.set(audio, requestAnimationFrame(step));
  }

  // ──────────────────── 播放方法 ────────────────────

  /**
   * 设置手动循环：监听 ended 事件，播放结束后自动从头重播。
   * 完全不依赖浏览器 loop 属性（不同浏览器/音频编码下行为不一致）。
   * play() 失败时带指数退避自动重试（最多 5 次）。
   */
  private setupManualLoop(audio: HTMLAudioElement, label: string): void {
    audio.loop = false;
    const handler = () => {
      console.log(`[AudioManager] ${label} ended，手动循环重播`);
      this.retryPlay(audio, label, 0);
    };
    audio.onended = handler;
  }

  /** 带指数退避的 play 重试 */
  private retryPlay(audio: HTMLAudioElement, label: string, attempt: number): void {
    audio.currentTime = 0;
    audio.play().then(() => {
      if (attempt > 0) {
        console.log(`[AudioManager] ${label} 重试第 ${attempt} 次成功`);
      }
    }).catch((e) => {
      console.warn(`[AudioManager] ${label} play 失败 (${attempt + 1}/5):`, e.name);
      if (attempt < 4) {
        setTimeout(() => this.retryPlay(audio, label, attempt + 1), 300 * (attempt + 1));
      } else {
        console.error(`[AudioManager] ${label} 已达最大重试次数，放弃`);
      }
    });
  }

  /**
   * 播放/切换背景音乐，自动淡入淡出。
   * 新 BGM 立即淡入，旧 BGM 同时淡出，体验更流畅。
   */
  playBGM(file: string, volume: number = 0.3): void {
    // 同一首 BGM 已在播放，跳过
    if (this.currentBGM === file && this.bgmAudio && !this.bgmAudio.paused) {
      return;
    }

    const newAudio = this.getAudio(file);
    newAudio.volume = volume;

    // 手动循环：不依赖 loop 属性
    this.setupManualLoop(newAudio, `BGM:${file}`);

    // 清除旧 BGM 的 onended 并淡出
    if (this.bgmAudio) {
      this.bgmAudio.onended = null;
      this.fadeOut(this.bgmAudio, 1000);
    }

    // 立即切入新 BGM
    this.bgmAudio = newAudio;
    this.currentBGM = file;
    this.fadeIn(newAudio, 1000);

    // 确保 Watchdog 已启动
    this.startWatchdog();
    // 确保页面可见性恢复已监听
    this.attachVisibilityListener();
  }

  /**
   * 播放 NPC 场景音，自动淡出当前背景音乐，淡入新的场景音。
   */
  playAmbient(npcName: string, volume: number = 0.2): void {
    const file = `${npcName}.mp3`;

    if (this.currentAmbient === file && this.ambientAudio && !this.ambientAudio.paused) {
      return;
    }

    const newAudio = this.getAudio(file);
    newAudio.volume = volume;

    // 手动循环：不依赖 loop 属性
    this.setupManualLoop(newAudio, `Ambient:${file}`);

    // 淡出当前背景音乐（先保存以便 stopAmbient 能恢复）
    if (this.bgmAudio && this.currentBGM) {
      this.savedBGM = { file: this.currentBGM, volume: this.bgmAudio.volume || 0.3 };
      this.bgmAudio.onended = null;
      this.fadeOut(this.bgmAudio, 800);
      this.currentBGM = null;
    }

    // 淡出当前场景音（如果有）
    if (this.ambientAudio) {
      this.ambientAudio.onended = null;
      this.fadeOut(this.ambientAudio, 800);
    }

    // 开始淡入新场景音
    this.ambientAudio = newAudio;
    this.currentAmbient = file;
    this.fadeIn(newAudio, 1000);

    // 确保 Watchdog 已启动
    this.startWatchdog();
    // 确保页面可见性恢复已监听
    this.attachVisibilityListener();
  }

  /**
   * 停止当前场景音，恢复之前的背景音乐。
   * 如果不传 resumeBGMFile，会自动恢复被 playAmbient 淡出前保存的 BGM。
   */
  stopAmbient(resumeBGMFile?: string, bgmVolume: number = 0.3): void {
    if (this.ambientAudio) {
      this.fadeOut(this.ambientAudio, 800);
      this.ambientAudio = null;
      this.currentAmbient = null;
    }

    if (resumeBGMFile) {
      this.savedBGM = null;
      this.playBGM(resumeBGMFile, bgmVolume);
    } else if (this.savedBGM) {
      // 恢复被 playAmbient 淡出前的 BGM
      const { file, volume } = this.savedBGM;
      this.savedBGM = null;
      this.playBGM(file, volume);
    }
  }

  /**
   * 播放短音效，允许重叠（每次创建新 Audio 元素，结束后自动清理）。
   */
  playSound(file: string, volume: number = 0.5): void {
    const audio = this.createAudio(file);
    audio.volume = volume;
    audio.loop = false;

    this.activeSoundAudios.add(audio);

    const cleanup = () => {
      audio.pause();
      audio.currentTime = 0;
      this.activeSoundAudios.delete(audio);
      audio.removeEventListener('ended', cleanup);
      audio.removeEventListener('error', cleanup);
    };

    audio.addEventListener('ended', cleanup, { once: true });
    audio.addEventListener('error', cleanup, { once: true });

    audio.play().catch((e) => {
      console.warn(`[AudioManager] playSound 失败: ${file}`, e);
      cleanup();
    });
  }

  // ──────────────────── 停止 ────────────────────

  /** 停止所有音频（BGM / 场景音 / 短音效），不淡出。 */
  stopAll(): void {
    // 停止 Watchdog
    this.stopWatchdog();

    // 停止 BGM
    if (this.bgmAudio) {
      this.cancelFade(this.bgmAudio);
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
      this.bgmAudio = null;
      this.currentBGM = null;
    }

    // 停止场景音
    if (this.ambientAudio) {
      this.cancelFade(this.ambientAudio);
      this.ambientAudio.pause();
      this.ambientAudio.currentTime = 0;
      this.ambientAudio = null;
      this.currentAmbient = null;
    }

    // 停止所有短音效
    for (const audio of this.activeSoundAudios) {
      this.cancelFade(audio);
      audio.pause();
    }
    this.activeSoundAudios.clear();
  }
}

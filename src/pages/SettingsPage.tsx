import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { useAppState } from '../app/providers/useAppState'
import { resolveActionCategoryLogo } from '../assets/cards'
import { SETTINGS_SECTION_LOGOS } from '../assets/settings'
import { Pig } from '../components/Pig'
import { SettingsCard, SettingsSheet } from '../components/Settings'
import {
  NEXT_MEET_BACKUP_MAX_BYTES,
  createBackupFileName,
  parseNextMeetBackup,
  serializeNextMeetBackup,
  type ParsedBackup,
} from '../services/backup'
import { resolveCurrentCycle } from '../services/currentCycle'
import { resolvePigGrowth } from '../services/pigGrowth'
import type {
  Action,
  ActionCategory,
} from '../types/models'
import './SettingsPage.css'

const DAY_IN_MS = 24 * 60 * 60 * 1000
const TARGET_OPTIONS = Array.from({ length: 100 }, (_, index) => index + 1)

type ActiveSheet =
  | null
  | 'pig'
  | 'cycle'
  | 'actions'
  | 'action-form'
  | 'data'
  | 'data-import'

interface ActionPreset {
  name: string
  icon: string
  note: string
}

interface ActionDraft {
  id?: string
  category: ActionCategory
  categoryLabel: string
  choice: string
  name: string
  note: string
  targetCount: number
  icon: string
}

const CATEGORY_LABELS: Record<ActionCategory, string> = {
  health: '运动',
  bodyCare: '身体照顾',
  rest: '休息',
  learning: '学习与兴趣',
  work: '工作',
  custom: '自定义',
}

const GROWTH_STAR_LOGO = resolveActionCategoryLogo('custom', 'small')

const CATEGORY_DESCRIPTIONS: Record<ActionCategory, string> = {
  health: '主动提升身体能力',
  bodyCare: '温柔照顾自己的身体',
  rest: '恢复自己',
  learning: '成长和创造',
  work: '完成重要事情',
  custom: '任何特别想坚持的事情',
}

const ACTION_PRESETS: Record<Exclude<ActionCategory, 'custom'>, ActionPreset[]> = {
  health: [
    { name: '力量训练', icon: '💪', note: '60 分钟' },
    { name: '跑步', icon: '🏃', note: '30 分钟' },
    { name: '拳击', icon: '🥊', note: '30 分钟' },
    { name: '健身操', icon: '🎵', note: '30 分钟' },
    { name: '瑜伽', icon: '🧘', note: '30 分钟' },
    { name: '骑行', icon: '🚲', note: '骑行 30 分钟' },
    { name: '球类运动', icon: '🏀', note: '活动一下身体' },
    { name: '爬山', icon: '🥾', note: '去户外走一走' },
    { name: '散步', icon: '🚶', note: '散步 30 分钟' },
  ],
  bodyCare: [
    { name: '喝水', icon: '💧', note: '记得补充水分' },
    { name: '吃早餐', icon: '🍞', note: '认真吃一顿早餐' },
    { name: '按时吃药', icon: '💊', note: '按计划照顾身体' },
    { name: '控制饮食', icon: '🍽️', note: '好好选择今天的食物' },
  ],
  rest: [
    { name: '早睡', icon: '🌙', note: '00:00 前休息' },
    { name: '午休', icon: '💤', note: '休息 20 分钟' },
    { name: '睡前放松', icon: '☁️', note: '睡前放松一会儿' },
    { name: '冥想', icon: '🧘', note: '安静 10 分钟' },
    { name: '泡澡', icon: '🛁', note: '让身体慢慢放松' },
  ],
  learning: [
    { name: '阅读', icon: '📖', note: '阅读 20 分钟' },
    { name: '学语言', icon: '💬', note: '学习 20 分钟' },
    { name: '创作', icon: '✨', note: '创作一点喜欢的东西' },
    { name: '画画', icon: '🎨', note: '画一点喜欢的东西' },
    { name: '写作', icon: '✍️', note: '写一会儿' },
    { name: '摄影', icon: '📷', note: '记录一个喜欢的瞬间' },
    { name: '音乐', icon: '🎵', note: '练习 20 分钟' },
    { name: '手工', icon: '🧶', note: '动手做一点东西' },
    { name: '写日记', icon: '📔', note: '记下今天的心情' },
  ],
  work: [
    { name: '工作就是工作', icon: '🚀', note: '完成今天重要的事情' },
  ],
}

function settingsSectionIcon(
  type: keyof typeof SETTINGS_SECTION_LOGOS,
) {
  return (
    <img
      className={[
        'settings-section-icon',
        `settings-section-icon--${type}`,
      ].join(' ')}
      src={SETTINGS_SECTION_LOGOS[type]}
      alt=""
      draggable={false}
    />
  )
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  }).format(parseLocalDate(value))
}

function addDays(value: string, amount: number) {
  const date = parseLocalDate(value)
  date.setDate(date.getDate() + amount)
  return formatLocalDate(date)
}

function formatBackupDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('zh-CN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
}

function downloadBackupFile(file: File) {
  const url = URL.createObjectURL(file)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = file.name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function createActionId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `action-${crypto.randomUUID()}`
    : `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getFirstPreset(category: ActionCategory): ActionPreset {
  if (category === 'custom') {
    return { name: '努力', icon: '✦', note: '今天也向前一点' }
  }
  return ACTION_PRESETS[category][0]
}

function createActionDraft(category: ActionCategory = 'health'): ActionDraft {
  const preset = getFirstPreset(category)
  return {
    category,
    categoryLabel: category === 'custom' ? '好习惯' : '',
    choice: category === 'custom' ? '__custom' : preset.name,
    name: preset.name,
    note: preset.note,
    targetCount: 6,
    icon: preset.icon,
  }
}

function draftFromAction(action: Action): ActionDraft {
  const presets =
    action.category === 'custom' ? [] : ACTION_PRESETS[action.category]
  const matchingPreset = presets.find((preset) => preset.name === action.name)

  return {
    id: action.id,
    category: action.category,
    categoryLabel: action.categoryLabel ?? '好习惯',
    choice: matchingPreset?.name ?? '__custom',
    name: action.name,
    note: action.note,
    targetCount: action.targetCount,
    icon: action.icon ?? matchingPreset?.icon ?? '✦',
  }
}

export default function SettingsPage() {
  const {
    state,
    replaceAppState,
    updateSettings,
    updateCycle,
    createAction,
    updateAction,
    deleteAction,
    updatePig,
  } = useAppState()
  const activeCycle = resolveCurrentCycle(
    state.cycles,
    state.activeCycleId,
  )
  const activeActions = state.actions.filter(
    (action) => action.cycleId === activeCycle?.id && !action.deletedAt,
  )
  const today = formatLocalDate(new Date())
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null)
  const [pigName, setPigName] = useState(state.pig.name)
  const [cycleTitle, setCycleTitle] = useState(activeCycle?.title ?? '')
  const [cycleStartDate, setCycleStartDate] = useState(
    activeCycle?.startDate ?? today,
  )
  const [cycleTargetDate, setCycleTargetDate] = useState(
    activeCycle?.targetDate ?? addDays(today, 1),
  )
  const [cycleError, setCycleError] = useState('')
  const [actionDraft, setActionDraft] = useState<ActionDraft | null>(null)
  const [actionError, setActionError] = useState('')
  const [pendingImport, setPendingImport] = useState<ParsedBackup | null>(null)
  const [dataMessage, setDataMessage] = useState('')
  const [isPigGrowthExpanded, setIsPigGrowthExpanded] = useState(false)
  const [isInstallExpanded, setIsInstallExpanded] = useState(false)
  const [installDevice, setInstallDevice] = useState<'ios' | 'android'>(
    () =>
      typeof navigator !== 'undefined' &&
      /android/i.test(navigator.userAgent)
        ? 'android'
        : 'ios',
  )
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const installSectionRef = useRef<HTMLElement | null>(null)
  const shouldPositionInstall = useRef(false)
  const isSettingsPanelOpen = activeSheet !== null

  useLayoutEffect(() => {
    const section = installSectionRef.current
    if (!isInstallExpanded || !shouldPositionInstall.current || !section) {
      return
    }

    shouldPositionInstall.current = false
    section.classList.add('is-positioning')

    const bounds = section.getBoundingClientRect()
    const topClearance = 16
    const bottomClearance = 96
    const visibleBottom = window.innerHeight - bottomClearance

    if (bounds.bottom > visibleBottom) {
      window.scrollBy(0, bounds.bottom - visibleBottom)
    }

    const adjustedBounds = section.getBoundingClientRect()
    if (adjustedBounds.top < topClearance) {
      window.scrollBy(0, adjustedBounds.top - topClearance)
    }

    const frame = window.requestAnimationFrame(() => {
      section.classList.remove('is-positioning')
    })

    return () => {
      window.cancelAnimationFrame(frame)
      section.classList.remove('is-positioning')
    }
  }, [isInstallExpanded])

  useEffect(() => {
    if (!isSettingsPanelOpen) {
      return
    }

    const scrollPosition = window.scrollY
    const root = document.documentElement
    const body = document.body
    const previousRootOverflow = root.style.overflow
    const previousBodyOverflow = body.style.overflow
    const previousBodyPosition = body.style.position
    const previousBodyTop = body.style.top
    const previousBodyWidth = body.style.width

    root.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollPosition}px`
    body.style.width = '100%'

    return () => {
      root.style.overflow = previousRootOverflow
      body.style.overflow = previousBodyOverflow
      body.style.position = previousBodyPosition
      body.style.top = previousBodyTop
      body.style.width = previousBodyWidth
      window.scrollTo(0, scrollPosition)
    }
  }, [isSettingsPanelOpen])

  const daysUntil = activeCycle
    ? Math.max(
        0,
        Math.ceil(
          (parseLocalDate(activeCycle.targetDate).getTime() -
            parseLocalDate(today).getTime()) /
            DAY_IN_MS,
        ),
      )
    : 0

  const closeSheet = () => {
    setActiveSheet(null)
    setCycleError('')
    setActionError('')
    setPendingImport(null)
  }

  const openCycleSheet = () => {
    if (!activeCycle) {
      return
    }
    setCycleTitle(activeCycle.title)
    setCycleStartDate(activeCycle.startDate)
    setCycleTargetDate(activeCycle.targetDate)
    setCycleError('')
    setActiveSheet('cycle')
  }

  const handleCycleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeCycle) {
      return
    }
    if (cycleStartDate > today) {
      setCycleError('开始日期不能晚于今天。')
      return
    }
    if (cycleTargetDate <= cycleStartDate) {
      setCycleError('目标日期需要晚于开始日期。')
      return
    }

    const nextLengthDays = Math.ceil(
      (parseLocalDate(cycleTargetDate).getTime() -
        parseLocalDate(cycleStartDate).getTime()) /
        DAY_IN_MS,
    )
    updateCycle(activeCycle.id, {
      title: cycleTitle.trim() || activeCycle.title,
      startDate: cycleStartDate,
      targetDate: cycleTargetDate,
      lengthDays: nextLengthDays,
    })
    closeSheet()
  }

  const openActionEditor = (action?: Action) => {
    setActionDraft(action ? draftFromAction(action) : createActionDraft())
    setActionError('')
    setActiveSheet('action-form')
  }

  const handleCategoryChange = (category: ActionCategory) => {
    if (!actionDraft) {
      return
    }
    const preset = getFirstPreset(category)
    setActionDraft({
      ...actionDraft,
      category,
      categoryLabel: category === 'custom' ? '好习惯' : '',
      choice: category === 'custom' ? '__custom' : preset.name,
      name: preset.name,
      note: preset.note,
      icon: preset.icon,
    })
  }

  const handleActionChoiceChange = (choice: string) => {
    if (!actionDraft) {
      return
    }
    if (choice === '__custom' || actionDraft.category === 'custom') {
      setActionDraft({
        ...actionDraft,
        choice: '__custom',
        name: actionDraft.choice === '__custom' ? actionDraft.name : '努力',
        icon: '✦',
      })
      return
    }
    const preset = ACTION_PRESETS[actionDraft.category].find(
      (candidate) => candidate.name === choice,
    )
    if (preset) {
      setActionDraft({
        ...actionDraft,
        choice,
        name: preset.name,
        note: preset.note,
        icon: preset.icon,
      })
    }
  }

  const handleActionSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!actionDraft || !activeCycle) {
      return
    }
    const name = actionDraft.name.trim()
    if (!name) {
      setActionError('写下这件行动的名字。')
      return
    }
    const now = new Date().toISOString()
    const values = {
      category: actionDraft.category,
      categoryLabel:
        actionDraft.category === 'custom'
          ? actionDraft.categoryLabel.trim() || '好习惯'
          : undefined,
      name,
      note: actionDraft.note.trim(),
      targetCount: actionDraft.targetCount,
      icon: actionDraft.icon,
    }

    if (actionDraft.id) {
      updateAction(actionDraft.id, values)
    } else {
      createAction({
        id: createActionId(),
        cycleId: activeCycle.id,
        ...values,
        createdAt: now,
        updatedAt: now,
      })
    }
    setActiveSheet('actions')
  }

  const handleExportBackup = async () => {
    const fileName = createBackupFileName()
    const backupContents = serializeNextMeetBackup(state)
    const file = new File([backupContents], fileName, {
      type: 'application/json',
    })

    try {
      const canShareFile =
        typeof navigator.share === 'function' &&
        (typeof navigator.canShare !== 'function' ||
          navigator.canShare({ files: [file] }))

      if (canShareFile) {
        try {
          await navigator.share({
            title: 'next-meet 搬家记录',
            text: '保存这份记录，可以在另一台设备找回小猪和这段陪伴。',
            files: [file],
          })
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return
          }
          downloadBackupFile(file)
        }
      } else {
        downloadBackupFile(file)
      }
      setDataMessage('搬家记录已经准备好啦')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      setDataMessage('暂时没能保存，请稍后再试')
    }
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) {
      return
    }

    setDataMessage('')
    if (file.size > NEXT_MEET_BACKUP_MAX_BYTES) {
      setDataMessage('这份搬家记录太大，暂时无法读取')
      return
    }

    try {
      const parsedBackup = parseNextMeetBackup(await file.text())
      setPendingImport(parsedBackup)
      setActiveSheet('data-import')
    } catch {
      setDataMessage(
        '没能认出这份搬家记录，请选择从 next-meet 保存的记录。',
      )
    }
  }

  const confirmImport = () => {
    if (!pendingImport) {
      return
    }
    replaceAppState(pendingImport.state)
    setPendingImport(null)
    setActiveSheet(null)
    setDataMessage('小猪和记录都回来啦')
  }

  const cycleWeeks = activeCycle
    ? Math.max(1, activeCycle.lengthDays / 7)
    : 1
  const weeklyFrequency = actionDraft
    ? Math.round((actionDraft.targetCount / cycleWeeks) * 10) / 10
    : 0
  const installSteps =
    installDevice === 'android'
      ? ['点击浏览器菜单', '选择「添加到主屏幕」', '点击添加']
      : [
          '点击浏览器底部的分享按钮',
          '选择「添加到主屏幕」',
          '点击添加',
        ]
  const pigGrowth = resolvePigGrowth(state.activities.length)

  return (
    <section className="settings-page" aria-label="设置">
      <SettingsCard
        icon={settingsSectionIcon('pig')}
        title="小猪"
        className="settings-card--pig"
      >
        <button
          className="settings-row"
          type="button"
          onClick={() => {
            setPigName(state.pig.name)
            setActiveSheet('pig')
          }}
        >
          <span><small>名字</small><strong>{state.pig.name}</strong></span>
          <span aria-hidden="true">›</span>
        </button>
        <button
          className="settings-row settings-pig-growth-toggle"
          type="button"
          aria-expanded={isPigGrowthExpanded}
          aria-controls="settings-pig-growth"
          onClick={() => setIsPigGrowthExpanded((expanded) => !expanded)}
        >
          <span><small>成长</small><strong>Lv.{state.pig.level}</strong></span>
          <span
            className={[
              'settings-pig-growth-toggle__arrow',
              isPigGrowthExpanded
                ? 'settings-pig-growth-toggle__arrow--expanded'
                : '',
            ].filter(Boolean).join(' ')}
            aria-hidden="true"
          >
            ›
          </span>
        </button>
        {isPigGrowthExpanded ? (
          <div className="settings-pig-growth" id="settings-pig-growth">
            <div className="settings-pig-growth__copy">
              <strong>
                小猪陪你完成了 {pigGrowth.foldedCardCount} 次行动
              </strong>
              <small>
                {pigGrowth.nextLevel
                  ? `再完成 ${pigGrowth.cardsUntilNextLevel} 次行动，小猪就会成长到 Lv.${pigGrowth.nextLevel}`
                  : '小猪已经陪你成长到 Lv.5 啦'}
              </small>
            </div>
            <div
              className="settings-pig-growth__track"
              role="progressbar"
              aria-label={
                pigGrowth.nextLevel
                  ? `前往 Lv.${pigGrowth.nextLevel} 的成长进度`
                  : '小猪已经到达最高等级'
              }
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pigGrowth.levelProgress * 100)}
            >
              <span
                className="settings-pig-growth__fill"
                style={{ width: `${pigGrowth.levelProgress * 100}%` }}
              >
                <img
                  src={GROWTH_STAR_LOGO.src}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                />
              </span>
            </div>
            <small className="settings-pig-growth__count">
              {pigGrowth.nextLevelTotal
                ? `${pigGrowth.foldedCardCount} / ${pigGrowth.nextLevelTotal} 次`
                : `${pigGrowth.foldedCardCount} 次`}
            </small>
          </div>
        ) : null}
      </SettingsCard>

      <SettingsCard
        icon={settingsSectionIcon('cycle')}
        title="当前周期"
        className="settings-card--primary"
      >
        {activeCycle ? (
          <button
            className="settings-cycle-summary"
            type="button"
            onClick={openCycleSheet}
          >
            <span>
              <strong>{activeCycle.title}</strong>
              <small>
                {formatShortDate(activeCycle.startDate)} –{' '}
                {formatShortDate(activeCycle.targetDate)}
              </small>
              <em>还有 {daysUntil} 天</em>
            </span>
            <span aria-hidden="true">编辑 ›</span>
          </button>
        ) : (
          <p className="settings-card__empty">还没有正在进行的周期。</p>
        )}
      </SettingsCard>

      <SettingsCard icon={settingsSectionIcon('actions')} title="我的行动">
        <button
          className="settings-exercise-summary"
          type="button"
          onClick={() => setActiveSheet('actions')}
        >
          <span className="settings-exercise-chips">
            {activeActions.slice(0, 5).map((action) => {
              const logo = resolveActionCategoryLogo(action.category, 'small')
              return (
                <span key={action.id}>
                  <img src={logo.src} alt="" aria-hidden="true" />
                  {action.name}
                </span>
              )
            })}
            {activeActions.length === 0 ? <span>添加第一件行动</span> : null}
          </span>
          <span aria-hidden="true">›</span>
        </button>
      </SettingsCard>

      <SettingsCard icon={settingsSectionIcon('todo')} title="待办">
        <label className="settings-inline-toggle">
          <span>
            <strong>延续未完成事项</strong>
            <small>进入新周期时，自动带上上一场未完成的待办。</small>
          </span>
          <input
            type="checkbox"
            checked={state.settings.carryOverUnfinishedTodos}
            onChange={(event) =>
              updateSettings({
                carryOverUnfinishedTodos: event.target.checked,
              })
            }
          />
        </label>
      </SettingsCard>

      <SettingsCard
        icon={settingsSectionIcon('data')}
        title="我的数据"
        className="settings-data"
      >
        <div className="settings-data__list">
          <section className="settings-data__item">
            <h3>你的记录属于你自己</h3>
            <p>
              next-meet 不会上传你的日记、打卡和生活记录。
              你的数据会保存在当前设备中，只有你能看到。
            </p>
          </section>
          <section className="settings-data__item">
            <h3>使用普通浏览模式保存小猪的记忆</h3>
            <p>
              为了让小猪记住你的陪伴，请使用普通浏览模式打开
              next-meet，给小猪一个稳定的小家。无痕或隐私浏览模式
              可能会在关闭页面后清除记录。
            </p>
          </section>
          <button
            className="settings-data__move"
            type="button"
            onClick={() => setActiveSheet('data')}
          >
            <span>
              <strong>带着小猪搬家</strong>
              <small>换设备时，把小猪和成长记录一起带走。</small>
            </span>
            <span aria-hidden="true">›</span>
          </button>
        </div>
        <input
          ref={importInputRef}
          className="settings-data__file-input"
          type="file"
          accept=".json,.nextmeet.json,application/json"
          onChange={handleImportFile}
        />
        {dataMessage ? (
          <small className="settings-data__message" role="status">
            {dataMessage}
          </small>
        ) : null}
      </SettingsCard>

      <section
        ref={installSectionRef}
        className={[
          'settings-card',
          'settings-install',
          isInstallExpanded ? 'is-expanded' : '',
        ].filter(Boolean).join(' ')}
      >
        <button
          className="settings-install__summary"
          type="button"
          aria-expanded={isInstallExpanded}
          aria-controls="settings-install-details"
          onClick={() => {
            if (!isInstallExpanded) {
              shouldPositionInstall.current = true
            }
            setIsInstallExpanded((isExpanded) => !isExpanded)
          }}
        >
          <span className="settings-card__icon" aria-hidden="true">
            {settingsSectionIcon('install')}
          </span>
          <span className="settings-install__summary-copy">
            <strong>把 next-meet 放到桌面</strong>
            <small>
              把 next-meet 添加到手机桌面，就可以像打开 App 一样，
              每天回来看看小猪。
            </small>
          </span>
          <span className="settings-install__chevron" aria-hidden="true">›</span>
        </button>
        <div
          id="settings-install-details"
          className="settings-install__collapsible"
          aria-hidden={!isInstallExpanded}
        >
          <div className="settings-install__content">
            <div
              className="settings-install__device-picker"
              role="group"
              aria-label="选择设备"
            >
              <button
                className={installDevice === 'ios' ? 'is-selected' : ''}
                type="button"
                tabIndex={isInstallExpanded ? 0 : -1}
                aria-pressed={installDevice === 'ios'}
                onClick={() => setInstallDevice('ios')}
              >
                iPhone
              </button>
              <button
                className={installDevice === 'android' ? 'is-selected' : ''}
                type="button"
                tabIndex={isInstallExpanded ? 0 : -1}
                aria-pressed={installDevice === 'android'}
                onClick={() => setInstallDevice('android')}
              >
                Android
              </button>
            </div>
            <div className="settings-install__steps">
              <ol>
                {installSteps.map((step) => <li key={step}>{step}</li>)}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {activeSheet === 'data' ? (
        <SettingsSheet title="带着小猪搬家" onClose={closeSheet}>
          <div className="settings-move">
            <div className="settings-move__illustration" aria-hidden="true">
              <img
                src={SETTINGS_SECTION_LOGOS.pig}
                alt=""
                draggable={false}
              />
            </div>
            <div>
              <h3>换设备，也把这段陪伴一起带走</h3>
              <p>
                先保存一份小猪的成长记录，再在新设备中找回它。
                周期、行动、记录和小猪都会回到原来的样子。
              </p>
            </div>
            <div className="settings-move__actions">
              <button
                className="settings-primary-button"
                type="button"
                onClick={handleExportBackup}
              >
                保存搬家记录
              </button>
              <button
                className="settings-secondary-button"
                type="button"
                onClick={() => importInputRef.current?.click()}
              >
                恢复搬家记录
              </button>
            </div>
          </div>
        </SettingsSheet>
      ) : null}

      {activeSheet === 'pig' ? (
        <SettingsSheet title="小猪" onClose={closeSheet}>
          <div className="settings-pig-preview">
            <Pig level={1} size="large" decorative />
            <span>成长 · Lv.{state.pig.level}</span>
          </div>
          <form
            className="settings-form"
            onSubmit={(event) => {
              event.preventDefault()
              const name = pigName.trim()
              if (!name) return
              updatePig({ name, lastUpdatedAt: new Date().toISOString() })
              closeSheet()
            }}
          >
            <label>
              <span>名字</span>
              <input
                value={pigName}
                autoFocus
                onChange={(event) => setPigName(event.target.value)}
              />
            </label>
            <button className="settings-primary-button" type="submit">
              保存名字
            </button>
          </form>
        </SettingsSheet>
      ) : null}

      {activeSheet === 'cycle' && activeCycle ? (
        <SettingsSheet title="编辑当前周期" onClose={closeSheet}>
          <form className="settings-form" onSubmit={handleCycleSave}>
            <label>
              <span>周期名称</span>
              <input
                value={cycleTitle}
                onChange={(event) => setCycleTitle(event.target.value)}
              />
            </label>
            <div className="settings-form__columns">
              <label>
                <span>开始日期</span>
                <input
                  type="date"
                  max={today}
                  value={cycleStartDate}
                  onChange={(event) => {
                    setCycleStartDate(event.target.value)
                    setCycleError('')
                  }}
                />
              </label>
              <label>
                <span>目标日期</span>
                <input
                  type="date"
                  min={addDays(cycleStartDate, 1)}
                  value={cycleTargetDate}
                  onChange={(event) => {
                    setCycleTargetDate(event.target.value)
                    setCycleError('')
                  }}
                />
              </label>
            </div>
            {cycleError ? (
              <p className="settings-form__error" role="alert">{cycleError}</p>
            ) : null}
            <button className="settings-primary-button" type="submit">
              保存这一场
            </button>
          </form>
        </SettingsSheet>
      ) : null}

      {activeSheet === 'actions' ? (
        <SettingsSheet title="我的行动" onClose={closeSheet}>
          <div className="settings-exercise-list">
            {activeActions.map((action) => {
              const logo = resolveActionCategoryLogo(action.category, 'small')
              return (
                <button
                  type="button"
                  key={action.id}
                  onClick={() => openActionEditor(action)}
                >
                  <img
                    className="settings-action-logo"
                    src={logo.src}
                    alt=""
                    aria-hidden="true"
                  />
                  <span>
                    <strong>{action.name}</strong>
                    <small>
                      {action.category === 'custom'
                        ? action.categoryLabel || '好习惯'
                        : CATEGORY_LABELS[action.category]}
                      {' · '}{action.targetCount} 次
                    </small>
                  </span>
                  <span aria-hidden="true">›</span>
                </button>
              )
            })}
          </div>
          <button
            className="settings-add-button"
            type="button"
            onClick={() => openActionEditor()}
          >
            ＋ 添加行动
          </button>
        </SettingsSheet>
      ) : null}

      {activeSheet === 'action-form' && actionDraft ? (
        <SettingsSheet
          title={actionDraft.id ? '编辑行动' : '添加行动'}
          onClose={() => setActiveSheet('actions')}
        >
          <form className="settings-form" onSubmit={handleActionSave}>
            <label>
              <span>类型</span>
              <select
                value={actionDraft.category}
                onChange={(event) =>
                  handleCategoryChange(event.target.value as ActionCategory)
                }
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <small>{CATEGORY_DESCRIPTIONS[actionDraft.category]}</small>
            </label>

            {actionDraft.category === 'custom' ? (
              <label>
                <span>类型名称</span>
                <input
                  value={actionDraft.categoryLabel}
                  onChange={(event) =>
                    setActionDraft({
                      ...actionDraft,
                      categoryLabel: event.target.value,
                    })
                  }
                />
              </label>
            ) : null}

            <label>
              <span>行动</span>
              <select
                value={actionDraft.choice}
                onChange={(event) =>
                  handleActionChoiceChange(event.target.value)
                }
              >
                {actionDraft.category !== 'custom'
                  ? ACTION_PRESETS[actionDraft.category].map((preset) => (
                      <option key={preset.name} value={preset.name}>
                        {preset.name}
                      </option>
                    ))
                  : null}
                <option value="__custom">自定义</option>
              </select>
            </label>

            {actionDraft.choice === '__custom' ? (
              <label>
                <span>行动名称</span>
                <input
                  value={actionDraft.name}
                  autoFocus
                  onChange={(event) =>
                    setActionDraft({ ...actionDraft, name: event.target.value })
                  }
                />
              </label>
            ) : null}

            <label>
              <span>小提示</span>
              <input
                value={actionDraft.note}
                placeholder="例如：20分钟"
                onChange={(event) =>
                  setActionDraft({ ...actionDraft, note: event.target.value })
                }
              />
            </label>

            <label>
              <span>周期目标</span>
              <select
                value={actionDraft.targetCount}
                onChange={(event) =>
                  setActionDraft({
                    ...actionDraft,
                    targetCount: Number(event.target.value),
                  })
                }
              >
                {TARGET_OPTIONS.map((target) => (
                  <option key={target} value={target}>{target} 次</option>
                ))}
              </select>
              <small>每周约 {weeklyFrequency} 次</small>
            </label>

            {actionError ? (
              <p className="settings-form__error" role="alert">{actionError}</p>
            ) : null}
            <button className="settings-primary-button" type="submit">
              保存行动
            </button>
            {actionDraft.id ? (
              <button
                className="settings-danger-button"
                type="button"
                onClick={() => {
                  deleteAction(actionDraft.id!)
                  setActiveSheet('actions')
                }}
              >
                删除行动
              </button>
            ) : null}
          </form>
        </SettingsSheet>
      ) : null}

      {activeSheet === 'data-import' && pendingImport ? (
        <SettingsSheet title="找回小猪和记录" onClose={closeSheet}>
          <div className="settings-import">
            <p>这份搬家记录里有：</p>
            <dl>
              <div>
                <dt>保存时间</dt>
                <dd>{formatBackupDate(pendingImport.summary.exportedAt)}</dd>
              </div>
              <div>
                <dt>小猪</dt>
                <dd>
                  {pendingImport.summary.pigName}
                  {' · '}Lv.{pendingImport.summary.pigLevel}
                </dd>
              </div>
              <div>
                <dt>周期</dt>
                <dd>{pendingImport.summary.cycleCount} 个</dd>
              </div>
              <div>
                <dt>行动</dt>
                <dd>{pendingImport.summary.actionCount} 项</dd>
              </div>
              <div>
                <dt>成长记录</dt>
                <dd>{pendingImport.summary.activityCount} 条</dd>
              </div>
              <div>
                <dt>待办</dt>
                <dd>{pendingImport.summary.todoCount} 项</dd>
              </div>
            </dl>
            <p className="settings-import__warning">
              恢复后，这台设备会回到保存搬家记录时的样子。
              现在的内容不会和它混在一起。
            </p>
            <button
              className="settings-primary-button"
              type="button"
              onClick={confirmImport}
            >
              确认恢复
            </button>
            <button
              className="settings-secondary-button"
              type="button"
              onClick={closeSheet}
            >
              再想想
            </button>
          </div>
        </SettingsSheet>
      ) : null}
    </section>
  )
}

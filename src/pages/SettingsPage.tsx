import { useAppState } from '../app/providers/AppProvider'

export default function SettingsPage() {
  const { state, updateSettings } = useAppState()

  return (
    <section>
      <h2>设置页</h2>
      <p>这里将提供周期和小猪相关设置。</p>
      <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 12 }}>
        <p>默认周期长度：{state.settings.defaultCycleLengthDays} 天</p>
        <p>睡眠目标时间：{state.settings.sleepTargetTime}</p>
        <button
          type="button"
          onClick={() => updateSettings({ defaultCycleLengthDays: 21 })}
        >
          恢复默认周期长度
        </button>
      </div>
    </section>
  )
}

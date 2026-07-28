import { useAppState } from '../app/providers/AppProvider'

export default function HomePage() {
  const { state } = useAppState()

  const activeCycle = state.cycles.find((cycle) => cycle.id === state.activeCycleId) ?? state.cycles[0]

  return (
    <section>
      <h2>首页</h2>
      <p>下一场见，陪你一起慢慢变好。</p>
      <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 12 }}>
        <h3>{activeCycle?.title ?? '尚未创建周期'}</h3>
        <p>目标日期：{activeCycle?.targetDate ?? '暂未设置'}</p>
        <p>目标数量：{activeCycle?.goals.length ?? 0}</p>
      </div>
    </section>
  )
}

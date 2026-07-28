import { useAppState } from '../app/providers/AppProvider'

export default function HistoryPage() {
  const { state } = useAppState()

  return (
    <section>
      <h2>历史页</h2>
      <p>这里将展示过去周期和总结。</p>
      <ul>
        {state.cycles.map((cycle) => (
          <li key={cycle.id} style={{ marginBottom: 8 }}>
            {cycle.title} · {cycle.status}
          </li>
        ))}
      </ul>
    </section>
  )
}

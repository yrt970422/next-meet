import { useAppState } from '../app/providers/AppProvider'

export default function CardsPage() {
  const { state } = useAppState()

  return (
    <section>
      <h2>卡片页</h2>
      <p>这里将展示周期目标卡片。</p>
      <ul>
        {state.goals.map((goal) => (
          <li key={goal.id} style={{ marginBottom: 8 }}>
            {goal.title ?? goal.type} · 目标 {goal.targetCount}
          </li>
        ))}
      </ul>
    </section>
  )
}

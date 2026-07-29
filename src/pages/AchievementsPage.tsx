import { useAppState } from '../app/providers/useAppState'

export default function AchievementsPage() {
  const { state } = useAppState()

  return (
    <section>
      <h2>成就页</h2>
      <ul>
        {state.achievements.map((achievement) => (
          <li key={achievement.id} style={{ marginBottom: 8 }}>
            {achievement.title} · {achievement.unlocked ? '已解锁' : '未解锁'}
          </li>
        ))}
      </ul>
    </section>
  )
}

import { useAppState } from '../app/providers/useAppState'
import './CardsPage.css'

export default function CardsPage() {
  const { state } = useAppState()
  const activeCycle =
    state.cycles.find((cycle) => cycle.id === state.activeCycleId) ?? state.cycles[0]
  const recordCount = activeCycle
    ? state.activities.filter((activity) => activity.cycleId === activeCycle.id).length
    : 0

  return (
    <section className="cards-page-placeholder" aria-labelledby="records-page-title">
      <p>成长记录</p>
      <h2 id="records-page-title">日历将在下一阶段来到这里</h2>
      <span>
        当前周期已经留下 {recordCount} 条真实记录。现在可以先从首页完成今天的行动卡。
      </span>
    </section>
  )
}

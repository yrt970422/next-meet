import { useEffect, useRef, useState } from 'react'
import './UpdateNotice.css'

const UPDATE_NOTICE_READ_KEY = 'next-meet:update-notice:2026-09-v1'

function hasReadUpdateNotice() {
  try {
    return window.localStorage.getItem(UPDATE_NOTICE_READ_KEY) === 'read'
  } catch {
    return false
  }
}

export function UpdateNotice() {
  const [isOpen, setIsOpen] = useState(() => !hasReadUpdateNotice())
  const dialogRef = useRef<HTMLElement>(null)
  const acknowledgeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  const acknowledge = () => {
    try {
      window.localStorage.setItem(UPDATE_NOTICE_READ_KEY, 'read')
    } catch {
      // The notice still closes for this session if storage is unavailable.
    }
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div className="update-notice__backdrop">
      <section
        ref={dialogRef}
        className="update-notice"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-notice-title"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Tab') {
            event.preventDefault()
            acknowledgeButtonRef.current?.focus()
          }
        }}
      >
        <div className="update-notice__content">
          <h2 id="update-notice-title">人，你好：</h2>
          <p className="update-notice__intro">小猪更新啦！</p>

          <ol className="update-notice__list">
            <li>
              <h3>每天从凌晨 4 点开始</h3>
              <p>00:00–03:59 完成的行动，仍会记在前一天。</p>
              <p className="update-notice__aside">（不是鼓励你熬夜的意思！）</p>
            </li>
            <li>
              <h3>下一场会自动开始</h3>
              <p>当前周期结束后，小猪会自动开启新的周期。</p>
              <p>
                如果已经知道下一站，就会进入对应的时空乐园；如果还没有下一站，就会按照上一场的长度，开始一段新的「下一场见」。
              </p>
              <p>自动开始的新周期，也可以按照你的目标自由修改哦～</p>
            </li>
            <li>
              <h3>目标设置更灵活</h3>
              <p>
                行动目标现在可以选择「整个周期 X 次」或「每周 X 次」。
              </p>
              <p>选择每周目标后，会自动换算成本周期的目标次数。</p>
            </li>
          </ol>

          <p className="update-notice__assurance">旧记录和旧备份都会正常保留。</p>
          <p className="update-notice__closing">人，小猪希望你天天开心哦！</p>
        </div>

        <footer className="update-notice__footer">
          <button
            ref={acknowledgeButtonRef}
            type="button"
            onClick={acknowledge}
          >
            知道啦
          </button>
        </footer>
      </section>
    </div>
  )
}

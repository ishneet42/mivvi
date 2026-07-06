'use client'

import { PhoneDemo, type DemoScreen } from './phone-demo'
import { useState } from 'react'

const ROWS: { key: DemoScreen; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    key: 'groups',
    label: 'GROUPS',
    desc: 'every crew & their balances',
    icon: (
      <span className="flex gap-px flex-none">
        <i className="w-[11px] h-[11px] rounded-full bg-highlighter block" />
        <i className="w-[11px] h-[11px] rounded-full bg-highlighter block -ml-1" />
      </span>
    ),
  },
  {
    key: 'scan',
    label: 'SCAN',
    desc: 'snap any receipt, parsed in seconds',
    icon: (
      <span className="relative w-4 h-3 border-2 border-highlighter rounded-[3px] flex-none">
        <span className="absolute top-0.5 left-1 w-1.5 h-1.5 border-[1.5px] border-highlighter rounded-full" />
      </span>
    ),
  },
  {
    key: 'split',
    label: 'SPLIT',
    desc: 'say who had what, in plain words',
    icon: (
      <span
        className="w-[15px] h-[15px] rounded-full border-2 border-highlighter flex-none"
        style={{
          background: 'conic-gradient(#F5D83F 0 50%, transparent 0 50%)',
        }}
      />
    ),
  },
  {
    key: 'ledger',
    label: 'LEDGER',
    desc: 'who owes who, settled in a tap',
    icon: (
      <span className="flex flex-col gap-[2.5px] flex-none">
        <i className="w-4 h-[2.4px] bg-highlighter block rounded-sm" />
        <i className="w-4 h-[2.4px] bg-highlighter block rounded-sm" />
        <i className="w-[11px] h-[2.4px] bg-highlighter block rounded-sm" />
      </span>
    ),
  },
]

export function AppShowcase() {
  const [screen, setScreen] = useState<DemoScreen>('groups')

  return (
    <section id="app" className="bg-ink mt-[clamp(20px,3vw,40px)] border-t-[3px] border-ink-deep relative z-[2]">
      <div className="max-w-[1180px] mx-auto px-5 sm:px-10 py-[clamp(40px,6vw,80px)] flex flex-wrap gap-[clamp(30px,5vw,64px)] items-center justify-center">
        <div className="flex-[1_1_340px] min-w-[290px] max-w-[470px]">
          <span className="font-mono text-[11.5px] tracking-[0.16em] text-highlighter">
            INSIDE THE APP
          </span>
          <h2 className="font-display text-[clamp(32px,4.6vw,54px)] text-[#F7F1E3] mt-2.5 mb-0">
            Everyone&rsquo;s tabs,
            <br />
            in one pocket.
          </h2>
          <p className="text-base leading-[1.55] text-[#C7C0AE] mt-3.5 mb-6 max-w-[400px]">
            Every crew, every receipt, every balance. Tap a tab to take it for
            a spin →
          </p>
          <div className="flex flex-col gap-[9px]">
            {ROWS.map((row) => (
              <button
                key={row.key}
                onClick={() => setScreen(row.key)}
                className="flex items-center gap-[13px] rounded-xl px-[15px] py-[13px] cursor-pointer text-left border transition-colors"
                style={{
                  background:
                    screen === row.key
                      ? 'rgba(247,241,227,0.12)'
                      : 'rgba(247,241,227,0.05)',
                  borderColor: screen === row.key ? '#5A5D55' : '#3A3D35',
                }}
              >
                {row.icon}
                <span className="font-mono font-bold text-[13px] tracking-[0.06em] text-[#F7F1E3] w-[74px] flex-none">
                  {row.label}
                </span>
                <span className="text-[13.5px] text-[#9A937F]">{row.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-none">
          <PhoneDemo screen={screen} onScreenChange={setScreen} />
        </div>
      </div>
    </section>
  )
}

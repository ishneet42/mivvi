'use client'

/**
 * Interactive phone demo for the landing page (design handoff: "The app").
 * Renders a device frame with four demo screens — Groups / Scan / Split /
 * Ledger — driven by the bottom tab bar or external tab rows (AppShowcase).
 * Deliberately sample data: this is a marketing demo of the product, not
 * live state.
 */

export type DemoScreen = 'groups' | 'scan' | 'split' | 'ledger'

function Ava({
  bg,
  children,
  size = 30,
  color = '#fff',
  ring,
  className = '',
  style,
}: {
  bg: string
  children?: React.ReactNode
  size?: number
  color?: string
  ring?: string
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <i
      className={`not-italic rounded-full font-display grid place-items-center flex-none ${className}`}
      style={{
        width: size,
        height: size,
        background: bg,
        color,
        fontSize: Math.round(size * 0.38),
        border: ring ? `2px solid ${ring}` : undefined,
        ...style,
      }}
    >
      {children}
    </i>
  )
}

function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] tracking-[0.16em] text-label mt-[17px] mb-2.5">
      {children}
    </div>
  )
}

function GroupsScreen() {
  const rows = [
    {
      avatars: [
        ['IS', '#E0452B'],
        ['MA', '#2F4E78'],
      ],
      name: 'TARRO · FRI',
      meta: '3 people · 1 open',
      amount: '+$72',
      color: '#2E9E68',
    },
    {
      avatars: [
        ['DA', '#C77D2E'],
        ['TH', '#5B7A4E'],
      ],
      name: 'ROOMMATES',
      meta: '4 people · 2 open',
      amount: '−$12',
      color: '#D8412A',
    },
    {
      avatars: [
        ['PR', '#8A5BB0'],
        ['IS', '#E0452B'],
      ],
      name: 'LUNCH CREW',
      meta: '5 people · 1 open',
      amount: '−$12',
      color: '#D8412A',
    },
  ]
  return (
    <div className="flex-1 overflow-y-auto px-3.5 pt-3.5 pb-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl text-ink m-0">Groups</h3>
        <Ava bg="#7ED9A6" color="#20242B" size={34}>
          YO
        </Ava>
      </div>

      <div className="bg-ink rounded-2xl px-[17px] py-4 mt-3.5">
        <div className="font-mono text-[10px] tracking-[0.16em] text-[#8C8A74]">
          NET BALANCE
        </div>
        <div className="font-display text-[38px] text-acid leading-none mt-1.5">
          +$48.00
        </div>
        <div className="font-mono text-[11px] text-[#C7C0AE] mt-2">
          you&rsquo;re owed $72 · you owe $24
        </div>
      </div>

      <MonoLabel>YOUR GROUPS · 4</MonoLabel>

      <div className="flex flex-col gap-[9px]">
        {rows.map((r) => (
          <div
            key={r.name}
            className="flex items-center gap-3 bg-paper-cream border border-paper-edge rounded-[14px] px-[13px] py-3"
          >
            <span className="flex flex-none">
              <Ava bg={r.avatars[0][1]}>{r.avatars[0][0]}</Ava>
              <Ava bg={r.avatars[1][1]} ring="#F8F2E4" className="-ml-[9px]">
                {r.avatars[1][0]}
              </Ava>
            </span>
            <span className="flex-1 min-w-0">
              <span className="font-display text-[15px] text-ink block tracking-[0.02em]">
                {r.name}
              </span>
              <span className="font-mono text-[10.5px] text-label">
                {r.meta}
              </span>
            </span>
            <span
              className="font-display text-base"
              style={{ color: r.color }}
            >
              {r.amount}
            </span>
          </div>
        ))}
        {/* settled group — dimmed, pill instead of amount */}
        <div className="flex items-center gap-3 bg-paper-cream border border-paper-edge rounded-[14px] px-[13px] py-3 opacity-70">
          <span className="flex flex-none">
            <Ava bg="#3F6E8C">SK</Ava>
            <Ava bg="#B6AB90" ring="#F8F2E4" className="-ml-[9px]">
              +4
            </Ava>
          </span>
          <span className="flex-1 min-w-0">
            <span className="font-display text-[15px] text-ink block tracking-[0.02em]">
              SKI CABIN &rsquo;26
            </span>
            <span className="font-mono text-[10.5px] text-label">6 people</span>
          </span>
          <span className="font-mono text-[10px] text-[#7A7560] border-[1.5px] border-paper-dashed rounded-[5px] px-1.5 py-[3px]">
            SETTLED
          </span>
        </div>
      </div>

      <div className="mt-3.5 border-2 border-dashed border-paper-dashed rounded-[13px] p-[13px] text-center font-mono font-bold text-[13px] tracking-[0.06em] text-[#7A7560]">
        ＋ NEW GROUP
      </div>
    </div>
  )
}

function ScanScreen() {
  const items = [
    ['Margherita', '$18.00', '0s'],
    ['Carbonara', '$22.00', '.15s'],
    ['House red (½L)', '$32.00', '.3s'],
  ]
  return (
    <div className="flex-1 overflow-y-auto px-3.5 pt-3.5 pb-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl text-ink m-0">Scan</h3>
        <span className="w-[30px] h-[30px] rounded-full border-2 border-paper-dashed text-[#7A7560] grid place-items-center text-[15px]">
          ✕
        </span>
      </div>

      {/* camera viewport */}
      <div className="relative h-[286px] bg-ink-deep rounded-[18px] mt-[13px] overflow-hidden flex items-center justify-center mv-anim">
        <div className="w-[150px] bg-[#F2EAD8] rounded px-3.5 pt-3.5 pb-[18px] -rotate-[4deg] shadow-[0_20px_30px_-14px_rgba(0,0,0,0.6)]">
          <div className="text-center font-display text-[15px] text-ink">
            TARRO
          </div>
          <div className="border-t-[1.5px] border-dashed border-paper-dashed my-2" />
          {[
            ['Margherita', '18'],
            ['Carbonara', '22'],
            ['House red', '32'],
          ].map(([n, p]) => (
            <div
              key={n}
              className="flex justify-between font-mono text-[9px] text-ink-soft mt-1 first:mt-0"
            >
              <span>{n}</span>
              <span>{p}</span>
            </div>
          ))}
          <div className="border-t-[1.5px] border-dashed border-paper-dashed my-2" />
          <div className="flex justify-between font-mono text-[10px] font-bold text-ink">
            <span>TOTAL</span>
            <span>72</span>
          </div>
        </div>
        {/* corner brackets */}
        <span className="absolute top-4 left-4 w-[22px] h-[22px] border-t-[3px] border-l-[3px] border-highlighter rounded-tl" />
        <span className="absolute top-4 right-4 w-[22px] h-[22px] border-t-[3px] border-r-[3px] border-highlighter rounded-tr" />
        <span className="absolute bottom-4 left-4 w-[22px] h-[22px] border-b-[3px] border-l-[3px] border-highlighter rounded-bl" />
        <span className="absolute bottom-4 right-4 w-[22px] h-[22px] border-b-[3px] border-r-[3px] border-highlighter rounded-br" />
        {/* scan line */}
        <span className="absolute left-3.5 right-3.5 h-[2.5px] bg-highlighter shadow-[0_0_14px_2px_rgba(245,216,63,0.8)] animate-mv-scan" />
        <span className="absolute top-3.5 left-3.5 font-mono text-[9.5px] tracking-[0.12em] text-highlighter flex items-center gap-[5px]">
          <i className="w-1.5 h-1.5 rounded-full bg-redpen inline-block" />
          DETECTING…
        </span>
      </div>

      <div className="flex flex-col gap-[7px] mt-[13px]">
        {items.map(([name, price, delay]) => (
          <div
            key={name}
            className="flex items-center gap-[9px] bg-paper-cream border border-paper-edge rounded-[11px] px-3 py-[9px] animate-mv-pop"
            style={{ animationDelay: delay }}
          >
            <span className="w-[18px] h-[18px] rounded-full bg-acid-ink text-white text-[11px] grid place-items-center flex-none">
              ✓
            </span>
            <span className="flex-1 font-mono text-xs text-ink">{name}</span>
            <span className="font-mono text-xs font-bold text-ink">
              {price}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-3.5">
        <span className="font-mono text-[11px] text-label">
          FOUND 3 ITEMS · TAX + TIP
        </span>
        <span className="font-display text-lg text-ink">$72.00</span>
      </div>
      <div className="mt-3 bg-ink text-[#F7F1E3] rounded-xl p-[13px] text-center font-mono font-bold text-[13px] tracking-[0.05em]">
        LOOKS GOOD → SPLIT IT
      </div>
    </div>
  )
}

function SplitScreen() {
  return (
    <div className="flex-1 overflow-y-auto px-3.5 pt-3.5 pb-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[9.5px] tracking-[0.14em] text-label">
            TARRO · WOOD-FIRED
          </div>
          <h3 className="font-display text-[23px] text-ink mt-0.5 m-0">
            $72.00
          </h3>
        </div>
        <span className="font-mono text-[10px] text-[#7A7560] border-[1.5px] border-paper-dashed rounded-md px-2 py-[5px]">
          3 PEOPLE
        </span>
      </div>

      {/* segmented control */}
      <div className="flex gap-1 bg-[#EFE6D2] rounded-[11px] p-1 mt-[13px] font-mono font-bold text-[11px]">
        <span className="flex-1 text-center bg-ink text-[#F7F1E3] p-2 rounded-lg">
          BY ITEM
        </span>
        <span className="flex-1 text-center text-[#8A8470] p-2">EVENLY</span>
        <span className="flex-1 text-center text-[#8A8470] p-2">SHARES</span>
      </div>

      {/* tally chips */}
      <div className="flex gap-2 mt-[13px]">
        <div className="flex-1 bg-paper-cream border border-paper-edge rounded-xl px-2 py-2.5 text-center">
          <Ava bg="#E0452B" className="mx-auto">
            IS
          </Ava>
          <div className="font-display text-[17px] text-ink mt-[5px]">$40</div>
        </div>
        <div className="flex-1 bg-paper-cream border border-paper-edge rounded-xl px-2 py-2.5 text-center">
          <Ava bg="#2F4E78" className="mx-auto">
            MA
          </Ava>
          <div className="font-display text-[17px] text-ink mt-[5px]">$32</div>
        </div>
        <div className="flex-1 bg-ink rounded-xl px-2 py-2.5 text-center">
          <Ava bg="#7ED9A6" color="#20242B" className="mx-auto">
            YO
          </Ava>
          <div className="font-display text-sm text-acid mt-[7px]">paid</div>
        </div>
      </div>

      {/* item rows */}
      <div className="flex flex-col gap-[7px] mt-3.5">
        <div className="flex items-center gap-2.5 bg-paper-cream border border-paper-edge rounded-xl px-3 py-[11px]">
          <span className="flex-1">
            <span className="font-bold text-sm text-ink block">
              Margherita
            </span>
            <span className="font-mono text-[10px] text-label">
              shared · table
            </span>
          </span>
          <span className="flex">
            <Ava bg="#E0452B" size={22} ring="#F8F2E4" />
            <Ava bg="#2F4E78" size={22} ring="#F8F2E4" className="-ml-[7px]" />
          </span>
          <span className="font-mono text-[13px] font-bold text-ink w-[42px] text-right">
            $18
          </span>
        </div>
        <div className="flex items-center gap-2.5 bg-paper-cream border border-paper-edge rounded-xl px-3 py-[11px]">
          <span className="flex-1">
            <span className="font-bold text-sm text-ink block">Carbonara</span>
            <span className="font-mono text-[10px] text-label">Ishi</span>
          </span>
          <span className="flex">
            <Ava bg="#E0452B" size={22} ring="#F8F2E4" />
          </span>
          <span className="font-mono text-[13px] font-bold text-ink w-[42px] text-right">
            $22
          </span>
        </div>
        <div className="flex items-center gap-2.5 bg-paper-cream border border-paper-edge rounded-xl px-3 py-[11px]">
          <span className="flex-1">
            <span className="font-bold text-sm text-ink block">
              <span className="mv-highlight">House red (½L)</span>
            </span>
            <span className="font-mono text-[10px] text-label">
              drinkers · ÷2
            </span>
          </span>
          <span className="flex">
            <Ava bg="#E0452B" size={22} ring="#F8F2E4" />
            <Ava bg="#7ED9A6" size={22} ring="#F8F2E4" className="-ml-[7px]" />
          </span>
          <span className="font-mono text-[13px] font-bold text-ink w-[42px] text-right">
            $32
          </span>
        </div>
      </div>

      {/* smart note */}
      <div className="flex items-center gap-2 mt-[13px] bg-[rgba(47,78,120,0.08)] rounded-[11px] px-[11px] py-[9px]">
        <span className="w-[22px] h-[22px] rounded-full flex-none bg-[linear-gradient(135deg,#2F4E78,#D8412A)]" />
        <span className="font-hand text-[17px] text-inkblue">
          wine ÷ drinkers, Manny skipped 👍
        </span>
      </div>

      {/* input bar */}
      <div className="flex items-center gap-[9px] mt-[13px] bg-white border-[1.5px] border-[#E2D8BF] rounded-[13px] px-3 py-2.5">
        <span className="w-[26px] h-[26px] rounded-full bg-redpen text-white grid place-items-center text-xs flex-none">
          🎙
        </span>
        <span className="flex-1 text-[12.5px] text-[#A39A82]">
          Tell Mivvi who had what…
        </span>
        <span className="w-[26px] h-[26px] rounded-lg bg-ink text-[#F7F1E3] grid place-items-center text-[13px] flex-none">
          ↑
        </span>
      </div>
    </div>
  )
}

function LedgerScreen() {
  const debts = [
    { init: 'IS', bg: '#E0452B', who: <><b>Ishi</b> pays you</>, amt: '$40', color: '#2E9E68', action: 'REMIND', dark: false },
    { init: 'MA', bg: '#2F4E78', who: <><b>Manny</b> pays you</>, amt: '$32', color: '#2E9E68', action: 'REMIND', dark: false },
    { init: 'DA', bg: '#C77D2E', who: <>you pay <b>Dana</b></>, amt: '$24', color: '#D8412A', action: 'SETTLE', dark: true },
  ]
  const activity = [
    ['TARRO · WOOD-FIRED', 'you paid · split 3 · fri', '$72', 'OPEN'],
    ['COFFEE RUN', 'dana paid · thu', '$14', 'SETTLED'],
    ['GROCERIES', 'you paid · split 4 · wed', '$61', 'OPEN'],
    ['UBER HOME', 'split 2 · tue', '$28', 'SETTLED'],
  ]
  return (
    <div className="flex-1 overflow-y-auto px-3.5 pt-3.5 pb-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl text-ink m-0">Ledger</h3>
        <span className="font-mono text-[10px] text-[#7A7560] border-[1.5px] border-paper-dashed rounded-md px-2 py-[5px]">
          THIS MONTH ▾
        </span>
      </div>

      <div className="bg-ink rounded-2xl px-[17px] py-[15px] mt-[13px] flex items-center justify-between">
        <div>
          <div className="font-mono text-[9.5px] tracking-[0.14em] text-[#8C8A74]">
            NET THIS MONTH
          </div>
          <div className="font-display text-[30px] text-acid leading-none mt-1">
            +$48.00
          </div>
        </div>
        <div className="font-mono text-[10px] text-[#C7C0AE] text-right leading-[1.6]">
          settled $134
          <br />6 splits
        </div>
      </div>

      <MonoLabel>WHO OWES WHO</MonoLabel>
      <div className="flex flex-col gap-[7px]">
        {debts.map((d) => (
          <div
            key={d.init + d.amt}
            className="flex items-center gap-2.5 bg-paper-cream border border-paper-edge rounded-xl px-[11px] py-[9px]"
          >
            <Ava bg={d.bg} size={28}>
              {d.init}
            </Ava>
            <span className="flex-1 text-[12.5px] text-ink">{d.who}</span>
            <span className="font-display text-[15px]" style={{ color: d.color }}>
              {d.amt}
            </span>
            <span
              className={
                d.dark
                  ? 'font-mono text-[9.5px] font-bold text-[#F7F1E3] bg-ink rounded-md px-[7px] py-[5px]'
                  : 'font-mono text-[9.5px] font-bold text-[#7A7560] border-[1.5px] border-paper-dashed rounded-md px-[7px] py-[5px]'
              }
            >
              {d.action}
            </span>
          </div>
        ))}
      </div>

      <MonoLabel>ACTIVITY</MonoLabel>
      <div className="flex flex-col font-mono">
        {activity.map(([venue, meta, amt, status], i) => (
          <div
            key={venue}
            className={`flex items-center gap-2.5 py-2.5 px-0.5 ${
              i < activity.length - 1
                ? 'border-b-[1.5px] border-dashed border-[#DCD0B4]'
                : ''
            }`}
          >
            <span className="flex-1">
              <span className="text-xs font-bold text-ink block">{venue}</span>
              <span className="text-[10px] text-label">{meta}</span>
            </span>
            <span className="text-xs font-bold text-ink">{amt}</span>
            <span
              className={
                status === 'OPEN'
                  ? 'text-[9px] text-[#C77D2E] border-[1.5px] border-[#E0C08A] rounded-[5px] px-[5px] py-[3px]'
                  : 'text-[9px] text-acid-ink border-[1.5px] border-[#A9D8BE] rounded-[5px] px-[5px] py-[3px]'
              }
            >
              {status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const TABS: { key: DemoScreen; label: string; icon: React.ReactNode }[] = [
  {
    key: 'groups',
    label: 'GROUPS',
    icon: (
      <span className="flex gap-px">
        <i className="w-[11px] h-[11px] rounded-full bg-current block" />
        <i className="w-[11px] h-[11px] rounded-full bg-current block -ml-1" />
      </span>
    ),
  },
  {
    key: 'scan',
    label: 'SCAN',
    icon: (
      <span className="relative w-[18px] h-[13px] border-2 border-current rounded-[3px] block">
        <i className="absolute top-[2.5px] left-[5px] w-1.5 h-1.5 border-[1.5px] border-current rounded-full block" />
      </span>
    ),
  },
  {
    key: 'split',
    label: 'SPLIT',
    icon: (
      <span
        className="w-[15px] h-[15px] rounded-full border-2 border-current block"
        style={{
          background: 'conic-gradient(currentColor 0 50%, transparent 0 50%)',
        }}
      />
    ),
  },
  {
    key: 'ledger',
    label: 'LEDGER',
    icon: (
      <span className="flex flex-col gap-[2.5px]">
        <i className="w-4 h-[2.4px] bg-current block rounded-sm" />
        <i className="w-4 h-[2.4px] bg-current block rounded-sm" />
        <i className="w-2.5 h-[2.4px] bg-current block rounded-sm" />
      </span>
    ),
  },
]

export function PhoneDemo({
  screen,
  onScreenChange,
}: {
  screen: DemoScreen
  onScreenChange: (s: DemoScreen) => void
}) {
  return (
    <div className="w-[clamp(300px,84vw,346px)] bg-ink-deep rounded-[48px] p-[11px] shadow-phone">
      <div className="relative h-[686px] bg-paper-screen rounded-[38px] overflow-hidden">
        {/* status bar */}
        <div className="absolute left-0 right-0 top-0 h-[38px] flex items-center justify-between px-5 font-mono text-[11.5px] font-bold text-ink z-[5]">
          <span>9:15</span>
          <span className="flex items-center gap-[5px]">
            <i className="w-4 h-[9px] border-[1.5px] border-ink rounded-sm inline-block" />
            <i className="w-1 h-1 rounded-full bg-ink inline-block" />
          </span>
        </div>

        {/* screen content */}
        <div className="absolute left-0 right-0 top-[38px] bottom-16 overflow-hidden">
          {(['groups', 'scan', 'split', 'ledger'] as const).map((k) => (
            <div
              key={k}
              className="absolute inset-0 flex-col"
              style={{ display: screen === k ? 'flex' : 'none' }}
            >
              {k === 'groups' && <GroupsScreen />}
              {k === 'scan' && <ScanScreen />}
              {k === 'split' && <SplitScreen />}
              {k === 'ledger' && <LedgerScreen />}
            </div>
          ))}
        </div>

        {/* tab bar */}
        <div className="absolute left-0 right-0 bottom-0 h-16 bg-paper-screen border-t-2 border-dashed border-[#DCCFB3] flex px-1 z-[5]">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onScreenChange(tab.key)}
              className="flex flex-col items-center justify-center gap-[5px] flex-1 cursor-pointer bg-transparent border-none font-mono font-bold text-[9.5px] tracking-[0.08em] pt-2.5 transition-colors"
              style={{ color: screen === tab.key ? '#20242B' : '#B3AA95' }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

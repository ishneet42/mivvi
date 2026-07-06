/**
 * Bobbing thermal receipt for the landing hero (design handoff: "Hero").
 * Pure CSS collage: TARRO receipt + red hand-drawn circle, Caveat
 * annotations, SETTLED stamp, and two taped sticker avatars. Static
 * server-rendered markup; motion is CSS-only.
 */
export function HeroReceipt() {
  return (
    <div className="relative w-[min(330px,80vw)] animate-mv-bob mv-anim">
      <div className="relative bg-paper-cream rounded-md shadow-paper-pop px-[26px] pt-7 pb-[34px]">
        <div className="text-center font-display text-[30px] tracking-[0.04em] text-ink">
          TARRO
        </div>
        <div className="text-center font-mono text-[10px] tracking-[0.18em] text-[#8A8470] mt-1">
          WOOD-FIRED OVEN · EST. &rsquo;19
        </div>
        <div className="text-center font-mono text-[11px] tracking-[0.1em] text-[#8A8470] mt-2">
          FRI 9:15 PM — 3 GUESTS
        </div>
        <div className="border-t-2 border-dashed border-paper-dashed my-4" />
        <div className="font-mono text-[#33302A]">
          <div className="flex justify-between text-[14.5px] my-2">
            <span>Margherita</span>
            <span>18.00</span>
          </div>
          <div className="flex justify-between text-[14.5px] my-2">
            <span>Carbonara</span>
            <span>22.00</span>
          </div>
          <div className="flex justify-between text-[14.5px] my-2">
            <span className="mv-highlight">House red (½L)</span>
            <span>32.00</span>
          </div>
        </div>
        <div className="border-t-2 border-dashed border-paper-dashed my-4" />
        <div className="flex justify-between font-display text-[21px] text-ink tracking-[0.02em]">
          <span>TOTAL</span>
          <span>$72.00</span>
        </div>
        <div className="h-[34px] mt-[18px] opacity-85 mv-barcode" />
        <div className="text-center font-mono text-[9.5px] tracking-[0.2em] text-[#8A8470] mt-[11px]">
          THANK YOU · COME HUNGRY
        </div>

        {/* hand-drawn annotations overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[118px] left-3.5 w-[226px] h-[70px] border-[2.5px] border-redpen opacity-85 -rotate-[4deg] rounded-[48%_52%_50%_50%]" />
          <div className="absolute top-[100px] -right-[30px] font-hand text-2xl text-redpen -rotate-[7deg] leading-[0.95]">
            Ishi&rsquo;s!
            <div className="text-[15px]">↙ both</div>
          </div>
          <div className="absolute top-[208px] -right-5 font-hand text-[19px] text-inkblue rotate-[5deg]">
            ÷ drinkers
          </div>
          <div className="absolute bottom-[104px] right-1.5 mv-stamp font-display text-xl tracking-[0.08em] px-2.5 py-[3px]">
            SETTLED
          </div>
        </div>
      </div>

      {/* taped sticker avatars */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -bottom-[18px] -left-[22px] -rotate-[8deg] text-center">
          <div className="absolute -top-2 left-4 w-[38px] h-3.5 bg-white/50 -rotate-[6deg]" />
          <div className="w-[60px] h-[60px] rounded-full text-white font-display text-xl grid place-items-center border-[3px] border-paper-cream shadow-[0_10px_18px_-6px_rgba(0,0,0,0.4)] bg-[radial-gradient(circle_at_35%_30%,#FF8A6E,#E0452B)]">
            IS
          </div>
          <div className="font-hand text-[22px] text-ink mt-0.5">$40</div>
        </div>
        <div className="absolute bottom-3.5 -right-6 rotate-[7deg] text-center">
          <div className="absolute -top-2 left-3.5 w-[38px] h-3.5 bg-white/50 rotate-[8deg]" />
          <div className="w-[60px] h-[60px] rounded-full text-white font-display text-xl grid place-items-center border-[3px] border-paper-cream shadow-[0_10px_18px_-6px_rgba(0,0,0,0.4)] bg-[radial-gradient(circle_at_35%_30%,#6E97D6,#2F4E78)]">
            MA
          </div>
          <div className="font-hand text-[22px] text-ink mt-0.5">$32</div>
        </div>
      </div>
    </div>
  )
}

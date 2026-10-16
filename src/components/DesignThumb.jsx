/**
 * Miniature A4 mock of a PDF design, drawn with plain divs.
 * Reads `design.thumb`: { variant, accent, soft, pop }.
 */
export default function DesignThumb({ design, className = "" }) {
  const { variant, accent, soft, pop } = design.thumb;

  const TableRows = ({ striped = true, top }) => (
    <div className="absolute inset-x-1.5 space-y-[3px]" style={{ top }}>
      <div className="h-[7px] rounded-[2px]" style={{ background: accent }} />
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-[6px] rounded-[2px]"
          style={{ background: striped && i % 2 === 0 ? soft : "#f7f7f8" }}
        />
      ))}
    </div>
  );

  const TotalChip = () => (
    <div
      className="absolute bottom-2 right-1.5 h-[8px] w-9 rounded-[2px]"
      style={{ background: pop }}
    />
  );

  const GrayBar = ({ w, style }) => (
    <div className="h-[4px] rounded-full bg-gray-300" style={{ width: w, ...style }} />
  );

  return (
    <div
      className={`relative h-32 w-24 overflow-hidden rounded-lg border border-base-300 bg-white shadow-sm ${className}`}
    >
      {variant === "classic" && (
        <>
          <div className="absolute inset-1 rounded-[3px] border border-gray-300" />
          <div className="absolute left-1/2 top-2.5 h-[6px] w-12 -translate-x-1/2 rounded-full bg-gray-800" />
          <div className="absolute left-1/2 top-[18px] h-[3px] w-14 -translate-x-1/2 rounded-full bg-gray-300" />
          <div className="absolute left-1/2 top-[24px] h-[3px] w-10 -translate-x-1/2 rounded-full bg-gray-300" />
          <div className="absolute inset-x-2.5 top-9 space-y-[3px]">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[6px] rounded-[1px] border border-gray-200" />
            ))}
          </div>
          <div className="absolute bottom-2 left-2.5 right-2.5 h-[8px] rounded-[1px] border border-gray-400" />
        </>
      )}

      {variant === "gold" && (
        <>
          <div
            className="absolute inset-x-0 top-0 h-9"
            style={{ background: accent, clipPath: "polygon(0 0, 100% 0, 100% 55%, 0 100%)" }}
          />
          <div
            className="absolute top-0 h-9 w-3"
            style={{ left: "58%", background: pop, clipPath: "polygon(40% 0, 100% 0, 60% 100%, 0 100%)" }}
          />
          <div className="absolute left-2 top-2 h-[5px] w-10 rounded-full bg-white/80" />
          <div className="absolute left-2 top-[15px] h-[3px] w-8 rounded-full" style={{ background: pop }} />
          <TableRows striped={false} top="44px" />
          <TotalChip />
          <div className="absolute inset-x-0 bottom-0 h-2" style={{ background: accent }} />
        </>
      )}

      {variant === "band" && (
        <>
          <div className="absolute inset-x-0 top-0 h-7" style={{ background: accent }} />
          <div className="absolute left-1.5 top-2 h-[5px] w-9 rounded-full bg-white/85" />
          <div className="absolute right-1.5 top-2 h-[5px] w-6 rounded-full" style={{ background: pop !== accent ? pop : "rgba(255,255,255,0.85)" }} />
          <div className="absolute left-1.5 top-9 space-y-[3px]">
            <GrayBar w="34px" />
            <GrayBar w="26px" />
          </div>
          <div className="absolute right-1.5 top-9 space-y-[3px]">
            <GrayBar w="20px" style={{ marginLeft: "auto" }} />
            <GrayBar w="14px" style={{ marginLeft: "auto" }} />
          </div>
          <TableRows top="58px" />
          <TotalChip />
          <div className="absolute inset-x-0 bottom-0 h-[6px]" style={{ background: accent }} />
        </>
      )}

      {variant === "side" && (
        <>
          <div className="absolute inset-y-0 left-0 w-[7px]" style={{ background: accent }} />
          <div className="absolute left-3 top-2.5 h-[5px] w-9 rounded-full" style={{ background: accent }} />
          <div className="absolute left-3 top-[19px] space-y-[3px]">
            <GrayBar w="30px" />
            <GrayBar w="22px" />
          </div>
          <div className="absolute right-1.5 top-2.5 h-[6px] w-7 rounded-full" style={{ background: accent }} />
          <div className="absolute left-3 right-1.5 top-9 h-[2px]" style={{ background: accent }} />
          <div className="absolute right-1.5 left-3" style={{ top: "44px" }}>
            <div className="space-y-[3px]">
              <div className="h-[7px] rounded-[2px]" style={{ background: accent }} />
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-[6px] rounded-[2px]" style={{ background: i % 2 === 0 ? soft : "#f7f7f8" }} />
              ))}
            </div>
          </div>
          <TotalChip />
          <div className="absolute bottom-0 left-[7px] right-0 h-[6px]" style={{ background: accent }} />
        </>
      )}

      {variant === "center" && (
        <>
          <div className="absolute left-1/2 top-2.5 h-[6px] w-12 -translate-x-1/2 rounded-full" style={{ background: accent }} />
          <div className="absolute left-1/2 top-[14px] h-[3px] w-14 -translate-x-1/2 rounded-full bg-gray-300" />
          <div className="absolute left-1/2 top-[20px] h-[3px] w-10 -translate-x-1/2 rounded-full bg-gray-300" />
          <div className="absolute inset-x-2 top-[28px] h-[2px]" style={{ background: accent }} />
          <div className="absolute inset-x-2 top-[32px] h-px" style={{ background: accent, opacity: 0.5 }} />
          <div className="absolute left-1/2 top-[38px] h-[4px] w-8 -translate-x-1/2 rounded-full bg-gray-500" />
          <TableRows top="50px" striped={false} />
          <TotalChip />
        </>
      )}

      {variant === "split" && (
        <>
          <div className="absolute left-1.5 top-2.5 h-[6px] w-9 rounded-full" style={{ background: accent }} />
          <div className="absolute left-1.5 top-[14px] space-y-[3px]">
            <GrayBar w="28px" />
            <GrayBar w="20px" />
          </div>
          <div className="absolute right-1.5 top-2.5 h-[7px] w-8 rounded-full" style={{ background: accent }} />
          <div className="absolute inset-x-1.5 top-[32px] h-[2.5px]" style={{ background: accent }} />
          <TableRows top="44px" />
          <TotalChip />
        </>
      )}

      {variant === "minimal" && (
        <>
          <div className="absolute left-1.5 top-2.5 flex items-center gap-[3px]">
            {pop !== accent && <div className="h-[9px] w-[3px]" style={{ background: pop }} />}
            <div className="h-[9px] w-12 rounded-[2px]" style={{ background: accent }} />
          </div>
          <div className="absolute right-1.5 top-2.5 space-y-[3px]">
            <GrayBar w="18px" style={{ marginLeft: "auto" }} />
            <GrayBar w="24px" style={{ marginLeft: "auto" }} />
          </div>
          <div className="absolute inset-x-1.5 top-[26px] h-px bg-gray-300" />
          <TableRows top="40px" striped={false} />
          <TotalChip />
        </>
      )}
    </div>
  );
}

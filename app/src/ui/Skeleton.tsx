/** Скелетон канваса на время загрузки doc (DESIGN.md: форма контента, не спиннер). */
export function Skeleton() {
  const placeholders = [
    { top: '18%', left: '12%' },
    { top: '18%', left: '42%' },
    { top: '46%', left: '20%' },
    { top: '46%', left: '55%' },
    { top: '72%', left: '15%' },
    { top: '72%', left: '48%' },
  ]

  return (
    <div className="relative h-full w-full overflow-hidden">
      {placeholders.map((pos, i) => (
        <div
          key={i}
          className="absolute h-16 w-[150px] animate-pulse rounded-[10px] border border-line bg-surface-2"
          style={pos}
        />
      ))}
    </div>
  )
}

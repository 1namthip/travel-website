export default function DetailStickyBar({
  price,
  cta,
}: {
  price: React.ReactNode;
  cta: React.ReactNode;
}) {
  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-stone-200/80 bg-white/90 backdrop-blur-lg shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.06)]">
      <div className="max-w-6xl mx-auto px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-4">
        <div className="min-w-0">{price}</div>
        <div className="shrink-0">{cta}</div>
      </div>
    </div>
  );
}

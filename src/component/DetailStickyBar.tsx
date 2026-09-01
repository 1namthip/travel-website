export default function DetailStickyBar({
  price,
  cta,
}: {
  price: React.ReactNode;
  cta: React.ReactNode;
}) {
  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-4">
        <div className="min-w-0">{price}</div>
        <div className="shrink-0">{cta}</div>
      </div>
    </div>
  );
}

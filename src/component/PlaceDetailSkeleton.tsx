export default function PlaceDetailSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      {/* top bar */}
      <div className="h-14 border-b border-neutral-100" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 animate-pulse">
        <div className="h-3.5 w-40 bg-neutral-100 rounded mb-6" />
        <div className="h-9 w-2/3 bg-neutral-200 rounded-lg mb-4" />
        <div className="flex gap-3 mb-8">
          <div className="h-6 w-24 bg-neutral-100 rounded-full" />
          <div className="h-6 w-28 bg-neutral-100 rounded-full" />
          <div className="h-6 w-40 bg-neutral-100 rounded-full" />
        </div>

        {/* gallery */}
        <div className="w-full h-[40vh] md:h-[50vh] bg-neutral-200 rounded-3xl mb-12" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-neutral-100 rounded-xl" />
              ))}
            </div>
            <div className="h-5 w-full bg-neutral-100 rounded mt-6" />
            <div className="h-5 w-11/12 bg-neutral-100 rounded" />
            <div className="h-5 w-4/5 bg-neutral-100 rounded" />
          </div>
          <div className="lg:col-span-1">
            <div className="w-full h-72 bg-neutral-200 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

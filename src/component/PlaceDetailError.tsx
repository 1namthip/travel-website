import Link from "next/link";
import { Frown } from "lucide-react";

export default function PlaceDetailError({
  message,
  backHref,
  backLabel,
}: {
  message: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-neutral-200 text-center max-w-md w-full">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-5 text-neutral-400">
          <Frown className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 mb-2">เกิดข้อผิดพลาด</h2>
        <p className="text-neutral-500 mb-7 leading-relaxed">{message}</p>
        <Link
          href={backHref}
          className="inline-flex w-full h-11 items-center justify-center rounded-xl bg-neutral-900 px-8 text-sm font-semibold text-white transition-colors hover:bg-black"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { Destination } from "../../types/destination";

export default function DestinationCard({ destination }: { destination: Destination }) {
  return (
    <Link href={`/destinations/${destination.id}`}>
      <div className="bg-white rounded-xl shadow hover:shadow-md transition overflow-hidden">
        <Image
            src={destination.image_url ?? "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=70"} // ✅ ถ้าไม่มี image_url ใช้รูป default
            alt={destination.name}
            width={400}
            height={300}
            className="rounded-xl object-cover"
            />
        <div className="p-4">
          <h3 className="text-lg font-semibold text-emerald-700">
            {destination.name}
          </h3>
          <p className="text-gray-600 text-sm mt-1 line-clamp-2">
            {destination.description}
          </p>
          <span className="text-xs mt-2 inline-block bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
            {destination.category}
          </span>
        </div>
      </div>
    </Link>
  );
}

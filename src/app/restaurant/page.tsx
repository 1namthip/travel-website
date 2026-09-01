import { Navbar } from "@/component/User/Navbar";
import RestaurantList from "@/component/RestaurantList"; // ปรับเป็น Absolute path ให้เหมือน Navbar
import Link from "next/link";

export default function RestaurantsPage() {
  return (
    <>
      <Navbar />
        
      {/* 🌟 1. Hero Banner Section */}
      <div className="relative w-full min-h-100 md:min-h-125 bg-neutral-900 flex flex-col items-center justify-center overflow-hidden pt-20 pb-12">

        <div
          className="absolute inset-0 bg-cover bg-center blur-xs scale-110"
          style={{ backgroundImage: "url('/images/banner5.png')" }}
        ></div>

        <div className="absolute inset-0 bg-black/60"></div>

        <div className="relative z-10 text-center px-4 md:px-8 w-full max-w-4xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-4 leading-tight drop-shadow-md">
            ร้านอาหาร
            <span className="text-amber-400 sm:ml-3 block sm:inline mt-2 sm:mt-0">
              เด็ดๆในโคราช
            </span>
          </h1>

          <p className="text-neutral-200 text-lg md:text-xl max-w-2xl mx-auto font-medium drop-shadow-md">
            ร้านอาหารอร่อยในโคราชที่คุณไม่ควรพลาด พร้อมเมนูเด็ดๆ ที่จะทำให้คุณต้องกลับมาอีกครั้ง!
          </p>

        </div>
      </div>

      {/* 🌟 2. Breadcrumbs Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 mb-4">
        <nav aria-label="Breadcrumb" className="flex">
          <ol className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-neutral-500 font-medium">
            <li>
              <Link
                href="/"
                className="hover:text-amber-600 transition-colors flex items-center gap-1.5 focus:outline-none focus:text-amber-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>หน้าแรก</span>
              </Link>
            </li>
            
            <li>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-neutral-400 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </li>

            <li aria-current="page">
              <span className="text-neutral-900 font-semibold">ร้านอาหาร</span>
            </li>
          </ol>
        </nav>
      </div>

      {/* 🌟 3. Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 pb-16 pt-6">
        <RestaurantList />
      </main>
    </>
  );
}
import { useState } from 'react';

interface Accommodation {
  id: string;
  name: string;
  description: string;
  address: string;
  price_range: string;
  category: string;
  contact_phone: string;
  contact_line: string;
  contact_facebook: string;
  images: string[];
  created_by: string;
  created_at: string;
}

interface AccommodationModalProps {
  accommodation: Accommodation;
  isOpen: boolean;
  onClose: () => void;
  
}

export default function AccommodationModal({ accommodation, isOpen, onClose }: AccommodationModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-xl animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 bg-white">
          <h2 className="text-2xl font-bold text-neutral-900">{accommodation.name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-y-auto max-h-[calc(90vh-88px)]">
          {/* Left: Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative h-96 bg-neutral-200 rounded-xl overflow-hidden">
              {accommodation.images && accommodation.images.length > 0 ? (
                <img
                  src={accommodation.images[selectedImageIndex]}
                  alt={`${accommodation.name} - รูปที่ ${selectedImageIndex + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
                    e.currentTarget.classList.add('hidden');
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-neutral-200 flex items-center justify-center">
                  <svg className="w-20 h-20 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
              )}

              {/* Image Counter */}
              {accommodation.images && accommodation.images.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white text-sm font-semibold px-4 py-2 rounded-full">
                  {selectedImageIndex + 1} / {accommodation.images.length}
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {accommodation.images && accommodation.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {accommodation.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImageIndex === index
                        ? 'border-amber-500 ring-2 ring-amber-200'
                        : 'border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Description under images */}
            {accommodation.description && (
              <div className="p-4 rounded-xl">
                <p className="text-neutral-900 leading-relaxed whitespace-pre-line">{accommodation.description}</p>
              </div>
            )}
          </div>

          {/* Right: Details as Text */}
          <div className="space-y-4">
            {/* Category */}
            <div>
              <p className="text-sm text-neutral-500 mb-1">ประเภทที่พัก</p>
              <p className="text-lg font-semibold text-neutral-900">{accommodation.category}</p>
            </div>

            <div className="border-t border-neutral-200"></div>

            {/* Price */}
            {accommodation.price_range && (
              <>
                <div>
                  <p className="text-sm text-neutral-500 mb-1">ค่าเช่า</p>
                  <p className="text-2xl font-bold text-amber-700">
                    {accommodation.price_range.toLocaleString()} ฿<span className="text-base font-medium text-neutral-600">/เดือน</span>
                  </p>
                </div>
                <div className="border-t border-neutral-200"></div>
              </>
            )}

            {/* Address */}
            {accommodation.address && (
              <>
                <div>
                  <p className="text-sm text-neutral-500 mb-1">ที่อยู่</p>
                  <p className="text-neutral-700 leading-relaxed">{accommodation.address}</p>
                </div>
                <div className="border-t border-neutral-200"></div>
              </>
            )}

            {/* Contact Information */}
            <div>
              <p className="text-sm text-neutral-500 mb-3">ช่องทางติดต่อ</p>
              <div className="space-y-3">
                {accommodation.contact_phone && (
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">โทรศัพท์</p>
                    <a
                      href={`tel:${accommodation.contact_phone}`}
                      className="text-amber-700 hover:text-amber-800 font-medium hover:underline inline-flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                      </svg>
                      {accommodation.contact_phone}
                    </a>
                  </div>
                )}
                
                {accommodation.contact_line && (
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">LINE ID</p>
                    <a
                      href={`https://line.me/ti/p/${accommodation.contact_line}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00B900] hover:text-[#00A000] font-medium hover:underline inline-flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                      </svg>
                      @{accommodation.contact_line}
                    </a>
                  </div>
                )}
                
                {accommodation.contact_facebook && (
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Facebook</p>
                    <a
                      href={accommodation.contact_facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#1877F2] hover:text-[#0C63D4] font-medium hover:underline inline-flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      เข้าชมเพจ Facebook
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
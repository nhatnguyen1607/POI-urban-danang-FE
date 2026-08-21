import { useState } from 'react';
import { Compass, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../auth/useAuth';
import { PoiExperienceLayer } from '../urban-agent/PoiExperienceLayer';
import { destinationToTripPlace, queueTripPlace } from '../urban-agent/tripPlaceBridge';
import type { SearchDestination } from '../../services/poiExperienceService';

export default function DashboardPage() {
  const { language } = useLanguage();
  const { user, firebaseReady } = useAuth();
  const navigate = useNavigate();
  const [addingPlaceId, setAddingPlaceId] = useState('');
  const copy = language === 'vi'
    ? {
        badge: 'Khám phá Đà Nẵng',
        title: 'Tìm một nơi bạn muốn ghé',
        subtitle: 'Tìm quán, địa danh hoặc một địa chỉ cụ thể, rồi thêm thẳng vào chuyến đi đang lên kế hoạch.',
        searchTitle: 'Tìm kiếm địa điểm',
        searchSubtitle: 'Một ô tìm kiếm cho cả địa điểm UrbanAgent và địa chỉ ngoài danh sách.',
      }
    : {
        badge: 'Explore Da Nang',
        title: 'Find somewhere worth visiting',
        subtitle: 'Search venues, landmarks, or a precise address, then add it directly to your current trip.',
        searchTitle: 'Place search',
        searchSubtitle: 'One search box for UrbanAgent places and addresses outside the catalog.',
      };

  const addToTrip = async (destination: SearchDestination) => {
    setAddingPlaceId(destination.id);
    queueTripPlace(destinationToTripPlace(destination));
    navigate('/urban-agent', { state: { queuedPlace: true } });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-teal-800"><Compass size={16} /> {copy.badge}</div>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">{copy.title}</h1>
          <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">{copy.subtitle}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-900"><MapPin size={17} /> Đà Nẵng</div>
      </header>

      <PoiExperienceLayer
        user={user}
        firebaseReady={firebaseReady}
        itineraryPois={[]}
        extraPois={[]}
        title={copy.searchTitle}
        subtitle={copy.searchSubtitle}
        language={language}
        addingPlaceId={addingPlaceId}
        onAddToTrip={addToTrip}
      />
    </div>
  );
}

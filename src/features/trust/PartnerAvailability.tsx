import { ExternalLink, Hotel, Utensils } from 'lucide-react';
import { availabilityPresentation, safePartnerHandoffUrl, type PoiTrust } from './trustPresentation';

export function PartnerAvailability({ trust }: { trust?: PoiTrust | null }) {
  const view = availabilityPresentation(trust);
  const safeUrl = safePartnerHandoffUrl(trust?.handoff?.url);
  if (!view && !safeUrl) return null;
  const foodHandoff = trust?.handoff?.capability === 'FOOD_HANDOFF';
  const Icon = foodHandoff ? Utensils : Hotel;
  return (
    <div className="mt-2 border-t border-current/10 pt-2 text-xs leading-5">
      {view && (
        <>
          <div className="flex items-center gap-1.5 font-semibold"><Icon size={14} />{view.label}</div>
          <p>{view.detail}</p>
        </>
      )}
      {safeUrl && (
        <>
          <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 font-semibold underline underline-offset-2">
            {foodHandoff ? 'Xem dịch vụ đặt món' : 'Kiểm tra / Đặt phòng'}
            <ExternalLink size={13} />
          </a>
          <p className="mt-1 opacity-80">Đặt chỗ, thanh toán và hủy dịch vụ được thực hiện với nhà cung cấp bên ngoài.</p>
        </>
      )}
      {!safeUrl && trust?.availability?.handoffRequired && (
        <p className="mt-1 font-medium">Kiểm tra trực tiếp trên nhà cung cấp.</p>
      )}
    </div>
  );
}

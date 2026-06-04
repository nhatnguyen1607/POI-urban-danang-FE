# PLANNING - Frontend

## Vai tro cua thu muc nay

`POI-urban-danang-FE` phu trach UI/UX cho Danang UrbanAgent AI. Frontend phai the hien ro san pham co hai role lien ket:

- Khach: tim dia diem, lap lich trinh, chinh sua lich trinh, mo action.
- Nguoi kinh doanh: nhap concept, xem khu vuc de xuat, demand proxy, doi thu, ly do.

## Nguyen tac UI

- Khong lam landing page chung chung neu dang demo san pham; man hinh dau nen la trai nghiem dung duoc.
- Phai co `RoleSwitcher` ro rang.
- Moi ket qua goi y phai co ly do, score va action tiep theo.
- UI phai cho phep chinh sua, khong chi hien ket qua tinh.
- Khong noi qua kha nang: neu chi handoff Grab thi nut la `Mo Grab de xac nhan`, khong ghi `Da dat xe`.

## Cau truc component goi y

```text
src/
  pages/
    TravelerAgentPage.tsx
    BusinessAgentPage.tsx
  components/
    RoleSwitcher.tsx
    AgentChatBox.tsx
    PoiResultCard.tsx
    ItineraryEditor.tsx
    RouteMapPanel.tsx
    BusinessInsightPanel.tsx
    ScoreBreakdown.tsx
    ActionButtons.tsx
  hooks/
    useAgentSession.ts
    useItineraryState.ts
    useBusinessInsights.ts
  services/
    agentApi.ts
    routeApi.ts
    weatherApi.ts
```

## Traveler flow

```text
Input nhu cau -> Goi API -> Hien POI/itinerary -> Sua lich trinh -> Mo action
```

Can ho tro:

- Them POI vao lich trinh.
- Xoa POI.
- Goi y POI bo sung khong trung voi POI da co trong lich trinh.
- Tim dia diem bang mo ta text va anh tham chieu ngay trong Urban Agent; khong mo mot man hinh Legacy Site Selection rieng cho nguoi dung cuoi.
- Cau lenh tu nhien co nhieu nhu cau, vi du `quan an + cafe`, phai hien du cac intent chinh neu data co.
- Doi thu tu.
- Doi phuong tien.
- Xem warning.
- Xem route bang he chuyen gia tren ban do truc quan trong app truoc khi mo Google Maps.
- Mo ban do/phone/website/Grab handoff la action phu de nguoi dung xac nhan.
- Ghi feedback huu ich/khong phu hop va thao tac them/xoa de tao learning loop.

## Business flow

```text
Input concept -> Goi API -> Hien top khu vuc -> Score breakdown -> Doi thu/POI bo tro -> Ly do/rui ro
```

Can ho tro:

- Loc theo danh muc kinh doanh.
- Loc theo khu vuc.
- Xem heatmap/cum POI neu co map.
- Xem doi thu gan do.
- Xem reason de thuyet phuc.

## API response frontend mong doi

```json
{
  "role": "traveler",
  "results": [],
  "itinerary": [],
  "warnings": [],
  "actions": []
}
```

```json
{
  "role": "business",
  "areas": [],
  "score_breakdown": {},
  "competitors": [],
  "reasons": [],
  "warnings": []
}
```

## Quy uoc code FE

- Component dung PascalCase.
- Hook dung `useSomething`.
- API client tach khoi component.
- Trang khong chua logic scoring phuc tap.
- Text UI dung UTF-8 va nen di qua language context neu la man hinh moi.
- Neu backend fail, hien error co hanh dong thu lai.
- Loading state phai ro.
- Empty state phai goi y query mau.

## Commit lien quan FE

```text
feat(fe): add role switch layout
feat(fe): add itinerary editor
feat(fe): add business insight panel
fix(fe): handle empty agent response
```

## Cach chay du an FE

### Cai dat

```bash
cd D:\POI-urban-danang-FE
npm install
```

### Cau hinh backend

Tao file `.env` neu can doi backend URL:

```text
VITE_API_URL=http://localhost:7860
```

Neu khong co `.env`, frontend mac dinh goi:

```text
http://localhost:7860
```

### Chay dev

```bash
npm run dev
```

Mo trang MVP moi:

```text
http://localhost:5173/urban-agent
```

Khi test Urban Agent, nen kiem tra:

```text
- Chuyen ngon ngu Viet/Anh trong sidebar.
- Query co nhieu intent: "tao lo trinh co quan an va quan cafe".
- Chon thoi luong di choi 2/3/4/6 gio; itinerary phai thay doi so diem va tong thoi gian hop ly.
- Nut Route AI hien route noi bo, Google Maps chi la action phu.
- Nut Route AI phai hien modal ban do co marker, polyline, route stats va canh bao he chuyen gia.
- Nut xem toan bo lo trinh phai hien route da diem tren mot ban do duy nhat.
- Upload anh tham chieu + mo ta text de goi y dia diem theo Version 4.
- POI co the them khong trung voi cac diem da nam trong lich trinh.
- Nut huu ich/khong phu hop khong lam ngat flow UI.
```

### Build kiem tra

```bash
npm run build
```

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
- Doi thu tu.
- Doi phuong tien.
- Xem warning.
- Mo ban do/phone/website/Grab handoff.

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

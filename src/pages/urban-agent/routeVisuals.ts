export const ROUTE_VISUALS = {
  primary: '#087EA4',
  selected: '#0757B5',
  casing: '#FFFFFF',
  fallback: '#D97706',
} as const;

export const DAY_ROUTE_COLORS = [
  '#087EA4',
  '#0F8F83',
  '#5B5FC7',
  '#C65D4B',
  '#2875B9',
  '#8A5A9E',
  '#4F7F52',
] as const;

export function routeColorForDay(dayNumber: number) {
  return DAY_ROUTE_COLORS[(Math.max(1, dayNumber) - 1) % DAY_ROUTE_COLORS.length];
}

export function routeCasingOptions(selected = false) {
  return {
    color: ROUTE_VISUALS.casing,
    weight: selected ? 10 : 8,
    opacity: selected ? 0.96 : 0.82,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
    interactive: false,
  };
}

export function routeLineOptions({
  dayNumber = 1,
  selected = false,
  fallback = false,
}: {
  dayNumber?: number;
  selected?: boolean;
  fallback?: boolean;
} = {}) {
  return {
    color: fallback
      ? ROUTE_VISUALS.fallback
      : selected
        ? ROUTE_VISUALS.selected
        : routeColorForDay(dayNumber),
    weight: selected ? 6 : 5,
    opacity: selected ? 1 : 0.9,
    dashArray: fallback ? '8 10' : undefined,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
  };
}

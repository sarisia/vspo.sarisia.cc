export * from "./defineConfig";

export const calcTTL = (from: string, period = 7): Date => {
  const date = new Date(from);
  date.setDate(date.getDate() + period);
  return date;
};

export type FetchWindow = { start: Date; end: Date };

// Window the refresh batch fetches streams within: from `days` days ago to
// `days` days in the future (inclusive of today).
export const getFetchWindow = (days = 7): FetchWindow => {
  const now = Date.now();
  return {
    start: new Date(now - days * 86_400_000),
    end: new Date(now + days * 86_400_000),
  };
};

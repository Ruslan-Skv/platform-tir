export function getDefaultPeriod() {
  const now = new Date();
  return {
    month: String(now.getMonth() + 1).padStart(2, '0'),
    year: String(now.getFullYear()),
  };
}

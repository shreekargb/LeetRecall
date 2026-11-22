export function isValidRouteId(value: string) {
  return /^[1-9]\d{0,9}$/.test(value) && Number(value) <= 2147483647
}


const UUID_ROUTE_PARAM =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuidRouteParam(
  value: string,
) {
  let normalized = value;

  try {
    normalized =
      decodeURIComponent(value);
  } catch {
    return false;
  }

  return UUID_ROUTE_PARAM.test(
    normalized,
  );
}

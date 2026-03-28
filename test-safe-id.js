const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FALLBACK_TENANT_UUID = "00000000-0000-0000-0000-000000000000";

function getSafeId(id) {
  if (!id) return 5;
  if (UUID_REGEX.test(id)) return id;
  if (!isNaN(Number(id))) return Number(id);
  return FALLBACK_TENANT_UUID;
}

console.log("Raw UUID:", getSafeId("f47ac10b-58cc-4372-a567-0e02b2c3d479"));
console.log("Short Slug:", getSafeId("gecko-demo"));
console.log("Numeric:", getSafeId("10"));

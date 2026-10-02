// Mirrors the server rules in server/public/api/assets.php so most mistakes are caught before a round trip.
// The server remains the authority.
const ROOM_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ./#-]*$/;

function checkText(value, label, max) {
  const trimmed = value.trim();
  if (trimmed === '') return `${label} is required.`;
  if ([...trimmed].length > max) return `${label} must be ${max} characters or fewer.`;
  return undefined;
}

export function validateRoom(value) {
  const error = checkText(value, 'Room number', 20);
  if (error) return error;
  if (!ROOM_PATTERN.test(value.trim())) {
    return 'Room number may use letters, numbers, spaces and . / # - only.';
  }
  return undefined;
}

export function validateAsset(values) {
  const errors = {
    item_name: checkText(values.item_name, 'Item name', 100),
    category: checkText(values.category, 'Category', 50),
    room_number: validateRoom(values.room_number),
  };
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v));
}

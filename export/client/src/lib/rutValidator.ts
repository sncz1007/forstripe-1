/**
 * Validates a Chilean RUT (Rol Único Tributario)
 * 
 * @param rut The RUT to validate, can include formatting
 * @returns boolean indicating if the RUT is valid
 */
export function validateRut(rut: string): boolean {
  if (!rut) return false;
  
  // Remove format
  rut = rut.replace(/\./g, '').replace('-', '');
  
  if (rut.length < 2) return false;
  
  const dv = rut.slice(-1).toUpperCase();
  const rutBody = rut.slice(0, -1);
  
  if (!/^\d+$/.test(rutBody)) return false;
  
  // Calculate verification digit
  let sum = 0;
  let multiplier = 2;
  
  for (let i = rutBody.length - 1; i >= 0; i--) {
    sum += parseInt(rutBody.charAt(i)) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const expectedDV = 11 - (sum % 11);
  const calculatedDV = expectedDV === 11 ? '0' : expectedDV === 10 ? 'K' : expectedDV.toString();
  
  return calculatedDV === dv;
}

/**
 * Formats a RUT with dots and dash
 * 
 * @param value The RUT to format
 * @returns The formatted RUT (XX.XXX.XXX-X)
 */
export function formatRut(value: string): string {
  // Remove all non-digits and non-K
  value = value.replace(/[^0-9kK]/g, '');
  
  if (value.length <= 1) return value;
  
  // Format with dots and dash
  let formatted = '';
  let rut = value.slice(0, -1);
  let dv = value.slice(-1);
  
  // Add dots for thousands
  let i = rut.length;
  while (i > 0) {
    if (formatted !== '') formatted = '.' + formatted;
    formatted = rut.substring(Math.max(0, i - 3), i) + formatted;
    i -= 3;
  }
  
  // Add verification digit with dash
  if (formatted !== '') {
    return `${formatted}-${dv}`;
  }
  
  return value;
}

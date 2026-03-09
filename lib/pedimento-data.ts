// Pedimento number structure according to Anexo 22, Campo 1:
// XX  XX  XXXX  X XXXXXX
// ├─  ├─  ├───  ├ └───── Progressive number (6 digits)
// │   │   │     └─────── Last digit of year
// │   │   └───────────── Patent/Authorization number (4 digits)
// │   └───────────────── Customs office code (2 digits)
// └───────────────────── Year of validation (2 digits)

export interface PedimentoNumberParts {
  yearValidation: string; // 2 digits
  customsOffice: string; // 2 digits
  patentNumber: string; // 4 digits
  yearDigit: string; // 1 digit
  progressiveNumber: string; // 6 digits
}

// Parse a pedimento number into its component parts
export function parsePedimentoNumber(pedimentoNumber: string): PedimentoNumberParts | null {
  // Remove any extra spaces and normalize
  const normalized = pedimentoNumber.replace(/\s+/g, ' ').trim();
  
  // Pattern: XX  XX  XXXX  XXXXXXX (where the last 7 chars are yearDigit + progressive)
  // The format can be: "25 81 3645 5001495" or "25  81  3645  5001495"
  const parts = normalized.split(/\s+/);
  
  if (parts.length === 4) {
    const [yearValidation, customsOffice, patentNumber, lastPart] = parts;
    
    if (yearValidation.length === 2 && 
        customsOffice.length === 2 && 
        patentNumber.length === 4 && 
        lastPart.length === 7) {
      return {
        yearValidation,
        customsOffice,
        patentNumber,
        yearDigit: lastPart[0],
        progressiveNumber: lastPart.slice(1),
      };
    }
  }
  
  // Try compact format without spaces (15 digits total)
  const compact = normalized.replace(/\s/g, '');
  if (compact.length === 15 && /^\d+$/.test(compact)) {
    return {
      yearValidation: compact.slice(0, 2),
      customsOffice: compact.slice(2, 4),
      patentNumber: compact.slice(4, 8),
      yearDigit: compact.slice(8, 9),
      progressiveNumber: compact.slice(9, 15),
    };
  }
  
  return null;
}

// Format pedimento parts back to standard display format
export function formatPedimentoNumber(parts: PedimentoNumberParts): string {
  return `${parts.yearValidation}  ${parts.customsOffice}  ${parts.patentNumber}  ${parts.yearDigit}${parts.progressiveNumber}`;
}

// Customs offices from Anexo 22, Apéndice 1
export interface CustomsOffice {
  code: string;
  name: string;
  state: string;
}

export const customsOffices: CustomsOffice[] = [
  { code: "01", name: "Acapulco", state: "Guerrero" },
  { code: "02", name: "Agua Prieta", state: "Sonora" },
  { code: "05", name: "Subteniente López", state: "Quintana Roo" },
  { code: "06", name: "Ciudad del Carmen", state: "Campeche" },
  { code: "07", name: "Ciudad Juárez", state: "Chihuahua" },
  { code: "08", name: "Coatzacoalcos", state: "Veracruz" },
  { code: "11", name: "Ensenada", state: "Baja California" },
  { code: "12", name: "Guaymas", state: "Sonora" },
  { code: "14", name: "La Paz", state: "Baja California Sur" },
  { code: "16", name: "Manzanillo", state: "Colima" },
  { code: "17", name: "Matamoros", state: "Tamaulipas" },
  { code: "18", name: "Mazatlán", state: "Sinaloa" },
  { code: "19", name: "Mexicali", state: "Baja California" },
  { code: "20", name: "México", state: "Ciudad de México" },
  { code: "22", name: "Naco", state: "Sonora" },
  { code: "23", name: "Nogales", state: "Sonora" },
  { code: "24", name: "Nuevo Laredo", state: "Tamaulipas" },
  { code: "25", name: "Ojinaga", state: "Chihuahua" },
  { code: "26", name: "Puerto Palomas", state: "Chihuahua" },
  { code: "27", name: "Piedras Negras", state: "Coahuila" },
  { code: "28", name: "Progreso", state: "Yucatán" },
  { code: "30", name: "Ciudad Reynosa", state: "Tamaulipas" },
  { code: "31", name: "Salina Cruz", state: "Oaxaca" },
  { code: "33", name: "San Luis Río Colorado", state: "Sonora" },
  { code: "34", name: "Ciudad Miguel Alemán", state: "Tamaulipas" },
  { code: "37", name: "Ciudad Hidalgo", state: "Chiapas" },
  { code: "38", name: "Tampico", state: "Tamaulipas" },
  { code: "39", name: "Tecate", state: "Baja California" },
  { code: "40", name: "Tijuana", state: "Baja California" },
  { code: "42", name: "Tuxpan", state: "Veracruz" },
  { code: "43", name: "Veracruz", state: "Veracruz" },
  { code: "44", name: "Ciudad Acuña", state: "Coahuila" },
  { code: "46", name: "Torreón", state: "Coahuila" },
  { code: "47", name: "AICM", state: "Ciudad de México" },
  { code: "48", name: "Guadalajara", state: "Jalisco" },
  { code: "50", name: "Sonoyta", state: "Sonora" },
  { code: "51", name: "Lázaro Cárdenas", state: "Michoacán" },
  { code: "52", name: "Monterrey", state: "Nuevo León" },
  { code: "53", name: "Cancún", state: "Quintana Roo" },
  { code: "64", name: "Querétaro", state: "Querétaro" },
  { code: "65", name: "Toluca", state: "Estado de México" },
  { code: "67", name: "Chihuahua", state: "Chihuahua" },
  { code: "73", name: "Aguascalientes", state: "Aguascalientes" },
  { code: "75", name: "Puebla", state: "Puebla" },
  { code: "80", name: "Colombia", state: "Nuevo León" },
  { code: "81", name: "Altamira", state: "Tamaulipas" },
  { code: "82", name: "Ciudad Camargo", state: "Tamaulipas" },
  { code: "83", name: "Dos Bocas", state: "Tabasco" },
  { code: "84", name: "Guanajuato", state: "Guanajuato" },
  { code: "85", name: "AIFA", state: "Estado de México" },
];

// Get customs office by code
export function getCustomsOfficeByCode(code: string): CustomsOffice | undefined {
  return customsOffices.find(office => office.code === code);
}

// Generate year options for filtering (last 10 years)
export function getValidationYearOptions(): { value: string; label: string }[] {
  const currentYear = new Date().getFullYear();
  const years: { value: string; label: string }[] = [];
  
  for (let i = 0; i < 10; i++) {
    const year = currentYear - i;
    const twoDigitYear = year.toString().slice(-2);
    years.push({
      value: twoDigitYear,
      label: `20${twoDigitYear}`,
    });
  }
  
  return years;
}

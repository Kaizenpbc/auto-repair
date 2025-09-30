// VIN Decoder utilities for Canadian auto shops
// Supports NHTSA (free) + VinAudit (paid backup)

export interface DecodedVehicle {
  success: boolean;
  vin: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  engine?: string;
  transmission?: string;
  driveType?: string;
  fuelType?: string;
  bodyStyle?: string;
  cylinders?: number;
  displacement?: string;
  source: 'nhtsa' | 'vinaudit' | 'manual';
  error?: string;
}

// VIN validation utilities
export function validateVIN(vin: string): boolean {
  if (!vin || vin.length !== 17) return false;

  // Remove spaces and convert to uppercase
  const cleanVin = vin.replace(/\s/g, '').toUpperCase();

  // Check for invalid characters (I, O, Q not allowed)
  const validChars = /^[0-9A-HJ-NPR-Z]{17}$/;
  if (!validChars.test(cleanVin)) return false;

  // Validate check digit (9th character)
  return validateCheckDigit(cleanVin);
}

export function formatVIN(vin: string): string {
  const cleaned = vin.replace(/\s/g, '').toUpperCase();
  // Format as: ABC12 345678 9ABCDEF
  if (cleaned.length === 17) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5, 11)} ${cleaned.slice(11)}`;
  }
  return cleaned;
}

function validateCheckDigit(vin: string): boolean {
  // VIN check digit validation algorithm
  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  const values: { [key: string]: number } = {
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
    'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
    'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9
  };

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    if (i === 8) continue; // Skip check digit position
    sum += values[vin[i]] * weights[i];
  }

  const checkDigit = sum % 11;
  const expectedChar = checkDigit === 10 ? 'X' : checkDigit.toString();

  return vin[8] === expectedChar;
}

// Decode VIN using free NHTSA API
export async function decodeVINWithNHTSA(vin: string): Promise<DecodedVehicle> {
  try {
    const cleanVin = vin.replace(/\s/g, '').toUpperCase();

    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${cleanVin}?format=json`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`NHTSA API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.Results || data.Results.length === 0) {
      throw new Error('No results from NHTSA API');
    }

    return parseNHTSAResponse(cleanVin, data.Results);
  } catch (error) {
    return {
      success: false,
      vin,
      source: 'nhtsa',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function parseNHTSAResponse(vin: string, results: any[]): DecodedVehicle {
  const getValue = (variable: string): string | undefined => {
    const result = results.find(r => r.Variable === variable);
    return result?.Value && result.Value !== '' ? result.Value : undefined;
  };

  const year = getValue('Model Year');
  const make = getValue('Make');
  const model = getValue('Model');

  // Must have at least year, make, model to be considered successful
  if (!year || !make || !model) {
    return {
      success: false,
      vin,
      source: 'nhtsa',
      error: 'Incomplete vehicle data from NHTSA'
    };
  }

  return {
    success: true,
    vin,
    year: parseInt(year),
    make: make,
    model: model,
    trim: getValue('Trim'),
    engine: buildEngineDescription(getValue('Displacement (L)'), getValue('Engine Configuration')),
    transmission: getValue('Transmission Style'),
    driveType: getValue('Drive Type'),
    fuelType: getValue('Fuel Type - Primary'),
    bodyStyle: getValue('Body Class'),
    cylinders: getValue('Engine Number of Cylinders') ? parseInt(getValue('Engine Number of Cylinders')!) : undefined,
    displacement: getValue('Displacement (L)') ? `${getValue('Displacement (L)')}L` : undefined,
    source: 'nhtsa'
  };
}

function buildEngineDescription(displacement?: string, config?: string): string {
  const parts = [];
  if (displacement) parts.push(`${displacement}L`);
  if (config) parts.push(config);
  return parts.join(' ') || 'Unknown Engine';
}

// Placeholder for VinAudit backup (would need API key)
export async function decodeVINWithVinAudit(vin: string): Promise<DecodedVehicle> {
  // This would be implemented with actual VinAudit API
  // For now, return failure to fall back to manual entry
  return {
    success: false,
    vin,
    source: 'vinaudit',
    error: 'VinAudit API not configured'
  };
}

// Main VIN decoder with fallback strategy
export async function decodeVIN(vin: string): Promise<DecodedVehicle> {
  // Validate VIN first
  if (!validateVIN(vin)) {
    return {
      success: false,
      vin,
      source: 'manual',
      error: 'Invalid VIN format'
    };
  }

  // Try NHTSA first (free, works for most Canadian vehicles)
  console.log('Decoding VIN with NHTSA API...');
  const nhtsaResult = await decodeVINWithNHTSA(vin);

  if (nhtsaResult.success) {
    return nhtsaResult;
  }

  // Could fallback to VinAudit here if API key is configured
  console.log('NHTSA failed, would try backup API...');

  return nhtsaResult; // Return NHTSA error for now
}

// Canadian-specific utilities
export function convertToMetric(vehicle: DecodedVehicle): DecodedVehicle {
  // Convert any imperial measurements to metric for Canadian shops
  // Most data from APIs is already in appropriate units
  return {
    ...vehicle,
    // Could add conversions here if needed
  };
}

export function getCanadianRecallInfo(vin: string): Promise<any> {
  // Placeholder for Transport Canada recall lookup
  // Would integrate with Transport Canada's recall database
  return Promise.resolve({ recalls: [], message: 'Recall lookup not implemented' });
}
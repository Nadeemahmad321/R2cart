import { Product } from '../types';

export interface ProductNutrition {
  servingSize?: string;
  energy?: string;
  protein?: string;
  carbs?: string;
  totalSugars?: string;
  addedSugars?: string;
  fat?: string;
}

export interface ParsedProductDetails {
  summary: string;
  brand?: string;
  productType?: string;
  dietaryPreference?: string;
  flavour?: string;
  itemForm?: string;
  weight?: string;
  packagingType?: string;
  shelfLife?: string;
  countryOfOrigin?: string;
  storage?: string;
  ingredients?: string;
  allergens?: string;
  keyFeatures: string[];
  nutrition?: ProductNutrition;
}

export interface DietaryInfo {
  label: string;
  tone: 'veg' | 'non_veg' | 'vegan' | 'eggless' | 'organic';
  dotColor: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

/**
 * Parses product description, whether stored as structured JSON,
 * line-by-line key:value pairs, or free text.
 */
export function parseProductDetails(
  rawDesc?: string,
  product?: Product | null
): ParsedProductDetails {
  const empty: ParsedProductDetails = {
    summary: '',
    brand: '',
    productType: '',
    dietaryPreference: product?.dietaryPreference || '',
    flavour: '',
    itemForm: '',
    weight: product?.unit || '',
    packagingType: '',
    shelfLife: '',
    countryOfOrigin: 'India',
    storage: '',
    ingredients: '',
    allergens: '',
    keyFeatures: [],
    nutrition: {},
  };

  const text = rawDesc ? String(rawDesc).trim() : '';
  if (!text) {
    if (product?.dietaryPreference) {
      empty.dietaryPreference = product.dietaryPreference;
    }
    return empty;
  }

  // 1. Try parsing JSON format
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsed = JSON.parse(text);
      return {
        ...empty,
        ...parsed,
        summary: String(parsed.summary || parsed.description || '').trim(),
        dietaryPreference:
          parsed.dietaryPreference || product?.dietaryPreference || empty.dietaryPreference,
        nutrition: {
          ...empty.nutrition,
          ...(parsed.nutrition || {}),
        },
        keyFeatures: Array.isArray(parsed.keyFeatures)
          ? parsed.keyFeatures.filter(Boolean)
          : parsed.keyFeatures
          ? String(parsed.keyFeatures).split('\n').filter(Boolean)
          : [],
      };
    } catch {}
  }

  // 2. Try parsing plain text with Key: Value lines
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const genericLines: string[] = [];
  const result: ParsedProductDetails = { ...empty };

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('brand:')) {
      result.brand = line.substring(6).trim();
    } else if (lower.startsWith('product type:') || lower.startsWith('type:')) {
      result.productType = line.split(':')[1]?.trim() || '';
    } else if (
      lower.startsWith('dietary preference:') ||
      lower.startsWith('speciality:') ||
      lower.startsWith('dietary:')
    ) {
      result.dietaryPreference = line.split(':')[1]?.trim() || '';
    } else if (lower.startsWith('flavour:') || lower.startsWith('flavor:')) {
      result.flavour = line.substring(8).trim();
    } else if (lower.startsWith('item form:') || lower.startsWith('form:')) {
      result.itemForm = line.split(':')[1]?.trim() || '';
    } else if (lower.startsWith('weight:') || lower.startsWith('net weight:')) {
      result.weight = line.split(':')[1]?.trim() || '';
    } else if (lower.startsWith('packaging type:') || lower.startsWith('packaging:')) {
      result.packagingType = line.split(':')[1]?.trim() || '';
    } else if (lower.startsWith('shelf life:') || lower.startsWith('best before:')) {
      result.shelfLife = line.split(':')[1]?.trim() || '';
    } else if (lower.startsWith('country of origin:') || lower.startsWith('origin:')) {
      result.countryOfOrigin = line.split(':')[1]?.trim() || '';
    } else if (lower.startsWith('storage instruction:') || lower.startsWith('storage:')) {
      result.storage = line.split(':')[1]?.trim() || '';
    } else if (lower.startsWith('ingredients:')) {
      result.ingredients = line.substring(12).trim();
    } else if (lower.startsWith('allergen information:') || lower.startsWith('allergens:')) {
      result.allergens = line.split(':')[1]?.trim() || '';
    } else if (lower.startsWith('key features:') || lower.startsWith('highlights:')) {
      const featText = line.split(':')[1]?.trim() || '';
      if (featText) {
        result.keyFeatures.push(
          ...featText.split(',').map((s) => s.trim()).filter(Boolean)
        );
      }
    } else if (line.startsWith('-') || line.startsWith('*') || line.startsWith('•')) {
      result.keyFeatures.push(line.replace(/^[-*•]\s*/, '').trim());
    } else {
      genericLines.push(line);
    }
  }

  result.summary = genericLines.join('\n');
  if (!result.dietaryPreference && product?.dietaryPreference) {
    result.dietaryPreference = product.dietaryPreference;
  }
  return result;
}

/**
 * Resolves dietary preference to a structured badge config with colors.
 * Returns null for non-food, utility, or empty items.
 */
export function getDietaryInfo(
  product?: Product | null,
  details?: ParsedProductDetails
): DietaryInfo | null {
  let val = product?.dietaryPreference || details?.dietaryPreference || '';

  if (!val && product?.description) {
    const str = String(product.description).trim();
    if (str.startsWith('{') && str.endsWith('}')) {
      try {
        const parsed = JSON.parse(str);
        val = parsed.dietaryPreference || '';
      } catch {}
    }
    if (!val) {
      const match = str.match(/(?:dietary preference|speciality|dietary)\s*:\s*([^\n\r]+)/i);
      if (match) val = match[1].trim();
    }
  }

  if (!val) return null;

  const lower = val.toLowerCase().trim();
  if (
    lower.includes('not applicable') ||
    lower.includes('non-food') ||
    lower.includes('utility') ||
    lower === 'none' ||
    lower === 'n/a'
  ) {
    return null;
  }

  if (lower.includes('non')) {
    return {
      label: 'Non-Veg',
      tone: 'non_veg',
      dotColor: '#EF4444',
      bgColor: '#FEF2F2',
      borderColor: '#FECACA',
      textColor: '#991B1B',
    };
  }
  if (lower.includes('vegan')) {
    return {
      label: 'Vegan',
      tone: 'vegan',
      dotColor: '#059669',
      bgColor: '#ECFDF5',
      borderColor: '#A7F3D0',
      textColor: '#065F46',
    };
  }
  if (lower.includes('egg')) {
    return {
      label: 'Eggless',
      tone: 'eggless',
      dotColor: '#D97706',
      bgColor: '#FFFBEB',
      borderColor: '#FDE68A',
      textColor: '#92400E',
    };
  }
  if (lower.includes('organic')) {
    return {
      label: 'Organic',
      tone: 'organic',
      dotColor: '#16A34A',
      bgColor: '#F0FDF4',
      borderColor: '#BBF7D0',
      textColor: '#166534',
    };
  }
  if (lower.includes('veg')) {
    return {
      label: 'Veg',
      tone: 'veg',
      dotColor: '#10B981',
      bgColor: '#ECFDF5',
      borderColor: '#A7F3D0',
      textColor: '#065F46',
    };
  }

  return {
    label: val,
    tone: 'veg',
    dotColor: '#10B981',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    textColor: '#065F46',
  };
}


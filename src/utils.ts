export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch (error) {
    return 'Data inválida';
  }
}

// Deeply cleans any undefined values from objects/arrays before writing to Firestore
export function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as any;
  }
  if (typeof obj === 'object') {
    const clean = { ...obj } as any;
    Object.keys(clean).forEach((key) => {
      if (clean[key] === undefined) {
        delete clean[key];
      } else if (clean[key] !== null && typeof clean[key] === 'object') {
        clean[key] = cleanUndefined(clean[key]);
      }
    });
    return clean;
  }
  return obj;
}


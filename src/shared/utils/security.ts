import DOMPurify from 'dompurify';

export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};

export const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span', 'p'],
    ALLOWED_ATTR: []
  });
};

export const validateNumericInput = (value: string, min: number = 0, max: number = Infinity): number => {
  const num = parseFloat(value);
  if (isNaN(num) || num < min || num > max) {
    throw new Error(`Invalid numeric input: ${value}`);
  }
  return num;
};
/**
 * Image generation utilities for notifications
 */

const IMAGE_API_BASE = 'https://api.a0.dev/assets/image';

export interface GeneratedImageOptions {
  text: string;
  aspect?: string;
  seed?: number;
}

/**
 * Generate an image URL for notifications
 */
export function generateNotificationImageUrl(options: GeneratedImageOptions): string {
  const params = new URLSearchParams({
    text: options.text,
    aspect: options.aspect || '1:1',
    ...(options.seed && { seed: options.seed.toString() })
  });

  return `${IMAGE_API_BASE}?${params.toString()}`;
}

/**
 * Generate appropriate image description based on notification type and content
 */
export function generateImageDescription(
  title: string,
  message: string,
  type: string
): string {
  // Create a descriptive prompt for the image generation API
  const baseDescription = `${title}: ${message.substring(0, 100)}`;

  // Add visual style based on notification type
  switch (type) {
    case 'announcement':
      return `Professional announcement banner: ${baseDescription}, clean design, corporate style, blue and white colors`;

    case 'feature':
      return `Modern feature highlight: ${baseDescription}, tech innovation, colorful, app interface, futuristic design`;

    case 'maintenance':
      return `System maintenance notification: ${baseDescription}, gears and tools, maintenance mode, yellow and orange colors`;

    case 'security':
      return `Security alert: ${baseDescription}, shield and lock, cybersecurity, blue and green colors`;

    case 'success':
      return `Success celebration: ${baseDescription}, checkmark, confetti, green and gold colors`;

    case 'warning':
      return `Important warning: ${baseDescription}, caution triangle, yellow and black colors`;

    case 'error':
      return `Error notification: ${baseDescription}, red alert, warning symbols, red and white colors`;

    case 'info':
    default:
      return `Information notification: ${baseDescription}, info icon, light blue background, informative design`;
  }
}

/**
 * Generate a notification image URL with smart defaults
 */
export function createNotificationImage(
  title: string,
  message: string,
  type: string = 'info',
  customSeed?: number
): string {
  const description = generateImageDescription(title, message, type);
  const seed = customSeed || Math.floor(Math.random() * 1000);

  return generateNotificationImageUrl({
    text: description,
    aspect: '1:1',
    seed
  });
}

/**
 * Generate multiple image options for selection
 */
export function generateImageOptions(
  title: string,
  message: string,
  type: string = 'info',
  count: number = 3
): string[] {
  const images: string[] = [];

  for (let i = 0; i < count; i++) {
    images.push(createNotificationImage(title, message, type, i + 1));
  }

  return images;
}

/**
 * Validate if a URL is a generated notification image
 */
export function isGeneratedImage(url: string): boolean {
  return url.startsWith(IMAGE_API_BASE);
}

/**
 * Extract parameters from a generated image URL
 */
export function parseGeneratedImageUrl(url: string): GeneratedImageOptions | null {
  if (!isGeneratedImage(url)) return null;

  try {
    const urlObj = new URL(url);
    const text = urlObj.searchParams.get('text');
    const aspect = urlObj.searchParams.get('aspect');
    const seed = urlObj.searchParams.get('seed');

    if (!text) return null;

    return {
      text,
      aspect: aspect || '1:1',
      seed: seed ? parseInt(seed) : undefined
    };
  } catch {
    return null;
  }
}
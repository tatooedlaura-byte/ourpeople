/**
 * Sharing Utilities
 *
 * Compress and encode family data for URL-based sharing.
 * Uses lz-string for compression to keep URLs manageable.
 */

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { Person, Relationship } from '../types';

export interface ShareableData {
  people: Person[];
  relationships: Relationship[];
  version: number;
}

const SHARE_VERSION = 1;

/**
 * Create a shareable URL containing the family data
 */
export function createShareLink(data: { people: Person[]; relationships: Relationship[] }): string {
  const shareData: ShareableData = {
    ...data,
    version: SHARE_VERSION,
  };

  const compressed = compressToEncodedURIComponent(JSON.stringify(shareData));
  const baseUrl = window.location.origin + window.location.pathname;

  return `${baseUrl}?share=${compressed}`;
}

/**
 * Check if the current URL contains shared data
 */
export function getSharedDataFromUrl(): ShareableData | null {
  const params = new URLSearchParams(window.location.search);
  const shareParam = params.get('share');

  if (!shareParam) return null;

  try {
    const decompressed = decompressFromEncodedURIComponent(shareParam);
    if (!decompressed) return null;

    const data = JSON.parse(decompressed) as ShareableData;

    // Validate structure
    if (!Array.isArray(data.people) || !Array.isArray(data.relationships)) {
      return null;
    }

    return data;
  } catch {
    console.error('Failed to parse shared data from URL');
    return null;
  }
}

/**
 * Clear the share parameter from URL without reloading
 */
export function clearShareFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('share');
  window.history.replaceState({}, '', url.pathname);
}

/**
 * Copy text to clipboard with fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

/**
 * A muted blurhash shown while remote photos load.
 *
 * Every material photo in the app is hotlinked from Unsplash rather than
 * bundled, so on a slow connection the listing cards would otherwise sit
 * blank until the download finished. expo-image fades up from this instead.
 */
export const MATERIAL_PLACEHOLDER = 'L6Pj0^i_.AyE_3t7t7R**0o#DgR4';

/** Cross-fade duration (ms) for remote images settling in over the placeholder. */
export const IMAGE_TRANSITION_MS = 220;

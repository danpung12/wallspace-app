import { supabase } from '../supabase';
import { getCurrentUserCached } from '../authCache';
import {
  clearCachedRequestPrefix,
  getCachedRequest,
} from '../requestCache';

const LOCATIONS_TTL_MS = 5 * 60_000;
const LOCATION_DETAILS_TTL_MS = 5 * 60_000;
const FAVORITES_TTL_MS = 60_000;

export type AppLocation = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  images: string[];
  tags: string[];
  category: string;
};

export async function getLocations(options?: { force?: boolean }): Promise<AppLocation[]> {
  return getCachedRequest('locations:all', LOCATIONS_TTL_MS, async () => {
    const [locResult, imgResult, tagResult, catResult] = await Promise.all([
      supabase
        .from('locations')
        .select('id, name, address, lat, lng, category_id')
        .order('created_at', { ascending: false }),
      supabase
        .from('location_images')
        .select('location_id, image_url, sort_order')
        .order('sort_order'),
      supabase
        .from('location_tags')
        .select('location_id, tag:tags(name)'),
      supabase
        .from('categories')
        .select('id, name'),
    ]);

    const locations = locResult.data ?? [];
    const images = imgResult.data ?? [];
    const tags = tagResult.data ?? [];
    const categories = catResult.data ?? [];

    return locations.map((loc) => {
      const cat = categories.find((c: any) => c.id === loc.category_id);
      const locImages = images
        .filter((i: any) => i.location_id === loc.id)
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((i: any) => i.image_url)
        .filter(Boolean) as string[];
      const locTags = tags
        .filter((t: any) => t.location_id === loc.id)
        .map((t: any) => (t.tag as any)?.name)
        .filter(Boolean) as string[];

      return {
        id: loc.id,
        name: loc.name,
        address: loc.address ?? '',
        lat: loc.lat ?? 0,
        lng: loc.lng ?? 0,
        images: locImages,
        tags: locTags,
        category: (cat as any)?.name ?? '',
      };
    });
  }, options);
}

async function fetchLocationsByIds(ids: string[]): Promise<AppLocation[]> {
  if (ids.length === 0) return [];
  const sortedIds = [...ids].sort();

  return getCachedRequest(`locations:ids:${sortedIds.join(',')}`, LOCATION_DETAILS_TTL_MS, async () => {
    const [locResult, imgResult, tagResult, catResult] = await Promise.all([
      supabase
        .from('locations')
        .select('id, name, address, lat, lng, category_id')
        .in('id', sortedIds),
      supabase
        .from('location_images')
        .select('location_id, image_url, sort_order')
        .in('location_id', sortedIds)
        .order('sort_order'),
      supabase
        .from('location_tags')
        .select('location_id, tag:tags(name)')
        .in('location_id', sortedIds),
      supabase
        .from('categories')
        .select('id, name'),
    ]);

    const locations = locResult.data ?? [];
    const images = imgResult.data ?? [];
    const tags = tagResult.data ?? [];
    const categories = catResult.data ?? [];

    return locations.map((loc) => {
      const cat = categories.find((c: any) => c.id === loc.category_id);
      const locImages = images
        .filter((i: any) => i.location_id === loc.id)
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((i: any) => i.image_url)
        .filter(Boolean) as string[];
      const locTags = tags
        .filter((t: any) => t.location_id === loc.id)
        .map((t: any) => (t.tag as any)?.name)
        .filter(Boolean) as string[];

      return {
        id: loc.id,
        name: loc.name,
        address: loc.address ?? '',
        lat: loc.lat ?? 0,
        lng: loc.lng ?? 0,
        images: locImages,
        tags: locTags,
        category: (cat as any)?.name ?? '',
      };
    });
  });
}

export async function getFavoriteLocationIds(userId: string, options?: { force?: boolean }): Promise<string[]> {
  if (!userId) return [];
  return getCachedRequest(`favorites:ids:${userId}`, FAVORITES_TTL_MS, async () => {
    const { data } = await supabase
      .from('favorites')
      .select('location_id')
      .eq('user_id', userId);
    return (data ?? []).map((f: any) => f.location_id);
  }, options);
}

export async function getUserFavoriteLocations(userId: string, options?: { force?: boolean }): Promise<AppLocation[]> {
  if (!userId) return [];
  return getCachedRequest(`favorites:locations:${userId}`, FAVORITES_TTL_MS, async () => {
    const ids = await getFavoriteLocationIds(userId, options);
    return fetchLocationsByIds(ids);
  }, options);
}

function clearFavoriteCaches(userId?: string): void {
  if (userId) {
    clearCachedRequestPrefix(`favorites:ids:${userId}`);
    clearCachedRequestPrefix(`favorites:locations:${userId}`);
    return;
  }
  clearCachedRequestPrefix('favorites:');
}

export async function addFavorite(locationId: string): Promise<void> {
  const user = await getCurrentUserCached();
  if (!user) return;
  await supabase
    .from('favorites')
    .insert({ user_id: user.id, location_id: locationId });
  clearFavoriteCaches(user.id);
}

export async function removeFavorite(locationId: string): Promise<void> {
  const user = await getCurrentUserCached();
  if (!user) return;
  await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('location_id', locationId);
  clearFavoriteCaches(user.id);
}

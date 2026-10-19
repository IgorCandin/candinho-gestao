import "server-only";
import type { StorefrontTestimonial } from "@/components/storefront-testimonials";

type GoogleReview = {
  reviewId?: string;
  reviewer?: { displayName?: string; profilePhotoUrl?: string; isAnonymous?: boolean };
  starRating?: string;
  comment?: string;
  updateTime?: string;
};
type ReviewResponse = { reviews?: GoogleReview[]; averageRating?: number; totalReviewCount?: number };
export type GoogleReviewsResult = {
  status: "not_configured" | "unavailable" | "connected";
  items: StorefrontTestimonial[];
  mapsUrl?: string;
  rating?: number;
  count?: number;
};

export function googleMapsUrl(value: string | undefined) {
  try {
    const url = new URL(value ?? "");
    if (url.protocol !== "https:" || url.username || url.password) return undefined;
    if ((url.hostname === "www.google.com" || url.hostname === "google.com") && url.pathname.startsWith("/maps")) return url.href;
    if (url.hostname === "maps.app.goo.gl" || (url.hostname === "g.page" && url.pathname.length > 1)) return url.href;
  } catch { /* An incomplete configuration must not create a public link. */ }
  return undefined;
}

const stars: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
export function googleReviewItems(data: ReviewResponse, mapsUrl: string): StorefrontTestimonial[] {
  const seen = new Set<string>();
  return (Array.isArray(data.reviews) ? data.reviews : []).flatMap(review => {
    if (!review || typeof review.reviewId !== "string" || !review.reviewId || seen.has(review.reviewId) || typeof review.comment !== "string" || !review.comment.trim() || !Object.hasOwn(stars, review.starRating ?? "")) return [];
    seen.add(review.reviewId);
    return [{
      id: `google:${review.reviewId}`,
      customer_name: review.reviewer?.isAnonymous || typeof review.reviewer?.displayName !== "string" ? "Usuário do Google" : review.reviewer.displayName || "Usuário do Google",
      comment: review.comment,
      profession: "Avaliação no Google",
      // Keep public authorship; no permanent copy of Google content is written to our database.
      photo_url: typeof review.reviewer?.profilePhotoUrl === "string" && review.reviewer.profilePhotoUrl.startsWith("https://") ? review.reviewer.profilePhotoUrl : null,
      google: { rating: stars[review.starRating ?? ""], mapsUrl, updatedAt: review.updateTime ?? null },
    }];
  }).slice(0, 6);
}

export async function getGoogleBusinessReviews(): Promise<GoogleReviewsResult> {
  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_BUSINESS_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_BUSINESS_REFRESH_TOKEN;
  const location = process.env.GOOGLE_BUSINESS_LOCATION;
  const mapsUrl = googleMapsUrl(process.env.GOOGLE_BUSINESS_MAPS_URL ?? "https://maps.app.goo.gl/jBwJKoXhCydht8Vd8");
  if (!clientId || !clientSecret || !refreshToken || !location || !/^accounts\/\d+\/locations\/\d+$/.test(location) || !mapsUrl) return { status: "not_configured", items: [] };
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(5000),
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    });
    if (!tokenResponse.ok) return { status: "unavailable", items: [], mapsUrl };
    const token: { access_token?: string } = await tokenResponse.json();
    if (!token.access_token) return { status: "unavailable", items: [], mapsUrl };
    const response = await fetch(`https://mybusiness.googleapis.com/v4/${location}/reviews?pageSize=50&orderBy=updateTime%20desc`, {
      headers: { Authorization: `Bearer ${token.access_token}` }, cache: "no-store", signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { status: "unavailable", items: [], mapsUrl };
    const data: ReviewResponse = await response.json();
    if (!data || typeof data !== "object" || !Number.isSafeInteger(data.totalReviewCount) || data.totalReviewCount! < 0 || (data.reviews !== undefined && !Array.isArray(data.reviews))) return { status: "unavailable", items: [], mapsUrl };
    return {
      status: "connected", mapsUrl, items: googleReviewItems(data, mapsUrl),
      rating: typeof data.averageRating === "number" && data.averageRating >= 1 && data.averageRating <= 5 ? data.averageRating : undefined,
      count: Number.isSafeInteger(data.totalReviewCount) && data.totalReviewCount! >= 0 ? data.totalReviewCount : undefined,
    };
  } catch {
    // Do not log OAuth responses, credentials or public reviewers' personal information.
    return { status: "unavailable", items: [], mapsUrl };
  }
}

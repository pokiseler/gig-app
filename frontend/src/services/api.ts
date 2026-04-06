export type UserRole = "provider" | "consumer" | "admin";
export type PostType = "WANTED";
export type PostStatus = "open" | "in_progress" | "completed";

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  verified?: boolean;
  balance?: number;
  escrowBalance?: number;
  avatarUrl?: string;
  bio?: string;
  skills?: string[];
  averageRating?: number;
  totalReviews?: number;
  location?: {
    city?: string;
    address?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface GigItem {
  _id: string;
  title: string;
  description: string;
  postType: PostType;
  type?: "wanted";
  status: PostStatus;
  category: string;
  tags?: string[];
  price: number;
  location?: {
    city?: string;
    address?: string;
  };
  author?: AuthUser;
  postedBy?: AuthUser;
  client?: AuthUser;
  freelancer?: AuthUser;
  freelancerConfirmed?: boolean;
  clientConfirmed?: boolean;
  escrowAmount?: number;
  taskTransaction?: string;
  tipAmount?: number;
  tipMethod?: "cash" | "bit";
  createdAt?: string;
}

export interface TransactionItem {
  _id: string;
  senderId: string;
  receiverId: string;
  gigId: string;
  amount: number;
  type: "DEPOSIT" | "PAYMENT" | "ESCROW_RELEASE" | "REFUND";
  status: "PENDING" | "COMPLETED" | "FAILED";
  platformFee?: number;
  netAmount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GigRequestItem {
  gigId: string;
  gigTitle: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  requestedAt: string;
}

export interface ReviewItem {
  _id: string;
  reviewer: AuthUser;
  targetUser: AuthUser;
  gigId: {
    _id: string;
    title: string;
    postType: PostType;
    status: PostStatus;
  };
  rating: number;
  comment: string;
  createdAt: string;
}

// NEXT_PUBLIC_API_URL must be set in production (Vercel env vars).
// In local development it falls back to localhost so .env.local is optional.
const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

const buildHeaders = (token?: string, includeJsonContentType = true) => {
  const headers: Record<string, string> = {};

  if (includeJsonContentType) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error("שגיאת רשת: לא ניתן להגיע לשרת ה-API.");
  }

  const text = await response.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (!response.ok) {
        throw new Error("הבקשה נכשלה");
      }
      throw new Error("התקבלה תגובת JSON לא תקינה משרת ה-API.");
    }
  }

  const responseData = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};

  if (!response.ok) {
    throw new Error(typeof responseData.message === "string" ? responseData.message : "הבקשה נכשלה");
  }

  return responseData as T;
}

export async function register(payload: {
  name: string;
  email: string;
  password: string;
}) {
  return request<{ message: string; token: string; user: AuthUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(payload: { email: string; password: string }) {
  return request<{ message: string; token: string; user: AuthUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMe(token: string) {
  return request<{ user: AuthUser }>("/auth/me", {
    method: "GET",
    headers: buildHeaders(token),
  });
}

export interface GigFilters {
  search?: string;
  postType?: PostType;
  status?: PostStatus;
  category?: string;
  city?: string;
  sortBy?: "createdAt" | "title" | "category" | "tipAmount";
  order?: "asc" | "desc";
  limit?: number;
}

export async function getGigs(filters: GigFilters = {}, token?: string) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  params.set("postType", "WANTED");
  if (filters.status) params.set("status", filters.status);
  if (filters.category) params.set("category", filters.category);
  if (filters.city) params.set("city", filters.city);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.order) params.set("order", filters.order);
  if (filters.limit) params.set("limit", String(filters.limit));

  const qs = params.toString();
  return request<{ total: number; gigs: GigItem[] }>(`/gigs${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: buildHeaders(token),
  });
}

export async function createGig(
  token: string,
  payload: {
    title: string;
    description: string;
    postType: PostType;
    category: string;
    location: { city: string; address: string };
    tags?: string[];
    status?: PostStatus;
    tipAmount?: number;
    tipMethod?: "cash" | "bit";
  },
) {
  return request<{ message: string; gig: GigItem }>("/gigs", {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function hireGig(token: string, gigId: string) {
  return request<{ message: string; gig: GigItem; transaction: TransactionItem }>(`/gigs/${gigId}/hire`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify({}),
  });
}

export async function requestGig(token: string, gigId: string) {
  return request<{ message: string; gig: GigItem }>(`/gigs/${gigId}/request`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify({}),
  });
}

export async function getMyGigRequests(token: string) {
  return request<{ total: number; requests: GigRequestItem[] }>("/gigs/my/requests", {
    method: "GET",
    headers: buildHeaders(token),
  });
}

export async function acceptGigRequest(token: string, gigId: string, applicantId: string) {
  return request<{ message: string; gig: GigItem }>(`/gigs/${gigId}/applications/${applicantId}/accept`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify({}),
  });
}

export async function denyGigRequest(token: string, gigId: string, applicantId: string) {
  return request<{ message: string }>(`/gigs/${gigId}/applications/${applicantId}/deny`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify({}),
  });
}

export async function updateGig(
  token: string,
  gigId: string,
  payload: Partial<{
    title: string;
    description: string;
    category: string;
    location: { city?: string; address?: string };
    tags: string[];
  }>,
) {
  return request<{ message: string; gig: GigItem }>(`/gigs/${gigId}`, {
    method: "PATCH",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function deleteGig(token: string, gigId: string) {
  return request<{ message: string; deletedGigId: string }>(`/gigs/${gigId}`, {
    method: "DELETE",
    headers: buildHeaders(token),
  });
}

export async function markGigAsFinished(token: string, gigId: string) {
  return request<{ message: string; gig: GigItem }>(`/gigs/${gigId}/finish`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify({}),
  });
}

export async function confirmGigReceipt(token: string, gigId: string) {
  return request<{ message: string; gig: GigItem }>(`/gigs/${gigId}/confirm`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify({}),
  });
}

export async function getMyTasks(token: string) {
  return request<{ total: number; gigs: GigItem[] }>("/gigs/my/tasks", {
    method: "GET",
    headers: buildHeaders(token),
  });
}

export async function createReview(
  token: string,
  payload: { targetUser: string; gigId?: string; gigName?: string; rating: number; comment?: string },
) {
  return request<{ message: string; review: ReviewItem }>("/reviews", {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function getUserProfile(userId: string) {
  return request<{ user: AuthUser; offers: GigItem[]; requests: GigItem[]; reviews: ReviewItem[] }>(
    `/users/${userId}/profile`,
    { method: "GET" },
  );
}

export async function updateMyProfile(
  token: string,
  payload: FormData,
) {
  return request<{ message: string; user: AuthUser }>("/users/me/profile", {
    method: "PUT",
    headers: buildHeaders(token, false),
    body: payload,
  });
}

export async function getMyTransactions(token: string) {
  return request<{ total: number; transactions: TransactionItem[] }>("/users/me/transactions", {
    method: "GET",
    headers: buildHeaders(token),
  });
}

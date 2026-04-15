// Single source of truth for all Zod validation schemas.
// Used by both the Express backend (require) and the Next.js frontend (webpack alias @shared).
// Each side provides its own zod installation; we resolve whichever is available.
const { z } = (() => {
  try { return require('zod'); } catch { /* not in local node_modules */ }
  try { return require(require.resolve('zod', { paths: [__dirname + '/../backend'] })); } catch { /* */ }
  try { return require(require.resolve('zod', { paths: [__dirname + '/../frontend'] })); } catch { /* */ }
  throw new Error('shared/schemas.js: zod not found. Install zod in backend or frontend.');
})();

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const postTypeEnum = z.enum(['WANTED']);
const statusEnum = z.enum(['open', 'in_progress', 'completed']);

const locationSchema = z.object({
  city: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(300),
});

const optionalLocationSchema = z
  .object({
    city: z.string().trim().max(100).optional(),
    address: z.string().trim().max(300).optional(),
  })
  .optional();

const geoLocationSchema = z
  .object({
    type: z.literal('Point'),
    coordinates: z.tuple([
      z.number().min(-180).max(180),
      z.number().min(-90).max(90),
    ]),
  })
  .optional();

const createGigSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(140),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(5000),
  postType: postTypeEnum,
  category: z.string().trim().min(2, 'Category is required').max(80),
  location: locationSchema,
  geoLocation: geoLocationSchema,
  status: statusEnum.optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional().default([]),
  images: z.array(z.string().url()).max(10).optional().default([]),
  tipAmount: z.coerce.number().min(0).max(10000).optional().default(0),
  tipMethod: z.enum(['cash', 'bit']).optional().default('cash'),
});

const updateGigSchema = z
  .object({
    title: z.string().trim().min(3).max(140).optional(),
    description: z.string().trim().min(10).max(5000).optional(),
    postType: postTypeEnum.optional(),
    category: z.string().trim().min(2).max(80).optional(),
    status: statusEnum.optional(),
    location: optionalLocationSchema,
    geoLocation: geoLocationSchema,
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    images: z.array(z.string().url()).max(10).optional(),
    tipAmount: z.coerce.number().min(0).max(10000).optional(),
    tipMethod: z.enum(['cash', 'bit']).optional(),
  })
  .refine((payload) => {
    return Object.entries(payload).some(([key, value]) => {
      if (key === 'location') {
        if (!value || typeof value !== 'object') {
          return false;
        }
        const location = value;
        return Boolean(
          (typeof location.city === 'string' && location.city.trim().length > 0)
          || (typeof location.address === 'string' && location.address.trim().length > 0),
        );
      }
      return value !== undefined;
    });
  }, {
    message: 'At least one non-empty field must be provided for update.',
  });

const filterGigsSchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  postType: postTypeEnum.optional(),
  category: z.string().trim().min(1).max(80).optional(),
  city: z.string().trim().min(1).max(100).optional(),
  status: statusEnum.optional(),
  sortBy: z.enum(['createdAt', 'title', 'category', 'tipAmount']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const createReviewSchema = z.object({
  targetUser: z.string().regex(objectIdRegex, 'targetUser must be a valid ObjectId.'),
  gigId: z.string().regex(objectIdRegex, 'gigId must be a valid ObjectId.').optional(),
  gigName: z.string().trim().max(200).optional().default(''),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(2).max(1000).optional().default(''),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['provider', 'consumer']).optional(),
});

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().max(40).optional(),
    avatarUrl: z.string().trim().url().optional().or(z.literal('')),
    bio: z.string().trim().max(600).optional(),
    skills: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    categories: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    location: z
      .object({
        city: z.string().trim().max(100).optional(),
        address: z.string().trim().max(300).optional(),
      })
      .optional(),
  })
  .refine((payload) => {
    return Object.entries(payload).some(([key, value]) => {
      if (key === 'location') {
        if (!value || typeof value !== 'object') {
          return false;
        }
        const location = value;
        return Boolean(
          (typeof location.city === 'string' && location.city.trim().length > 0)
          || (typeof location.address === 'string' && location.address.trim().length > 0),
        );
      }
      return value !== undefined;
    });
  }, {
    message: 'At least one non-empty profile field is required.',
  });

module.exports = {
  objectIdRegex,
  postTypeEnum,
  statusEnum,
  createGigSchema,
  updateGigSchema,
  filterGigsSchema,
  createReviewSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
};

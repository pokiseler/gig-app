const mongoose = require('mongoose');
const Gig = require('../models/Gig');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const sseManager = require('../events/sseManager');
const pointsService = require('../services/pointsService').default;
const { mapGigForResponse } = require('../utils/gigMapper');
const {
  createGigSchema,
  updateGigSchema,
  filterGigsSchema,
  objectIdRegex,
} = require('../validation/schemas');

const buildSortOptions = (sortBy = 'createdAt', order = 'desc') => ({
  [sortBy]: order === 'asc' ? 1 : -1,
});

const parseOrFail = (schema, payload, res) => {
  const result = schema.safeParse(payload);

  if (!result.success) {
    res.status(400).json({ message: result.error.issues[0].message });
    return null;
  }

  return result.data;
};

const getActorUser = (req) => {
  if (!req.user) {
    return { error: 'Not authorized. Login is required for this action.' };
  }

  return { actorUser: req.user };
};

const getGigOwnerId = (gig) => gig.author?.toString() || gig.postedBy?.toString() || null;

const findApplication = (gig, applicantId) => (
  gig.applications?.find((entry) => entry.user.toString() === String(applicantId))
);

const normalizeCreatePayload = (payload) => ({
  ...payload,
  postType: 'WANTED',
  price: GIG_OPENING_COST,
  location: {
    city: payload.location.city,
    address: payload.location.address,
  },
  tags: payload.tags || [],
  images: payload.images || [],
  type: 'wanted',
});

const normalizeUpdatePayload = (payload) => {
  const update = { ...payload };

  if (update.price !== undefined) {
    delete update.price;
  }

  if (update.postType !== undefined) {
    update.postType = 'WANTED';
    update.type = 'wanted';
  }

  return update;
};

const toMoney = (value) => Math.round(value * 100) / 100;

const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT || 0);
const GIG_OPENING_COST = toMoney(Number(process.env.GIG_OPENING_COST || 25));
const GIG_COMPLETION_REWARD = toMoney(Number(process.env.GIG_COMPLETION_REWARD || 25));

const withMaybeSession = (query, session) => (session ? query.session(session) : query);
const saveWithMaybeSession = (doc, session) => (session ? doc.save({ session }) : doc.save());
const createWithMaybeSession = (Model, docs, session) => (
  session ? Model.create(docs, { session }) : Model.create(docs)
);
const {
  runAtomicOperation,
  openTask,
  releaseEscrowPayout,
} = pointsService;

const createGig = async (req, res) => {
  try {
    const parsed = parseOrFail(createGigSchema, req.body, res);

    if (!parsed) {
      return;
    }

    const { actorUser, error } = getActorUser(req);

    if (error) {
      return res.status(401).json({ message: error });
    }

    const payload = normalizeCreatePayload(parsed);

    const createdGig = await runAtomicOperation(async (session) => {
      const posterUser = await openTask({
        userId: actorUser._id,
        amount: GIG_OPENING_COST,
        session,
      });

      const [gig] = await createWithMaybeSession(Gig, [
        {
          title: payload.title,
          description: payload.description,
          postType: payload.postType,
          type: payload.type,
          category: payload.category,
          price: payload.price,
          author: actorUser._id,
          postedBy: actorUser._id,
          status: payload.status || 'open',
          tags: payload.tags,
          images: payload.images,
          location: payload.location,
          geoLocation: payload.geoLocation,
        },
      ], session);

      await createWithMaybeSession(Transaction, [
        {
          senderId: posterUser._id,
          receiverId: posterUser._id,
          gigId: gig._id,
          amount: GIG_OPENING_COST,
          type: 'DEPOSIT',
          status: 'COMPLETED',
          platformFee: 0,
          netAmount: GIG_OPENING_COST,
        },
      ], session);

      return gig;
    });

    const populatedGig = await Gig.findById(createdGig._id).populate('author', 'name email role averageRating totalReviews');

    return res.status(201).json({
      message: `Gig created successfully. ${GIG_OPENING_COST} points were locked as opening cost.`,
      gig: mapGigForResponse(populatedGig),
    });
  } catch (error) {
    if (error.code === 'TRANSACTIONS_UNAVAILABLE') {
      return res.status(503).json({ message: error.message });
    }

    if (error.code === 'INSUFFICIENT_BALANCE') {
      return res.status(400).json({ message: `Opening a gig requires ${GIG_OPENING_COST} points.` });
    }

    console.error('createGig error:', error);
    return res.status(500).json({ message: 'Server error while creating gig.' });
  }
};

const filterGigs = async (req, res) => {
  try {
    const parsed = parseOrFail(filterGigsSchema, req.query, res);
    if (!parsed) return;

    const limit = parsed.limit || 20;
    const sortOptions = buildSortOptions(parsed.sortBy || 'createdAt', parsed.order || 'desc');
    const useAtlas = process.env.ATLAS_SEARCH_ENABLED === 'true' && parsed.search;

    if (useAtlas) {
      // --- Atlas Search path (fuzzy, multi-field) ---
      const pipeline = [];

      pipeline.push({
        $search: {
          index: 'gig_search',
          compound: {
            must: [
              {
                text: {
                  query: parsed.search,
                  path: ['title', 'description', 'category', 'tags'],
                  fuzzy: { maxEdits: 1, prefixLength: 2 },
                },
              },
            ],
          },
        },
      });

      const $match = { postType: 'WANTED' };
      if (req.user?._id) {
        $match.applications = {
          $not: {
            $elemMatch: {
              user: req.user._id,
              status: 'DENIED',
            },
          },
        };
      }
      if (parsed.postType) $match.postType = parsed.postType;
      $match.status = parsed.status || 'open';
      if (parsed.category) $match.category  = parsed.category;
      if (parsed.city)     $match['location.city'] = { $regex: parsed.city, $options: 'i' };
      if (parsed.minPrice !== undefined || parsed.maxPrice !== undefined) {
        $match.price = {};
        if (parsed.minPrice !== undefined) $match.price.$gte = parsed.minPrice;
        if (parsed.maxPrice !== undefined) $match.price.$lte = parsed.maxPrice;
      }
      if (Object.keys($match).length) pipeline.push({ $match });
      pipeline.push(
        { $sort: sortOptions },
        { $limit: limit },
        { $lookup: { from: 'users', localField: 'author', foreignField: '_id', as: 'author' } },
        { $unwind: { path: '$author', preserveNullAndEmpty: true } },
      );

      const gigs = await Gig.aggregate(pipeline);
      return res.status(200).json({ total: gigs.length, gigs: gigs.map(mapGigForResponse) });
    }

    // --- Standard MongoDB path ---
    const filters = { postType: 'WANTED' };
    if (req.user?._id) {
      filters.applications = {
        $not: {
          $elemMatch: {
            user: req.user._id,
            status: 'DENIED',
          },
        },
      };
    }
    if (parsed.postType) filters.postType = parsed.postType;
    if (parsed.category) filters.category = parsed.category;
    filters.status = parsed.status || 'open';
    if (parsed.city)     filters['location.city'] = { $regex: parsed.city, $options: 'i' };

    if (parsed.minPrice !== undefined || parsed.maxPrice !== undefined) {
      filters.price = {};
      if (parsed.minPrice !== undefined) filters.price.$gte = parsed.minPrice;
      if (parsed.maxPrice !== undefined) filters.price.$lte = parsed.maxPrice;
    }

    if (parsed.search) {
      filters.$or = [
        { title:           { $regex: parsed.search, $options: 'i' } },
        { description:     { $regex: parsed.search, $options: 'i' } },
        { category:        { $regex: parsed.search, $options: 'i' } },
        { 'location.city': { $regex: parsed.search, $options: 'i' } },
        { tags:            { $regex: parsed.search, $options: 'i' } },
      ];
    }

    const gigs = await Gig.find(filters)
      .populate('author', 'name role averageRating totalReviews')
      .populate('client', 'name')
      .populate('freelancer', 'name')
      .sort(sortOptions)
      .limit(limit);

    return res.status(200).json({
      total: gigs.length,
      gigs: gigs.map(mapGigForResponse),
    });
  } catch (error) {
    console.error('filterGigs error:', error);
    return res.status(500).json({ message: 'Server error while fetching gigs.' });
  }
};

const getGigById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!objectIdRegex.test(id)) {
      return res.status(400).json({ message: 'Gig id is invalid.' });
    }

    const gig = await Gig.findById(id)
      .populate('author', 'name email role phone verified location averageRating totalReviews')
      .populate('client', 'name email')
      .populate('freelancer', 'name email');

    if (!gig) {
      return res.status(404).json({ message: 'Gig not found.' });
    }

    if (gig.postType !== 'WANTED' || gig.type === 'offering') {
      return res.status(404).json({ message: 'Gig not found.' });
    }

    return res.status(200).json(mapGigForResponse(gig));
  } catch (error) {
    console.error('getGigById error:', error);
    return res.status(500).json({ message: 'Server error while fetching gig details.' });
  }
};

const updateGig = async (req, res) => {
  try {
    const { id } = req.params;

    if (!objectIdRegex.test(id)) {
      return res.status(400).json({ message: 'Gig id is invalid.' });
    }

    if (req.body.author !== undefined || req.body.postedBy !== undefined) {
      return res.status(400).json({ message: 'author/postedBy cannot be updated.' });
    }

    const parsed = parseOrFail(updateGigSchema, req.body, res);

    if (!parsed) {
      return;
    }

    const { actorUser, error } = getActorUser(req);

    if (error) {
      return res.status(401).json({ message: error });
    }

    const gig = await Gig.findById(id);

    if (!gig) {
      return res.status(404).json({ message: 'Gig not found.' });
    }

    const ownerId = gig.author ? gig.author.toString() : gig.postedBy?.toString();
    if (!ownerId || ownerId !== actorUser._id.toString()) {
      return res.status(403).json({ message: 'You are not allowed to update this gig.' });
    }

    const updatePayload = normalizeUpdatePayload(parsed);

    const updatedGig = await Gig.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true,
    }).populate('author', 'name email role phone verified location averageRating totalReviews');

    return res.status(200).json({
      message: 'Gig updated successfully.',
      gig: mapGigForResponse(updatedGig),
    });
  } catch (error) {
    console.error('updateGig error:', error);
    return res.status(500).json({ message: 'Server error while updating gig.' });
  }
};

const deleteGig = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Gig id is invalid.' });
    }

    const { actorUser, error } = getActorUser(req);

    if (error) {
      return res.status(401).json({ message: error });
    }

    const gig = await Gig.findById(id);

    if (!gig) {
      return res.status(404).json({ message: 'Gig not found.' });
    }

    const ownerId = gig.author ? gig.author.toString() : gig.postedBy?.toString();
    if (!ownerId || ownerId !== actorUser._id.toString()) {
      return res.status(403).json({ message: 'You are not allowed to delete this gig.' });
    }

    await gig.deleteOne();

    return res.status(200).json({
      message: 'Gig deleted successfully.',
      deletedGigId: id,
    });
  } catch (error) {
    console.error('deleteGig error:', error);
    return res.status(500).json({ message: 'Server error while deleting gig.' });
  }
};

const requestGigAssignment = async (req, res) => {
  try {
    const { actorUser, error } = getActorUser(req);
    if (error) {
      return res.status(401).json({ message: error });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Gig id is invalid.' });
    }

    const responsePayload = await runAtomicOperation(async (session) => {
      const gig = await withMaybeSession(Gig.findById(id), session);
      if (!gig) {
        throw new Error('Gig not found.');
      }

      if (gig.status !== 'open') {
        throw new Error('Gig is not open for applications.');
      }

      const gigOwnerId = getGigOwnerId(gig);
      if (!gigOwnerId || !mongoose.Types.ObjectId.isValid(gigOwnerId)) {
        throw new Error('Gig owner id is invalid.');
      }

      if (actorUser._id.toString() === gigOwnerId) {
        throw new Error('You cannot apply to your own gig.');
      }

      const existing = findApplication(gig, actorUser._id);
      if (existing?.status === 'DENIED') {
        throw new Error('Your request to this gig was denied.');
      }

      if (existing?.status === 'REQUESTED') {
        throw new Error('You already requested this gig.');
      }

      if (existing?.status === 'ACCEPTED') {
        throw new Error('You are already accepted for this gig.');
      }

      if (!Array.isArray(gig.applications)) {
        gig.applications = [];
      }

      gig.applications.push({
        user: actorUser._id,
        status: 'REQUESTED',
        requestedAt: new Date(),
        actedAt: null,
      });
      await saveWithMaybeSession(gig, session);

      return {
        gig,
        ownerId: gigOwnerId,
      };
    });

    const populatedGig = await Gig.findById(responsePayload.gig._id)
      .populate('author', 'name role averageRating totalReviews')
      .populate('client', 'name email')
      .populate('freelancer', 'name email');

    sseManager.send(responsePayload.ownerId, 'gig_request', {
      message: `${actorUser.name} requested to do your gig: ${populatedGig.title}`,
      gigId: populatedGig._id,
      applicantId: actorUser._id,
      applicantName: actorUser.name,
      gigTitle: populatedGig.title,
    });

    return res.status(200).json({
      message: 'Request sent successfully. Waiting for owner approval.',
      gig: mapGigForResponse(populatedGig),
    });
  } catch (error) {
    if (error.code === 'TRANSACTIONS_UNAVAILABLE') {
      return res.status(503).json({ message: error.message });
    }

    if (error.message === 'Gig not found.') {
      return res.status(404).json({ message: error.message });
    }

    if (
      error.message === 'Gig id is invalid.'
      || error.message === 'Gig is not open for applications.'
      || error.message === 'You cannot apply to your own gig.'
      || error.message === 'Gig owner id is invalid.'
      || error.message === 'Your request to this gig was denied.'
      || error.message === 'You already requested this gig.'
      || error.message === 'You are already accepted for this gig.'
    ) {
      return res.status(400).json({ message: error.message });
    }

    console.error('requestGigAssignment error:', error);
    return res.status(500).json({ message: 'Server error while creating gig request.' });
  }
};

const acceptGigApplicant = async (req, res) => {
  try {
    const { actorUser, error } = getActorUser(req);
    if (error) {
      return res.status(401).json({ message: error });
    }

    const { id, applicantId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(applicantId)) {
      return res.status(400).json({ message: 'Gig id or applicant id is invalid.' });
    }

    const result = await runAtomicOperation(async (session) => {
      const gig = await withMaybeSession(Gig.findById(id), session);
      if (!gig) {
        throw new Error('Gig not found.');
      }

      if (gig.status !== 'open') {
        throw new Error('Gig is not open for applications.');
      }

      const gigOwnerId = getGigOwnerId(gig);
      if (!gigOwnerId || gigOwnerId !== actorUser._id.toString()) {
        throw new Error('Only gig owner can accept applicants.');
      }

      const targetApplication = findApplication(gig, applicantId);
      if (!targetApplication || targetApplication.status !== 'REQUESTED') {
        throw new Error('Applicant request not found.');
      }

      const freelancerUser = await withMaybeSession(User.findById(applicantId), session);
      if (!freelancerUser) {
        throw new Error('Applicant user was not found.');
      }

      const [paymentTx] = await createWithMaybeSession(Transaction, [
        {
          senderId: actorUser._id,
          receiverId: freelancerUser._id,
          gigId: gig._id,
          amount: GIG_COMPLETION_REWARD,
          type: 'PAYMENT',
          status: 'PENDING',
          platformFee: 0,
          netAmount: GIG_COMPLETION_REWARD,
        },
      ], session);

      gig.applications.forEach((entry) => {
        if (entry.user.toString() === String(applicantId)) {
          entry.status = 'ACCEPTED';
          entry.actedAt = new Date();
        } else if (entry.status === 'REQUESTED') {
          entry.status = 'DENIED';
          entry.actedAt = new Date();
        }
      });

      gig.client = actorUser._id;
      gig.freelancer = freelancerUser._id;
      gig.status = 'in_progress';
      gig.freelancerConfirmed = false;
      gig.clientConfirmed = false;
      gig.escrowAmount = GIG_COMPLETION_REWARD;
      gig.taskTransaction = paymentTx._id;
      await saveWithMaybeSession(gig, session);

      return {
        gig,
        applicantId: String(freelancerUser._id),
        gigTitle: gig.title,
      };
    });

    const populatedGig = await Gig.findById(result.gig._id)
      .populate('author', 'name role averageRating totalReviews')
      .populate('client', 'name email')
      .populate('freelancer', 'name email');

    sseManager.send(result.applicantId, 'gig_request_accepted', {
      message: `Your request was accepted: ${result.gigTitle}`,
      gigId: result.gig._id,
      gigTitle: result.gigTitle,
    });

    return res.status(200).json({
      message: 'Applicant accepted. Task moved to in progress.',
      gig: mapGigForResponse(populatedGig),
    });
  } catch (error) {
    if (error.code === 'TRANSACTIONS_UNAVAILABLE') {
      return res.status(503).json({ message: error.message });
    }

    if (error.message === 'Gig not found.') {
      return res.status(404).json({ message: error.message });
    }

    if (
      error.message === 'Gig id or applicant id is invalid.'
      || error.message === 'Gig is not open for applications.'
      || error.message === 'Only gig owner can accept applicants.'
      || error.message === 'Applicant request not found.'
      || error.message === 'Applicant user was not found.'
    ) {
      return res.status(400).json({ message: error.message });
    }

    console.error('acceptGigApplicant error:', error);
    return res.status(500).json({ message: 'Server error while accepting applicant.' });
  }
};

const denyGigApplicant = async (req, res) => {
  try {
    const { actorUser, error } = getActorUser(req);
    if (error) {
      return res.status(401).json({ message: error });
    }

    const { id, applicantId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(applicantId)) {
      return res.status(400).json({ message: 'Gig id or applicant id is invalid.' });
    }

    const result = await runAtomicOperation(async (session) => {
      const gig = await withMaybeSession(Gig.findById(id), session);
      if (!gig) {
        throw new Error('Gig not found.');
      }

      if (gig.status !== 'open') {
        throw new Error('Gig is not open for applications.');
      }

      const gigOwnerId = getGigOwnerId(gig);
      if (!gigOwnerId || gigOwnerId !== actorUser._id.toString()) {
        throw new Error('Only gig owner can deny applicants.');
      }

      const targetApplication = findApplication(gig, applicantId);
      if (!targetApplication || targetApplication.status !== 'REQUESTED') {
        throw new Error('Applicant request not found.');
      }

      targetApplication.status = 'DENIED';
      targetApplication.actedAt = new Date();
      await saveWithMaybeSession(gig, session);

      return {
        gig,
        applicantId,
        gigTitle: gig.title,
      };
    });

    sseManager.send(result.applicantId, 'gig_request_denied', {
      message: `Your request was denied: ${result.gigTitle}`,
      gigId: result.gig._id,
      gigTitle: result.gigTitle,
    });

    return res.status(200).json({
      message: 'Applicant denied. Gig remains open for others.',
    });
  } catch (error) {
    if (error.code === 'TRANSACTIONS_UNAVAILABLE') {
      return res.status(503).json({ message: error.message });
    }

    if (error.message === 'Gig not found.') {
      return res.status(404).json({ message: error.message });
    }

    if (
      error.message === 'Gig id or applicant id is invalid.'
      || error.message === 'Gig is not open for applications.'
      || error.message === 'Only gig owner can deny applicants.'
      || error.message === 'Applicant request not found.'
    ) {
      return res.status(400).json({ message: error.message });
    }

    console.error('denyGigApplicant error:', error);
    return res.status(500).json({ message: 'Server error while denying applicant.' });
  }
};

const getMyGigRequests = async (req, res) => {
  try {
    const { actorUser, error } = getActorUser(req);
    if (error) {
      return res.status(401).json({ message: error });
    }

    const gigs = await Gig.find({
      author: actorUser._id,
      status: 'open',
      applications: {
        $elemMatch: { status: 'REQUESTED' },
      },
    })
      .populate('applications.user', 'name email')
      .sort({ updatedAt: -1 })
      .limit(100);

    const requests = gigs.flatMap((gig) => {
      const pending = gig.applications.filter((entry) => entry.status === 'REQUESTED');
      return pending.map((entry) => ({
        gigId: gig._id,
        gigTitle: gig.title,
        applicantId: entry.user._id,
        applicantName: entry.user.name,
        applicantEmail: entry.user.email,
        requestedAt: entry.requestedAt,
      }));
    });

    return res.status(200).json({
      total: requests.length,
      requests,
    });
  } catch (error) {
    console.error('getMyGigRequests error:', error);
    return res.status(500).json({ message: 'Server error while fetching gig requests.' });
  }
};

const hireFreelancer = requestGigAssignment;

const markAsFinished = async (req, res) => {
  try {
    const { actorUser, error } = getActorUser(req);
    if (error) {
      return res.status(401).json({ message: error });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Gig id is invalid.' });
    }

    const payoutResult = await runAtomicOperation(async (session) => {
      const gig = await withMaybeSession(Gig.findById(id), session);
      if (!gig) {
        throw new Error('Gig not found.');
      }

      if (gig.status !== 'in_progress') {
        throw new Error('Gig is not in progress.');
      }

      if (!gig.freelancer || gig.freelancer.toString() !== actorUser._id.toString()) {
        throw new Error('Only the assigned freelancer can mark this task as finished.');
      }

      gig.freelancerConfirmed = true;

      if (gig.clientConfirmed) {
        if (!gig.client || !gig.freelancer) {
          throw new Error('Task participants are missing.');
        }

        return releaseEscrowPayout({
          session,
          gig,
          clientUserId: gig.client,
          freelancerUserId: gig.freelancer,
          paymentAmount: GIG_COMPLETION_REWARD,
        });
      }

      await saveWithMaybeSession(gig, session);
      return null;
    });

    const refreshedGig = await Gig.findById(id)
      .populate('author', 'name role averageRating totalReviews')
      .populate('client', 'name email')
      .populate('freelancer', 'name email');

    return res.status(200).json({
      message: payoutResult
        ? `Both confirmations received. Payment released (${payoutResult.freelancerCredit} points, including ${payoutResult.completionReward} completion reward).`
        : 'Freelancer confirmation recorded. Waiting for client confirmation.',
      gig: mapGigForResponse(refreshedGig),
    });
  } catch (error) {
    if (error.code === 'TRANSACTIONS_UNAVAILABLE') {
      return res.status(503).json({ message: error.message });
    }

    if (error.message === 'Gig not found.') {
      return res.status(404).json({ message: error.message });
    }

    if (
      error.message === 'Gig id is invalid.'
      || error.message === 'Gig is not in progress.'
      || error.message === 'Only the assigned freelancer can mark this task as finished.'
    ) {
      return res.status(400).json({ message: error.message });
    }

    console.error('markAsFinished error:', error);
    return res.status(500).json({ message: 'Server error while confirming freelancer completion.' });
  }
};

const confirmReceipt = async (req, res) => {
  try {
    const { actorUser, error } = getActorUser(req);
    if (error) {
      return res.status(401).json({ message: error });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Gig id is invalid.' });
    }

    const payoutResult = await runAtomicOperation(async (session) => {
      const gig = await withMaybeSession(Gig.findById(id), session);
      if (!gig) {
        throw new Error('Gig not found.');
      }

      if (gig.status !== 'in_progress') {
        throw new Error('Gig is not in progress.');
      }

      if (!gig.client || gig.client.toString() !== actorUser._id.toString()) {
        throw new Error('Only the assigned client can confirm receipt.');
      }

      gig.clientConfirmed = true;

      if (gig.freelancerConfirmed) {
        if (!gig.client || !gig.freelancer) {
          throw new Error('Task participants are missing.');
        }

        return releaseEscrowPayout({
          session,
          gig,
          clientUserId: gig.client,
          freelancerUserId: gig.freelancer,
          paymentAmount: GIG_COMPLETION_REWARD,
        });
      }

      await saveWithMaybeSession(gig, session);
      return null;
    });

    const refreshedGig = await Gig.findById(id)
      .populate('author', 'name role averageRating totalReviews')
      .populate('client', 'name email')
      .populate('freelancer', 'name email');

    return res.status(200).json({
      message: payoutResult
        ? `Both confirmations received. Payment released (${payoutResult.freelancerCredit} points, including ${payoutResult.completionReward} completion reward).`
        : 'Client confirmation recorded. Waiting for freelancer confirmation.',
      gig: mapGigForResponse(refreshedGig),
    });
  } catch (error) {
    if (error.code === 'TRANSACTIONS_UNAVAILABLE') {
      return res.status(503).json({ message: error.message });
    }

    if (error.message === 'Gig not found.') {
      return res.status(404).json({ message: error.message });
    }

    if (
      error.message === 'Gig id is invalid.'
      || error.message === 'Gig is not in progress.'
      || error.message === 'Only the assigned client can confirm receipt.'
    ) {
      return res.status(400).json({ message: error.message });
    }

    console.error('confirmReceipt error:', error);
    return res.status(500).json({ message: 'Server error while confirming client receipt.' });
  }
};

const getMyTasks = async (req, res) => {
  try {
    const { actorUser, error } = getActorUser(req);
    if (error) {
      return res.status(401).json({ message: error });
    }

    const gigs = await Gig.find({
      $or: [
        { client: actorUser._id },
        { freelancer: actorUser._id },
      ],
      status: { $in: ['in_progress', 'completed'] },
    })
      .populate('author', 'name role averageRating totalReviews')
      .populate('client', 'name email')
      .populate('freelancer', 'name email')
      .sort({ updatedAt: -1 })
      .limit(100);

    return res.status(200).json({
      total: gigs.length,
      gigs: gigs.map(mapGigForResponse),
    });
  } catch (error) {
    console.error('getMyTasks error:', error);
    return res.status(500).json({ message: 'Server error while fetching tasks.' });
  }
};

module.exports = {
  createGig,
  filterGigs,
  getAllGigs: filterGigs,
  updateGig,
  getGigById,
  deleteGig,
  hireFreelancer,
  requestGigAssignment,
  acceptGigApplicant,
  denyGigApplicant,
  getMyGigRequests,
  markAsFinished,
  confirmReceipt,
  getMyTasks,
};

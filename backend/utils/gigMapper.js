const mapGigForResponse = (gigDoc) => {
  const gig = gigDoc?.toObject ? gigDoc.toObject() : gigDoc;
  const postType = 'WANTED';

  return {
    ...gig,
    postType,
    type: 'wanted',
    postedBy: gig?.author || gig?.postedBy,
  };
};

module.exports = {
  mapGigForResponse,
};
const { v2: cloudinary } = require('cloudinary');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { Readable } = require('stream');

const isConfigured = () => Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET,
);

if (isConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const getFileExtension = (originalName = '', mimeType = '') => {
  const originalExt = path.extname(originalName).toLowerCase();
  if (originalExt === '.jpg' || originalExt === '.jpeg' || originalExt === '.png') {
    return originalExt;
  }

  if (mimeType === 'image/png') return '.png';
  return '.jpg';
};

const uploadLocally = async (buffer, folder, originalName, mimeType) => {
  const safeFolder = folder.split('/').filter(Boolean);
  const targetDir = path.join(__dirname, '..', 'uploads', ...safeFolder);
  await fs.mkdir(targetDir, { recursive: true });

  const fileName = `${Date.now()}-${crypto.randomUUID()}${getFileExtension(originalName, mimeType)}`;
  const targetPath = path.join(targetDir, fileName);
  await fs.writeFile(targetPath, buffer);

  return {
    secure_url: `/uploads/${safeFolder.join('/')}/${fileName}`,
    provider: 'local',
  };
};

const uploadBuffer = async (buffer, folder, originalName = '', mimeType = '') => {
  if (!isConfigured()) {
    return uploadLocally(buffer, folder, originalName, mimeType);
  }

  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        overwrite: true,
        transformation: [{ width: 800, height: 800, crop: 'limit' }],
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      },
    );

    Readable.from(buffer).pipe(upload);
  });
};

module.exports = {
  isConfigured,
  uploadBuffer,
};

const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const { v4: uuid } = require('uuid');

const MIME_TYPE_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
};

const storage = new GridFsStorage({
  url: process.env.MONGOPATH || "mongodb://127.0.0.1:27017/emmarket_production",
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    if (!isValid) {
      return null;
    }
    const ext = MIME_TYPE_MAP[file.mimetype];
    return {
      bucketName: 'uploads',
      filename: uuid() + '.' + ext
    };
  }
});

const imageUpload = multer({
  storage: storage,
  limits: 50000000,
});

exports.imageUpload = imageUpload;


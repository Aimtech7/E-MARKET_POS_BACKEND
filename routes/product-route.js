const express = require("express");
const { getAllProduct, createProduct, updateProduct, deleteProduct, clearAll, getProductBarcodeImage, archiveProduct, restoreProduct, fetchBookMetadataByIsbn, generateThermalBarcodeLabels } = require("../controller/product-controller");
const { imageUpload } = require("../middleware/file-upload");

const checkAuth = require("../middleware/check-auth");
const checkAdmin = require("../middleware/check-admin");

const router = express.Router();

// Allow public/browser rendering of barcode images without JWT auth
router.get('/:id/barcode', getProductBarcodeImage);

router.use(checkAuth);

router.get('/fetch-isbn/:isbn', fetchBookMetadataByIsbn);
router.get('/print-labels/:id', generateThermalBarcodeLabels);
router.get('/products',getAllProduct);

router.use(checkAdmin);

router.post('/update/:id', imageUpload.single('image'),updateProduct)
router.post('/new', imageUpload.single('image'),createProduct)
router.delete('/delete/:id',deleteProduct)
router.get('/delete/all',clearAll)
router.put('/archive/:id', archiveProduct)
router.put('/restore/:id', restoreProduct)


module.exports = router
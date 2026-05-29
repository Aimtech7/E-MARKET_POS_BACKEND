const express = require("express");
const { getAllProduct, createProduct, updateProduct, deleteProduct, clearAll, getProductBarcodeImage, archiveProduct, restoreProduct } = require("../controller/product-controller");
const { imageUpload } = require("../middleware/file-upload");

const checkAuth = require("../middleware/check-auth");
const checkAdmin = require("../middleware/check-admin");

const router = express.Router();

router.use(checkAuth);

router.get('/products',getAllProduct)
router.get('/:id/barcode', getProductBarcodeImage)

router.use(checkAdmin);

router.post('/update/:id', imageUpload.single('image'),updateProduct)
router.post('/new', imageUpload.single('image'),createProduct)
router.delete('/delete/:id',deleteProduct)
router.get('/delete/all',clearAll)
router.put('/archive/:id', archiveProduct)
router.put('/restore/:id', restoreProduct)


module.exports = router
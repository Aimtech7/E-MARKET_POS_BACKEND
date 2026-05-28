const Category = require("../model/Category");
const Product = require("../model/Product");
const UnitOfMeasure = require("../model/UnitOfMeasure");
const fs = require("fs");
const bwipjs = require("bwip-js");

const getAllProduct = async (req, res) => {
  let product;
  try {
    product = await Product.find().populate([
      "productCategory",
      "unitOfMeasure",
    ]);
  } catch (err) {
    return res.status(404).json({ message: "No data found" });
  }
  return res
    .status(201)
    .json(product.map((p) => p.toObject({ getters: true })));
};

const updateProduct = async (req, res) => {
  const { productName, productCategory, unitOfMeasure, productPrice } =
    req.body;
  const { id } = req.params;
  const image = req.file;
  let product;
  let unit = await UnitOfMeasure.findOne({unitOfMeasureName:unitOfMeasure})
  let cate = await Category.findOne({categoryName:productCategory})
  try {
    if (image) {
      product = await Product.findByIdAndUpdate(
        id,
        {
          productName,
          productCategory: cate,
          unitOfMeasure:unit,
          productPrice,
          productImage: image.path,
        },
        { returnOriginal: true }
      );
      try {
        fs.unlinkSync(product.productImage);
      } catch (err) {}
    } else
      product = await Product.findByIdAndUpdate(
        id,
        {
          productName,
          productCategory:cate,
          unitOfMeasure:unit,
          productPrice,
        },
        {
          returnOriginal: true,
        }
      );
  } catch (err) {
    if (image) fs.unlinkSync(image.path);
    console.log(err);
    return res
      .status(402)
      .json({ message: "Could not update the product, please try again" });
  }
  if (product) {
    return res.status(201).json({ message: "date have been updated" });
  }
  fs.unlinkSync(image.path);
  return res.status(402).json({ message: "No match with this product" });
};
const deleteProduct = async (req, res) => {
  const { id } = req.params;
  let product;
  try {
    product = await Product.findByIdAndDelete(id);
  } catch (err) {
    return res
      .status(402)
      .json({ message: "Could not delete the product, please try again" });
  }
  if (product) {
    return res.status(201).json({ message: "date have been deleted" });
  }
  return res.status(402).json({ message: "No match with this product" });
};

const createProduct = async (req, res) => {
  const {
    productName,
    productCategory,
    unitOfMeasure,
    productPrice,
    stockQuantity,
    reorderLevel,
    expiryDate,
    batchNumber,
    supplierReference,
    sku,
    barcode,
  } = req.body;

  const imagePath = req.file;
  if (!imagePath) {
    return res.status(400).json({ message: "Product image is required" });
  }

  let product;
  try {
    product = await Product.findOne({
      productName: productName,
      unitOfMeasure: await UnitOfMeasure.findOne({
        unitOfMeasureName: unitOfMeasure,
      }),
    });
  } catch (err) {
    fs.unlinkSync(imagePath.path);
    return res
      .status(402)
      .json({ message: "Could not Create new product, please try again" });
  }

  if (!product) {
    try {
      // Auto-generate SKU if omitted
      let productSku = sku;
      if (!productSku) {
        const cleanName = productName.replace(/[^a-zA-Z0-9]/g, "").substring(0, 3).toUpperCase();
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        productSku = `SKU-${cleanName}-${rand}`;
      }

      // Ensure SKU uniqueness
      const existingSku = await Product.findOne({ sku: productSku });
      if (existingSku) {
        // regenerate random chunk if collision
        productSku += `-${Math.floor(Math.random() * 90 + 10)}`;
      }

      // Auto-generate barcode if omitted
      const productBarcode = barcode || Math.floor(100000000000 + Math.random() * 900000000000).toString();

      product = new Product({
        productName: productName,
        productCategory: await Category.findOne({
          categoryName: productCategory,
        }),
        unitOfMeasure: await UnitOfMeasure.findOne({
          unitOfMeasureName: unitOfMeasure,
        }),
        productPrice: parseFloat(productPrice),
        productImage: imagePath.path,
        stockQuantity: parseInt(stockQuantity) || 0,
        reorderLevel: parseInt(reorderLevel) || 5,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        batchNumber: batchNumber || undefined,
        supplierReference: supplierReference || undefined,
        sku: productSku,
        barcode: productBarcode,
      });

      await product.save();
      return res.status(201).json({ id: product.id, product });
    } catch (err) {
      fs.unlinkSync(imagePath.path);
      return res.status(402).json({ message: "Error registering product document: " + err.message });
    }
  }
  fs.unlinkSync(imagePath.path);
  return res.status(402).json({ message: "The product is already exists" });
};

const clearAll = async (req, res) => {
  await Product.deleteMany();
  return res.status(201).json({ message: "delete all items" });
};

const getProductBarcodeImage = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let barcodeText = product.barcode;
    if (!barcodeText) {
      // Auto-generate barcode digit string if missing
      barcodeText = Math.floor(100000000000 + Math.random() * 900000000000).toString();
      product.barcode = barcodeText;
      await product.save();
    }

    bwipjs.toBuffer(
      {
        bcid: "code128", // Barcode type
        text: barcodeText,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: "center",
      },
      (err, png) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Barcode generation error", error: err.message });
        }
        res.contentType("image/png");
        return res.send(png);
      }
    );
  } catch (err) {
    return res.status(500).json({ message: "Error generating barcode", error: err.message });
  }
};

exports.getAllProduct = getAllProduct;
exports.deleteProduct = deleteProduct;
exports.updateProduct = updateProduct;
exports.createProduct = createProduct;
exports.clearAll = clearAll;
exports.getProductBarcodeImage = getProductBarcodeImage;

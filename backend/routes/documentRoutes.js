const express = require("express");
const router = express.Router();
const {
  uploadDocument,
  getMyDocuments,
  getDocumentById,
  uploadSignature,
  deleteDocument,
} = require("../controllers/documentController");
const { protect } = require("../middleware/authMiddleware");
const { upload } = require("../config/cloudinary");

router.post("/", protect, upload.single("file"), uploadDocument);
router.get("/", protect, getMyDocuments);
router.get("/:id", protect, getDocumentById);
router.post("/:id/signature", protect, upload.single("signature"), uploadSignature);
router.delete("/:id", protect, deleteDocument);

module.exports = router;
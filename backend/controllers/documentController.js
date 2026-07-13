const Document = require("../models/document");
const { cloudinary } = require("../config/cloudinary");

// @route   POST /api/documents
// @desc    Upload a new document
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { title } = req.body;

    const document = await Document.create({
      uploadedBy: req.user.id,
      title: title || req.file.originalname,
      fileUrl: req.file.path, // Cloudinary URL
      publicId: req.file.filename, // Cloudinary public_id
      fileType: req.file.mimetype,
    });

    res.status(201).json({ message: "Document uploaded successfully", document });
  } catch (error) {
    console.error("Upload document error:", error);
    res.status(500).json({ message: "Server error uploading document" });
  }
};

// @route   GET /api/documents
// @desc    Get all documents uploaded by the logged-in user
exports.getMyDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ uploadedBy: req.user.id })
      .populate("uploadedBy", "fullName email")
      .sort({ createdAt: -1 });

    res.status(200).json({ documents });
  } catch (error) {
    console.error("Get documents error:", error);
    res.status(500).json({ message: "Server error fetching documents" });
  }
};

// @route   GET /api/documents/:id
// @desc    Get a single document by ID
exports.getDocumentById = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id).populate("uploadedBy", "fullName email");

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Only the uploader can view it (adjust later if you want shared access)
    if (document.uploadedBy._id.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to view this document" });
    }

    res.status(200).json({ document });
  } catch (error) {
    console.error("Get document error:", error);
    res.status(500).json({ message: "Server error fetching document" });
  }
};

// @route   POST /api/documents/:id/signature
// @desc    Attach a signature image to a document
exports.uploadSignature = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No signature image uploaded" });
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    document.signature = {
      imageUrl: req.file.path,
      publicId: req.file.filename,
      signedBy: req.user.id,
      signedAt: new Date(),
    };
    document.status = "signed";

    await document.save();

    res.status(200).json({ message: "Document signed successfully", document });
  } catch (error) {
    console.error("Upload signature error:", error);
    res.status(500).json({ message: "Server error uploading signature" });
  }
};

// @route   DELETE /api/documents/:id
// @desc    Delete a document (and its file from Cloudinary)
exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (document.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to delete this document" });
    }

    await cloudinary.uploader.destroy(document.publicId, { resource_type: "auto" });

    if (document.signature?.publicId) {
      await cloudinary.uploader.destroy(document.signature.publicId, { resource_type: "image" });
    }

    await document.deleteOne();

    res.status(200).json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Delete document error:", error);
    res.status(500).json({ message: "Server error deleting document" });
  }
};
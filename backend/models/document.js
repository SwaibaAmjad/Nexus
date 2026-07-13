const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    publicId: {
      type: String, // Cloudinary's identifier, needed to delete/replace later
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ["draft", "pending_signature", "signed", "archived"],
      default: "draft",
    },
    signature: {
      imageUrl: { type: String, default: null },
      publicId: { type: String, default: null },
      signedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      signedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);
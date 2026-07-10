const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema(
  {
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      default: "",
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Prevent invalid time ranges at the schema level
meetingSchema.pre("validate", function () {
  if (this.endTime <= this.startTime) {
    throw new Error("endTime must be after startTime");
  }
});

module.exports = mongoose.model("Meeting", meetingSchema);
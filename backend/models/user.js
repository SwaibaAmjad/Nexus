const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false, // never returned in queries unless explicitly requested
    },

    role: {
      type: String,
      enum: ["entrepreneur", "investor", "admin"],
      default: "entrepreneur",
    },

    // Shared profile fields
    bio: {
      type: String,
      default: "",
      maxlength: 500,
    },

    profileImage: {
      type: String,
      default: "",
    },

    location: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      default: "",
    },

    // Entrepreneur-specific info
    startupInfo: {
      companyName: { type: String, default: "" },
      industry: { type: String, default: "" },
      fundingStage: {
        type: String,
        enum: ["idea", "pre-seed", "seed", "series-a", "series-b+", "growth", ""],
        default: "",
      },
      description: { type: String, default: "" },
      website: { type: String, default: "" },
      teamSize: { type: Number, default: 1 },
      fundingNeeded: { type: Number, default: 0 },
    },

    // Investor-specific info
    investorInfo: {
      investmentRange: {
        type: String,
        enum: ["<10k", "10k-50k", "50k-200k", "200k-1m", "1m+", ""],
        default: "",
      },
      preferredIndustries: {
        type: [String],
        default: [],
      },
      pastInvestments: {
        type: [String],
        default: [],
      },
      investmentThesis: {
        type: String,
        default: "",
      },
    },

    // Account status
    isVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving (only if modified)
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare passwords during login
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to return safe user object (no password)
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
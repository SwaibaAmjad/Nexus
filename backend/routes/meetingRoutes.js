const express = require("express");
const router = express.Router();
const {
  scheduleMeeting,
  getMyMeetings,
  acceptMeeting,
  rejectMeeting,
  cancelMeeting,
} = require("../controllers/meetingController");
const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, scheduleMeeting);
router.get("/", protect, getMyMeetings);
router.put("/:id/accept", protect, acceptMeeting);
router.put("/:id/reject", protect, rejectMeeting);
router.delete("/:id", protect, cancelMeeting);

module.exports = router;
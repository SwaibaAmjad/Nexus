const Meeting = require("../models/meeting");

// Helper: check if a proposed time range conflicts with existing accepted meetings
const hasConflict = async ({ userId, startTime, endTime, excludeMeetingId }) => {
  const query = {
    status: "accepted",
    $or: [{ organizer: userId }, { participant: userId }],
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };

  if (excludeMeetingId) {
    query._id = { $ne: excludeMeetingId };
  }

  const conflict = await Meeting.findOne(query);
  return !!conflict;
};

// @route   POST /api/meetings
// @desc    Schedule a new meeting request
exports.scheduleMeeting = async (req, res) => {
  try {
    const { participantId, title, notes, startTime, endTime } = req.body;
    const organizerId = req.user.id;

    if (!participantId || !title || !startTime || !endTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (participantId === organizerId) {
      return res.status(400).json({ message: "Cannot schedule a meeting with yourself" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return res.status(400).json({ message: "endTime must be after startTime" });
    }

    // Check conflicts for both organizer and participant
    const organizerConflict = await hasConflict({ userId: organizerId, startTime: start, endTime: end });
    const participantConflict = await hasConflict({ userId: participantId, startTime: start, endTime: end });

    if (organizerConflict || participantConflict) {
      return res.status(409).json({ message: "Time slot conflicts with an existing accepted meeting" });
    }

    const meeting = await Meeting.create({
      organizer: organizerId,
      participant: participantId,
      title,
      notes,
      startTime: start,
      endTime: end,
    });

    res.status(201).json({ message: "Meeting requested successfully", meeting });
  } catch (error) {
    console.error("Schedule meeting error:", error);
    res.status(500).json({ message: "Server error scheduling meeting" });
  }
};

// @route   GET /api/meetings
// @desc    Get all meetings for the logged-in user (as organizer or participant)
exports.getMyMeetings = async (req, res) => {
  try {
    const userId = req.user.id;

    const meetings = await Meeting.find({
      $or: [{ organizer: userId }, { participant: userId }],
    })
      .populate("organizer", "fullName email role")
      .populate("participant", "fullName email role")
      .sort({ startTime: 1 });

    res.status(200).json({ meetings });
  } catch (error) {
    console.error("Get meetings error:", error);
    res.status(500).json({ message: "Server error fetching meetings" });
  }
};

// @route   PUT /api/meetings/:id/accept
// @desc    Accept a pending meeting request
exports.acceptMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    if (meeting.participant.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the invited participant can accept this meeting" });
    }

    if (meeting.status !== "pending") {
      return res.status(400).json({ message: `Meeting is already ${meeting.status}` });
    }

    // Re-check conflicts at acceptance time, since other meetings may have been accepted since the request was made
    const organizerConflict = await hasConflict({
      userId: meeting.organizer,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      excludeMeetingId: meeting._id,
    });
    const participantConflict = await hasConflict({
      userId: meeting.participant,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      excludeMeetingId: meeting._id,
    });

    if (organizerConflict || participantConflict) {
      return res.status(409).json({ message: "This time slot now conflicts with another accepted meeting" });
    }

    meeting.status = "accepted";
    await meeting.save();

    res.status(200).json({ message: "Meeting accepted", meeting });
  } catch (error) {
    console.error("Accept meeting error:", error);
    res.status(500).json({ message: "Server error accepting meeting" });
  }
};

// @route   PUT /api/meetings/:id/reject
// @desc    Reject a pending meeting request
exports.rejectMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    if (meeting.participant.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the invited participant can reject this meeting" });
    }

    if (meeting.status !== "pending") {
      return res.status(400).json({ message: `Meeting is already ${meeting.status}` });
    }

    meeting.status = "rejected";
    await meeting.save();

    res.status(200).json({ message: "Meeting rejected", meeting });
  } catch (error) {
    console.error("Reject meeting error:", error);
    res.status(500).json({ message: "Server error rejecting meeting" });
  }
};

// @route   DELETE /api/meetings/:id
// @desc    Cancel a meeting (organizer or participant can cancel)
exports.cancelMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    const userId = req.user.id;
    if (meeting.organizer.toString() !== userId && meeting.participant.toString() !== userId) {
      return res.status(403).json({ message: "You are not part of this meeting" });
    }

    meeting.status = "cancelled";
    await meeting.save();

    res.status(200).json({ message: "Meeting cancelled", meeting });
  } catch (error) {
    console.error("Cancel meeting error:", error);
    res.status(500).json({ message: "Server error cancelling meeting" });
  }
};
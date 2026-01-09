const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  shareTopic,
  getMyShares,
  getSharedWithMe,
  removeShare,
  getSharedTopicNotes,
} = require('../controllers/shareController');

/**
 * @route   GET /api/share/users
 * @desc    Get all users with optional name search
 * @access  Public
 * @query   search - Search term for name, phoneNumber, or email
 */
router.get('/users', getAllUsers);

/**
 * @route   POST /api/share/topic
 * @desc    Share a topic with a user
 * @access  Public
 * @body    { topicId: "xxx", sharedWithUserId: "yyy", ownerId: "zzz" }
 */
router.post('/topic', shareTopic);

/**
 * @route   GET /api/share/my-shares
 * @desc    Get all topics I shared with other users (books > chapters > topics with user list)
 * @access  Public
 * @query   userId - The owner's user ID
 */
router.get('/my-shares', getMyShares);

/**
 * @route   GET /api/share/shared-with-me
 * @desc    Get all topics shared with me (with full info including who shared them)
 * @access  Public
 * @query   userId - The recipient's user ID
 */
router.get('/shared-with-me', getSharedWithMe);

/**
 * @route   GET /api/share/shared-notes
 * @desc    Get the notes of the person who shared a topic with you
 * @access  Public
 * @query   topicId - The topic ID
 * @query   userId - Your user ID (the recipient)
 */
router.get('/shared-notes', getSharedTopicNotes);

/**
 * @route   GET /api/share/shared-notes/:topicId/:userId
 * @desc    Get the notes of the person who shared a topic with you (alternative route)
 * @access  Public
 */
router.get('/shared-notes/:topicId/:userId', getSharedTopicNotes);

/**
 * @route   DELETE /api/share/:shareId
 * @desc    Remove a share by shareId
 * @access  Public
 * @query   userId - User ID for permission verification
 */
router.delete('/:shareId', removeShare);

/**
 * @route   DELETE /api/share
 * @desc    Remove a share by topicId, sharedWithUserId, and ownerId
 * @access  Public
 * @query   topicId, sharedWithUserId, ownerId, userId
 */
router.delete('/', removeShare);

module.exports = router;


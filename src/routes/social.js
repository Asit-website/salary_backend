const express = require('express');
const { SocialPost, SocialLike, SocialComment, User, StaffProfile, OrgAccount } = require('../models');
const { authRequired } = require('../middleware/auth');
const { tenantEnforce } = require('../middleware/tenant');

const router = express.Router();

// Helper to check org
function requireOrg(req, res) {
  const orgId = req.tenantOrgAccountId || null;
  if (!orgId || isNaN(orgId)) {
    res.status(403).json({ success: false, message: 'No organization in context' });
    return null;
  }
  return Number(orgId);
}

// Apply common middleware
router.use(authRequired);
router.use(tenantEnforce);

/**
 * GET /admin/social/posts
 * Fetch all posts for the current organization
 */
router.get('/posts', async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const posts = await SocialPost.findAll({
      where: { orgAccountId: orgId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'phone'],
          include: [{ model: StaffProfile, as: 'profile', attributes: ['name', 'photoUrl'] }]
        },
        {
          model: SocialLike,
          as: 'likes',
          attributes: ['id', 'userId']
        },
        {
          model: SocialComment,
          as: 'comments',
          where: { parentId: null },
          required: false,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'phone'],
              include: [{ model: StaffProfile, as: 'profile', attributes: ['name', 'photoUrl'] }]
            },
            {
              model: SocialComment,
              as: 'replies',
              include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'phone'],
                include: [{ model: StaffProfile, as: 'profile', attributes: ['name', 'photoUrl'] }]
              }]
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.json({ success: true, posts });
  } catch (error) {
    console.error('Failed to fetch social posts:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /admin/social/posts
 * Create a new post
 */
router.post('/posts', async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const { content, mediaUrl, type } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const post = await SocialPost.create({
      orgAccountId: orgId,
      userId: req.user.id,
      content,
      mediaUrl,
      type: type || 'post'
    });

    return res.json({ success: true, post });
  } catch (error) {
    console.error('Failed to create social post:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /admin/social/posts/:id/like
 * Toggle like for a post
 */
router.post('/posts/:id/like', async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const postId = req.params.id;
    const userId = req.user.id;

    const existingLike = await SocialLike.findOne({
      where: { postId, userId }
    });

    if (existingLike) {
      await existingLike.destroy();
      return res.json({ success: true, action: 'unliked' });
    } else {
      await SocialLike.create({ postId, userId });
      return res.json({ success: true, action: 'liked' });
    }
  } catch (error) {
    console.error('Failed to toggle like:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /admin/social/posts/:id/comment
 * Add a comment to a post
 */
router.post('/posts/:id/comment', async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const { content, parentId } = req.body;
    const postId = req.params.id;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    const comment = await SocialComment.create({
      postId,
      userId,
      parentId: parentId || null,
      content
    });

    return res.json({ success: true, comment });
  } catch (error) {
    console.error('Failed to add comment:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;

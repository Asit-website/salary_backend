const express = require('express');
const { Asset, AssetAssignment, AssetMaintenance, User, StaffProfile } = require('../models');
const { Op } = require('sequelize');
const router = express.Router();

// Helper function to get orgId from request
const requireOrg = (req, res) => {
  const orgId = req.user?.orgAccountId || req.user?.orgId;
  if (!orgId) {
    res.status(403).json({ success: false, message: 'Organization ID required' });
    return null;
  }
  return orgId;
};

// GET /admin/assets - Get all assets with filters
router.get('/', async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const { 
      page = 1, 
      limit = 10, 
      search, 
      category, 
      status, 
      assignedTo,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const whereClause = { orgId };
    
    // Apply filters
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { serialNumber: { [Op.like]: `%${search}%` } },
        { model: { [Op.like]: `%${search}%` } },
        { brand: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (category) whereClause.category = category;
    if (status) whereClause.status = status;
    if (assignedTo) whereClause.assignedTo = assignedTo;

    const offset = (page - 1) * limit;
    const order = [[sortBy, sortOrder.toUpperCase()]];

    const { count, rows: assets } = await Asset.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'assignedUser',
          include: [{ model: StaffProfile, as: 'profile' }]
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ],
      limit: parseInt(limit),
      offset,
      order,
      distinct: true
    });

    // Get unique categories for filter dropdown
    const categories = await Asset.findAll({
      where: { orgId },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']],
      raw: true
    });

    res.json({
      success: true,
      data: assets,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      },
      filters: {
        categories: categories.map(c => c.category)
      }
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch assets' });
  }
});

// GET /admin/assets/:id - Get single asset
router.get('/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const asset = await Asset.findOne({
      where: { id: req.params.id, orgId },
      include: [
        {
          model: User,
          as: 'assignedUser',
          include: [{ model: StaffProfile, as: 'profile' }]
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'name', 'email']
        },
        {
          model: AssetAssignment,
          as: 'assignments',
          include: [
            {
              model: User,
              as: 'assignedUser',
              include: [{ model: StaffProfile, as: 'profile' }]
            },
            {
              model: User,
              as: 'assignedBy',
              attributes: ['id', 'name', 'email']
            }
          ],
          order: [['assignedDate', 'DESC']]
        },
        {
          model: AssetMaintenance,
          as: 'maintenanceRecords',
          include: [
            {
              model: User,
              as: 'performedBy',
              attributes: ['id', 'name', 'email']
            },
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'name', 'email']
            }
          ],
          order: [['scheduledDate', 'DESC']]
        }
      ]
    });

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    res.json({ success: true, data: asset });
  } catch (error) {
    console.error('Error fetching asset:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch asset' });
  }
});

// POST /admin/assets - Create new asset
router.post('/', async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const {
      name,
      category,
      description,
      serialNumber,
      model,
      brand,
      purchaseDate,
      purchaseCost,
      currentValue,
      location,
      condition,
      warrantyExpiry,
      lastMaintenanceDate,
      nextMaintenanceDate,
      notes,
      attachments
    } = req.body;

    // Check if serial number is unique within organization
    if (serialNumber) {
      const existingAsset = await Asset.findOne({
        where: { orgId, serialNumber }
      });
      if (existingAsset) {
        return res.status(400).json({ 
          success: false, 
          message: 'Serial number already exists' 
        });
      }
    }

    const asset = await Asset.create({
      orgId,
      name,
      category,
      description,
      serialNumber,
      model,
      brand,
      purchaseDate,
      purchaseCost,
      currentValue,
      location,
      condition,
      warrantyExpiry,
      lastMaintenanceDate,
      nextMaintenanceDate,
      notes,
      attachments: attachments || [],
      createdBy: req.user.id,
      updatedBy: req.user.id
    });

    const createdAsset = await Asset.findByPk(asset.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({ success: true, data: createdAsset });
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({ success: false, message: 'Failed to create asset' });
  }
});

// PUT /admin/assets/:id - Update asset
router.put('/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const asset = await Asset.findOne({
      where: { id: req.params.id, orgId }
    });

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    const {
      name,
      category,
      description,
      serialNumber,
      model,
      brand,
      purchaseDate,
      purchaseCost,
      currentValue,
      location,
      condition,
      status,
      assignedTo,
      warrantyExpiry,
      lastMaintenanceDate,
      nextMaintenanceDate,
      notes,
      attachments
    } = req.body;

    // Check if serial number is unique (excluding current asset)
    if (serialNumber && serialNumber !== asset.serialNumber) {
      const existingAsset = await Asset.findOne({
        where: { orgId, serialNumber, id: { [Op.ne]: req.params.id } }
      });
      if (existingAsset) {
        return res.status(400).json({ 
          success: false, 
          message: 'Serial number already exists' 
        });
      }
    }

    await asset.update({
      name,
      category,
      description,
      serialNumber,
      model,
      brand,
      purchaseDate,
      purchaseCost,
      currentValue,
      location,
      condition,
      status,
      assignedTo,
      warrantyExpiry,
      lastMaintenanceDate,
      nextMaintenanceDate,
      notes,
      attachments,
      updatedBy: req.user.id
    });

    const updatedAsset = await Asset.findByPk(asset.id, {
      include: [
        {
          model: User,
          as: 'assignedUser',
          include: [{ model: StaffProfile, as: 'profile' }]
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({ success: true, data: updatedAsset });
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ success: false, message: 'Failed to update asset' });
  }
});

// DELETE /admin/assets/:id - Delete asset
router.delete('/:id', async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const asset = await Asset.findOne({
      where: { id: req.params.id, orgId }
    });

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    // Check if asset has active assignments
    const activeAssignments = await AssetAssignment.findOne({
      where: { assetId: req.params.id, status: 'active' }
    });

    if (activeAssignments) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete asset with active assignments' 
      });
    }

    await asset.destroy();

    res.json({ success: true, message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ success: false, message: 'Failed to delete asset' });
  }
});

// POST /admin/assets/:id/assign - Assign asset to user
router.post('/:id/assign', async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const { assignedTo, notes } = req.body;

    const asset = await Asset.findOne({
      where: { id: req.params.id, orgId }
    });

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    if (asset.status !== 'available') {
      return res.status(400).json({ 
        success: false, 
        message: 'Asset is not available for assignment' 
      });
    }

    // Check if user exists and belongs to same organization
    const user = await User.findOne({
      where: { id: assignedTo, orgAccountId: orgId }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    // Create assignment record
    const assignment = await AssetAssignment.create({
      assetId: req.params.id,
      assignedTo,
      assignedBy: req.user.id,
      assignedDate: new Date(),
      status: 'active',
      notes,
      conditionAtAssignment: asset.condition
    });

    // Update asset status and assignment
    await asset.update({
      status: 'in_use',
      assignedTo,
      assignedDate: new Date(),
      updatedBy: req.user.id
    });

    const updatedAsset = await Asset.findByPk(asset.id, {
      include: [
        {
          model: User,
          as: 'assignedUser',
          include: [{ model: StaffProfile, as: 'profile' }]
        }
      ]
    });

    res.json({ success: true, data: updatedAsset });
  } catch (error) {
    console.error('Error assigning asset:', error);
    res.status(500).json({ success: false, message: 'Failed to assign asset' });
  }
});

// POST /admin/assets/:id/return - Return asset
router.post('/:id/return', async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const { notes, conditionAtReturn } = req.body;

    const asset = await Asset.findOne({
      where: { id: req.params.id, orgId }
    });

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    if (asset.status !== 'in_use') {
      return res.status(400).json({ 
        success: false, 
        message: 'Asset is not currently assigned' 
      });
    }

    // Find active assignment
    const activeAssignment = await AssetAssignment.findOne({
      where: { assetId: req.params.id, status: 'active' }
    });

    if (activeAssignment) {
      // Update assignment record
      await activeAssignment.update({
        status: 'returned',
        returnedDate: new Date(),
        conditionAtReturn: conditionAtReturn || asset.condition
      });
    }

    // Update asset status
    await asset.update({
      status: 'available',
      assignedTo: null,
      assignedDate: null,
      condition: conditionAtReturn || asset.condition,
      updatedBy: req.user.id
    });

    const updatedAsset = await Asset.findByPk(asset.id);
    res.json({ success: true, data: updatedAsset });
  } catch (error) {
    console.error('Error returning asset:', error);
    res.status(500).json({ success: false, message: 'Failed to return asset' });
  }
});

// GET /admin/assets/stats - Get asset statistics
router.get('/stats', async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;

    const stats = await Promise.all([
      // Total assets
      Asset.count({ where: { orgId } }),
      
      // Assets by status
      Asset.findAll({
        where: { orgId },
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      }),
      
      // Assets by category
      Asset.findAll({
        where: { orgId },
        attributes: [
          'category',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['category'],
        raw: true
      }),
      
      // Assets by condition
      Asset.findAll({
        where: { orgId },
        attributes: [
          'condition',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['condition'],
        raw: true
      }),
      
      // Maintenance due (next 30 days)
      Asset.count({
        where: {
          orgId,
          nextMaintenanceDate: {
            [Op.lte]: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            [Op.gte]: new Date()
          }
        }
      })
    ]);

    const [total, statusStats, categoryStats, conditionStats, maintenanceDue] = stats;

    res.json({
      success: true,
      data: {
        total,
        statusStats: statusStats.reduce((acc, stat) => {
          acc[stat.status] = parseInt(stat.count);
          return acc;
        }, {}),
        categoryStats: categoryStats.reduce((acc, stat) => {
          acc[stat.category] = parseInt(stat.count);
          return acc;
        }, {}),
        conditionStats: conditionStats.reduce((acc, stat) => {
          acc[stat.condition] = parseInt(stat.count);
          return acc;
        }, {}),
        maintenanceDue
      }
    });
  } catch (error) {
    console.error('Error fetching asset stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch asset statistics' });
  }
});

module.exports = router;

const express = require('express');
const { User, Role, Permission, RolePermission, UserRole, Subscription, Plan, StaffProfile } = require('../models');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { tenantEnforce } = require('../middleware/tenant');
const { Sequelize } = require('sequelize');

const router = express.Router();

// Get all roles for the organization
router.get('/roles', authRequired, tenantEnforce, async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;

    const roles = await Role.findAll({
      where: { orgAccountId },
      include: [{
        model: Permission,
        as: 'permissions',
        through: { attributes: [] }
      }],
      order: [['name', 'ASC']]
    });

    res.json({ success: true, roles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create a new role
router.post('/roles', authRequired, tenantEnforce, async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;
    const { name, displayName, description, permissionIds } = req.body;

    if (!name || !displayName) {
      return res.status(400).json({ success: false, message: 'Name and display name are required' });
    }

    // Check if role name already exists for this org
    const existingRole = await Role.findOne({
      where: { name, orgAccountId }
    });

    if (existingRole) {
      return res.status(400).json({ success: false, message: 'Role name already exists' });
    }

    const role = await Role.create({
      name,
      displayName,
      description,
      orgAccountId
    });

    // Assign permissions if provided
    if (permissionIds && permissionIds.length > 0) {
      const rolePermissions = permissionIds.map(permissionId => ({
        roleId: role.id,
        permissionId
      }));
      await RolePermission.bulkCreate(rolePermissions);
    }

    // Get role with permissions
    const createdRole = await Role.findByPk(role.id, {
      include: [{
        model: Permission,
        as: 'permissions',
        through: { attributes: [] }
      }]
    });

    res.status(201).json({ success: true, role: createdRole });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Update a role
router.put('/roles/:id', authRequired, tenantEnforce, async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;
    const { id } = req.params;
    const { name, displayName, description, permissionIds } = req.body;

    const role = await Role.findOne({
      where: { id, orgAccountId }
    });

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    // Check if role name already exists (excluding current role)
    if (name && name !== role.name) {
      const existingRole = await Role.findOne({
        where: { name, orgAccountId }
      });

      if (existingRole) {
        return res.status(400).json({ success: false, message: 'Role name already exists' });
      }
    }

    await role.update({
      name: name || role.name,
      displayName: displayName || role.displayName,
      description: description || role.description
    });

    // Update permissions if provided
    if (permissionIds !== undefined) {
      // Remove existing permissions
      await RolePermission.destroy({ where: { roleId: id } });

      // Add new permissions
      if (permissionIds.length > 0) {
        const rolePermissions = permissionIds.map(permissionId => ({
          roleId: id,
          permissionId
        }));
        await RolePermission.bulkCreate(rolePermissions);
      }
    }

    // Get updated role with permissions
    const updatedRole = await Role.findByPk(id, {
      include: [{
        model: Permission,
        as: 'permissions',
        through: { attributes: [] }
      }]
    });

    res.json({ success: true, role: updatedRole });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Delete a role
router.delete('/roles/:id', authRequired, tenantEnforce, async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;
    const { id } = req.params;

    const role = await Role.findOne({
      where: { id, orgAccountId }
    });

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    // Check if role is being used by any users
    const userCount = await UserRole.count({ where: { roleId: id } });
    if (userCount > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete role that is assigned to users' });
    }

    await role.destroy();

    res.json({ success: true, message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get all available permissions
router.get('/permissions', authRequired, async (req, res) => {
  try {
    const permissions = await Permission.findAll({
      order: [['name', 'ASC']]
    });

    res.json({ success: true, permissions });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get staff with their roles
router.get('/staff-with-roles', authRequired, tenantEnforce, async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;

    const staff = await User.findAll({
      where: {
        orgAccountId,
        role: 'staff',
        active: true
      },
      include: [
        {
          model: StaffProfile,
          as: 'profile'
        },
        {
          model: Role,
          as: 'roles',
          through: { attributes: [] },
          include: [{
            model: Permission,
            as: 'permissions',
            through: { attributes: [] }
          }]
        }
      ],
      order: [[{ model: StaffProfile, as: 'profile' }, 'name', 'ASC']]
    });

    res.json({ success: true, staff });
  } catch (error) {
    console.error('Get staff with roles error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Assign role to staff member
router.post('/assign-role', authRequired, tenantEnforce, async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;
    const { userId, roleIds } = req.body;

    console.log('Assign role request:', { userId, roleIds, orgAccountId });

    if (!userId || !roleIds || !Array.isArray(roleIds)) {
      return res.status(400).json({ success: false, message: 'User ID and role IDs are required' });
    }

    // Verify user belongs to the organization
    const user = await User.findOne({
      where: { id: userId, orgAccountId, role: 'staff' }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    // Verify roles belong to the organization and include permissions
    const roles = await Role.findAll({
      where: {
        id: roleIds,
        orgAccountId
      },
      include: [{
        model: Permission,
        as: 'permissions',
        through: { attributes: [] }
      }]
    });

    if (roles.length !== roleIds.length) {
      return res.status(400).json({ success: false, message: 'One or more roles not found' });
    }

    console.log('Roles to assign:', roles.map(r => ({ id: r.id, name: r.name, permissions: r.permissions?.length })));

    // Check if any of the roles being assigned have geolocation permission
    const geoPermission = await Permission.findOne({ where: { name: 'geolocation_access' } });
    const geolocationRoles = roles.filter(role =>
      role.permissions?.some(p => p.id === geoPermission?.id)
    );

    console.log('Geolocation permission:', geoPermission?.id, 'Geolocation roles:', geolocationRoles.length);

    // Check geolocation staff limits if geolocation is enabled and roles have geo permission
    const geolocationEnabled = req.subscriptionInfo?.geolocationEnabled;
    if (geolocationEnabled && req.subscriptionInfo?.maxGeolocationStaff > 0 && geolocationRoles.length > 0) {
      console.log('Checking geolocation limits...');
      const maxGeoStaff = req.subscriptionInfo.maxGeolocationStaff;

      // Count current staff with geolocation permission (excluding current user)
      const allStaff = await User.findAll({
        where: {
          orgAccountId,
          role: 'staff',
          active: true,
          id: { [Sequelize.Op.ne]: userId } // Exclude current user
        },
        include: [
          {
            model: Role,
            as: 'roles',
            through: { attributes: [] },
            include: [{
              model: Permission,
              as: 'permissions',
              through: { attributes: [] }
            }]
          }
        ]
      });

      // Filter users who have the geolocation_access permission
      const usersWithGeoAccess = allStaff.filter(user =>
        user.roles?.some(role =>
          role.permissions?.some(permission => permission.id === geoPermission.id)
        )
      );

      // Count unique users
      const currentGeoStaff = usersWithGeoAccess.length;

      console.log('Current geo staff count (excluding user):', currentGeoStaff);

      // Check if current user already has geolocation permission
      const currentUserRoles = await User.findByPk(userId, {
        include: [{
          model: Role,
          as: 'roles',
          through: { attributes: [] },
          include: [{
            model: Permission,
            as: 'permissions',
            through: { attributes: [] }
          }]
        }]
      });

      const currentUserHasGeo = currentUserRoles?.roles?.some(role =>
        role.permissions?.some(p => p.id === geoPermission.id)
      ) || false;

      console.log('Current user has geo access:', currentUserHasGeo);

      // Calculate new total after assignment
      const newTotalGeoStaff = currentGeoStaff + (currentUserHasGeo ? 0 : 1);

      console.log('New total geo staff after assignment:', newTotalGeoStaff, 'Max allowed:', maxGeoStaff);

      // Check if new assignment would exceed limit
      if (newTotalGeoStaff > maxGeoStaff) {
        console.log('Limit exceeded, blocking assignment');
        return res.status(400).json({
          success: false,
          message: `Geolocation staff limit reached (${maxGeoStaff}). Currently ${currentGeoStaff} staff have geolocation access. Cannot assign more staff with geolocation access.`
        });
      }
    }

    console.log('Proceeding with role assignment...');

    // Remove existing role assignments
    await UserRole.destroy({ where: { userId } });
    console.log('Removed existing roles');

    // Add new role assignments
    const userRoles = roleIds.map(roleId => ({ userId, roleId }));
    await UserRole.bulkCreate(userRoles);
    console.log('Created new role assignments:', userRoles);

    // Get updated user with roles
    const updatedUser = await User.findByPk(userId, {
      include: [{
        model: Role,
        as: 'roles',
        through: { attributes: [] },
        include: [{
          model: Permission,
          as: 'permissions',
          through: { attributes: [] }
        }]
      }]
    });

    console.log('Role assignment completed successfully');
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Assign role error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get subscription limits for geolocation
router.get('/geolocation-limits', authRequired, tenantEnforce, async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;
    console.log('Getting geolocation limits for orgAccountId:', orgAccountId);

    // First check if we have a maxGeolocationStaff value set
    const maxGeoStaff = req.subscriptionInfo?.maxGeolocationStaff || 0;
    const geolocationEnabled = req.subscriptionInfo?.geolocationEnabled;
    console.log('maxGeoStaff value:', maxGeoStaff, 'geolocationEnabled:', geolocationEnabled);

    // If geolocation is disabled or maxGeoStaff is 0, geolocation is effectively disabled
    if (!geolocationEnabled || maxGeoStaff === 0) {
      console.log('Geolocation disabled - enabled:', geolocationEnabled, 'maxGeoStaff:', maxGeoStaff);
      return res.json({
        success: true,
        geolocationEnabled: false,
        maxStaff: 0,
        currentStaff: 0,
        canAssignMore: false
      });
    }

    // Count current staff with geolocation permission
    const geoPermission = await Permission.findOne({ where: { name: 'geolocation_access' } });
    let currentGeoStaff = 0;

    if (geoPermission) {
      // Get all staff users for this organization
      const allStaff = await User.findAll({
        where: {
          orgAccountId,
          role: 'staff',
          active: true
        },
        include: [
          {
            model: Role,
            as: 'roles',
            through: { attributes: [] },
            include: [{
              model: Permission,
              as: 'permissions',
              through: { attributes: [] }
            }]
          }
        ]
      });

      // Filter users who have the geolocation_access permission
      const usersWithGeoAccess = allStaff.filter(user =>
        user.roles?.some(role =>
          role.permissions?.some(permission => permission.id === geoPermission.id)
        )
      );

      // Count unique users
      currentGeoStaff = usersWithGeoAccess.length;
      console.log('Total staff:', allStaff.length, 'Users with geo access:', currentGeoStaff);

      // Debug: Log user IDs with geo access
      if (currentGeoStaff > 0) {
        console.log('User IDs with geolocation access:', usersWithGeoAccess.map(u => u.id).join(', '));
      }
    }

    console.log('Returning geolocation limits - maxStaff:', maxGeoStaff, 'currentStaff:', currentGeoStaff);

    res.json({
      success: true,
      geolocationEnabled: true,
      maxStaff: maxGeoStaff,
      currentStaff: currentGeoStaff,
      canAssignMore: currentGeoStaff < maxGeoStaff
    });
  } catch (error) {
    console.error('Get geolocation limits error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Simple test endpoint to check subscription data
router.get('/test-subscription', authRequired, tenantEnforce, async (req, res) => {
  try {
    const subscription = req.activeSubscription;
    const rawQuery = await require('../models').Subscription.findOne({
      where: { orgAccountId: req.tenantOrgAccountId, status: 'ACTIVE' }
    });

    res.json({
      success: true,
      middlewareSubscription: {
        id: subscription?.id,
        maxGeolocationStaff: subscription?.maxGeolocationStaff,
        dataValues: subscription?.dataValues
      },
      rawQuery: rawQuery?.dataValues,
      tenantOrgAccountId: req.tenantOrgAccountId
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug endpoint for geolocation limits
router.get('/debug-geolocation', authRequired, tenantEnforce, async (req, res) => {
  try {
    const subscription = req.activeSubscription;
    const orgAccountId = req.tenantOrgAccountId;

    const rawSubscription = await Subscription.findOne({
      where: { orgAccountId, status: 'ACTIVE' },
      include: [{ model: Plan, as: 'plan' }]
    });

    res.json({
      success: true,
      tenantOrgAccountId: orgAccountId,
      middlewareSubscription: {
        id: subscription?.id,
        maxGeolocationStaff: subscription?.maxGeolocationStaff,
        staffLimit: subscription?.staffLimit,
        status: subscription?.status
      },
      rawQuerySubscription: {
        id: rawSubscription?.id,
        maxGeolocationStaff: rawSubscription?.maxGeolocationStaff,
        staffLimit: rawSubscription?.staffLimit,
        status: rawSubscription?.status
      }
    });
  } catch (error) {
    console.error('Debug geolocation error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// Fix geo role permissions
router.post('/fix-geo-role', authRequired, tenantEnforce, async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;

    // Find the geo role
    const geoRole = await Role.findOne({
      where: { name: 'geo', orgAccountId }
    });

    if (!geoRole) {
      return res.status(404).json({ success: false, message: 'Geo role not found' });
    }

    // Find geolocation_access permission
    const geoPermission = await Permission.findOne({
      where: { name: 'geolocation_access' }
    });

    if (!geoPermission) {
      return res.status(404).json({ success: false, message: 'Geolocation permission not found' });
    }

    // Check if role already has this permission
    const existingPermission = await RolePermission.findOne({
      where: { roleId: geoRole.id, permissionId: geoPermission.id }
    });

    if (existingPermission) {
      return res.json({ success: true, message: 'Geo role already has geolocation permission' });
    }

    // Add the permission
    await RolePermission.create({
      roleId: geoRole.id,
      permissionId: geoPermission.id
    });

    // Get updated role with permissions
    const updatedRole = await Role.findByPk(geoRole.id, {
      include: [{
        model: Permission,
        as: 'permissions',
        through: { attributes: [] }
      }]
    });

    res.json({ success: true, role: updatedRole, message: 'Geo role fixed with geolocation permission' });
  } catch (error) {
    console.error('Fix geo role error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get current user's permissions (for mobile app) - no auth for testing
// Also supports X-User-ID header to get permissions for specific user (for admin panel)
router.get('/my-permissions-open', async (req, res) => {
  try {
    // Get token from header for testing
    const token = req.headers.authorization?.replace('Bearer ', '');
    console.log('Token received:', token ? 'Yes' : 'No');

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    // Simple token verification (for testing only)
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('Token decoded:', decoded);
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Check if X-User-ID header is provided (for getting specific user's permissions)
    const targetUserId = req.headers['x-user-id'];
    const userId = targetUserId || decoded.id;

    // console.log('Getting permissions for user ID:', userId, '(requested by:', decoded.id, ')');

    const user = await User.findByPk(userId, {
      include: [{
        model: Role,
        as: 'roles',
        through: { attributes: [] },
        include: [{
          model: Permission,
          as: 'permissions',
          through: { attributes: [] }
        }]
      }]
    });

    if (!user) {
      console.log('User not found:', userId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log('User found:', user.id, 'Roles:', user.roles.length);

    // Collect all unique permissions from all roles
    const permissions = new Set();
    user.roles.forEach(role => {
      console.log('Processing role:', role.name, 'Permissions:', role.permissions.length);
      role.permissions.forEach(permission => {
        console.log('Adding permission:', permission.name);
        permissions.add({
          id: permission.id,
          name: permission.name,
          displayName: permission.displayName
        });
      });
    });

    const permissionsArray = Array.from(permissions);
    console.log('Final permissions count:', permissionsArray.length);

    res.json({
      success: true,
      permissions: permissionsArray
    });
  } catch (error) {
    console.error('Get user permissions error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get current user's permissions (for mobile app)
router.get('/my-permissions', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    // console.log('Getting permissions for user ID:', userId);

    const user = await User.findByPk(userId, {
      include: [{
        model: Role,
        as: 'roles',
        through: { attributes: [] },
        include: [{
          model: Permission,
          as: 'permissions',
          through: { attributes: [] }
        }]
      }]
    });

    if (!user) {
      console.log('User not found:', userId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log('User found:', user.id, 'Roles:', user.roles.length);

    // Collect all unique permissions from all roles
    const permissions = new Set();
    user.roles.forEach(role => {
      console.log('Processing role:', role.name, 'Permissions:', role.permissions.length);
      role.permissions.forEach(permission => {
        console.log('Adding permission:', permission.name);
        permissions.add({
          id: permission.id,
          name: permission.name,
          displayName: permission.displayName
        });
      });
    });

    const permissionsArray = Array.from(permissions);
    console.log('Final permissions count:', permissionsArray.length);

    res.json({
      success: true,
      permissions: permissionsArray
    });
  } catch (error) {
    console.error('Get user permissions error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get current user's permissions (admin endpoint)
router.get('/user-permissions', authRequired, tenantEnforce, async (req, res) => {
  try {
    const userId = req.user.id;
    // console.log('Getting permissions for user ID:', userId);

    const user = await User.findByPk(userId, {
      include: [{
        model: Role,
        as: 'roles',
        through: { attributes: [] },
        include: [{
          model: Permission,
          as: 'permissions',
          through: { attributes: [] }
        }]
      }]
    });

    if (!user) {
      console.log('User not found:', userId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log('User found:', user.id, 'Roles:', user.roles.length);

    // Collect all unique permissions from all roles
    const permissions = new Set();
    user.roles.forEach(role => {
      console.log('Processing role:', role.name, 'Permissions:', role.permissions.length);
      role.permissions.forEach(permission => {
        console.log('Adding permission:', permission.name);
        permissions.add({
          id: permission.id,
          name: permission.name,
          displayName: permission.displayName
        });
      });
    });

    const permissionsArray = Array.from(permissions);
    console.log('Final permissions count:', permissionsArray.length);

    res.json({
      success: true,
      permissions: permissionsArray
    });
  } catch (error) {
    console.error('Get user permissions error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});


module.exports = router;

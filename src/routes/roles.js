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

    // Check if organization has geolocation enabled in their subscription
    const subscription = await Subscription.findOne({
      where: { orgAccountId, status: 'ACTIVE' },
      include: [{ model: Plan, as: 'plan' }]
    });

    // Check if any of the roles being assigned have geolocation permission
    const geoPermission = await Permission.findOne({ where: { name: 'geolocation_access' } });
    const geolocationRoles = roles.filter(role => 
      role.permissions?.some(p => p.id === geoPermission?.id)
    );

    // If assigning geolocation roles but org doesn't have geolocation enabled
    if (geolocationRoles.length > 0 && (!subscription || !subscription.plan.geolocationEnabled)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Cannot assign geolocation access roles. Your organization\'s subscription plan does not include geolocation features. Please upgrade your plan to enable geolocation access.' 
      });
    }

    // Check geolocation staff limits if geolocation is enabled
    if (subscription && subscription.plan.geolocationEnabled && geolocationRoles.length > 0) {
      const maxGeoStaff = subscription.meta?.maxGeolocationStaff || subscription.plan.maxGeolocationStaff;
      
      // Count current staff with geolocation permission (excluding the user being updated)
      const currentGeoStaff = await User.count({
        where: { 
          orgAccountId, 
          role: 'staff', 
          active: true,
          id: { [Sequelize.Op.ne]: userId } // Exclude current user
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
              through: { attributes: [] },
              where: { id: geoPermission.id }
            }]
          }
        ]
      });

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

      // Calculate new total after assignment
      const newTotalGeoStaff = currentGeoStaff + (currentUserHasGeo ? 0 : 1);

      // Check if new assignment would exceed limit
      if (newTotalGeoStaff > maxGeoStaff) {
        return res.status(400).json({ 
          success: false, 
          message: `Geolocation staff limit reached (${maxGeoStaff}). Currently ${currentGeoStaff} staff have geolocation access. Cannot assign more staff with geolocation access.` 
        });
      }
    }

    // Remove existing role assignments
    await UserRole.destroy({ where: { userId } });

    // Add new role assignments
    const userRoles = roleIds.map(roleId => ({ userId, roleId }));
    await UserRole.bulkCreate(userRoles);

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
    
    const subscription = await Subscription.findOne({
      where: { orgAccountId, status: 'ACTIVE' },
      include: [{ model: Plan, as: 'plan' }]
    });

    if (!subscription || !subscription.plan.geolocationEnabled) {
      return res.json({ 
        success: true, 
        geolocationEnabled: false,
        maxStaff: 0,
        currentStaff: 0
      });
    }

    const maxGeoStaff = subscription.meta?.maxGeolocationStaff || subscription.plan.maxGeolocationStaff;
    
    // Count current staff with geolocation permission
    const geoPermission = await Permission.findOne({ where: { name: 'geolocation_access' } });
    let currentGeoStaff = 0;
    
    if (geoPermission) {
      currentGeoStaff = await User.count({
        where: { orgAccountId, role: 'staff', active: true },
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
              through: { attributes: [] },
              where: { id: geoPermission.id }
            }]
          }
        ]
      });
    }

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

// Test endpoint to verify API is working
router.get('/test', (req, res) => {
  console.log('Test endpoint called');
  res.json({ success: true, message: 'Roles API is working' });
});

// Open test endpoint (no auth required)
router.get('/open-test', (req, res) => {
  console.log('Open test endpoint called');
  res.json({ success: true, message: 'Open API is working' });
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
    
    console.log('Getting permissions for user ID:', userId, '(requested by:', decoded.id, ')');
    
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
    console.log('Getting permissions for user ID:', userId);
    
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
    console.log('Getting permissions for user ID:', userId);
    
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

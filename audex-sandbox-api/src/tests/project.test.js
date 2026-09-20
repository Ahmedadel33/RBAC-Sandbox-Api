const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../server'); 
const User = require('../models/User');

describe('Project API & RBAC Tests (Real DB & Fresh Token)', () => {

 beforeAll(async () => {
    const mongoUri = 'mongodb://localhost:27017/audex-sandbox';
    
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        family: 4  
      });
    }
  }, 10000);

   afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  test('GET /api/projects - Should fail if no token provided (401)', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.statusCode).toEqual(401);
  });

  test('GET /api/projects - Should allow Admin with valid token', async () => {
    const adminUser = await User.create({
      name: 'Admin Test',
      email: `admin_${Date.now()}_${Math.random()}@test.com`,
      password: 'password123',
      role: 'admin',
      department: 'IT'
    });

    const token = jwt.sign(
      { id: adminUser._id, role: adminUser.role }, 
      process.env.JWT_SECRET || 'your_super_secret_key_here', 
      { expiresIn: '1d' }
    );

    const res = await request(app)
      .get('/api/projects')
      .set('Cookie', [`token=${token}`]);

    await User.findByIdAndDelete(adminUser._id);

    expect(res.statusCode).not.toEqual(401);
    expect(res.statusCode).not.toEqual(403);
  });

  test('GET /api/projects - Should allow Manager with valid token', async () => {
    const managerUser = await User.create({
      name: 'Manager Test',
      email: `manager_${Date.now()}_${Math.random()}@test.com`,
      password: 'password123',
      role: 'manager',
      department: 'Development'
    });

    const token = jwt.sign(
      { id: managerUser._id, role: managerUser.role }, 
      process.env.JWT_SECRET || 'your_super_secret_key_here', 
      { expiresIn: '1d' }
    );

    const res = await request(app)
      .get('/api/projects')
      .set('Cookie', [`token=${token}`]);

    await User.findByIdAndDelete(managerUser._id);

    expect(res.statusCode).not.toEqual(401);
    expect(res.statusCode).not.toEqual(403);
  });

  test('POST /api/roles - Should allow admin to create a role dynamically', async () => {
    const adminUser = await User.create({
      name: 'RBAC Admin',
      email: `rbac_admin_${Date.now()}_${Math.random()}@test.com`,
      password: 'password123',
      role: 'admin',
      department: 'Operations'
    });

    const token = jwt.sign(
      { id: adminUser._id, role: adminUser.role },
      process.env.JWT_SECRET || 'your_super_secret_key_here',
      { expiresIn: '1d' }
    );

    const roleName = `editor_${Date.now()}`;

    const res = await request(app)
      .post('/api/roles')
      .set('Cookie', [`token=${token}`])
      .send({ name: roleName, description: 'Can edit projects' });

    await User.findByIdAndDelete(adminUser._id);

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(roleName);
  });

  test('POST /api/permissions - Should create a permission with endpoint and method', async () => {
    const adminUser = await User.create({
      name: 'Permission Admin',
      email: `rbac_perm_${Date.now()}_${Math.random()}@test.com`,
      password: 'password123',
      role: 'admin',
      department: 'Operations'
    });

    const token = jwt.sign(
      { id: adminUser._id, role: adminUser.role },
      process.env.JWT_SECRET || 'your_super_secret_key_here',
      { expiresIn: '1d' }
    );

    const permissionPath = `/api/reports_${Date.now()}`;

    const res = await request(app)
      .post('/api/permissions')
      .set('Cookie', [`token=${token}`])
      .send({ name: 'Create Report', method: 'POST', path: permissionPath });

    await User.findByIdAndDelete(adminUser._id);

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.path).toBe(permissionPath);
    expect(res.body.data.method).toBe('POST');
  });

});
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

// Configure environment variables before importing app
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test_memory_db';
process.env.JWT_SECRET = 'super-secret-test-jwt-key-minimum-32-chars-long';
process.env.JWT_EXPIRES_IN = '1d';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
process.env.BCRYPT_SALT_ROUNDS = '4';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '10000';

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Dynamically import app after establishing in-memory MongoDB connection
  const appModule = await import('../src/app.js');
  app = appModule.default;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('TaskFlow REST API Integration Tests', () => {
  // Helper to register a test user
  const registerUser = async (name, email, password) => {
    return request(app).post('/api/auth/register').send({ name, email, password });
  };

  // 1. POST /api/auth/register
  describe('1. POST /api/auth/register', () => {
    it('should register a new user successfully (201) without exposing passwordHash', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alice Johnson',
          email: 'alice@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('alice@example.com');
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should return 400 when required registration fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'incomplete@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(typeof res.body.message).toBe('string');
    });

    it('should return 409 when registering with an existing email', async () => {
      await registerUser('User One', 'duplicate@example.com', 'Password123!');

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'User Two',
          email: 'duplicate@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/duplicate/i);
    });
  });

  // 2. POST /api/auth/login
  describe('2. POST /api/auth/login', () => {
    it('should log in an existing user with valid credentials (200)', async () => {
      await registerUser('Bob Smith', 'bob@example.com', 'Password123!');

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bob@example.com', password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('should return 401 with consistent error shape when credentials are wrong', async () => {
      await registerUser('Bob Smith', 'bob@example.com', 'Password123!');

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bob@example.com', password: 'WrongPassword!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(typeof res.body.message).toBe('string');
    });
  });

  // 3. GET /api/users/me
  describe('3. GET /api/users/me', () => {
    it('should return profile with valid Bearer token (200)', async () => {
      const regRes = await registerUser('Charlie', 'charlie@example.com', 'Password123!');
      const token = regRes.body.data.token;

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('charlie@example.com');
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('should return 401 without Bearer token', async () => {
      const res = await request(app).get('/api/users/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // 4. GET /api/users
  describe('4. GET /api/users', () => {
    it('admin should receive 200, regular user should receive 403', async () => {
      // Create normal user
      const userRes = await registerUser('Normal User', 'normal@example.com', 'Password123!');
      const userToken = userRes.body.data.token;

      // Normal user tries to access /api/users -> 403
      const forbiddenRes = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(forbiddenRes.status).toBe(403);
      expect(forbiddenRes.body.success).toBe(false);

      // Create admin user directly in DB
      const User = mongoose.model('User');
      await User.updateOne({ email: 'normal@example.com' }, { role: 'admin' });

      // Admin accesses /api/users -> 200
      const adminRes = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.success).toBe(true);
      expect(Array.isArray(adminRes.body.data.users)).toBe(true);
      expect(adminRes.body.data.pagination).toBeDefined();
    });
  });

  // 5. POST /api/projects
  describe('5. POST /api/projects & Member check', () => {
    it('should create project and allow user to only see their own projects', async () => {
      const userARes = await registerUser('User A', 'userA@example.com', 'Password123!');
      const tokenA = userARes.body.data.token;

      const userBRes = await registerUser('User B', 'userB@example.com', 'Password123!');
      const tokenB = userBRes.body.data.token;

      // User A creates project
      const projRes = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'User A Project', description: 'Exclusive workspace' });

      expect(projRes.status).toBe(201);
      expect(projRes.body.success).toBe(true);
      expect(projRes.body.data.project.title).toBe('User A Project');

      // User A gets their projects (sees 1)
      const listA = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(listA.body.data.projects.length).toBe(1);

      // User B gets their projects (sees 0)
      const listB = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${tokenB}`);
      expect(listB.body.data.projects.length).toBe(0);
    });
  });

  // 6. GET /api/projects/:id
  describe('6. GET /api/projects/:id', () => {
    it('non-member should get 404 to avoid leaking project existence', async () => {
      const userARes = await registerUser('Owner', 'owner@example.com', 'Password123!');
      const tokenA = userARes.body.data.token;

      const userBRes = await registerUser('Strangr', 'stranger@example.com', 'Password123!');
      const tokenB = userBRes.body.data.token;

      const projRes = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'Secret Project' });

      const projectId = projRes.body.data.project._id;

      const getRes = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(getRes.status).toBe(404);
      expect(getRes.body.success).toBe(false);
      expect(getRes.body.message).toMatch(/not found/i);
    });
  });

  // 7. PATCH /api/projects/:id
  describe('7. PATCH /api/projects/:id', () => {
    it('non-owner should get 403 when attempting to update project', async () => {
      const ownerRes = await registerUser('Owner P', 'ownerP@example.com', 'Password123!');
      const tokenOwner = ownerRes.body.data.token;

      const nonOwnerRes = await registerUser('Non Owner', 'nonowner@example.com', 'Password123!');
      const tokenNonOwner = nonOwnerRes.body.data.token;

      const projRes = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ title: 'Original Title' });

      const projectId = projRes.body.data.project._id;

      // Add non-owner as member
      await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ email: 'nonowner@example.com' });

      // Non-owner attempts to update -> 403
      const patchRes = await request(app)
        .patch(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${tokenNonOwner}`)
        .send({ title: 'Hacked Title' });

      expect(patchRes.status).toBe(403);
      expect(patchRes.body.success).toBe(false);
    });
  });

  // 8. DELETE /api/projects/:id
  describe('8. DELETE /api/projects/:id', () => {
    it('cascade deletes project, tasks, and comments', async () => {
      const userRes = await registerUser('Del User', 'del@example.com', 'Password123!');
      const token = userRes.body.data.token;

      // Create project
      const projRes = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Project to Delete' });
      const projectId = projRes.body.data.project._id;

      // Create task
      const taskRes = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Task to Delete' });
      const taskId = taskRes.body.data.task._id;

      // Create comment
      await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Comment to be cascaded' });

      // Delete project
      const delRes = await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(delRes.status).toBe(200);

      // Verify cascade deletion
      const Project = mongoose.model('Project');
      const Task = mongoose.model('Task');
      const Comment = mongoose.model('Comment');

      expect(await Project.findById(projectId)).toBeNull();
      expect(await Task.findOne({ project: projectId })).toBeNull();
      expect(await Comment.findOne({ task: taskId })).toBeNull();
    });
  });

  // 9. POST /api/projects/:id/members
  describe('9. POST /api/projects/:id/members', () => {
    it('owner adds member, duplicate addition returns 409', async () => {
      const ownerRes = await registerUser('Owner M', 'ownerm@example.com', 'Password123!');
      const tokenOwner = ownerRes.body.data.token;

      const memberRes = await registerUser('Collab M', 'collab@example.com', 'Password123!');

      const projRes = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ title: 'Collab Project' });
      const projectId = projRes.body.data.project._id;

      // First addition: success (200)
      const addRes = await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ email: 'collab@example.com' });

      expect(addRes.status).toBe(200);
      expect(addRes.body.success).toBe(true);

      // Duplicate addition: conflict (409)
      const dupRes = await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ email: 'collab@example.com' });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.success).toBe(false);
    });
  });

  // 10. POST /api/projects/:id/tasks
  describe('10. POST /api/projects/:id/tasks', () => {
    it('non-member gets 403 when creating a task', async () => {
      const ownerRes = await registerUser('Owner T', 'ownert@example.com', 'Password123!');
      const tokenOwner = ownerRes.body.data.token;

      const strangerRes = await registerUser('Stranger T', 'strangert@example.com', 'Password123!');
      const tokenStranger = strangerRes.body.data.token;

      const projRes = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ title: 'Task Workspace' });
      const projectId = projRes.body.data.project._id;

      const taskRes = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${tokenStranger}`)
        .send({ title: 'Unauthorized task' });

      expect(taskRes.status).toBe(403);
      expect(taskRes.body.success).toBe(false);
    });
  });

  // 11. GET /api/projects/:id/tasks
  describe('11. GET /api/projects/:id/tasks', () => {
    it('filter by status and correct pagination meta', async () => {
      const ownerRes = await registerUser('Owner Filter', 'filter@example.com', 'Password123!');
      const token = ownerRes.body.data.token;

      const projRes = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Filter Project' });
      const projectId = projRes.body.data.project._id;

      // Create 3 tasks: 2 todo, 1 done
      await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Task 1', status: 'todo' });

      await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Task 2', status: 'todo' });

      await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Task 3', status: 'done' });

      // Filter by status=todo, limit=1
      const getRes = await request(app)
        .get(`/api/projects/${projectId}/tasks?status=todo&page=1&limit=1`)
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data.tasks.length).toBe(1);
      expect(getRes.body.data.tasks[0].status).toBe('todo');
      expect(getRes.body.data.pagination).toEqual({
        page: 1,
        limit: 1,
        total: 2,
        totalPages: 2,
      });
    });
  });

  // 12. PATCH /api/tasks/:id
  describe('12. PATCH /api/tasks/:id', () => {
    it('creator can update, non-creator gets 403', async () => {
      const creatorRes = await registerUser('Creator', 'creator@example.com', 'Password123!');
      const tokenCreator = creatorRes.body.data.token;

      const otherRes = await registerUser('Other', 'other@example.com', 'Password123!');
      const tokenOther = otherRes.body.data.token;

      const projRes = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${tokenCreator}`)
        .send({ title: 'Update Task Project' });
      const projectId = projRes.body.data.project._id;

      const taskRes = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${tokenCreator}`)
        .send({ title: 'Initial Task' });
      const taskId = taskRes.body.data.task._id;

      // Creator updates task -> 200
      const updateRes = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${tokenCreator}`)
        .send({ title: 'Updated Task Title', status: 'in-progress' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.task.title).toBe('Updated Task Title');
      expect(updateRes.body.data.task.status).toBe('in-progress');

      // Non-creator/non-assignee tries to update -> 403
      const forbiddenRes = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${tokenOther}`)
        .send({ title: 'Hacked Title' });

      expect(forbiddenRes.status).toBe(403);
    });
  });

  // 13. DELETE /api/tasks/:id
  describe('13. DELETE /api/tasks/:id', () => {
    it('deleting task cascades comments', async () => {
      const userRes = await registerUser('Task Del', 'taskdel@example.com', 'Password123!');
      const token = userRes.body.data.token;

      const projRes = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Task Del Project' });
      const projectId = projRes.body.data.project._id;

      const taskRes = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Task to Cascade' });
      const taskId = taskRes.body.data.task._id;

      // Add comment to task
      await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Direct task comment' });

      // Delete task
      const delRes = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(delRes.status).toBe(200);

      const Task = mongoose.model('Task');
      const Comment = mongoose.model('Comment');

      expect(await Task.findById(taskId)).toBeNull();
      expect(await Comment.findOne({ task: taskId })).toBeNull();
    });
  });

  // 14. POST /api/tasks/:id/comments
  describe('14. POST /api/tasks/:id/comments', () => {
    it('member can comment, non-member cannot (403)', async () => {
      const ownerRes = await registerUser('Comment Owner', 'cowner@example.com', 'Password123!');
      const tokenOwner = ownerRes.body.data.token;

      const outsiderRes = await registerUser('Outsider', 'outsider@example.com', 'Password123!');
      const tokenOutsider = outsiderRes.body.data.token;

      const projRes = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ title: 'Comment Project' });
      const projectId = projRes.body.data.project._id;

      const taskRes = await request(app)
        .post(`/api/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ title: 'Commentable Task' });
      const taskId = taskRes.body.data.task._id;

      // Owner (member) posts comment -> 201
      const okRes = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ text: 'Great progress on this!' });

      expect(okRes.status).toBe(201);
      expect(okRes.body.data.comment.text).toBe('Great progress on this!');

      // Outsider attempts to comment -> 403
      const failRes = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${tokenOutsider}`)
        .send({ text: 'Spam comment' });

      expect(failRes.status).toBe(403);
    });
  });

  // 15. Error shape: { success: false, message: string }
  describe('15. Error shape standardization', () => {
    it('every error has { success: false, message: string }', async () => {
      const res = await request(app).get('/api/unknown-endpoint-404');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(typeof res.body.message).toBe('string');
      expect(res.body.message.length).toBeGreaterThan(0);
    });
  });

  // 16. NoSQL injection: body { email: { $ne: null } } -> 400
  describe('16. NoSQL injection prevention', () => {
    it('sanitizes mongo operators and fails schema validation with 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: { $ne: null },
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // 17. Invalid ObjectId param -> 400
  describe('17. Invalid ObjectId route parameter', () => {
    it('returns 400 for malformed ObjectId param', async () => {
      const userRes = await registerUser('ID User', 'iduser@example.com', 'Password123!');
      const token = userRes.body.data.token;

      const res = await request(app)
        .get('/api/projects/123-invalid-id')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid ObjectId/i);
    });
  });

  // 18. Tampered JWT -> 401
  describe('18. Tampered JWT token', () => {
    it('returns 401 when token signature is invalid or tampered', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid token');
    });
  });

  // 19. GET /health -> 200 { success: true, data: { status: 'ok' } }
  describe('19. GET /health', () => {
    it('returns 200 { success: true, data: { status: "ok" } }', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: {
          status: 'ok',
        },
      });
    });
  });
});

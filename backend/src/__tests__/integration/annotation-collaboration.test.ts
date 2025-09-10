import request from 'supertest';
import { Server } from 'http';
import { io as Client } from 'socket.io-client';
import { createTestServer, TestSetup, cleanupTestServer } from './test-setup';
import { AnnotationService } from '../../services/AnnotationService';
import { WebSocketService } from '../../services/WebSocketService';
import { SessionService } from '../../services/SessionService';
import { UserService } from '../../services/UserService';

describe('Annotation Collaboration Integration Tests', () => {
  let setup: TestSetup;
  let clientSocket: any;
  let testUser: any;
  let testSession: any;
  let authToken: string;

  beforeAll(async () => {
    setup = await createTestServer();
    
    // Start server
    await new Promise<void>((resolve) => {
      setup.server.listen(0, () => resolve());
    });

    // Create test user
    testUser = await setup.userService.register({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      avatar: 'https://example.com/avatar.jpg'
    });
    
    // Generate auth token (simplified for testing)
    authToken = 'test-token';

    // Create test code snippet first
    const codeSnippet = await setup.codeSnippetService.storeCodeSnippet(
      'console.log("Hello World");',
      'javascript',
      'test.js'
    );

    // Create test session
    testSession = await setup.sessionService.createSession(
      testUser.id,
      codeSnippet.id,
      10
    );
  });

  afterAll(async () => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    await cleanupTestServer(setup);
  });

  beforeEach((done) => {
    const port = (setup.server.address() as any)?.port || 5000;
    clientSocket = Client(`http://localhost:${port}`, {
      auth: {
        token: authToken
      }
    });

    clientSocket.on('connect', () => {
      done();
    });

    clientSocket.on('connect_error', (error: any) => {
      console.error('Connection error:', error);
      done(error);
    });
  });

  afterEach((done) => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    done();
  });

  describe('Annotation CRUD Operations', () => {
    it('should create annotation via API', async () => {
      const annotationData = {
        sessionId: testSession.id,
        lineStart: 1,
        lineEnd: 3,
        columnStart: 0,
        columnEnd: 10,
        content: 'This is a test comment',
        type: 'comment'
      };

      const response = await request(setup.app)
        .post('/api/annotations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(annotationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        sessionId: testSession.id,
        lineStart: 1,
        lineEnd: 3,
        columnStart: 0,
        columnEnd: 10,
        content: 'This is a test comment',
        type: 'comment',
        userId: testUser.id
      });
    });

    it('should get session annotations', async () => {
      const response = await request(setup.app)
        .get(`/api/sessions/${testSession.id}/annotations`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should update annotation via API', async () => {
      // First create an annotation
      const createResponse = await request(setup.app)
        .post('/api/annotations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: testSession.id,
          lineStart: 5,
          lineEnd: 7,
          columnStart: 0,
          columnEnd: 15,
          content: 'Original comment',
          type: 'comment'
        })
        .expect(201);

      const annotationId = createResponse.body.data.id;

      // Update the annotation
      const updateResponse = await request(setup.app)
        .put(`/api/annotations/${annotationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Updated comment',
          type: 'suggestion'
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.content).toBe('Updated comment');
      expect(updateResponse.body.data.type).toBe('suggestion');
    });

    it('should delete annotation via API', async () => {
      // First create an annotation
      const createResponse = await request(setup.app)
        .post('/api/annotations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: testSession.id,
          lineStart: 10,
          lineEnd: 12,
          columnStart: 0,
          columnEnd: 20,
          content: 'Comment to delete',
          type: 'question'
        })
        .expect(201);

      const annotationId = createResponse.body.data.id;

      // Delete the annotation
      const deleteResponse = await request(setup.app)
        .delete(`/api/annotations/${annotationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
    });
  });

  describe('Real-time Annotation Collaboration', () => {
    it('should broadcast annotation creation to all session participants', (done) => {
      clientSocket.emit('join-session', {
        sessionId: testSession.id,
        userId: testUser.id
      });

      clientSocket.on('session-joined', () => {
        // Create annotation via WebSocket
        clientSocket.emit('add-annotation', {
          sessionId: testSession.id,
          annotation: {
            lineStart: 1,
            lineEnd: 2,
            columnStart: 0,
            columnEnd: 5,
            content: 'Real-time annotation',
            type: 'comment'
          }
        });
      });

      clientSocket.on('annotation-added', (data: any) => {
        expect(data.annotation).toMatchObject({
          sessionId: testSession.id,
          lineStart: 1,
          lineEnd: 2,
          columnStart: 0,
          columnEnd: 5,
          content: 'Real-time annotation',
          type: 'comment',
          userId: testUser.id
        });
        done();
      });

      clientSocket.on('error', (error: any) => {
        done(error);
      });
    });

    it('should broadcast annotation updates to all session participants', (done) => {
      clientSocket.emit('join-session', {
        sessionId: testSession.id,
        userId: testUser.id
      });

      let annotationId: string;

      clientSocket.on('session-joined', async () => {
        // First create an annotation
        const createResponse = await request(setup.app)
          .post('/api/annotations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            sessionId: testSession.id,
            lineStart: 3,
            lineEnd: 4,
            columnStart: 0,
            columnEnd: 8,
            content: 'Original content',
            type: 'comment'
          });

        annotationId = createResponse.body.data.id;

        // Update annotation via WebSocket
        clientSocket.emit('update-annotation', {
          sessionId: testSession.id,
          annotationId,
          updates: {
            content: 'Updated content',
            type: 'suggestion'
          }
        });
      });

      clientSocket.on('annotation-updated', (data: any) => {
        expect(data.annotation).toMatchObject({
          id: annotationId,
          content: 'Updated content',
          type: 'suggestion',
          userId: testUser.id
        });
        done();
      });

      clientSocket.on('error', (error: any) => {
        done(error);
      });
    });

    it('should broadcast annotation deletion to all session participants', (done) => {
      clientSocket.emit('join-session', {
        sessionId: testSession.id,
        userId: testUser.id
      });

      let annotationId: string;

      clientSocket.on('session-joined', async () => {
        // First create an annotation
        const createResponse = await request(setup.app)
          .post('/api/annotations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            sessionId: testSession.id,
            lineStart: 5,
            lineEnd: 6,
            columnStart: 0,
            columnEnd: 12,
            content: 'Annotation to delete',
            type: 'question'
          });

        annotationId = createResponse.body.data.id;

        // Delete annotation via WebSocket
        clientSocket.emit('delete-annotation', {
          sessionId: testSession.id,
          annotationId
        });
      });

      clientSocket.on('annotation-deleted', (data: any) => {
        expect(data.annotationId).toBe(annotationId);
        expect(data.userId).toBe(testUser.id);
        done();
      });

      clientSocket.on('error', (error: any) => {
        done(error);
      });
    });
  });

  describe('Annotation Filtering and Search', () => {
    beforeEach(async () => {
      // Create test annotations of different types
      await setup.annotationService.createAnnotation({
        userId: testUser.id,
        sessionId: testSession.id,
        lineStart: 1,
        lineEnd: 2,
        columnStart: 0,
        columnEnd: 10,
        content: 'This is a comment',
        type: 'comment'
      });

      await setup.annotationService.createAnnotation({
        userId: testUser.id,
        sessionId: testSession.id,
        lineStart: 3,
        lineEnd: 4,
        columnStart: 0,
        columnEnd: 15,
        content: 'This is a suggestion',
        type: 'suggestion'
      });

      await setup.annotationService.createAnnotation({
        userId: testUser.id,
        sessionId: testSession.id,
        lineStart: 5,
        lineEnd: 6,
        columnStart: 0,
        columnEnd: 12,
        content: 'This is a question',
        type: 'question'
      });
    });

    it('should get annotations by line range', async () => {
      const response = await request(setup.app)
        .get(`/api/sessions/${testSession.id}/annotations/line-range`)
        .query({ lineStart: 1, lineEnd: 3 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2); // Should include annotations on lines 1-2 and 3-4
    });

    it('should get user annotations', async () => {
      const response = await request(setup.app)
        .get(`/api/users/${testUser.id}/annotations`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for unauthenticated requests', async () => {
      await request(setup.app)
        .post('/api/annotations')
        .send({
          sessionId: testSession.id,
          lineStart: 1,
          lineEnd: 2,
          columnStart: 0,
          columnEnd: 10,
          content: 'Test comment',
          type: 'comment'
        })
        .expect(401);
    });

    it('should return 400 for invalid annotation data', async () => {
      await request(setup.app)
        .post('/api/annotations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: testSession.id,
          lineStart: -1, // Invalid line
          lineEnd: 2,
          columnStart: 0,
          columnEnd: 10,
          content: 'Test comment',
          type: 'comment'
        })
        .expect(400);
    });

    it('should return 404 for non-existent annotation', async () => {
      await request(setup.app)
        .get('/api/annotations/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 403 for unauthorized annotation access', async () => {
      // Create annotation
      const createResponse = await request(setup.app)
        .post('/api/annotations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: testSession.id,
          lineStart: 1,
          lineEnd: 2,
          columnStart: 0,
          columnEnd: 10,
          content: 'Test comment',
          type: 'comment'
        });

      const annotationId = createResponse.body.data.id;

      // Create another user
      const anotherUser = await setup.userService.register({
        username: 'anotheruser',
        email: 'another@example.com',
        password: 'password123',
        avatar: 'https://example.com/avatar2.jpg'
      });

      // Try to update annotation with different user
      await request(setup.app)
        .put(`/api/annotations/${annotationId}`)
        .set('Authorization', `Bearer another-token`)
        .send({
          content: 'Unauthorized update'
        })
        .expect(403);
    });
  });

  describe('Performance and Caching', () => {
    it('should handle multiple concurrent annotation operations', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(setup.app)
            .post('/api/annotations')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              sessionId: testSession.id,
              lineStart: i,
              lineEnd: i + 1,
              columnStart: 0,
              columnEnd: 10,
              content: `Concurrent annotation ${i}`,
              type: 'comment'
            })
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    });

    it('should clear session annotations', async () => {
      const response = await request(setup.app)
        .delete(`/api/sessions/${testSession.id}/annotations`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.deletedCount).toBeGreaterThan(0);
    });
  });
});

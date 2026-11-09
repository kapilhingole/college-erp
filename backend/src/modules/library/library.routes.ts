import { Router } from 'express';
import { LibraryController } from './library.controller';
import { authenticateJWT } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { logAudit } from '../../middleware/audit';

const router = Router();

// Everyone can view catalog and check their issues
router.get('/books', authenticateJWT, LibraryController.listBooks);
router.get('/issues', authenticateJWT, LibraryController.listIssues);

// Admin / Librarian operations
router.post(
  '/books',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN'),
  logAudit('LIBRARY', 'ADD_BOOK'),
  LibraryController.addBook
);
router.post(
  '/issue',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN'),
  logAudit('LIBRARY', 'ISSUE_BOOK'),
  LibraryController.issueBook
);
router.post(
  '/return/:issueRecordId',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN'),
  logAudit('LIBRARY', 'RETURN_BOOK'),
  LibraryController.returnBook
);

export default router;

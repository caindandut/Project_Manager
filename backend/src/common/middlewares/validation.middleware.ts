import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { ApiError } from '../utils/apiError';
import { ErrorCode } from '../../types/enums';

export const validate = (
  validations: ValidationChain[],
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    for (const validation of validations) {
      const result = await validation.run(req);
      if (!result.isEmpty()) break;
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
      return;
    }

    const formattedErrors = errors.array().map((err) => ({
      field: 'path' in err ? err.path : 'unknown',
      message: err.msg,
    }));

    next(ApiError.badRequest(
      ErrorCode.VALIDATION_ERROR,
      'Validation failed',
      formattedErrors
    ));
  };
};

// Common validation rules
export const validationRules = {
  // Auth validations
  register: [
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail()
      .isLength({ max: 255 })
      .withMessage('Email must be at most 255 characters'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number')
      .matches(/[!@#$%^&*(),.?":{}|<>]/)
      .withMessage('Password must contain at least one special character'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
  ],

  login: [
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],

  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/[A-Z]/)
      .withMessage('New password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('New password must contain at least one lowercase letter')
      .matches(/[0-9]/)
      .withMessage('New password must contain at least one number')
      .matches(/[!@#$%^&*(),.?":{}|<>]/)
      .withMessage('New password must contain at least one special character'),
  ],

  forgotPassword: [
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
  ],

  resetPassword: [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number')
      .matches(/[!@#$%^&*(),.?":{}|<>]/)
      .withMessage('Password must contain at least one special character'),
  ],

  // Workspace validations
  createWorkspace: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Workspace name must be between 2 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be at most 500 characters'),
    body('logo')
      .optional()
      .trim()
      .isURL()
      .withMessage('Logo must be a valid URL'),
  ],

  updateWorkspace: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Workspace name must be between 2 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be at most 500 characters'),
    body('logo')
      .optional()
      .trim()
      .isURL()
      .withMessage('Logo must be a valid URL'),
  ],

  inviteMember: [
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    body('role')
      .optional()
      .isIn(['ADMIN', 'MEMBER', 'GUEST'])
      .withMessage('Role must be ADMIN, MEMBER, or GUEST'),
  ],

  updateMemberRole: [
    body('role')
      .isIn(['ADMIN', 'MEMBER', 'GUEST'])
      .withMessage('Role must be ADMIN, MEMBER, or GUEST'),
  ],

  // Project validations
  createProject: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Project name must be between 2 and 100 characters'),
    body('key')
      .trim()
      .isLength({ min: 2, max: 10 })
      .withMessage('Project key must be between 2 and 10 characters')
      .matches(/^[A-Z]+$/)
      .withMessage('Project key must contain only uppercase letters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be at most 500 characters'),
    body('color')
      .optional()
      .trim()
      .matches(/^#[0-9A-Fa-f]{6}$/)
      .withMessage('Color must be a valid hex color code'),
  ],

  updateProject: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Project name must be between 2 and 100 characters'),
    body('key')
      .optional()
      .trim()
      .isLength({ min: 2, max: 10 })
      .withMessage('Project key must be between 2 and 10 characters')
      .matches(/^[A-Z]+$/)
      .withMessage('Project key must contain only uppercase letters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be at most 500 characters'),
    body('color')
      .optional()
      .trim()
      .matches(/^#[0-9A-Fa-f]{6}$/)
      .withMessage('Color must be a valid hex color code'),
  ],

  // Task validations
  createTask: [
    body('title')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Task title is required and must be at most 255 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage('Description must be at most 5000 characters'),
    body('type')
      .optional()
      .isIn(['TASK', 'SUB_TASK'])
      .withMessage('Type must be TASK or SUB_TASK'),
    body('status')
      .optional()
      .isIn(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED'])
      .withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST'])
      .withMessage('Invalid priority'),
    body('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Due date must be a valid ISO 8601 date'),
    body('estimatedHours')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Estimated hours must be a positive number'),
    body('assigneeId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Assignee ID must be a positive integer'),
  ],

  updateTask: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Task title must be at most 255 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage('Description must be at most 5000 characters'),
    body('status')
      .optional()
      .isIn(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED'])
      .withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST'])
      .withMessage('Invalid priority'),
    body('startDate')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    body('dueDate')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('Due date must be a valid ISO 8601 date'),
    body('estimatedHours')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Estimated hours must be a positive number'),
    body('assigneeId')
      .optional({ nullable: true })
      .isInt({ min: 1 })
      .withMessage('Assignee ID must be a positive integer'),
    body('order')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Order must be a non-negative integer'),
  ],

  updateTaskStatus: [
    body('status')
      .isIn(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED'])
      .withMessage('Invalid status'),
  ],

  assignTask: [
    body('assigneeId')
      .optional({ nullable: true })
      .isInt({ min: 1 })
      .withMessage('Assignee ID must be a positive integer'),
  ],

  timeLog: [
    body('hours')
      .isFloat({ min: 0.01, max: 24 })
      .withMessage('Hours must be between 0 and 24'),
    body('note')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Note must be at most 500 characters'),
  ],

  // Comment validations
  createComment: [
    body('content')
      .trim()
      .isLength({ min: 1, max: 5000 })
      .withMessage('Comment content is required and must be at most 5000 characters'),
  ],

  updateComment: [
    body('content')
      .trim()
      .isLength({ min: 1, max: 5000 })
      .withMessage('Comment content must be at most 5000 characters'),
  ],

  // Notification validations
  markAsRead: [
    body('notificationIds')
      .optional()
      .isArray()
      .withMessage('notificationIds must be an array'),
    body('notificationIds.*')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Each notification ID must be a positive integer'),
  ],

  // Common validations
  idParam: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('ID must be a positive integer'),
  ],

  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('cursor')
      .optional()
      .isString()
      .withMessage('Cursor must be a string'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
  ],

  sort: [
    query('sort')
      .optional()
      .matches(/^[a-zA-Z_]+:(asc|desc)$/)
      .withMessage('Sort format must be field:asc or field:desc'),
  ],
};

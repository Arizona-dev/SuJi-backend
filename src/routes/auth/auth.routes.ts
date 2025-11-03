import { Router } from "express";
import { body } from "express-validator";
import { AuthController } from "../../controllers/auth/auth.controller";

const router: Router = Router();
const authController = new AuthController();

/**
 * @swagger
 * /api/auth/customer/login:
 *   post:
 *     summary: Customer login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Customer's email address
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 128
 *                 description: Customer's password (must contain at least one letter and one number)
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT access token
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/customer/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 8, max: 128 })
      .matches(/^(?=.*[a-zA-Z])(?=.*\d)/),
  ],
  authController.customerLogin.bind(authController)
);

/**
 * @swagger
 * /api/auth/customer/register:
 *   post:
 *     summary: Customer registration
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Customer's email address
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 128
 *                 description: Customer's password (must contain at least one letter and one number)
 *               firstName:
 *                 type: string
 *                 minLength: 1
 *                 description: Customer's first name
 *               lastName:
 *                 type: string
 *                 minLength: 1
 *                 description: Customer's last name
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT access token
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/customer/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 8, max: 128 })
      .matches(/^(?=.*[a-zA-Z])(?=.*\d)/),
    body("firstName").trim().isLength({ min: 1 }),
    body("lastName").trim().isLength({ min: 1 }),
  ],
  authController.customerRegister.bind(authController)
);

// Store owner authentication routes
/**
 * @swagger
 * /api/auth/store/login:
 *   post:
 *     summary: Store owner login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Store owner's email address
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 128
 *                 description: Store owner's password (must contain at least one letter and one number)
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT access token
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/store/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 8, max: 128 })
      .matches(/^(?=.*[a-zA-Z])(?=.*\d)/),
  ],
  authController.storeOwnerLogin.bind(authController)
);

/**
 * @swagger
 * /api/auth/store/register:
 *   post:
 *     summary: Store owner registration
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - storeName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Store owner's email address
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 128
 *                 description: Store owner's password (must contain at least one letter and one number)
 *               storeName:
 *                 type: string
 *                 minLength: 1
 *                 description: Name of the store to be created
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT access token
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 store:
 *                   $ref: '#/components/schemas/Store'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/store/register",
  [
    // Basic required fields only - move complex validation to controller
    body("email").isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 8, max: 128 })
      .matches(/^(?=.*[a-zA-Z])(?=.*\d)/),
    body("storeName").trim().isLength({ min: 1, max: 100 }),
    body("businessName").trim().isLength({ min: 1, max: 200 }),
    body("businessType").isIn([
      "sole_proprietorship",
      "partnership",
      "llc",
      "corporation",
      "other",
    ]),
    body("businessAddress").isObject(),
    body("ownerFirstName").trim().isLength({ min: 1, max: 50 }),
    body("ownerLastName").trim().isLength({ min: 1, max: 50 }),
    body("ownerPhone").trim().isLength({ min: 1, max: 20 }),
    body("ownerDateOfBirth").isISO8601(),
    body("acceptedTerms").isBoolean(),
    body("acceptedPrivacyPolicy").isBoolean(),
    body("acceptedDataProcessing").isBoolean(),
  ],
  authController.storeOwnerRegister.bind(authController)
);

// OAuth routes
/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Google OAuth login
 *     tags: [Authentication]
 *     description: Redirect to Google OAuth for authentication
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth
 *       500:
 *         description: OAuth configuration error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/google", authController.googleOAuth.bind(authController));

/**
 * @swagger
 * /api/auth/apple:
 *   get:
 *     summary: Apple OAuth login
 *     tags: [Authentication]
 *     description: Redirect to Apple OAuth for authentication
 *     responses:
 *       302:
 *         description: Redirect to Apple OAuth
 *       500:
 *         description: OAuth configuration error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/apple", authController.appleOAuth.bind(authController));

export default router;

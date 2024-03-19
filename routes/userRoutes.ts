import { Router } from "express";
import userControllers from "../controllers/userController";
import userAuthMiddleware from "../middleware/userAuthMiddleware";
import adminController from "../controllers/adminController";
import searchController from "../controllers/searchController";
import queryController from "../controllers/queryController";

const router: Router = Router();

// userController
router.route("/register").post(userControllers.registerUser);
router.route("/validate/:token").get(userControllers.validateToken);
router.route("/login").post(userControllers.loginUser);
router.route("/getUser").get(userAuthMiddleware, userControllers.getUser);

// adminController
router.route("/getAdmin").get(userAuthMiddleware, adminController.getAdmin);

// queryController
router
  .route("/createQuery")
  .post(userAuthMiddleware, queryController.createQuery);
router
  .route("/getAllQueries")
  .get(userAuthMiddleware, queryController.getAllQueries);
router.route("/getQuery").get(userAuthMiddleware, queryController.getQueryById);
router.route("/vote").patch(userAuthMiddleware, queryController.voteQuery);
router
  .route("/addComment")
  .post(userAuthMiddleware, queryController.addComment);
router
  .route("/deleteComment")
  .delete(userAuthMiddleware, queryController.deleteComment);

// searchController
router
  .route("/search")
  .get(userAuthMiddleware, searchController.searchController);

export default router;

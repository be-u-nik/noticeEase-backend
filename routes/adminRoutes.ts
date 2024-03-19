import { Router } from "express";
import adminAuthMiddleware from "../middleware/adminAuthMiddleware";
import adminController from "../controllers/adminController";
import userController from "../controllers/userController";
import searchController from "../controllers/searchController";
import queryController from "../controllers/queryController";

const router: Router = Router();

// adminController
router.route("/register").post(adminController.registerAdmin);
router.route("/validate/:token").get(adminController.validateToken);
router.route("/login").post(adminController.loginAdmin);
router.route("/verifyUser").post(adminAuthMiddleware, adminController.verifyUser);
router.route("/getAdmin").get(adminAuthMiddleware, adminController.getAdmin);
router.route("/sendUserRegisterFeedback").post(adminAuthMiddleware, adminController.sendUserRegisterFeedback);

// userController
router.route("/getUser").get(adminAuthMiddleware, userController.getUser);
router.route("/getAllVerifiedUsers").get(adminAuthMiddleware, userController.getAllVerifiedUsers);
router.route("/getAllUnverifiedUsers").get(adminAuthMiddleware, userController.getAllUnverifiedUsers);

// queryController
router.route("/getAllQueries").get(adminAuthMiddleware, queryController.getAllQueries);
router.route("/getQuery").get(adminAuthMiddleware, queryController.getQueryById);
router.route("/updateQueryResolvedStatus").patch(adminAuthMiddleware, queryController.updateQueryResolvedStatus);
router.route("/addComment").post(adminAuthMiddleware, queryController.addComment);
router.route("/deleteComment").delete(adminAuthMiddleware, queryController.deleteComment);

// searchController
router.route("/search").get(adminAuthMiddleware, searchController.searchController);

export default router;

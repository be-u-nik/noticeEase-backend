import { Request, Response } from "express";
import { Types } from "mongoose";
import QueryModel, { IQuery } from "../models/qureyModel";
import UserModel, { IUser } from "../models/userModel";
import asyncHandler from "express-async-handler";
import AdminModel, { IAdmin } from "../models/adminModel";
import QueryResponseModel from "../models/queryResponse";
import QueryCommentModel, { IQueryComment } from "../models/queryCommentModel";

interface AuthenticatedUserRequest extends Request {
  user?: IUser;
}
interface AuthenticatedAdminRequest extends Request {
  admin?: IAdmin;
}
interface AuthenticatedRequest extends Request {
  user?: IUser;
  admin?: IAdmin;
}

const createQuery = asyncHandler(
  async (req: AuthenticatedUserRequest, res: Response): Promise<void> => {
    try {
      const queryBy = req.user?._id;
      const { queryTitle, query } = req.body;

      if (!queryBy || !queryTitle || !query) {
        res.status(400).json({ error: "All Fields are necessary" });
      }

      const userExists = await UserModel.findById(queryBy);

      if (!userExists) {
        res.status(404).json({ error: "User Not Found" });
      }

      const newQuery: IQuery = new QueryModel({
        queryBy,
        queryTitle,
        query,
      });
      const savedQuery: IQuery = await newQuery.save();

      if (savedQuery) {
        userExists?.queries.push(savedQuery._id);
        await userExists?.save();
        res
          .status(201)
          .json({ message: "Query created successfully", savedQuery });
      } else {
        res.status(403).json({
          error: "Unable to post the query",
        });
      }
    } catch (error) {
      res.status(500).json({
        error: "An error occurred while creating the query.",
        err: error,
      });
    }
  }
);

const getAllQueries = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { sortBy, limit, skip } = req.query;
      const sortCriteria: any =
        sortBy === "votes" ? { votes: -1, createdAt: -1 } : { createdAt: -1 };

      const queries = await QueryModel.find()
        .sort(sortCriteria)
        .skip(Number(skip) || 0)
        .limit(Number(limit) || 10)
        .populate({
          path: "queryResponse",
          populate: {
            path: "admin",
            select:
              "-password -verified -queryResponses -createdAt -updatedAt -__v",
          },
        })
        .exec();
      res.json(queries);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: "An error occurred while fetching queries",
        err: error,
      });
    }
  }
);

const getQueryById = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { queryId } = req.query;
      const query = await QueryModel.findById(queryId)
        .populate({
          path: "queryResponse",
          populate: {
            path: "admin",
            select: "-password",
          },
        })
        .populate({
          path: "queryComments",
          populate: [
            {
              path: "user",
              select: "-password",
            },
            {
              path: "admin",
              select: "-password",
            },
          ],
        });
      if (!query) {
        res.status(404).json({ error: "Query not found" });
        return;
      }
      res.json(query);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while fetching the query" });
    }
  }
);

// const updateQuery = async (req: Request, res: Response) => {
//   const { queryId } = req.params;
//   const { fields } = req.body;

//   try {
//     const query = await QueryModel.findById(queryId);

//     if (!query) {
//       return res.status(404).json({ message: "Query not found" });
//     }

//     Object.assign(query, fields);
//     const updatedQuery = await query.save();

//     res.json({ message: "Query updated successfully", query: updatedQuery });
//   } catch (error) {
//     console.error("Error updating query:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

const voteQuery = asyncHandler(
  async (req: AuthenticatedUserRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      const queryId = req.body.queryId;
      if (queryId === null) {
        res.status(400).json({ error: "Invalid queryId" });
      }
      const query = await QueryModel.findById(queryId);

      if (!query) {
        res.status(404).json({ error: "Query not found" });
      } else {
        const hasVoted = query.votedBy.includes(userId);

        if (hasVoted) {
          query.votes -= 1;
          query.votedBy = query.votedBy.filter(
            (voterId) => !voterId.equals(userId)
          );
        } else {
          query.votes += 1;
          query.votedBy.push(userId);
        }

        await query.save();
        res.json({ message: "Vote updated successfully", query });
      }
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

const updateQueryResolvedStatus = asyncHandler(
  async (req: AuthenticatedAdminRequest, res: Response): Promise<void> => {
    try {
      const { queryId, response } = req.body;
      const admin = req.admin;

      const query: IQuery | null = await QueryModel.findById(queryId);
      if (!admin) {
        res.status(404).json({ message: "Admin not found" });
      } else if (!query) {
        res.status(404).json({ message: "Query not found" });
      } else {
        if (!query.queryResponse) {
          query.isResolved = true;

          const queryResponse = await QueryResponseModel.create({
            admin: admin?._id,
            response,
            queryId,
          });
          query.queryResponse = queryResponse._id;

          admin.queryResponses.push(queryResponse._id);

          await admin.save();

          await query.populate({
            path: "queryResponse",
            populate: {
              path: "admin",
              select:
                "-password -verified -queryResponses -createdAt -updatedAt -__v",
            },
          });
        } else {
          query.isResolved = false;

          await QueryResponseModel.findByIdAndDelete(query.queryResponse._id);

          const queryResponseId: Types.ObjectId = query.queryResponse._id;
          admin.queryResponses = admin.queryResponses.filter(
            (queryResponse) => !queryResponse.equals(queryResponseId)
          );
          await admin.save();

          query.queryResponse = undefined;
        }

        await query.save();

        res.json({
          message: "Query Response status updated successfully",
          query,
        });
      }
    } catch (error) {
      res
        .status(500)
        .json({ error: "Failed to update Query Response status updated" });
    }
  }
);

const addComment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { queryId, comment } = req.body;
      const userComment = req.user ? true : false;

      const queryComment: IQueryComment = userComment
        ? await QueryCommentModel.create({
            query: queryId,
            comment,
            user: req.user?._id,
          })
        : await QueryCommentModel.create({
            query: queryId,
            comment,
            admin: req.admin?._id,
          });

      const updatedQuery: IQuery | null = await QueryModel.findById(queryId);

      if (!updatedQuery) {
        res.status(404).json({ message: "Query not found" });
      } else {
        updatedQuery?.queryComments.push(queryComment._id);
        await updatedQuery?.save();
      }

      res.json({
        message: "Comment added successfully",
        query: updatedQuery,
      });
    } catch (error) {
      console.error("Error adding comment to query:", error);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

const deleteComment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { commentId } = req.body;

      const comment: IQueryComment | null = await QueryCommentModel.findById(
        commentId
      );

      if (!comment) {
        res.status(404).json({ message: "Comment not found" });
      } else {
        const queryId = comment.query;
        const query: IQuery | null = await QueryModel.findById(queryId);

        if (!query) {
          res.status(404).json({ message: "Query not found" });
        } else {
          if (comment.user && !comment.user.equals(req.user?._id)) {
            console.log("first");
            res.status(400).json({ message: "Access Denied" });
          } else if (comment.admin && !comment.admin.equals(req.admin?._id)) {
            console.log("second");

            res.status(400).json({ message: "Access Denied" });
          } else {
            await QueryCommentModel.findByIdAndDelete(commentId);

            query.queryComments = query.queryComments.filter(
              (commentId) => !comment._id.equals(commentId)
            );
            await query.save();
            res.json({ message: "Comment deleted successfully", query });
          }
        }
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

export default {
  createQuery,
  getAllQueries,
  getQueryById,
  // updateQuery,
  voteQuery,
  updateQueryResolvedStatus,
  addComment,
  deleteComment,
};

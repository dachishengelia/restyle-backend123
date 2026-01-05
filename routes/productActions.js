import express from "express";
import {
  toggleLike,
  addComment,
  deleteComment,
  toggleFavorite,
  getUserFavorites,
} from "../controllers/productActionsController.js";

import isAuth from "../middlewares/isAuth.middleware.js";

const router = express.Router();


router.post("/:id/like", isAuth, toggleLike);


router.post("/:id/comment", isAuth, addComment);


router.delete("/:id/comment/:commentId", isAuth, deleteComment);


router.post("/:id/favorite", isAuth, toggleFavorite);


router.get("/my/favorites", isAuth, getUserFavorites);

export default router;

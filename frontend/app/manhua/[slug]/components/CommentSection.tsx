"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getManhuaComments,
  createManhuaComment,
  deleteComment,
  type Comment,
  type CommentsResponse,
} from "@/lib/api";

interface CommentSectionProps {
  manhuaId: string;
}

// Avatar component with first letter
function Avatar({ username }: { username: string }) {
  const initial = username.charAt(0).toUpperCase();
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200">
      {initial}
    </div>
  );
}

// Skeleton loader for comments
function CommentSkeleton() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 shrink-0 rounded-full bg-slate-800 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-slate-800 animate-pulse" />
          <div className="h-3 w-16 rounded bg-slate-800 animate-pulse" />
          <div className="h-4 w-full rounded bg-slate-800 animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-slate-800 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function CommentSection({ manhuaId }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  // Check if user has active access
  const hasActiveAccess =
    user &&
    (user.isVIP ||
      (user.vipExpiresAt && new Date(user.vipExpiresAt).getTime() > Date.now()));

  const loadComments = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setAccessError("Login required");
      return;
    }

    try {
      setError(null);
      const response = await getManhuaComments(manhuaId, page, 20);
      if (page === 1) {
        setComments(response.comments);
      } else {
        setComments((prev) => [...prev, ...response.comments]);
      }
      setHasMore(response.pagination.hasNext);
    } catch (err: any) {
      console.error("Failed to load comments:", err);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setAccessError("Login required");
      } else {
        setError(err?.response?.data?.message || "Failed to load comments");
      }
    } finally {
      setLoading(false);
    }
  }, [manhuaId, page, user]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setAccessError("Login required");
      return;
    }

    if (!hasActiveAccess) {
      setAccessError("Access expired. Please renew your subscription.");
      return;
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      setError("Comment cannot be empty");
      return;
    }

    if (trimmedText.length > 500) {
      setError("Comment must be 500 characters or less");
      return;
    }

    setSubmitting(true);
    setError(null);
    setAccessError(null);

    // Optimistic update
    const optimisticComment: Comment = {
      _id: `temp-${Date.now()}`,
      user: user._id,
      username: user.username,
      text: trimmedText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setComments((prev) => [optimisticComment, ...prev]);
    setText("");

    try {
      const response = await createManhuaComment(manhuaId, trimmedText);
      // Replace optimistic comment with real one
      setComments((prev) =>
        prev.map((c) =>
          c._id === optimisticComment._id ? response.comment : c
        )
      );
    } catch (err: any) {
      console.error("Failed to create comment:", err);
      // Remove optimistic comment on error
      setComments((prev) => prev.filter((c) => c._id !== optimisticComment._id));

      if (err?.response?.status === 403) {
        if (err?.response?.data?.code === "ACCESS_EXPIRED") {
          setAccessError("Access expired. Please renew your subscription.");
        } else if (err?.response?.data?.code === "DEVICE_ID_MISMATCH") {
          setAccessError("Device ID mismatch. Please use your registered device.");
        } else {
          setAccessError("You don't have permission to comment.");
        }
      } else if (err?.response?.status === 429) {
        setError(
          err?.response?.data?.message ||
            "Too many comments. Please wait 10 seconds before trying again."
        );
      } else {
        setError(
          err?.response?.data?.message || "Failed to create comment. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch (err: any) {
      console.error("Failed to delete comment:", err);
      setError(err?.response?.data?.message || "Failed to delete comment");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Сая";
    if (diffMins < 60) return `${diffMins} мин`;
    if (diffHours < 24) return `${diffHours} цаг`;
    if (diffDays < 7) return `${diffDays} өдөр`;
    return date.toLocaleDateString("mn-MN");
  };

  // Get latest comment date for subtitle
  const latestCommentDate = comments.length > 0 ? comments[0].createdAt : null;
  const latestCommentText = latestCommentDate
    ? formatDate(latestCommentDate)
    : null;

  if (!user) {
    return (
      <section className="space-y-3 px-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/90 shadow-lg shadow-black/40 px-4 py-6 text-center">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
            Сэтгэгдэл
          </h2>
          <p className="text-xs text-slate-500">Нэвтэрсэн байх шаардлагатай</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3 px-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Сэтгэгдэл
          </h2>
          {latestCommentText && (
            <p className="text-[11px] text-slate-500 mt-0.5">
              Сүүлд бичигдсэн: {latestCommentText}
            </p>
          )}
        </div>
      </div>

      {/* Error messages */}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {accessError && (
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-200">
          {accessError}
        </div>
      )}

      {/* Comment form card */}
      {hasActiveAccess && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/90 shadow-lg shadow-black/40 p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              placeholder="Сэтгэгдэл бичих..."
              className="w-full rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-[13px] text-slate-100 placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              rows={3}
              maxLength={500}
              disabled={submitting}
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {text.length}/500 тэмдэгт
              </span>
              <button
                type="submit"
                disabled={submitting || !text.trim()}
                className="rounded-full border border-slate-700/80 bg-slate-950/80 px-4 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-900 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Илгээж байна..." : "Илгээх"}
              </button>
            </div>
          </form>
        </div>
      )}

      {!hasActiveAccess && (
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-200">
          {user.vipExpiresAt && new Date(user.vipExpiresAt).getTime() <= Date.now()
            ? "Хандах эрх дууссан. Сэтгэгдэл бичихийн тулд эрхээ сэргээнэ үү."
            : "Сэтгэгдэл бичихийн тулд идэвхтэй эрх шаардлагатай."}
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <CommentSkeleton key={i} />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/90 shadow-lg shadow-black/40 px-4 py-8 text-center">
          <p className="text-xs text-slate-500">Одоогоор сэтгэгдэл алга.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment._id}
                className="rounded-2xl border border-slate-800 bg-slate-950/90 shadow-lg shadow-black/40 p-4"
              >
                <div className="flex items-start gap-3">
                  <Avatar username={comment.username} />
                  <div className="flex-1 min-w-0">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-slate-100">
                          {comment.username}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      {(user._id === comment.user || user.role === "admin") && (
                        <button
                          onClick={() => handleDelete(comment._id)}
                          className="text-[11px] text-red-400 hover:text-red-300 transition-colors"
                        >
                          Устгах
                        </button>
                      )}
                    </div>
                    <p className="text-[13px] leading-relaxed text-slate-200/90 whitespace-pre-wrap break-words">
                      {comment.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="pt-3 text-center">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="rounded-full border border-slate-700/80 bg-slate-950/80 px-4 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-slate-900 transition-colors"
              >
                Цааш ачаалах
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}


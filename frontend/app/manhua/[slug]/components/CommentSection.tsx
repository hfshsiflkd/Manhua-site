"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getManhuaComments, createManhuaComment, deleteComment, type Comment } from "@/lib/api";
import { useConfirm } from "@/app/components/ConfirmProvider";
import { useToast } from "@/app/components/ToastProvider";

interface CommentSectionProps {
  manhuaId: string;
}

function Avatar({ username }: { username: string }) {
  const initial = username.charAt(0).toUpperCase();
  return (
    <div
      className="flex items-center justify-center shrink-0 text-[12px] font-bold"
      style={{
        width: 32, height: 32, borderRadius: "50%",
        background: "var(--arc-cyan-dim)",
        border: "1px solid oklch(0.72 0.17 195/.3)",
        color: "var(--arc-cyan)",
        fontFamily: "var(--font-head,'Space Grotesk',sans-serif)",
      }}
    >
      {initial}
    </div>
  );
}

function CommentSkeleton() {
  return (
    <div className="animate-pulse rounded-[12px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 shrink-0 rounded-full" style={{ background: "var(--arc-elevated)" }} />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded" style={{ background: "var(--arc-elevated)" }} />
          <div className="h-3 w-16 rounded" style={{ background: "var(--arc-elevated)" }} />
          <div className="h-4 w-full rounded" style={{ background: "var(--arc-elevated)" }} />
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
  const confirm = useConfirm();
  const toast = useToast();

  const hasActiveAccess =
    user && (user.isVIP || (user.vipExpiresAt && new Date(user.vipExpiresAt).getTime() > Date.now()));

  const loadComments = useCallback(async () => {
    if (!user) { setLoading(false); setAccessError("Login required"); return; }
    try {
      setError(null);
      const response = await getManhuaComments(manhuaId, page, 20);
      if (page === 1) { setComments(response.comments); }
      else { setComments((prev) => [...prev, ...response.comments]); }
      setHasMore(response.pagination.hasNext);
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) { setAccessError("Login required"); }
      else { setError(err?.response?.data?.message || "Failed to load comments"); }
    } finally { setLoading(false); }
  }, [manhuaId, page, user]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setAccessError("Login required"); return; }
    if (!hasActiveAccess) { setAccessError("Access expired. Please renew your subscription."); return; }
    const trimmedText = text.trim();
    if (!trimmedText) { setError("Comment cannot be empty"); return; }
    if (trimmedText.length > 500) { setError("Comment must be 500 characters or less"); return; }

    setSubmitting(true); setError(null); setAccessError(null);
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
      setComments((prev) => prev.map((c) => c._id === optimisticComment._id ? response.comment : c));
    } catch (err: any) {
      setComments((prev) => prev.filter((c) => c._id !== optimisticComment._id));
      if (err?.response?.status === 403) {
        const code = err?.response?.data?.code;
        if (code === "ACCESS_EXPIRED") setAccessError("Access expired. Please renew your subscription.");
        else if (code === "DEVICE_ID_MISMATCH") setAccessError("Device ID mismatch. Please use your registered device.");
        else setAccessError("You don't have permission to comment.");
      } else if (err?.response?.status === 429) {
        setError(err?.response?.data?.message || "Too many comments. Please wait 10 seconds before trying again.");
      } else {
        setError(err?.response?.data?.message || "Failed to create comment. Please try again.");
      }
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (commentId: string) => {
    const ok = await confirm({ title: "Сэтгэгдэл устгах уу?", description: "Энэ сэтгэгдлийг устгавал буцаах боломжгүй.", confirmText: "Устгах", cancelText: "Болих" });
    if (!ok) return;
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      toast.success("Сэтгэгдэл устгагдлаа");
    } catch (err: any) {
      const message = err?.response?.data?.message || "Failed to delete comment";
      setError(message); toast.error(message);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Сая";
    if (diffMins < 60) return `${diffMins} мин`;
    if (diffHours < 24) return `${diffHours} цаг`;
    if (diffDays < 7) return `${diffDays} өдөр`;
    return date.toLocaleDateString("mn-MN");
  };

  const latestCommentDate = comments.length > 0 ? comments[0].createdAt : null;
  const latestCommentText = latestCommentDate ? formatDate(latestCommentDate) : null;

  if (!user) {
    return (
      <div className="rounded-[12px] px-4 py-8 text-center" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
        <p className="text-[12px]" style={{ color: "var(--arc-muted)" }}>Нэвтэрсэн байх шаардлагатай</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-[3px] h-[14px] rounded-sm" style={{ background: "var(--arc-cyan)", boxShadow: "0 0 8px var(--arc-cyan-glow)" }} />
        <div>
          <h2 className="text-[14px] font-bold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>Сэтгэгдэл</h2>
          {latestCommentText && <p className="text-[11px] mt-0.5" style={{ color: "var(--arc-muted)" }}>Сүүлд бичигдсэн: {latestCommentText}</p>}
        </div>
      </div>

      {error && (
        <div className="rounded-[10px] px-4 py-3 text-[12px]" style={{ background: "oklch(0.65 0.22 15/.08)", border: "1px solid oklch(0.65 0.22 15/.3)", color: "oklch(0.85 0.12 15)" }}>
          {error}
        </div>
      )}
      {accessError && (
        <div className="rounded-[10px] px-4 py-3 text-[12px]" style={{ background: "oklch(0.82 0.16 85/.08)", border: "1px solid oklch(0.82 0.16 85/.3)", color: "var(--arc-amber)" }}>
          {accessError}
        </div>
      )}

      {hasActiveAccess && (
        <div className="rounded-[12px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setError(null); }}
              placeholder="Сэтгэгдэл бичих..."
              className="w-full text-[13px] placeholder:opacity-40 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderRadius: 9, border: "1px solid var(--arc-border)", background: "var(--arc-elevated)",
                padding: "10px 14px", color: "var(--arc-text)", outline: "none", resize: "vertical",
              }}
              rows={3}
              maxLength={500}
              disabled={submitting}
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px]" style={{ color: "var(--arc-muted)" }}>{text.length}/500</span>
              <button
                type="submit"
                disabled={submitting || !text.trim()}
                className="rounded-full px-4 py-1.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}
              >
                {submitting ? "Илгээж байна..." : "Илгээх"}
              </button>
            </div>
          </form>
        </div>
      )}

      {!hasActiveAccess && (
        <div className="rounded-[10px] px-4 py-3 text-[12px]" style={{ background: "oklch(0.82 0.16 85/.08)", border: "1px solid oklch(0.82 0.16 85/.3)", color: "var(--arc-amber)" }}>
          {user.vipExpiresAt && new Date(user.vipExpiresAt).getTime() <= Date.now()
            ? "Хандах эрх дууссан. Сэтгэгдэл бичихийн тулд эрхээ сэргээнэ үү."
            : "Сэтгэгдэл бичихийн тулд идэвхтэй эрх шаардлагатай."}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <CommentSkeleton key={i} />)}</div>
      ) : comments.length === 0 ? (
        <div className="rounded-[12px] px-4 py-8 text-center" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
          <p className="text-[12px]" style={{ color: "var(--arc-muted)" }}>Одоогоор сэтгэгдэл алга.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {comments.map((comment) => (
              <div key={comment._id} className="rounded-[12px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
                <div className="flex items-start gap-3">
                  <Avatar username={comment.username} />
                  <div className="flex-1 min-w-0">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium" style={{ color: "var(--arc-text)" }}>{comment.username}</span>
                        <span className="text-[11px]" style={{ color: "var(--arc-muted)" }}>{formatDate(comment.createdAt)}</span>
                      </div>
                      {(user._id === comment.user || user.role === "admin") && (
                        <button
                          onClick={() => handleDelete(comment._id)}
                          className="text-[11px] transition-colors"
                          style={{ color: "oklch(0.65 0.22 15/.7)" }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "oklch(0.75 0.22 15)")}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "oklch(0.65 0.22 15/.7)")}
                        >
                          Устгах
                        </button>
                      )}
                    </div>
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words" style={{ color: "var(--arc-dim)" }}>
                      {comment.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="pt-3 text-center">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="rounded-full px-4 py-1.5 text-[11px] font-medium transition-colors"
                style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)", cursor: "pointer" }}
              >
                Цааш ачаалах
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

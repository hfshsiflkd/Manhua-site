const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => onChange(star)}
        className="text-lg transition-colors"
        style={{ color: star <= value ? "var(--arc-amber)" : "var(--arc-border)", background: "none", border: "none", cursor: "pointer" }}
        title={`${star} star`}
      >
        ★
      </button>
    ))}
    <span className="ml-1 text-[10px]" style={{ color: "var(--arc-muted)" }}>({value}/5)</span>
  </div>
);
export default StarRating;

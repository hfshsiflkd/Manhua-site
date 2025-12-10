// ⭐ STAR RATING COMPONENT (inline)
const StarRating = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-lg transition ${
              active
                ? "text-yellow-400"
                : "text-slate-600 hover:text-yellow-300"
            }`}
            title={`${star} star`}
          >
            ★
          </button>
        );
      })}
      <span className="ml-1 text-[10px] text-slate-400">({value}/5)</span>
    </div>
  );
};
export default StarRating;
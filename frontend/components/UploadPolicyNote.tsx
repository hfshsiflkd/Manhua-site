import { IMAGE_PURPOSES, type ImagePurpose } from "@/lib/imageLimits";

export function UploadPolicyNote({ purpose }: { purpose: ImagePurpose }) {
  return (
    <p className="mt-1 text-[10px] leading-relaxed" style={{ color: "var(--arc-muted)" }}>
      {IMAGE_PURPOSES[purpose].hint}
    </p>
  );
}

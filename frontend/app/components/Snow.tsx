"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

type Flake = {
  i: number;
  x: number;
  x2: number;
  y: number;
  s: number;
  t?: gsap.core.Timeline;
};

export default function SnowBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

    const ctx = c.getContext("2d");
    if (!ctx) return;

    const cw = (c.width = 3000);
    const ch = (c.height = 3000);

    // Маск зурах хоёр дахь canvas (одоо нуусан текст ашиглахгүй тул хоосон байна)
    const c2 = document.createElement("canvas");
    c2.width = cw;
    c2.height = ch;
    const ctx2 = c2.getContext("2d", { willReadFrequently: true });

    const arr: Flake[] = [];

    function makeFlake(i: number, ff: boolean) {
      const flake: Flake = { i, x: 0, x2: 0, y: 0, s: 0 };

      flake.t = gsap
        .timeline({ repeat: -1, repeatRefresh: true })
        .fromTo(
          flake,
          {
            x: () => -400 + (cw + 800) * Math.random(),
            y: -15,
            s: () => gsap.utils.random(1.8, 7, 0.1),
            x2: -500,
          },
          {
            ease: "none",
            y: ch,
            x: "+=" + gsap.utils.random(-400, 400, 1),
            x2: 500,
          }
        )
        .seek(ff ? Math.random() * 99 : 0)
        .timeScale(flake.s / 37);

      arr[i] = flake;
    }

    // Эхний ширхэгүүд
    for (let i = 0; i < 1300; i++) {
      makeFlake(i, true);
    }

    ctx.fillStyle = "#fff";

    const render = () => {
      ctx.clearRect(0, 0, cw, ch);

      arr.forEach((f) => {
        if (f.t && f.t.isActive() && ctx2) {
          // Ориг кодноос үлдээсэн логик — ctx2 дээр зураг байхгүй тул альфа=0, зүгээр л унана
          const d = ctx2.getImageData(f.x + f.x2, f.y, 1, 1);
          if (d.data[3] > 150 && Math.random() > 0.5) {
            f.t.pause();
            if (arr.length < 9000) {
              makeFlake(arr.length, false);
            }
          }
        }

        ctx.beginPath();
        ctx.arc(
          f.x + f.x2,
          f.y,
          f.s * gsap.utils.interpolate(1, 0.2, f.y / ch),
          0,
          Math.PI * 2
        );
        ctx.fill();
      });
    };

    gsap.ticker.add(render);

    return () => {
      // clean-up
      gsap.ticker.remove(render);
      arr.forEach((f) => f.t?.kill());
    };
  }, []);

  return (
    <div className="fixed-bg pointer-events-none">
      <canvas ref={canvasRef} />
    </div>
  );
}

"use client";

import Link from "next/link";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-[14px] p-5"
      style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-semibold" style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)" }}>{title}</h2>
        <a href={`#${id}`} className="text-[11px] transition-colors" style={{ color: "var(--arc-muted)" }} aria-label={`${title} хэсэг рүү линк`}>
          #{id}
        </a>
      </div>
      <div className="mt-3 text-[13px] leading-relaxed" style={{ color: "var(--arc-dim)" }}>
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  const lastUpdated = new Date().toISOString().slice(0, 10);

  const toc = [
    { id: "intro", label: "Ерөнхий" },
    { id: "account", label: "Бүртгэл ба үүрэг" },
    { id: "access", label: "VIP/хандалт" },
    { id: "violations", label: "Хориотой үйлдэл" },
    { id: "penalties", label: "Түгжих/бан хийх бодлого" },
    { id: "downtime", label: "Тасалдлын нөхөн олговор" },
    { id: "ip", label: "Зохиогчийн эрх" },
    { id: "liability", label: "Хариуцлага хязгаарлалт" },
    { id: "changes", label: "Нөхцөлийн өөрчлөлт" },
    { id: "contact", label: "Холбоо барих" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--arc-bg)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ borderBottom: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 20% 15%,oklch(0.72 0.17 195/.08),transparent 50%)" }} />
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 75% 30%,oklch(0.65 0.22 15/.06),transparent 55%)" }} />
        <div className="relative mx-auto w-full max-w-5xl px-4 py-14 sm:px-6">
          <div
            className="inline-flex items-center gap-2 text-[11px] font-semibold mb-4"
            style={{ borderRadius: 99, border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", padding: "4px 12px", color: "var(--arc-dim)" }}
          >
            📜 Үйлчилгээний нөхцөл
          </div>
          <h1
            className="text-[30px] sm:text-[38px] font-extrabold tracking-tight"
            style={{ fontFamily: "var(--font-head,'Space Grotesk',sans-serif)", color: "var(--arc-text)", letterSpacing: "-0.025em" }}
          >
            ARC•READ — Үйлчилгээний нөхцөл
          </h1>
          <p className="mt-2 max-w-3xl text-[13px]" style={{ color: "var(--arc-dim)" }}>
            ARC•READ нь Монгол хэл дээр манхва орчуулга түгээх платформ юм. Та энэхүү сайтыг ашигласнаар доорх нөхцөлийг зөвшөөрсөнд тооцогдоно.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span
              className="text-[11px] px-3 py-1 rounded-full"
              style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" }}
            >
              Сүүлийн шинэчлэлт: <b style={{ color: "var(--arc-text)" }}>{lastUpdated}</b>
            </span>
            <Link
              href="/feedback"
              className="text-[11px] px-3 py-1 rounded-full font-semibold transition-colors"
              style={{ border: "1px solid oklch(0.72 0.17 195/.3)", background: "var(--arc-cyan-dim)", color: "var(--arc-cyan)" }}
            >
              Санал хүсэлт илгээх →
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        {/* Warning + quick links */}
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <div
            className="lg:col-span-2 rounded-[14px] p-5"
            style={{ border: "1px solid oklch(0.82 0.16 85/.35)", background: "oklch(0.82 0.16 85/.08)" }}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--arc-amber)" }}>Анхааруулга</div>
            <div className="text-[13px]" style={{ color: "oklch(0.8 0.1 85)" }}>
              Нэг акаунтаар зэрэг олон төхөөрөмжөөс нэвтрэх зэрэг зөрчил илэрвэл
              анхны удаад <b>15 минутын</b> түр түгжих, давтан тохиолдолд{" "}
              <b>7 хоног хүртэл</b> хугацаатай бан хийх боломжтой.
            </div>
          </div>
          <div className="rounded-[14px] p-5" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
            <div className="text-[11px] font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--arc-muted)" }}>Хурдан товч</div>
            <div className="space-y-2 text-[13px]">
              {["#penalties", "#downtime"].map((href) => (
                <a
                  key={href}
                  href={href}
                  className="block rounded-[9px] px-3 py-2 transition-colors"
                  style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--arc-text)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--arc-dim)")}
                >
                  {href === "#penalties" ? "Түгжих/бан хийх бодлого →" : "Тасалдлын нөхөн олговор →"}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* TOC */}
        <div className="mb-6 rounded-[14px] p-5" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
          <div className="text-[13px] font-semibold mb-3" style={{ color: "var(--arc-text)" }}>Агуулгын жагсаалт</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {toc.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                className="rounded-[9px] px-3 py-2 text-[13px] transition-colors"
                style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)", color: "var(--arc-dim)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--arc-text)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--arc-dim)")}
              >
                {t.label}
              </a>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Section id="intro" title="1) Ерөнхий">
              <p>"ARC•READ" ("Бид", "Сайт") нь манхва орчуулга болон түүнтэй холбоотой контент түгээх үйлчилгээ үзүүлдэг. Сайтыг ашигласнаар та энэхүү нөхцөлийг дагаж мөрдөхийг зөвшөөрнө.</p>
            </Section>

            <Section id="account" title="2) Бүртгэл ба хэрэглэгчийн үүрэг">
              <ul className="list-disc pl-5 space-y-2">
                <li>Бүртгэл үүсгэхдээ үнэн зөв мэдээлэл оруулах, дансны нууц үгийг хамгаалах үүрэгтэй.</li>
                <li>Дансны мэдээллээ бусдад дамжуулах, бусдад ашиглуулахыг хориглоно.</li>
                <li>Данс ашиглалтаас үүдэх эрсдэл хэрэглэгчийн хариуцлага байна.</li>
              </ul>
            </Section>

            <Section id="access" title="3) VIP/Хандалтын нөхцөл">
              <ul className="list-disc pl-5 space-y-2">
                <li>Зарим контент/боломж нь VIP эсвэл төлбөртэй хандалтаар идэвхжинэ.</li>
                <li>Төлбөр, хугацаа, эрхийн нөхцөл нь тухайн үед Сайт дээр нийтлэгдсэн мэдээллээр тодорхойлогдоно.</li>
                <li>Хандалтын хугацаа дуусахад эрх автоматаар хаагдана.</li>
              </ul>
            </Section>

            <Section id="violations" title="4) Хориотой үйлдэл (Зөрчил)">
              <ul className="list-disc pl-5 space-y-2">
                <li>Нэг акаунтаар зэрэг олон төхөөрөмж/олон газраас нэвтрэх, системийн хамгаалалтыг тойрч ашиглах оролдлого</li>
                <li>Дансыг түрээслэх, худалдах, бусдад ашиглуулах</li>
                <li>Сайтын ажиллагаанд саад учруулах (бот, скрипт, эмзэг байдал ашиглах)</li>
                <li>Контентыг зөвшөөрөлгүй хуулбарлах, дахин нийтлэх, тараах</li>
                <li>Бусдын эрхийг зөрчих, доромж/үзэн ядалт өдөөсөн үйлдэл</li>
              </ul>
            </Section>

            <Section id="penalties" title="5) Зөрчлийн арга хэмжээ (Түгжих/Бан хийх)">
              <div className="rounded-[10px] p-4" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
                <div className="text-[12px] font-semibold mb-2" style={{ color: "var(--arc-text)" }}>Түгжих хугацааны дүрэм</div>
                <ul className="list-disc pl-5 space-y-2">
                  <li><b>Анхны зөрчил:</b> 15 минутын хугацаатай түр түгжих</li>
                  <li><b>Давтан зөрчил:</b> 1 өдөрөөс 7 хоног хүртэл хугацаатай данс түгжих</li>
                  <li><b>Онц ноцтой зөрчил:</b> урьдчилан мэдэгдэлгүйгээр удаан хугацаагаар эсвэл бүр мөсөн хаах боломжтой</li>
                </ul>
                <div className="mt-3 text-[11px]" style={{ color: "var(--arc-muted)" }}>
                  Зөрчлийн давтамж, эрсдэлийн түвшнээс хамааран шууд шат ахиж арга хэмжээ авах боломжтой.
                </div>
              </div>
            </Section>

            <Section id="downtime" title="6) Үйлчилгээ тасалдлын нөхөн олговор">
              <p>Хэрэв Сайтаас шалтгаалсан үйлчилгээний доголдол гарч, хэрэглэгчийн VIP/хандалтын хугацаанаас бодит хугацаа алдагдсан нь тогтоогдвол Бид тухайн алдагдсан хугацааг нөхөн олгоно.</p>
            </Section>

            <Section id="ip" title="7) Зохиогчийн эрх ба оюуны өмч">
              <ul className="list-disc pl-5 space-y-2">
                <li>Сайт дээрх орчуулга, дизайн, бүтэц зэрэг нь Бидний болон/эсвэл холбогдох эрх эзэмшигчдийн оюуны өмч байна.</li>
                <li>Зөвшөөрөлгүйгээр хуулбарлах, дахин ашиглах, түгээхийг хориглоно.</li>
              </ul>
            </Section>

            <Section id="liability" title="8) Хариуцлага хязгаарлалт">
              <ul className="list-disc pl-5 space-y-2">
                <li>Сайт нь "байгаагаар нь" нөхцөлөөр үйлчилгээ үзүүлнэ. Техникийн шалтгаанаар түр тасалдах боломжтой.</li>
                <li>Хэрэглэгчийн төхөөрөмж, интернет үйлчилгээнээс шалтгаалсан сааталд Бид хариуцлага хүлээхгүй.</li>
              </ul>
            </Section>

            <Section id="changes" title="9) Нөхцөлийн өөрчлөлт">
              <p>Бид эдгээр нөхцөлийг үе үе шинэчлэх эрхтэй. Шинэчилсэн хувилбар нь Сайт дээр нийтлэгдсэн өдрөөс хүчин төгөлдөр үйлчилнэ.</p>
            </Section>

            <Section id="contact" title="10) Холбоо барих">
              <p>
                Санал хүсэлт, гомдол, зөрчил мэдээлэх бол{" "}
                <Link href="/feedback" style={{ color: "var(--arc-cyan)" }}>
                  /feedback
                </Link>{" "}
                хуудсаар дамжуулан илгээнэ үү.
              </p>
            </Section>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[14px] p-5" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
              <div className="text-[13px] font-semibold mb-3" style={{ color: "var(--arc-text)" }}>Товч дүрэм</div>
              <div className="space-y-2 text-[13px]">
                {[
                  { label: "Анхны зөрчил", value: "15 минутын түр түгжээ" },
                  { label: "Давтан зөрчил", value: "7 хоног хүртэл бан" },
                  { label: "Тасалдал", value: "Алдагдсан хугацааг нөхөн олгоно" },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-[9px] px-3 py-2" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-elevated)" }}>
                    <div className="text-[11px]" style={{ color: "var(--arc-muted)" }}>{label}</div>
                    <div className="font-semibold" style={{ color: "var(--arc-text)" }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[14px] p-5" style={{ border: "1px solid var(--arc-border)", background: "var(--arc-card)" }}>
              <div className="text-[13px] font-semibold mb-2" style={{ color: "var(--arc-text)" }}>Санал хүсэлт хэрэгтэй юу?</div>
              <p className="text-[13px] mb-4" style={{ color: "var(--arc-dim)" }}>
                Алдаа олдсон бол зураг хавсаргаад илгээгээрэй — хурдан засахад тус болно.
              </p>
              <Link
                href="/feedback"
                className="inline-flex w-full items-center justify-center rounded-[9px] px-4 py-2.5 text-[12px] font-bold transition-all hover:brightness-110"
                style={{ background: "var(--arc-cyan)", color: "#07070e" }}
              >
                Санал хүсэлт илгээх
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

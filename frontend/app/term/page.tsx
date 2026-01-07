"use client";

import Link from "next/link";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 shadow-lg shadow-black/30"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        <a
          href={`#${id}`}
          className="text-[11px] text-slate-500 hover:text-slate-300"
          aria-label={`${title} хэсэг рүү линк`}
        >
          #{id}
        </a>
      </div>
      <div className="mt-3 text-sm leading-relaxed text-slate-200">
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
    <div className="min-h-screen bg-slate-950">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(34,211,238,0.10),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,rgba(167,139,250,0.10),transparent_55%)]" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-[11px] font-semibold text-slate-300">
            📜 Үйлчилгээний нөхцөл
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
            ARC•READ — Үйлчилгээний нөхцөл
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            ARC•READ нь Монгол хэл дээр манхва орчуулга түгээх платформ юм. Та
            энэхүү сайтыг ашигласнаар доорх нөхцөлийг зөвшөөрсөнд тооцогдоно.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-slate-800 bg-slate-950/50 px-3 py-1 text-slate-300">
              Сүүлийн шинэчлэлт:{" "}
              <b className="text-slate-100">{lastUpdated}</b>
            </span>
            <Link
              href="/feedback"
              className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 font-semibold text-cyan-200 hover:bg-cyan-500/20"
            >
              Санал хүсэлт илгээх →
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-16">
        {/* Highlight card */}
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 shadow-lg shadow-black/30">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-200">
              Анхааруулга
            </div>
            <div className="mt-2 text-sm text-amber-100">
              Нэг акаунтаар зэрэг олон төхөөрөмжөөс нэвтрэх зэрэг зөрчил илэрвэл
              анхны удаад <b>15 минутын</b> түр түгжих, давтан тохиолдолд{" "}
              <b>7 хоног хүртэл</b> хугацаатай бан хийх боломжтой.
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Хурдан товч
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <a
                href="#penalties"
                className="block rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-200 hover:bg-slate-950/70"
              >
                Түгжих/бан хийх бодлого →
              </a>
              <a
                href="#downtime"
                className="block rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-200 hover:bg-slate-950/70"
              >
                Тасалдлын нөхөн олговор →
              </a>
            </div>
          </div>
        </div>

        {/* TOC */}
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="text-sm font-semibold text-slate-100">
            Агуулгын жагсаалт
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {toc.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 hover:bg-slate-950/70"
              >
                {t.label}
              </a>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Section id="intro" title="1) Ерөнхий">
              <p>
                “ARC•READ” (“Бид”, “Сайт”) нь манхва орчуулга болон түүнтэй
                холбоотой контент түгээх үйлчилгээ үзүүлдэг. Сайтыг ашигласнаар
                та энэхүү нөхцөлийг дагаж мөрдөхийг зөвшөөрнө.
              </p>
            </Section>

            <Section id="account" title="2) Бүртгэл ба хэрэглэгчийн үүрэг">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Бүртгэл үүсгэхдээ үнэн зөв мэдээлэл оруулах, дансны нууц
                  үгийг хамгаалах үүрэгтэй.
                </li>
                <li>
                  Дансны мэдээллээ бусдад дамжуулах, бусдад ашиглуулахыг
                  хориглоно.
                </li>
                <li>
                  Данс ашиглалтаас үүдэх эрсдэл (жишээ нь нууц үг алдагдах)
                  хэрэглэгчийн хариуцлага байна.
                </li>
              </ul>
            </Section>

            <Section id="access" title="3) VIP/Хандалтын нөхцөл">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Зарим контент/боломж нь VIP эсвэл төлбөртэй хандалтаар
                  идэвхжинэ.
                </li>
                <li>
                  Төлбөр, хугацаа, эрхийн нөхцөл нь тухайн үед Сайт дээр нийтлэгдсэн
                  мэдээллээр тодорхойлогдоно.
                </li>
                <li>Хандалтын хугацаа дуусахад эрх автоматаар хаагдана.</li>
              </ul>
            </Section>

            <Section id="violations" title="4) Хориотой үйлдэл (Зөрчил)">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Нэг акаунтаар зэрэг (simultaneous) олон төхөөрөмж/олон газраас
                  нэвтрэх, системийн хамгаалалтыг тойрч ашиглах оролдлого
                </li>
                <li>Дансыг түрээслэх, худалдах, бусдад ашиглуулах</li>
                <li>
                  Сайтын ажиллагаанд саад учруулах (бот, скрипт, эмзэг байдал
                  ашиглах, халдлагын оролдлого гэх мэт)
                </li>
                <li>Контентыг зөвшөөрөлгүй хуулбарлах, дахин нийтлэх, тараах</li>
                <li>Бусдын эрхийг зөрчих, доромж/үзэн ядалт өдөөсөн үйлдэл</li>
              </ul>
            </Section>

            <Section id="penalties" title="5) Зөрчлийн арга хэмжээ (Түгжих/Бан хийх)">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="text-xs font-semibold text-slate-100">
                  Түгжих хугацааны дүрэм
                </div>
                <div className="mt-2 text-sm text-slate-200">
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <b>Анхны зөрчил:</b> 15 минутын хугацаатай түр түгжих
                    </li>
                    <li>
                      <b>Давтан зөрчил:</b> 1 өдөрөөс 7 хоног хүртэл хугацаатай
                      данс түгжих (account ban)
                    </li>
                    <li>
                      <b>Онц ноцтой зөрчил:</b> урьдчилан мэдэгдэлгүйгээр удаан
                      хугацаагаар эсвэл бүр мөсөн хаах боломжтой
                    </li>
                  </ul>
                </div>
                <div className="mt-3 text-[11px] text-slate-500">
                  Тайлбар: Зөрчлийн давтамж, эрсдэлийн түвшнээс хамааран шууд
                  шат ахиж арга хэмжээ авах боломжтой.
                </div>
              </div>
            </Section>

            <Section id="downtime" title="6) Үйлчилгээ тасалдлын нөхөн олговор">
              <p>
                Хэрэв Сайтаас шалтгаалсан үйлчилгээний доголдол/тасалдал гарч,
                хэрэглэгчийн VIP/хандалтын хугацаанаас бодит хугацаа алдагдсан нь
                тогтоогдвол Бид тухайн алдагдсан хугацаатай тэнцэх хэмжээний
                хандалтын хугацааг хэрэглэгчийн дансанд нэмж нөхөн олгоно.
              </p>
            </Section>

            <Section id="ip" title="7) Зохиогчийн эрх ба оюуны өмч">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Сайт дээрх орчуулга, дизайн, бүтэц зэрэг нь Бидний болон/эсвэл
                  холбогдох эрх эзэмшигчдийн оюуны өмч байна.
                </li>
                <li>
                  Зөвшөөрөлгүйгээр хуулбарлах, дахин ашиглах, түгээхийг хориглоно.
                </li>
              </ul>
            </Section>

            <Section id="liability" title="8) Хариуцлага хязгаарлалт">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Сайт нь “байгаагаар нь” нөхцөлөөр үйлчилгээ үзүүлнэ. Техникийн
                  шалтгаанаар түр тасалдах/удаашрах боломжтой.
                </li>
                <li>
                  Хэрэглэгчийн төхөөрөмж, интернет үйлчилгээ, гуравдагч талын
                  үйлчилгээнээс шалтгаалсан сааталд Бид хариуцлага хүлээхгүй.
                </li>
              </ul>
            </Section>

            <Section id="changes" title="9) Нөхцөлийн өөрчлөлт">
              <p>
                Бид эдгээр нөхцөлийг үе үе шинэчлэх эрхтэй. Шинэчилсэн хувилбар
                нь Сайт дээр нийтлэгдсэн өдрөөс хүчин төгөлдөр үйлчилнэ.
              </p>
            </Section>

            <Section id="contact" title="10) Холбоо барих">
              <p>
                Санал хүсэлт, гомдол, зөрчил мэдээлэх бол{" "}
                <Link href="/feedback" className="text-cyan-200 hover:underline">
                  /feedback
                </Link>{" "}
                хуудсаар дамжуулан илгээнэ үү.
              </p>
            </Section>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
              <div className="text-sm font-semibold text-slate-100">
                Товч дүрэм
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-200">
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
                  <div className="text-xs text-slate-400">Анхны зөрчил</div>
                  <div className="font-semibold">15 минутын түр түгжээ</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
                  <div className="text-xs text-slate-400">Давтан зөрчил</div>
                  <div className="font-semibold">7 хоног хүртэл бан</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
                  <div className="text-xs text-slate-400">Тасалдал</div>
                  <div className="font-semibold">Алдагдсан хугацааг нөхөн олгоно</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
              <div className="text-sm font-semibold text-slate-100">
                Санал хүсэлт хэрэгтэй юу?
              </div>
              <p className="mt-2 text-sm text-slate-300">
                Алдаа олдсон бол зураг хавсаргаад илгээгээрэй — хурдан засахад тус
                болно.
              </p>
              <Link
                href="/feedback"
                className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-500/20 hover:brightness-110"
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


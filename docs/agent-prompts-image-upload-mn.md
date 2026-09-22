# Зураг upload болон унших урсгалын засварын промптууд

2026-09-22-ны локал кодын шалгалтад тулгуурлав. Live сайт, production hosting, R2 bucket policy, бодит файлуудаар end-to-end туршилт хийгээгүй. Доорх нь кодоос тогтоосон асуудал болон шалгах эрсдэлүүд; одоогоор application код өөрчлөөгүй.

## Олдсон асуудал

| Эрэмбэ | Асуудал ба нотолгоо | Үр дагавар |
|---|---|---|
| P1 | `frontend/lib/api.ts:500–545`: 3.9MiB-аас том зургийг 2400px, шаардлагатай бол дахин 2000px болгож шахна. `frontend/lib/compressImage.ts:105`: урт талд тулгуурлаж resize хийнэ. | 1200×20000 зураг шахагдах нөхцөлд 144×2400 болж, текст болон нарийн зураас алдагдана. Backend дахин WebP хөрвүүлэх нь алдагдсан деталийг сэргээхгүй. |
| P1 | Frontend 4MiB hard limit; `backend/src/routes/uploadRoutes.js:13` нь 25MiB. | Backend limit нэмэх төдийд том файл орохгүй. Vercel-ийн тухай comment нь бодит deployment-ийн баталгаа биш. |
| P1 | `backend/src/controllers/chapterController.js:303,418` signed URL буцаана; `:327,455` ирсэн pages-ийг шууд хадгална. Editor meta save хүртэл pages буцааж илгээнэ. | Түр URL DB-д хадгалагдаж, хугацаа дуусахад зураг ачаалагдахгүй болох урсгал байна. `urlToR2Key` зөвхөн public base URL-ийг таньдаг тул хадгалагдсан signed URL-ийг дахин sign хийхгүй. |
| P1 | Editor chapter edit-ийн `saveChapterPages` алдааг catch хийгээд дахин throw хийхгүй. Caller нь await-ийн дараа success toast гаргана. | Хадгалагдаагүй нэмэлт/устгал амжилттай мэт харагдана. |
| P2 | Admin/editor chapter upload loop амжилттай URL-уудыг submit-ийн локал массивт хадгална. | Дундаас алдаа гарвал дахин submit хийхэд өмнө нь орсон зургуудыг дахин upload хийнэ; ашиглагдаагүй R2 объект хуримтлагдах эрсдэлтэй. |
| P2 | Requests хуудас энгийн нэвтэрсэн хэрэглэгчид зураг сонгуулаад `/upload` дуудна; backend зөвхөн editor/translator/admin зөвшөөрнө. | Энгийн хэрэглэгчийн зурагтай хүсэлт 403 болно. |
| P2 | `backend/src/controllers/userController.js` нь `DeleteObjectCommand` import хийнэ; `backend/src/config/r2.js` үүнийг export хийхгүй. | Хуучин avatar устгах оролдлого алдаа өгч, catch нь нууж өнгөрөөнө. |
| P2 | `backend/src/utils/image.js`: memory buffer, `limitInputPixels: false`, `failOn: "none"`. | Byte хэмжээ бага боловч асар их пикселтэй зураг серверийн memory/CPU-г хэт ашиглах эрсдэлтэй. Бодит resource failure туршаагүй. |
| P2 | Public chapter controller тусдаа `chapterCache` ашигладаг; update controller өөр cache-тай бөгөөд update handlers invalidate хийдэггүй. | Хадгалалтын дараа хуучин pages/title/status түр харагдах боломжтой. CDN болон олон instance-ийн нөлөөг нэмж шалгана. |
| P2 | `ChapterPages.tsx` зураг алдахад retry байхгүй; PageItem key зөвхөн pageNumber, src өөрчлөгдөхөд loaded/error state reset хийхгүй. | Шинэ зураг хуучин төлөв өвлөх, тасарсан зураг сэргээхэд хүндрэлтэй. |

## Промпт 1 — Зургийн чанар ба том файл оруулах үндсэн засвар

Доорх блокийг агент руу бүхэлд нь өг:

```text
Энэ Manhua-site repository дээр зураг оруулахад чанар муудах, том файл орохгүй байх асуудлыг бодитоор зас. Эхлээд холбогдох код болон AGENTS.md байвал уншаад, дараа нь хэрэгжүүлж шалга. Зөвхөн төлөвлөгөө гаргаад зогсохгүй.

Stack: frontend Next.js/React/TypeScript/Axios; backend Express/Mongoose/Multer/Sharp; storage Cloudflare R2.

Эхэлж шалгах файлууд:
- frontend/lib/api.ts, frontend/lib/compressImage.ts
- backend/src/routes/uploadRoutes.js, backend/src/utils/image.js, backend/src/config/r2.js
- frontend/app/admin/manhuas/[slug]/chapters/{new,[chapterId]}/page.tsx
- frontend/app/editor/manhuas/[slug]/chapters/{new,[chapterId]}/page.tsx
- backend/src/models/Chapter.js, backend/src/app.js

Батлагдсан шалтгаан: uploadImage >3.9MiB зурагт longest-side 2400px resize хийдэг; >4MiB хэвээр бол 2000px болгож дахин шахдаг. compressImage нь Math.max(width,height)-ээр scale тооцдог тул 1200×20000 манхуа 144×2400 болж болно. Backend 25MiB хязгаартай ч frontend 4MiB дээр тасалдаг. Backend дахин nearLossless WebP болгодог.

Хийх ажил:
1. Browser → API → processing → R2 → reader урсгал, deployment/proxy-ийн бодит хязгааруудыг тогтоо. Repo comment-оос hosting-ийг баттай гэж үзэхгүй. Env secret хэвлэхгүй.
2. Chapter page, cover, avatar, request attachment-ийн бодлогыг ялга. Chapter-ийн уртыг багасган өргөнийг сүйтгэдэг resize болон давтан lossy compression-ийг арилга. Эх зургийг хадгалж, унших хувилбарыг тусад нь үүсгэх эсвэл баталгаатай lossless хадгалалт сонго. Cover/avatar-д зохих тусдаа боловсруулалт хэрэглэ.
3. Зорилт: зөвшөөрсөн pixel хэмжээтэй 25MiB хүртэл chapter зураг, урт webtoon-ыг текстийн деталийг алдагдуулахгүй хүлээн авах. Proxy/serverless хязгаар байвал зөвхөн Multer limit нэмэхгүй: богино настай presigned R2 upload + server-side finalize/validation, эсвэл deployment-д нийцэх өөр бодит шийдэл хэрэгжүүл. Browser руу R2 secret гаргахгүй. Staging объект ownership, бодит byte size, decoded image type/dimensions-ийг шалгаж байж chapter-д холбох; presign нь өөрөө бүх size/type validation болдог гэж бүү үз.
4. Codec-ийн dimension хязгаараас урт зурагт эх хувилбарыг хадгалах эсвэл өргөнийг хэвээр үлдээн дараалсан хэсгүүдэд хуваах шийдэл хэрэглэ. Тасархай, давхардсан мөр үүсгэхгүй; хуучин pageNumber/imageUrl өгөгдөлтэй нийцүүл.
5. Byte, pixel, dimension, processing concurrency хязгаар тогтоо. limitInputPixels:false-ийг хязгааргүй шийдэл гэж бүү үлдээ. Дэмжихгүй/эвдэрсэн файлд тодорхой Монгол алдаа харуул. EXIF orientation, alpha, animation-ийн бодлогыг тодорхой болго.
6. Front/backend limit-ийг purpose тус бүрээр нийцүүлж, сонгохоос өмнө UI-д харуул. Upload, processing, saving төлөвийг ялгаж, save дуусаагүй байхад success гэж бүү харуул.

Шалгалт:
- Жижиг хэвийн зураг; >4MiB ба 20–25MiB бодит зураг; limit-ээс давсан файл.
- 1200×20000 урт зураг: хадгалсан dimensions, эх/гаралтын 1:1 текстийн crop харьцуулалт. 144px өргөн болж болохгүй.
- Transparent PNG, EXIF JPEG, гэмтсэн файл, хуурамч MIME, pixel limit давсан зураг.
- Upload/finalize зөвшөөрөлгүй хэрэглэгч болон өөр хүний upload key ашиглах оролдлогыг хаах.
- Admin/editor create/edit болон reader, cover/avatar-ийн regression.
- Холбогдох regression tests, TypeScript/lint/build боломжит шалгалт. Production DB/R2-д тестийн өөрчлөлт бүү хий; тусгаарласан fixture/mock хэрэглэ.

Одоогийн дизайн болон эрхийн дүрмийг хадгал. Өмнө нь чанар алдсан файл эх хувьгүй бол сэргээгдэхгүйг тайланд тэмдэглэ. Хийсэн өөрчлөлт, тестийн үр дүн, үлдсэн deployment/R2 CORS тохиргоог яг нэрлэ; ажиллуулаагүй шалгалтыг тэнцсэн гэж бүү бич. Production deploy бүү хий.
```

## Промпт 2 — Хадгалалт, хугацаа дууссан URL, upload тасралт

Промпт 1-ийн өөрчлөлтийг уншсаны дараа ажиллуул:

```text
Manhua-site-ийн chapter зураг хадгалах урсгалын дараах алдааг зас. Одоогийн diff-ийг эхэлж уншиж, өмнөх upload засварыг хадгал.

1. Түр signed URL DB-д хадгалагдах алдаа:
backend/src/controllers/chapterController.js-ийн getChapterById/editorGetChapterById нь signPages ашиглан imageUrl-ийг сольдог. updateChapter/editorUpdateChapter нь req.body.pages-ийг шууд хадгална. Frontend editor meta save хүртэл pages-ийг буцааж илгээдэг.
DB-д тогтвортой object key/canonical reference хадгалж, display URL-ийг тусад нь буцаа. GET→edit→PUT→GET урсгалд түр credential/query DB-д орохгүй болго. Legacy public URL, Cloudinary зурагтай нийцүүл. Өмнө хадгалагдсан signed URL засах dry-run migration бэлд; зөвхөн танигдсан bucket/host-ийн key-г найдвартай сэргээ, эргэлзээтэй өгөгдлийг тайлагна. Production migration автоматаар бүү ажиллуул. Хугацаа дууссаны дараах уншилтыг clock/mock-оор турш.

2. Хуурамч success:
frontend/app/editor/manhuas/[slug]/chapters/[chapterId]/page.tsx-ийн saveChapterPages catch алдааг залгидаг. Caller нь нэмэх/устгах үед success toast гаргадаг. Typed result эсвэл error propagation хэрэглэж, зөвхөн бодит амжилтад UI state/toast өөрчил. PUT 500 болон network failure тест хий.

3. Upload retry:
Admin/editor create/edit бүх замд per-file pending/uploading/uploaded/failed төлөв, cancel, failed-only retry нэвтрүүл. Амжилттай upload-ийн reference-ийг хадгалж, chapter save fail үед файлуудыг дахин upload хийхгүй болго. Дарааллыг concurrency-оос үл хамааран хадгал. Retry commit нь chapter/page давхардуулахгүй байхаар idempotency/давхардлын хамгаалалт хий. Orphan cleanup зөвхөн өөрийн finalize хийгдээгүй объектод үйлчилнэ; ашиглагдаж байгаа зураг устгахгүй.

4. Cache:
Public controller-ийн backend/src/cache/chapterCache.js ба chapterController.js-ийн локал Map өөр cache болохыг анхаар. Update/status/number/page/delete/restore-ийн дараа зөв cache invalidation хэрэгжүүл. Chapter list, prev/next, home болон CDN cache, олон instance орчин, freeRead хугацаа дуусахыг шалга. Draft болгосон chapter хуучин cached full pages буцаахгүй байх regression тест нэм.

Холбогдох tests/typecheck/lint/build ажиллуулж, баталсан болон шалгаагүй үр дүнг ялгаж тайлагна. Хуучин өгөгдөл устгах, production migration/deploy хийхгүй.
```

## Промпт 3 — Бусад зурагтай холбоотой алдаа, уншигчийн сайжруулалт

```text
Manhua-site дээр өмнөх засваруудыг хадгалан дараах ажлыг хэрэгжүүл:

1. frontend/app/requests/page.tsx энгийн нэвтэрсэн user-ийн attachment-д uploadImage дуудаж байгаа ч /api/upload зөвхөн editor/translator/admin зөвшөөрдөг. User-д зориулсан request-attachment upload purpose/endpoint болон byte/type/quota/rate validation нэм. Chapter upload эрхийг бүх user-д нээж засаж болохгүй. User-ийн зурагтай хүсэлт амжилттай, chapter upload хоригтой хэвээр гэдгийг тестэл.

2. backend/src/controllers/userController.js дахь DeleteObjectCommand нь backend/src/config/r2.js-ээс export хийгдээгүй. Import/export болон avatar replacement lifecycle зас: шинэ файл upload, DB update амжилттай болсны дараа хуучныг цэвэрлэх; DB update бүтэлгүйтсэн үед хуучин avatar хэвээр байх. Concurrent replacement болон cleanup failure-ийг бүртгэж, зөвхөн тухайн хэрэглэгчийн зөв bucket/key-г устгах. Mock storage-тай тестэл.

3. Reader-ийн бодитоор ашиглагдаж буй frontend/app/manhua/[slug]/chapter/[chapterNumber]/components/ChapterPages.tsx дээр image failure retry, imageUrl/chapter солигдоход loading/error reset, empty-state хэрэгжүүл. ChapterPage-ийн width/height metadata боломжтой бол layout reserve ашиглаж scroll jump-ийг багасга; хуучин metadata-гүй зураг ажиллах ёстой. Lazy loading-ийг хадгал. Хэрэглэгддэггүй PageWithLoader хувилбарыг давхар засахын оронд импортын урсгалыг тогтоо.

4. Public/private R2 delivery зөрүүг аудит хий. Public chapter controller public URL буцаадаг, admin/editor signed URL ашигладаг. Bucket үнэхээр public бол URL мэддэг хүн API-ийн VIP шалгалтыг тойрч чадна. Бодит policy нотлоогүй бол үүнийг нөхцөлт эрсдэл гэж тайлагна. Private delivery шаардлагатай бол cover/avatar/public assets-ийг эвдэхгүй migration болон cache/access төлөвлөгөө боловсруул; production bucket policy-г автоматаар бүү өөрчил.

5. Үлдсэн сайжруулалтыг бодит кодын нотолгоотой P1/P2 backlog болго: mobile reader, upload UX, accessibility, performance. Энэ ажлын хүрээнээс гадуур бүх сайтыг redesign/refactor бүү хий.

Хийсэн өөрчлөлт бүрийн шалтгаан, тест болон үлдсэн хязгаарлалтыг товч тайлагна. Production deploy хийхгүй.
```

# SHOD FLOW
## Fleet & Safety platformasi

**Texnik topshiriq (Product Requirements Document) — dasturchilarga topshirish hujjati**

---

Fleet va Safety operatsiyalari uchun production MVP hajmi: rolga asoslangan kirish nazorati, o'zaro bog'langan aktiv/haydovchi profillari, hujjatlarni saqlash, ogohlantirishlar, tarixlar va xarajatlarni hisobga olish.

| | |
|---|---|
| **Versiya** | 1.0 |
| **Holat** | Baholash va ishlab chiqishga tayyor |
| **Kim uchun** | SHOD Express LLC dasturchilar jamoasi |
| **Sana** | 2026-yil 17-iyun |

> **Hajm bo'yicha izoh:** Buxgalteriya (Accounting) ushbu relizga ataylab kiritilmagan va alohida hujjatda tavsiflanadi.

---

## 1. Mahsulot haqida umumiy ma'lumot

Shod Flow — tarqoq jadvallar (spreadsheet) va qo'lda bajariladigan nazoratni Fleet hamda Safety uchun yagona operatsion tizim bilan almashtiradigan ichki veb-ilova. Production versiyasi klikli MVP'da ko'rsatilgan va tasdiqlangan ish oqimlarini saqlab qolishi, ularning ustiga esa real ma'lumotlar bazasi, autentifikatsiya, ruxsatlar, fayl saqlash, audit tarixi va deploy qo'shishi kerak.

> **Asosiy natija**
> Fleet yoki Safety foydalanuvchisi tizimga kiradi va to'g'ridan-to'g'ri o'z bo'limining ish maydoniga yo'naltiriladi. Har bir operatsion yozuv qidiriladigan bo'ladi, o'zining truck, trailer, haydovchi, hujjat, hodisa yoki inspeksiyasiga to'g'ri bog'lanadi va tarix sifatida saqlanadi.

| Soha | Talab |
|---|---|
| Foydalanuvchilar | Owner/Admin, Fleet Manager, Safety Manager va bo'lim xodimlari. |
| Reliz hajmi | Fleet ish maydoni, Safety ish maydoni, umumiy login/ruxsatlar, umumiy haydovchi va aktiv master ma'lumotlari. |
| Mavjud prototip | Mock ma'lumot bilan ishlaydigan Next.js/TypeScript klikli MVP. U ish oqimi uchun namuna, sukut bo'yicha production'ga tayyor kod emas. |
| Production'dan kutilayotgani | Doimiy (persistent) ma'lumot va hujjat saqlashga ega xavfsiz, qo'llab-quvvatlanadigan, testdan o'tgan veb-ilova. |

---

## 2. Kirish, rollar va navigatsiya

| Rol | Sukut bo'yicha landing sahifa | Kirish huquqi |
|---|---|---|
| Owner / Admin | Bo'lim tanlash oynasi yoki Admin dashboard | Fleet, Safety, foydalanuvchilarni boshqarish, sozlamalar, audit loglar. |
| Fleet foydalanuvchisi | Fleet Dashboard | Faqat Fleet modullari, biriktirilgan ruxsatlarga muvofiq. |
| Safety foydalanuvchisi | Safety Dashboard | Faqat Safety modullari, biriktirilgan ruxsatlarga muvofiq. |

- Login foydalanuvchini bo'limi va roliga qarab avtomatik yo'naltirishi shart.
- Ruxsat etilmagan bo'lim yo'nalishlari (route) frontend'da ham, backend'da ham bloklanishi kerak.
- Admin foydalanuvchi, bo'lim, rol va aniq (granular) ruxsatlarni yaratishi, o'chirib qo'yishi (deactivate) va biriktirishi mumkin.
- Header'da tizimga kirgan foydalanuvchi, uning roli, bo'limi va logout tugmasi ko'rinib turishi shart.

---

## 3. Umumiy tizim talablari

- Haydovchilar, trucklar va trailerlar uchun yagona master yozuv; Fleet va Safety ma'lumotni takrorlamasdan bir xil ID'larga murojaat qilishi kerak.
- **Global qidiruv**: unit raqami, trailer raqami, haydovchi, VIN, davlat raqami (plate), CDL, claim raqami, load raqami yoki hujjat nomi bo'yicha.
- **Audit tarixi**: yaratish, tahrirlash, biriktirish, ko'chirish, yopish, o'chirish, yuklash va status o'zgarishi amallari — foydalanuvchi va vaqt belgisi (timestamp) bilan birga.
- Real fayl yuklash, xavfsiz saqlash, ko'rish (preview), yuklab olish, almashtirish/versiya tarixi va kirish nazorati.
- Amal qilish muddatlari, ochiq vazifalar, uzoq davom etayotgan statuslar va yetishmayotgan majburiy ma'lumotlardan avtomatik hosil bo'ladigan bildirishnomalar.
- Desktop-first interfeys: ixcham jadvallar, filtrlar, yopishib turadigan (sticky) sarlavhalar, gorizontal skroll va tushunarli status belgilari (badge).

---

## 4. Fleet ish maydoni

Fleet ish maydoni trucklar, trailerlar, servislar, fleet xarajatlari, hujjatlar va operatsion ogohlantirishlarni boshqaradi. Barcha status o'zgarishlari tarixni saqlab qolishi va dashboard hisoblagichlarini darhol yangilashi shart.

### 4.1 Fleet Dashboard

- **KPI'lar**: biriktirilgan (assigned), biriktirilmagan (unassigned) va servisdagi trucklar; biriktirilgan va biriktirilmagan trailerlar; ochiq servislar; oylik servis xarajati; oylik fleet xarajatlari; muddati tugayotgan hujjatlar; ochiq ogohlantirishlar.
- **Operatsion panellar**: servisdagi trucklar, trailer statusi/harakatsizligi (dormancy), shoshilinch ogohlantirishlar, muddati tugayotgan hujjatlar, so'nggi faoliyat va xarajat grafiklari.
- **Tezkor amallar**: truck qo'shish, trailer qo'shish, servis qo'shish, xarajat qo'shish va hujjat yuklash.

### 4.2 Trucks (Trucklar)

| Ko'rinish / Amal | Talab qilinadigan xatti-harakat |
|---|---|
| Ko'rinishlar | Assigned, Unassigned, In Service, History va All Trucks. |
| Truck qo'shish | Unit, VIN, davlat raqami, marka/yil, egalik turi (ownership type), doimiy joylashuv (home location), amal qilish muddatlari, izohlar va biriktirilgan qurilmalar kiritiladi. Yangi trucklar Unassigned holatida paydo bo'ladi. |
| Assign (biriktirish) | Mavjud haydovchi va olib ketish sanasi (pickup date) tanlanadi; truck Assigned holatiga o'tadi. |
| Move / Drop | Yard + kompaniyani tark etish → Unassigned + tarixga yozuv. Service + kompaniyani tark etish → In Service + tarixga yozuv. Service + uyga ketish → In Service, haydovchi bog'liqligi saqlanib qoladi. |
| Validatsiya | Unit raqami, VIN, davlat raqami va har bir qurilma raqami butun fleet bo'ylab takrorlanmas (unique) bo'lishi shart. |
| Qurilmalar (Devices) | Motive gateway, kamera, PrePass, ELD PT30, planshet va zanjirlar — biriktirish tarixi bilan. |

### 4.3 Truck Profili

- Umumiy ko'rinish, joriy status/haydovchi/joylashuv, egalik, amal qilish muddatlari va joriy qurilmalar.
- Biriktirishlar tarixi, qurilmalar tarixi, servislar tarixi, xarajatlar tarixi, hujjatlar, izohlar va audit vaqt chizig'i (timeline).
- Hisoblanadigan yig'indilar: servis xarajati, boshqa xarajatlar, umumiy xarajat, sonlar, oylik xarajat hamda tur/vendor kesimidagi xarajat taqsimoti.

### 4.4 Trailers (Trailerlar)

| Ko'rinish / Amal | Talab qilinadigan xatti-harakat |
|---|---|
| Ko'rinishlar | Assigned, Unassigned, History va All Trailers. |
| Trailer qo'shish | Trailer raqami, VIN, yil/marka, davlat raqami/shtat, doimiy joylashuv, olib ketish sanasi va yillik inspeksiya muddati kiritiladi. Yangi trailerlar Unassigned holatida paydo bo'ladi. |
| Assign / Drop | Haydovchiga olib ketish sanasi bilan biriktiriladi. Drop paytida joylashuv/manzil, shahar/shtat, sana, sabab/status va ixtiyoriy izohlar qayd etiladi; yozuv tarixga o'tadi. |
| Statuslar | Empty, Booked, Lane, Service va Loaded. Statusni Unassigned ko'rinishidan turib yangilash mumkin. |
| Profil | Foydalanish/joylashuv tarixi, servis tarixi, xarajatlar, hujjatlar, harakatsiz kunlar soni (dormant days) va servis/xarajat taqsimoti. |

### 4.5 Services (Servislar)

- Truck va Trailer uchun alohida ko'rinishlar, hamda All, In Progress, Completed va History.
- Maydonlar: unit, aktiv turi, servis sanasi/turi/statusi, ustaxona (shop), mexanik, narx, trucklar uchun odometr, kelish/hal qilish vaqt belgilari, tavsif va biriktirilgan fayllar.
- Narx faqat tasdiqlangan rental/lessor tomonidan to'lanadigan servislar uchungina ixtiyoriy; qolgan barcha holatlarda majburiy.
- Unit, aktiv turi, servis turi, status, vendor va sana bo'yicha qidiruv/filtr; unit, oy, tur va vendor kesimida yig'indilarni hisoblash.

### 4.6 Fleet xarajatlari

- Kategoriyalar: maintenance, repair, parts, service, parking, wash, equipment, registration, permits va other.
- Yoqilg'i (fuel), yo'l to'lovlari (tolls) va sug'urta (insurance) ushbu relizda Fleet xarajatlari ko'rinishidan tashqarida.
- Kuzatiladigan maydonlar: unit yoki umumiy fleet, sana, kategoriya, vendor, summa, to'lov statusi/usuli, tavsif va biriktirilgan fayl.
- Sana oralig'i, unit, kategoriya va to'langan/kutilayotgan status bo'yicha analitika; unit darajasidagi xarajatlar tarixi va yig'indilari ham bo'lishi kerak.

### 4.7 Fleet hujjatlari

- Faqat Registration, Annual Inspection va Rental Agreement majburiy.
- Yuklash aktiv turi, unit raqami, hujjat turi, berilgan/tugash sanasi va fayl orqali amalga oshiriladi.
- Unit raqami bo'yicha qidiruv va tez yuklab olish; hujjatlar Truck/Trailer profillari ichida ham ko'rinadi.
- Registration va yillik inspeksiya "Expiring Soon" va "Expired" ogohlantirishlarini hosil qiladi. Rental agreement muddati ixtiyoriy.

### 4.8 Fleet bildirishnomalari

- Registration/yillik inspeksiya muddati tugayotgani yoki tugagani, truck servisda haddan tashqari uzoq turgani, trailer juda uzoq harakatsiz qolgani, bajarilayotgan servis va kutilayotgan xarajat.
- Har bir bildirishnomada: muhimlik darajasi (priority), muddat sanasi, bog'liq unit, open/resolved/snoozed statusi va tegishli yozuvga to'g'ridan-to'g'ri havola.

---

## 5. Safety ish maydoni

Safety ish maydonining markazida Haydovchi profili turadi va u muvofiqlik (compliance) yozuvlari, sug'urta, avariyalar, yuk bo'yicha da'volar, inspeksiyalar, hujjatlar va ogohlantirishlarni Fleet ishlatadigan aynan o'sha haydovchi va unit master ma'lumotlariga bog'laydi.

### 5.1 Safety Dashboard

- **KPI'lar**: faol/ishdan bo'shatilgan haydovchilar, muddati tugayotgan CDL va tibbiy kartalar, ochiq avariyalar, ochiq yuk da'volari, kutilayotgan avariyadan keyingi testlar, shu oydagi inspeksiyalar, OCC/ACC'dan rad etilgan haydovchilar hamda yetishmayotgan/muddati o'tgan hujjatlar.
- **Panellar**: kritik ogohlantirishlar, haydovchilar muvofiqligi, ochiq hodisalar, sug'urta nazorati, inspeksiyalar, hujjatlar va so'nggi faoliyat.

### 5.2 Haydovchilar muvofiqligi va Haydovchi profili

| Soha | Talab qilinadigan xatti-harakat |
|---|---|
| Haydovchilar ro'yxati | Ism, status, tug'ilgan sana, CDL raqami/shtati/berilgan va tugash sanasi, tibbiy karta muddati, ishga qabul va bo'shatish sanalari. Faol haydovchilar yuqorida, ishdan bo'shatilganlar ro'yxat oxiriga tushadi. |
| Ogohlantirishlar | CDL yoki tibbiy karta 30 kun ichida tugasa → ogohlantirish (warning); muddati o'tgan bo'lsa → kritik ogohlantirish. |
| Haydovchi profili | Umumiy ko'rinish, CDL, tibbiy karta, DQ fayllar, OCC/ACC, avariyalar, yuk da'volari, inspeksiyalar, hujjatlar, izohlar, vaqt chizig'i va Fleet'dan olingan joriy unit. |
| Fayllar | CDL, tibbiy karta, DQ va tegishli Safety hujjatlarini ochish/ko'rish/yuklab olish. |

### 5.3 Sug'urta (Insurance)

| Modul | Maydonlar va qoidalar |
|---|---|
| OCC/ACC | Haydovchi, tug'ilgan sana, CDL, qo'shilgan/chiqarilgan sana, status Active/Removed/Rejected, rad etilganlik belgisi, izohlar. Faollar yuqorida; chiqarilganlar pastda; rad etilganlar aniq belgilanadi va sanab boriladi. |
| PD/Bobtail | Egasi, unit, yil/marka, VIN, davlat raqami, COI fayli, amal qilish muddati, status Active/Expired/Missing, izohlar. Fleet'dagi truck bilan bog'lanadi va COI muddati o'tgan yoki yo'q bo'lsa ogohlantirish beriladi. |

### 5.4 Avariyalar (Accidents)

- Maydonlar: aybdorlik (fault), sana, haydovchi, unit/yil/marka, joylashuv, avariyadan keyingi test bajarilgani, claim raqami, adjuster, status Pending/Closed, izohlar va fayllar.
- Kutilayotgan (Pending) avariyalar yuqorida, yopilganlari (Closed) oxirida turadi. Avariyadan keyingi test bajarilmagan bo'lsa — kritik ogohlantirish hosil bo'ladi.
- Avariya tafsilotlari sahifasida fayllar, vaqt chizig'i, status o'zgarishlari, bog'langan Haydovchi profili va Truck profili bo'ladi.

### 5.5 Yuk bo'yicha da'volar (Cargo Claims)

- Maydonlar: yo'qotish sanasi, haydovchi, unit, load, broker, yo'qotish joyi, claim raqami, adjuster, status Pending/Closed, izohlar va fayllar.
- Kutilayotgan da'volar yuqorida, yopilganlari oxirida. Da'vo tafsilotlari haydovchi va unit profillariga bog'lanadi.

### 5.6 Inspeksiyalar (Inspections)

- Maydonlar: inspeksiya sanasi, haydovchi, unit, shtat, daraja (level), izohlar/qoidabuzarliklar, bonus yoki jarima, hisobot fayli va status Clean/Violation/Pending Review/Closed.
- Inspeksiya tafsilotlari Haydovchi va Truck profillariga bog'lanadi. Hisobotni ko'rish va yuklab olish mumkin bo'lishi shart.
- Dashboard va hisobotlarda inspeksiyalar, qoidabuzarliklar, ko'rib chiqilishi kutilayotganlar, bonuslar va jarimalar bo'yicha yig'ma ma'lumot chiqadi.

### 5.7 Safety hujjatlari va bildirishnomalari

- Hujjat kategoriyalari: CDL, Medical Card, DQ File, OCC/ACC File, PD/Bobtail COI, Accident File, Cargo Claim File va Inspection Report.
- Haydovchi, unit, CDL, claim raqami, inspeksiya ID'si yoki hujjat nomi bo'yicha qidiruv; fayllar tegishli profillar ichida ko'rsatiladi.
- Bildirishnomalar: muddati tugayotgan/tugagan CDL yoki tibbiy karta, rad etilgan OCC/ACC, muddati tugayotgan yoki mavjud bo'lmagan COI, kutilayotgan avariyadan keyingi test, ochiq avariya/da'vo, ko'rib chiqilishi kutilayotgan inspeksiya va yetishmayotgan majburiy hujjat.

---

## 6. Production va texnik talablar

| Kategoriya | Minimal talab |
|---|---|
| Arxitektura | Qo'llab-quvvatlanadigan modulli veb-ilova. Mavjud Next.js prototipi kod ko'rigidan (code review) so'ng qayta ishlatilishi yoki noldan qayta yozilishi mumkin; ish oqimi xatti-harakati esa o'zgarmas mezon bo'lib qoladi. |
| Backend va ma'lumotlar bazasi | Foydalanuvchilar, haydovchilar, aktivlar, biriktirishlar, servislar, xarajatlar, hujjatlar, hodisalar, inspeksiyalar, bildirishnomalar va audit hodisalari uchun to'g'ri tashqi kalitlarga (foreign key) ega doimiy relatsion ma'lumot modeli. |
| Autentifikatsiya | Xavfsiz login, parolni tiklash, sessiyalarni boshqarish, rol/ruxsatlarni majburlash, faol bo'lmagan foydalanuvchilar bilan ishlash va MFA'ga tayyorlik (ixtiyoriy). |
| Fayllar | Yopiq (private) object storage, imzolangan (signed) kirish havolalari, fayl turi/hajmi validatsiyasi, metama'lumotlar, versiya/almashtirish tarixi va zaxira nusxalar. |
| Xavfsizlik | HTTPS, eng kam imtiyoz prinsipi, kirish ma'lumotlarini validatsiya qilish, server tomonda avtorizatsiya, audit loglash, shifrlangan maxfiy kalitlar hamda shaxsiy/haydovchi ma'lumotlarini himoya qilish. |
| Sifat | Kritik ish oqimlari uchun avtomatlashtirilgan testlar, lint/type/build tekshiruvlari, xatolarni qayta ishlash, loading/empty holatlar va QA/UAT muhiti. |
| Deploy | Alohida development/staging/production muhitlari, CI/CD, monitoring, zaxiralash va topshirish hujjatlari. |

---

## 7. Qabul qilish mezonlari (Acceptance Criteria)

1. Foydalanuvchi tizimga kira oladi va to'g'ri Fleet yoki Safety ish maydoniga yo'naltiriladi; ruxsatsiz kirish bloklanadi.
2. Fleet foydalanuvchilari trucklar va trailerlarni qo'sha, biriktira, ko'chira va kuzata oladi — bunda to'liq tarix saqlanib qoladi.
3. Truck va Trailer profillari faqat o'ziga tegishli biriktirishlar, servislar, xarajatlar, hujjatlar, qurilmalar, joylashuvlar va hisoblangan xarajatlarni ko'rsatadi.
4. Safety foydalanuvchilari haydovchilar muvofiqligi, sug'urta, avariyalar, yuk da'volari, inspeksiyalar, hujjatlar va tegishli ogohlantirishlarni o'zaro bog'langan profillardan turib boshqara oladi.
5. Muddat va kechikish qoidalari to'g'ri bildirishnomalar hamda dashboard hisoblagichlarini hosil qiladi.
6. Yuklangan fayllar xavfsiz saqlanadi, imkoni bo'lgan joyda ko'rib chiqiladi, qidiriladi va ruxsatga ega foydalanuvchilar tomonidan yuklab olinadi.
7. Qidiruv, filtrlar, saralash, status o'zgarishlari va asosiy dashboard ko'rsatkichlari real production ma'lumotlari bilan ishlaydi hamda sahifa yangilangandan yoki qayta kirgandan keyin ham saqlanib qoladi.
8. Audit tarixi har bir operatsion yozuvni kim va qachon o'zgartirganini aniq ko'rsatadi.
9. Reliz kelishilgan UAT stsenariylaridan, xavfsizlik ko'rigidan va production deploy tekshiruv ro'yxatidan muvaffaqiyatli o'tadi.

---

*Maxfiy — SHOD Express LLC | Fleet & Safety MVP*

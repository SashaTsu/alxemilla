// 📁 public/js/locale.js

export const supported = ['ru', 'en', 'sr'];

let currentLang = localStorage.getItem('lang') || 'ru';
if (!supported.includes(currentLang)) currentLang = 'ru';

export function getCurrentLang() {
  return currentLang;
}

export function changeLang(lang) {
  if (!supported.includes(lang)) return;
  currentLang = lang;
  localStorage.setItem('lang', lang);
}

export const locales = {
  ru: {
    about: {
      text: `Привет =)

Я дизайнер вязаной одежды с образованием архитектора,
поэтому стремлюсь создавать структурированные, сдержанные,
но при этом изысканные модели.

Если у вас есть любые вопросы — пишите мне на почту:
alxemilla@gmail.com`,
    },
    menu: {
      all: 'Все товары',
      clothing: 'Одежда',
      bags: 'Сумки',
      accessories: 'Аксессуары',
      pattern: 'Описания',
      about: 'Обо мне',
      delivery: 'Доставка',
    },
    delivery: {
      text: `После оформления заказа на товар с размером в наличии, вам на почту придет подтверждение и сообщение о стоимости и примерных сроках доставки. Отправка возможна в день заказа.
Доставка по Белграду в тот же день.
Оплата наличными / переводом по номеру карты / перевод по номеру телефона для рублевых переводов по курсу гугла.

Вещи под заказ могут отличаться от тех, что на фото, по составу и цвету пряжи и потребуют времени на изготовление необходимого размера. К примеру, кардиган займет 3–4 недели на изготовление и отправку, жилет — 1 неделю. Цвет и состав пряжи обговаривается с заказчиком после 50% предоплаты.`,
    },
    product: {
      buy: 'КУПИТЬ',
      download: 'СКАЧАТЬ',
      free: 'Бесплатно',
      back: '← Назад',
      materials: 'Материалы',
      sizeChart: 'Размерная сетка',
      description: 'Описание',
      productInfo: 'Информация о товаре',
      inStock: 'В наличии: {count}',
      outOfStockForSize: 'Нет в наличии',
      preorder: 'ПРЕДЗАКАЗ',
      color: 'Цвет',
      colors: {
        black: 'Чёрный',
        peach: 'Персиковый',
        grey: 'Серый',
      },
    },
    order: {
      title: 'Оформление заказа',
      preorderTitle: 'Оформление предзаказа',
      size: 'Размер',
      name: 'Имя',
      email: 'Email',
      comment: 'Комментарий',
      confirm: 'ПОДТВЕРДИТЬ ЗАКАЗ',
      confirmPreorder: 'ПОДТВЕРДИТЬ ПРЕДЗАКАЗ',
      thanksTitle: 'Спасибо за заказ!',
      thanksBody: 'Ваш заказ №{id} принят. Ожидайте письма с деталями на ваш Email.',
      backToProducts: 'Вернуться к товарам',
      nameError: 'Пожалуйста, введите имя',
      emailError: 'Пожалуйста, введите корректный E-mail',
      commentError: 'Пожалуйста, оставьте комментарий',
      captchaError: 'Пожалуйста, подтвердите капчу',
      submitError: 'Произошла ошибка при отправке заказа. Попробуйте ещё раз.',
    },
  },
  en: {
    about: {
      text: `Hi =)

I’m a knitwear designer with a degree in architecture,
so I aim to make structured, simple looking but sophisticated designs.

If you have questions of any kind - please contact me by email:
alxemilla@gmail.com`,
    },
    menu: {
      all: 'All products',
      clothing: 'Clothing',
      bags: 'Bags',
      accessories: 'Accessories',
      pattern: 'Patterns',
      about: 'About',
      delivery: 'Delivery',
    },
    delivery: {
      text: `After placing an order for an item in stock, you’ll receive a confirmation and details about delivery cost and estimated timing by email. Same-day shipping is possible.
Delivery within Belgrade — same day.
Payment in cash / bank transfer / phone number transfer (for RUB transfers at Google exchange rate).

Made-to-order items may differ in composition and color from the photo and require production time in your selected size. For example, a cardigan takes 3–4 weeks to produce and ship, a vest — about 1 week. Yarn color and composition are discussed with the customer after a 50% prepayment.`,
    },
    product: {
      buy: 'BUY',
      download: 'DOWNLOAD',
      free: 'Free',
      back: '← Back',
      materials: 'Materials',
      sizeChart: 'Size Chart',
      description: 'Description',
      productInfo: 'Product Information',
      inStock: 'In stock: {count}',
      outOfStockForSize: 'Out of stock',
      preorder: 'PREORDER',
      color: 'Color',
      colors: {
        black: 'Black',
        peach: 'Peach',
        grey: 'Grey',
      },
    },
    order: {
      title: 'Checkout',
      preorderTitle: 'Preorder checkout',
      size: 'Size',
      name: 'Name',
      email: 'Email',
      comment: 'Comment',
      confirm: 'PLACE ORDER',
      confirmPreorder: 'PLACE PREORDER',
      thanksTitle: 'Thank you!',
      thanksBody: "Your order №{id} has been received. You'll get an email shortly.",
      backToProducts: 'Back to products',
      nameError: 'Please enter your name',
      emailError: 'Please enter a valid email address',
      commentError: 'Please enter a comment',
      captchaError: 'Please complete the captcha',
      submitError: 'An error occurred while submitting the order. Please try again.',
    },
  },
  sr: {
    about: {
      text: `Zdravo =)

Ja sam dizajner pletene garderobe sa diplomom iz arhitekture,
pa težim da pravim strukturirane, jednostavnog izgleda
ali sofisticirane kreacije.

Ako imate bilo kakvih pitanja – slobodno mi se obratite
putem email-a:
alxemilla@gmail.com`,
    },
    menu: {
      all: 'Svi proizvodi',
      clothing: 'Odeća',
      bags: 'Torbe',
      accessories: 'Aksesoarije',
      pattern: 'Opisi',
      about: 'O meni',
      delivery: 'Dostava',
    },
    delivery: {
      text: `Nakon porudžbine artikla koji je na stanju, dobićete potvrdu i informacije o ceni i okvirnom roku isporuke putem e-pošte. Slanje je moguće istog dana.
Dostava u Beogradu — istog dana.
Plaćanje gotovinom / uplatom na broj kartice / uplatom na broj telefona za rublje po Google kursu.

Proizvodi po porudžbini mogu se razlikovati od onih na fotografiji po sastavu i boji prediva i zahtevaju vreme za izradu u željenoj veličini. Na primer, kardigan zahteva 3–4 nedelje za izradu i slanje, prsluk — oko 1 nedelju. Boja i sastav prediva dogovaraju se sa kupcem nakon 50% avansa.`,
    },
    product: {
      buy: 'KUPITI',
      download: 'Preuzmi',
      free: 'Besplatno',
      back: '← Nazad',
      materials: 'Materijali',
      sizeChart: 'Tabela veličina',
      description: 'Opis',
      productInfo: 'Informacije o proizvodu',
      inStock: 'Na stanju: {count}',
      outOfStockForSize: 'Nema na stanju',
      preorder: 'PREDNARUDŽBINA',
      color: 'Boja',
      colors: {
        black: 'Crni',
        peach: 'Boja breskve',
        grey: 'Sivi',
      },
    },
    order: {
      title: 'Porudžbina',
      preorderTitle: 'Prednarudžbina',
      size: 'Veličina',
      name: 'Ime',
      email: 'E-pošta',
      comment: 'Komentar',
      confirm: 'POTVRDI PORUDŽBINU',
      confirmPreorder: 'POTVRDI PREDNARUDŽBINU',
      thanksTitle: 'Hvala na porudžbini!',
      thanksBody: 'Vaša porudžbina №{id} je primljena. Očekujte mejл sa detaljima.',
      backToProducts: 'Povratak na proizvode',
      nameError: 'Unesite ime',
      emailError: 'Unesite ispravnu e-poštu',
      commentError: 'Unesite komentar',
      captchaError: 'Molimo potvrdite kapču',
      submitError:
        'Došlo je do greške prilikom slanja porudžbine. Molimo pokušajte ponovo.',
    },
  },
};

export function t(path, params) {
  const lang = getCurrentLang();
  let str = path.split('.').reduce((o, k) => o && o[k], locales[lang]);
  if (typeof str !== 'string' || !params) return str;
  return str.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`);
}
export function tColor(name) {
  if (!name) return '';
  const lang = getCurrentLang();
  const dict = locales?.[lang]?.product?.colors || {};
  // Без учёта регистра: ищет перевод для любого написания ('Black', 'black' и т.д.)
  const key = Object.keys(dict).find(
    (k) => k.toLowerCase() === String(name).toLowerCase(),
  );
  return key ? dict[key] : name; // Если нет перевода — вернуть как есть
}
export function tFormat(path, params = {}) {
  const template = t(path);
  if (!template || typeof template !== 'string') return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    params[k] !== undefined ? params[k] : `{${k}}`,
  );
}

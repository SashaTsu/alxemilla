function getPriceNumber(p) {
  // Получить число из строки (например, "1500 €" => 1500, "0" => 0)
  if (typeof p.price === 'number') return p.price;
  if (!p.price) return 0;
  const match = String(p.price)
    .replace(',', '.')
    .match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}
function getColorTitle(c) {
  if (!c) return '';
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map(getColorTitle).join(', ');
  if (typeof c === 'object' && c.name) return c.name;
  return String(c);
}
import { fetchProducts, fetchProduct, submitOrder, addOrUpdateProduct } from './api.js';
import { auth, signInWithEmailAndPassword, signOut } from './firebase.js';
import { t, tColor, tFormat } from './locale.js';
// Firebase Storage static assets
const ASSETS = {
  logo: {
    avif: 'https://firebasestorage.googleapis.com/v0/b/knitting-shop-7526c.firebasestorage.app/o/icons_and_logo%2Flogo.avif?alt=media',
    webp: 'https://firebasestorage.googleapis.com/v0/b/knitting-shop-7526c.firebasestorage.app/o/icons_and_logo%2Flogo.webp?alt=media',
    png: 'https://firebasestorage.googleapis.com/v0/b/knitting-shop-7526c.firebasestorage.app/o/icons_and_logo%2Flogo.png?alt=media',
  },
  instagram: {
    avif: 'https://firebasestorage.googleapis.com/v0/b/knitting-shop-7526c.firebasestorage.app/o/icons_and_logo%2Finstagram.avif?alt=media',
    webp: 'https://firebasestorage.googleapis.com/v0/b/knitting-shop-7526c.firebasestorage.app/o/icons_and_logo%2Finstagram.webp?alt=media',
    jpg: 'https://firebasestorage.googleapis.com/v0/b/knitting-shop-7526c.firebasestorage.app/o/icons_and_logo%2Finstagram.jpg?alt=media',
  },
  gmail: {
    avif: 'https://firebasestorage.googleapis.com/v0/b/knitting-shop-7526c.firebasestorage.app/o/icons_and_logo%2Fgmail.avif?alt=media',
    webp: 'https://firebasestorage.googleapis.com/v0/b/knitting-shop-7526c.firebasestorage.app/o/icons_and_logo%2Fgmail.webp?alt=media',
    png: 'https://firebasestorage.googleapis.com/v0/b/knitting-shop-7526c.firebasestorage.app/o/icons_and_logo%2Fgmail.png?alt=media',
  },
  etsy: {
    avif: 'https://firebasestorage.googleapis.com/v0/b/knitting-shop-7526c.firebasestorage.app/o/icons_and_logo%2Fetsy.avif?alt=media',
    webp: 'https://firebasestorage.googleapis.com/v0/b/knitting-shop-7526c.firebasestorage.app/o/icons_and_logo%2Fetsy.webp?alt=media',
    png: 'https://firebasestorage.googleapis.com/v0/b/knitting-shop-7526c.firebasestorage.app/o/icons_and_logo%2Fetsy.png?alt=media',
  },
  ravelry: {
    avif: 'https://firebasestorage.googleapis.com/v0/b/knitting-shop-7526c.firebasestorage.app/o/icons_and_logo%2Fravelry.avif?alt=media',
    webp: 'https://firebasestorage.googleapis.com/v0/b/knitting-shop-7526c.firebasestorage.app/o/icons_and_logo%2Fravelry.webp?alt=media',
    jpg: 'https://firebasestorage.googleapis.com/v0/b/knitting-shop-7526c.firebasestorage.app/o/icons_and_logo%2Fravelry.jpg?alt=media',
  },
};

function pictureHTML(srcs, alt, cls, w, h) {
  return `
    <picture>
      ${srcs.avif ? `<source srcset="${srcs.avif}" type="image/avif">` : ''}
      ${srcs.webp ? `<source srcset="${srcs.webp}" type="image/webp">` : ''}
      <img src="${srcs.jpg || srcs.png}" 
           alt="${alt}" 
           ${cls ? `class="${cls}"` : ''} 
           ${w ? `width="${w}"` : ''} 
           ${h ? `height="${h}"` : ''} 
           style="border-radius:8px;"
           loading="lazy" 
           decoding="async">
    </picture>
  `;
}

function getImageMeta(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.onload = () =>
      resolve({ url, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
  });
}

let app;

export function renderSidebar() {
  const user = auth.currentUser;
  document.querySelector('.sidebar').innerHTML = `
    <button class="burger-button" id="burger" aria-label="Меню">&#9776;</button>
    <!-- 1. Логотип -->
<div class="sidebar-header">
  <a href="/">
    ${pictureHTML(ASSETS.logo, 'Alxemilla Logo', 'sidebar-logo')}
  </a>
</div>
<div class="lang-switcher">
        <button data-lang="ru" onclick="setLanguage('ru')">RU</button>
        <button data-lang="en" onclick="setLanguage('en')">EN</button>
        <button data-lang="sr" onclick="setLanguage('sr')">SR</button>
      </div>

    <!-- 2. Меню скроллится отдельно -->
    <div class="sidebar-menu">
      <ul>
  <li><a href="/" onclick="renderProductList();return false;">${t('menu.all').toUpperCase()}</a></li>
  <li><a href="/clothing" onclick="renderProductList('clothing');return false;">${t('menu.clothing').toUpperCase()}</a></li>
  <li><a href="/bags" onclick="renderProductList('bags');return false;">${t('menu.bags').toUpperCase()}</a></li>
  <li><a href="/pattern" onclick="renderProductList('pattern');return false;">${t('menu.pattern').toUpperCase()}</a></li>
  <li><a href="/about" onclick="renderAbout();return false;">${t('menu.about').toUpperCase()}</a></li>
  <li><a href="/delivery" onclick="renderDelivery();return false;">${t('menu.delivery').toUpperCase()}</a></li>
  ${user ? `<li><a href="/admin">Добавить товар</a></li>` : ''}
</ul>     
    </div>


  `;
}

export async function renderProductList(category = null, updateHistory = true) {
  const app = document.getElementById('app');
  app.className = '';
  if (updateHistory) {
    history.pushState({ name: 'list', category }, '', category ? `/${category}` : '/');
  }
  window.currentView = { name: 'list', category };

  const lang = localStorage.getItem('lang') || 'ru';
  const products = await fetchProducts(category);

  function renderImgBlock(img, title) {
    if (!img) return '';
    // Новый формат: avif/webp/jpegUrl
    if (img.avifUrl || img.webpUrl || img.jpegUrl) {
      return `
      <picture>
        ${img.avifUrl ? `<source srcset="${img.avifUrl}" type="image/avif">` : ''}
        ${img.webpUrl ? `<source srcset="${img.webpUrl}" type="image/webp">` : ''}
        <img src="${img.jpegUrl || img.webpUrl || img.avifUrl}" width="${img.width}" height="${img.height}" alt="${title}" loading="lazy">
      </picture>
    `;
    }
    // Старый Storage downloadURL
    if (img.url && img.url.startsWith('http')) {
      return `<img src="${img.url}" width="${img.width}" height="${img.height}" alt="${title}" loading="lazy">`;
    }
    // Старый локальный путь (assets)
    if (img.url) {
      const base = img.url.replace(/^.*\//, '').replace(/\.\w+$/, '');
      return `
      <picture>
        <source srcset="/assets/images/nextgen/${base}.avif" type="image/avif" loading="lazy">
        <source srcset="/assets/images/nextgen/${base}.webp" type="image/webp" loading="lazy">
        <img src="${img.url}" width="${img.width}" height="${img.height}" alt="${title}" loading="lazy">
      </picture>
    `;
    }
    return '';
  }

  app.innerHTML = `
  <div class="container">
    <div class="product-grid">
      ${products
        .map((p) => {
          const thumb = p.image;
          const hover = p.hoverImage;
          const title = p.translations?.[lang]?.title || '';

          return `
<div class="card" onclick="showProduct('${p.id}');return false;">
  <div class="card-image">
    ${renderImgBlock(thumb, title)}
    ${
      hover
        ? renderImgBlock({ ...hover, className: 'hover' }, title).replace(
            '<img ',
            '<img class="hover" ',
          )
        : ''
    }
  </div>
  <div class="card-info">
    <div class="card-title">${title}</div>
    <div class="card-price">${getPriceNumber(p) === 0 ? t('product.free') : p.price}</div>
  </div>
</div>
`;
        })
        .join('')}
    </div>
  </div>
  <footer class="site-credit">
    Site by <a href="https://www.linkedin.com/in/atsukanova/" target="_blank" rel="noopener">
      Aleksandra Tsukanova
    </a>
  </footer>`;
}

export async function showProduct(id) {
  if (!window.currentView || window.currentView.id !== id) {
  }
  const app = document.getElementById('app');
  app.className = '';
  if (location.pathname !== `/product/${id}`) {
    history.pushState({ name: 'product', id }, '', `/product/${id}`);
  }
  window.currentView = { name: 'product', id };

  const p = await fetchProduct(id);
  if (!p) return renderProductList();

  const priceNum = getPriceNumber(p);

  const lang = localStorage.getItem('lang') || 'ru';
  const tr = p.translations?.[lang] || {};

  // Получаем все товары и варианты цвета для группы
  const allProducts = await fetchProducts();
  let groupProducts = [];
  if (p.group && typeof p.group === 'string' && p.group.trim() !== '') {
    // Только если у товара реально задана группа!
    groupProducts = allProducts.filter((prod) => prod.group === p.group);
  }

  // Блок цветовых свотчей
  let colorBlock = '';
  if (
    p.group &&
    typeof p.group === 'string' &&
    p.group.trim() !== '' &&
    groupProducts.length > 1
  ) {
    // Показываем свотчи для группы (переключатели)
    colorBlock = `
    <div class="product-colors" style="margin-bottom:16px;">
      <label style="display:block; margin-bottom:6px;">${t('product.color') || 'Цвет'}</label>
      <div>
        ${groupProducts
          .map(
            (prod) =>
              `<a 
  href="/product/${prod.id}" 
  class="color-swatch"
  title="${tColor(prod.color?.name || '')}"
  style="background: ${prod.color?.rgb || '#eee'};"
  data-id="${prod.id}"
  ${prod.id === p.id ? 'data-active="1"' : ''}
></a>`,
          )
          .join('')}
      </div>
    </div>
  `;
  } else if (p.color && p.color.rgb) {
    // Нет группы или товар единственный — просто кружок цвета (не ссылка)
    colorBlock = `
    <div class="product-colors" style="margin-bottom:12px;">
      <label style="display:block; margin-bottom:6px;">${t('order.color') || 'Цвет'}</label>
      <div>
        <span 
          class="color-swatch" 
          style="background: ${p.color.rgb}; opacity:0.7; cursor: default;" 
          title="${tColor(p.color?.name || '')}">
        </span>
      </div>
    </div>
  `;
  }

  // 5. Галерея
  const gallery = (
    Array.isArray(p.images) && p.images.length > 0 ? p.images : [p.image, p.hoverImage]
  ).filter(
    (item) =>
      item &&
      typeof item === 'object' &&
      (item.avifUrl || item.webpUrl || item.jpegUrl || item.url),
  );

  // Универсальный рендер картинки (Storage + старые)
  function renderGalleryImg(item) {
    if (!item) return '';
    // приоритет avif > webp > jpeg
    if (item.avifUrl || item.webpUrl || item.jpegUrl) {
      return `
      <div class="slider-slide">
        <picture>
          ${item.avifUrl ? `<source srcset="${item.avifUrl}" type="image/avif">` : ''}
          ${item.webpUrl ? `<source srcset="${item.webpUrl}" type="image/webp">` : ''}
          <img src="${item.jpegUrl || item.webpUrl || item.avifUrl}" width="${item.width}" height="${item.height}" alt="" loading="lazy">
        </picture>
      </div>
    `;
    }
    // поддержка старых
    if (item.url && item.url.startsWith('http')) {
      return `
      <div class="slider-slide">
        <img src="${item.url}" width="${item.width}" height="${item.height}" alt="" loading="lazy">
      </div>
    `;
    }
    if (item.url) {
      const name = item.url.replace(/^.*\//, '').replace(/\.\w+$/, '');
      return `
      <div class="slider-slide">
        <picture>
          <source srcset="/assets/images/nextgen/${name}.avif" type="image/avif">
          <source srcset="/assets/images/nextgen/${name}.webp" type="image/webp">
          <img src="${item.url}" width="${item.width}" height="${item.height}" alt="" loading="lazy">
        </picture>
      </div>
    `;
    }
    return '';
  }

  // 6. Это паттерн?
  const isPattern = p.category === 'pattern';

  // 7. Размер (селектор) и stock
  let selectedSize = null;
  if (Array.isArray(p.sizes) && p.sizes.length > 0) {
    selectedSize =
      p.sizes.find((size) => p.stock && Number(p.stock[size]) > 0) || p.sizes[0];
  }
  let sizeBlock = '';
  if (!isPattern && Array.isArray(p.sizes) && p.sizes.length > 0) {
    sizeBlock = `
      <div class="product-sizes">
        <label>${t('order.size')}</label>
        <select id="product-size-select">
          ${p.sizes.map((s) => `<option${s === selectedSize ? ' selected' : ''}>${s}</option>`).join('')}
        </select>
        <div class="size-stock-info" id="size-stock-info"></div>
      </div>
    `;
  }

  // 8. Кнопка купить/предзаказ
  let inStockForSize = true;
  if (p.stock && selectedSize) {
    inStockForSize = Number(p.stock[selectedSize]) > 0;
  }
  let actionButton = '';
  if (isPattern) {
    if (priceNum === 0 && p.fileUrl) {
      actionButton = `<button id="download-btn" class="buy-button">${t('product.download').toUpperCase()}</button>`;
    } else if (priceNum === 0 && !p.fileUrl) {
      actionButton = `<div class="product-warning">${t('product.noFileUrl') || 'Нет файла для скачивания'}</div>`;
    } else {
      actionButton = `<button id="buy-button" class="buy-button">${t('product.buy').toUpperCase()}</button>`;
    }
  } else {
    actionButton = inStockForSize
      ? `<button id="buy-button" class="buy-button">${t('product.buy').toUpperCase()}</button>`
      : `<button id="buy-button" class="buy-button" data-preorder="1">${t('product.preorder').toUpperCase() || 'ПРЕДЗАКАЗ'}</button>`;
  }

  // 9. Описание/материалы/размерная сетка
  let patternInfo = `
    <div class="product-description"><p>${tr.description || ''}</p></div>
    <div class="product-tabs-row">
      <button class="product-tab-btn" data-tab="materials">${t('product.materials')}</button>
      <button class="product-tab-btn" data-tab="sizeChart">${t('product.sizeChart')}</button>
    </div>
  `;

  // 10. Формируем HTML
  app.innerHTML = `
  <div class="container product-two-column">
    <div class="product-gallery-main">
      <div class="slider-container">
        <div class="slider-track">
          ${gallery.map(renderGalleryImg).join('')}
        </div>
      </div>
    </div>
 <div class="product-info-block">
      <h1 class="product-title">${tr.title || ''}</h1>
      <p class="product-price">${priceNum === 0 ? t('product.free') : p.price}</p>
      <div class="product-description"><p>${tr.description || ''}</p></div>
      ${p.category !== 'pattern' ? colorBlock : ''}
      ${p.category !== 'pattern' ? sizeBlock : ''}
      <div class="product-buy-tabs-wrap">
  ${actionButton}
  <div class="product-tabs-row">
    <button class="product-tab-btn" data-tab="materials">${t('product.materials')}</button>
    <button class="product-tab-btn" data-tab="sizeChart">${t('product.sizeChart')}</button>
  </div>
</div>
      <button class="back-button" onclick="renderProductList();return false;">
        ${t('product.back')}
      </button>
    </div>
  </div>`;
  window.scrollTo(0, 0);

  // ==== TABS LOGIC ====
  const productTabs = [
    {
      key: 'materials',
      title: t('product.materials'),
      content: (tr.materials || '').split('\n').join('<br>'),
    },
    {
      key: 'sizeChart',
      title: t('product.sizeChart'),
      content: (tr.sizeChart || '').split('\n').join('<br>'),
    },
  ];

  function openProductTabModal(selectedKey = 'materials') {
    let modal = document.querySelector('.product-tab-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'product-tab-modal';
      modal.innerHTML = `
        <div class="product-tab-modal-bg"></div>
        <div class="product-tab-modal-panel">
          <button class="product-tab-modal-close" aria-label="close">&times;</button>
          <div class="product-tab-modal-header">${t('product.productInfo') || 'Информация о товаре'}</div>
          <div class="product-tab-modal-nav"></div>
          <div class="product-tab-modal-content"></div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('.product-tab-modal-close').onclick = modal.querySelector(
        '.product-tab-modal-bg',
      ).onclick = () => modal.remove();
    }
    const tabsNav = productTabs
      .map(
        (tab) =>
          `<button class="product-modal-tab${tab.key === selectedKey ? ' active' : ''}" data-tab="${tab.key}">${tab.title}</button>`,
      )
      .join('');
    modal.querySelector('.product-tab-modal-nav').innerHTML = tabsNav;
    modal.querySelector('.product-tab-modal-content').innerHTML =
      productTabs.find((tab) => tab.key === selectedKey)?.content || '';

    modal.querySelectorAll('.product-modal-tab').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        openProductTabModal(btn.dataset.tab);
      };
    });
  }

  document.querySelectorAll('.product-tab-btn').forEach((btn) => {
    btn.onclick = () => openProductTabModal(btn.dataset.tab);
  });

  // === Обработка swatch (смена цвета/товара)
  document.querySelectorAll('.swatch-btn').forEach((btn) => {
    btn.onclick = () => {
      const newId = btn.dataset.id;
      if (newId && newId !== id) showProduct(newId);
    };
  });

  // === Обработка смены размера и отображение наличия/остатка
  const sizeSelect = document.getElementById('product-size-select');
  if (sizeSelect) {
    const stockMessage = document.getElementById('stock-message');
    const sizeStockInfo = document.getElementById('size-stock-info');
    function updateStock() {
      const val = sizeSelect.value;
      const stock =
        p.stock && typeof p.stock[val] !== 'undefined' ? Number(p.stock[val]) : null;
      let msg = '';
      const buyBtn = document.getElementById('buy-button');
      if (stock === null) {
        msg = '';
        if (buyBtn) {
          buyBtn.disabled = false;
          buyBtn.textContent = t('product.buy');
        }
      } else if (stock > 0) {
        msg = t('product.inStock', { count: stock }) || `В наличии: ${stock}`;
        if (buyBtn) {
          buyBtn.disabled = false;
          buyBtn.textContent = t('product.buy');
        }
      } else {
        msg = t('product.outOfStockForSize') || 'Нет в наличии';
        if (buyBtn) {
          buyBtn.disabled = false; // НЕ ОТКЛЮЧАЙ!
          buyBtn.textContent = t('product.preorder') || 'Предзаказ';
          buyBtn.setAttribute('data-preorder', '1');
        }
      }
      if (sizeStockInfo) sizeStockInfo.textContent = msg;
    }
    sizeSelect.onchange = updateStock;
    updateStock();
  }
  // Кнопка купить
  const buyBtn = document.getElementById('buy-button');
  if (buyBtn) {
    buyBtn.addEventListener('click', () => {
      const isPreorder = buyBtn.dataset.preorder === '1';
      const selectedSize =
        !isPattern && document.getElementById('product-size-select')
          ? document.getElementById('product-size-select').value
          : undefined;
      renderOrderForm(id, selectedSize, p.color, isPreorder);
      if (window.scrollToTop) window.scrollToTop();
    });
  }

  // Кнопка скачать
  const downloadBtn = document.getElementById('download-btn');
  if (downloadBtn && p.fileUrl) {
    let lastClick = 0;
    const wait = 10000;
    downloadBtn.addEventListener('click', function (e) {
      e.preventDefault();
      const now = Date.now();
      if (now - lastClick < wait || downloadBtn.classList.contains('loading')) return;
      lastClick = now;
      downloadBtn.classList.add('loading');
      downloadBtn.disabled = true;
      window.open(p.fileUrl, '_blank');
      setTimeout(() => {
        downloadBtn.classList.remove('loading');
        downloadBtn.disabled = false;
      }, wait);
    });
  }
}

export async function renderOrderForm(
  id,
  preSize = null,
  preColor = null,
  isPreorder = false,
) {
  app = document.getElementById('app');
  app.className = 'order-page';
  history.pushState(
    { name: 'order', id, size: preSize, color: preColor, preorder: isPreorder },
    '',
    `/order/${id}`,
  );
  window.currentView = {
    name: 'order',
    id,
    size: preSize,
    color: preColor,
    preorder: isPreorder,
  };
  const p = await fetchProduct(id);
  if (!p) return renderProductList();

  app.innerHTML = `
  <div class="container container-narrow">
    <h1 class="order-title-label">
      ${isPreorder ? t('order.preorderTitle') || 'Оформление предзаказа' : t('order.title')}
    </h1>
    <form id="order-form" class="order-form" novalidate>
            ${
              preSize && preSize !== 'undefined'
                ? `<div class="form-field" style="margin-bottom:10px;">
          <div class="checkout-params-row">
            <span class="checkout-product-title">${p.translations?.[localStorage.getItem('lang') || 'ru']?.title || ''}</span>
            <span class="checkout-size-badge">${preSize}</span>
          </div>
       </div>`
                : ''
            }
${
  !preSize && p.category !== 'pattern' && Array.isArray(p.sizes) && p.sizes.length > 0
    ? `<div class="form-field">
          <label>${t('order.size')}</label>
          <select name="size">
            ${p.sizes.map((s) => `<option>${s}</option>`).join('')}
          </select>
       </div>`
    : ''
}
      <div class="form-field"><label for="name-input">${t('order.name')}</label><input id="name-input" name="name" required pattern="^[A-Za-zA-Яа-яЁё ]{2,}$"/><div class="field-error" id="error-name"></div></div>
      <div class="form-field"><label for="email-input">${t('order.email')}</label><input id="email-input" name="email" type="email" required/><div class="field-error" id="error-email"></div></div>
      <div class="form-field"><label for="comment-input">${t('order.comment')}</label><textarea id="comment-input" name="comment" maxlength="500"></textarea><div class="field-error" id="error-comment"></div></div>
      <div class="form-field"><div id="recaptcha-container"></div><div class="field-error" id="error-captcha"></div></div>
      <div id="order-error" class="order-error" aria-live="polite"></div>
      <button type="submit" class="buy-button">
  ${(isPreorder ? t('order.confirmPreorder') : t('order.confirm')).toUpperCase()}
</button>
    </form>
    <button class="back-button" onclick="showProduct('${p.id}')">${t('product.back')}</button>
  </div>
`;
  document.querySelectorAll('.color-swatch').forEach((el) => {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      const pid = el.getAttribute('data-id');
      if (pid && pid !== p.id) showProduct(pid);
    });
  });
  // динамически ждём grecaptcha и контейнер
  (function renderCaptcha() {
    const c = document.getElementById('recaptcha-container');
    if (window.grecaptcha && c) {
      try {
        grecaptcha.render(c, {
          sitekey: '6LebqB8rAAAAAGu7irZmYxKl6Up_4CmFHT2Uhotk',
        });
      } catch {}
    } else {
      setTimeout(renderCaptcha, 300);
    }
  })();

  const form = document.getElementById('order-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1) Сброс всех ошибок
    form.querySelectorAll('.field-error').forEach((el) => (el.textContent = ''));

    // 2) Чтение полей
    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim();
    const comment = form.elements.comment.value.trim();

    // 3) Валидация полей (имя, email, комментарий)
    if (!name) {
      document.getElementById('error-name').textContent = t('order.nameError');
      document.getElementById('name-input').focus();
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      document.getElementById('error-email').textContent = t('order.emailError');
      document.getElementById('email-input').focus();
      return;
    }
    if (!comment) {
      document.getElementById('error-comment').textContent = t('order.commentError');
      document.getElementById('comment-input').focus();
      return;
    }

    // 4) Валидация размера — только если поле select есть
    if (form.elements.size && !form.elements.size.value) {
      alert('Пожалуйста, выберите размер');
      form.elements.size.focus();
      return;
    }

    // 5) Валидация капчи
    const token = grecaptcha.getResponse();
    if (!token) {
      document.getElementById('error-captcha').textContent = t('order.captchaError');
      document
        .getElementById('recaptcha-container')
        .scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // 6) Показываем спиннер на кнопке
    const btn = form.querySelector('button[type="submit"]');
    btn.classList.add('loading');
    btn.disabled = true;

    // 7) Формируем payload (size только если select реально есть)
    const payload = {
      name,
      email,
      comment,
      productId: id,
      'g-recaptcha-response': token,
    };

    if (preSize) {
      payload.size = preSize;
    } else if (form.elements.size && form.elements.size.value) {
      payload.size = form.elements.size.value;
    }

    if (preColor) {
      payload.color = typeof preColor === 'string' ? preColor : getColorTitle(preColor);
    }

    if (isPreorder) {
      payload.preorder = true;
    }
    try {
      const res = await submitOrder(payload);
      grecaptcha.reset();

      // экран «Спасибо»
      app.innerHTML = `
      <div class="container container-narrow">
        <h2 class="order-title-label">${t('order.thanksTitle')}</h2>
        <p>${t('order.thanksBody').replace('{id}', res.id)}</p>
        <button class="buy-button" onclick="renderProductList()">
          ${t('order.backToProducts')}
        </button>
      </div>
    `;
    } catch (e) {
      // обрабатываем серверные ошибки под полями
      const msg = e.message;
      if (msg === 'Invalid name') {
        document.getElementById('error-name').textContent = t('order.nameError');
      } else if (msg === 'Invalid email') {
        document.getElementById('error-email').textContent = t('order.emailError');
      } else if (msg === 'Invalid comment') {
        document.getElementById('error-comment').textContent = t('order.commentError');
      } else {
        alert(t('order.submitError'));
      }
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  });
  if (window.scrollToTop) window.scrollToTop();
}

export function renderAbout() {
  history.pushState({ name: 'about' }, '', '/about');
  app = document.getElementById('app');
  app.className = '';
  app.innerHTML = `
    <div class="container">
      <h1>${t('menu.about')}</h1>
      <p>${t('about.text')}</p>
<div class="about-socials" style="margin-top:24px; display:flex; gap:18px; align-items:center;">
  <a href="https://www.ravelry.com/designers/alxemilla" target="_blank" rel="noopener">
    ${pictureHTML(ASSETS.ravelry, 'Ravelry', '', 32, 32)}
  </a>
  <a href="https://www.instagram.com/alxemilla/" target="_blank" rel="noopener">
    ${pictureHTML(ASSETS.instagram, 'Instagram', '', 32, 32)}
  </a>
  <a href="mailto:alxemilla@gmail.com">
    ${pictureHTML(ASSETS.gmail, 'Email', '', 32, 32)}
  </a>
  <a href="https://www.etsy.com/people/wkanlq89y8coffwc?ref=hdr_user_menu-profile" target="_blank" rel="noopener">
    ${pictureHTML(ASSETS.etsy, 'Etsy', '', 32, 32)}
  </a>
</div>
      </div>
    </div>`;
  window.scrollToTop();
}

export function renderDelivery() {
  history.pushState({ name: 'delivery' }, '', '/delivery');
  app = document.getElementById('app');
  app.className = '';
  app.innerHTML = `
    <div class="container">
      <h1>${t('menu.delivery')}</h1>
      <p>${t('delivery.text').split('\n\n').join('</p><p>')}</p>
    </div>`;
  window.scrollToTop();
}

window.renderDelivery = renderDelivery;

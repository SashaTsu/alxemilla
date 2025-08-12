import { fetchProduct, addOrUpdateProduct } from './api.js';
import {
  auth,
  signInWithEmailAndPassword,
  signOut,
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from './firebase.js';
import { t } from './locale.js';

let app;

// Получение width/height по URL (только для jpeg)
async function getImageMeta(jpegUrl) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.src = jpegUrl;
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
  });
}

async function uploadImageToStorage(file, productId, filename) {
  const storage = getStorage();
  const storageRef = ref(storage, `products/${productId}/${filename}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

function stripToken(url) {
  const [main, queryRaw] = url.split('?');
  if (!queryRaw) return url;
  const query = queryRaw
    .split('&')
    .filter((x) => x.startsWith('alt='))
    .join('&');
  return query ? `${main}?${query}` : main;
}

export function renderLogin() {
  app = document.getElementById('app');
  app.className = '';
  history.replaceState({ name: 'login' }, '', '/admin');
  app.innerHTML = `
    <div class="container container-narrow">
      <h1>Вход в админ-панель</h1>
      <form id="login-form" class="order-form" novalidate>
        <div class="form-field"><label>Email</label><input type="email" name="email" required/></div>
        <div class="form-field"><label>Пароль</label><input type="password" name="password" required/></div>
        <div id="login-error" class="order-error"></div>
        <button type="submit" class="buy-button">Войти</button>
      </form>
    </div>`;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('login-error');
    const { email, password } = Object.fromEntries(new FormData(e.target));
    try {
      await signInWithEmailAndPassword(auth, email, password);
      location.href = `${location.origin.replace(/^http:/, 'https:')}/admin`;
    } catch (x) {
      err.textContent = x.message;
    }
  });
}

export async function renderAdminForm(id = null) {
  app = document.getElementById('app');
  app.className = '';
  const q = id ? `?id=${id}` : '';
  if (location.pathname + location.search !== `/admin${q}`) {
    history.replaceState({ name: 'admin', id }, '', `/admin${q}`);
  }
  let p = {
    id: '',
    category: '',
    price: '',
    sizes: [],
    color: { name: '', rgb: '' },
    stock: {},
    group: '',
    image: null,
    hoverImage: null,
    images: [],
    fileUrl: '',
    translations: { ru: {}, en: {}, sr: {} },
  };
  if (id) {
    const d = await fetchProduct(id);
    if (d) p = d;
    if (!p.color) p.color = { name: '', rgb: '' };
    if (!p.group) p.group = '';
    if (!p.stock) p.stock = {};
  }
  const sizesStr = Array.isArray(p.sizes) ? p.sizes.join(',') : '';

  // --- Фотоблоки: объекты с тремя форматами
  let mainImgObj = p.image || {
    jpegUrl: '',
    webpUrl: '',
    avifUrl: '',
    width: null,
    height: null,
  };
  let hoverImgObj = p.hoverImage || {
    jpegUrl: '',
    webpUrl: '',
    avifUrl: '',
    width: null,
    height: null,
  };
  let extraImages =
    Array.isArray(p.images) && p.images.length
      ? p.images.map((img) => ({
          jpegUrl: img?.jpegUrl || '',
          webpUrl: img?.webpUrl || '',
          avifUrl: img?.avifUrl || '',
          width: img?.width || null,
          height: img?.height || null,
        }))
      : [];

  // ------------------ RENDER FORM ------------------
  app.innerHTML = `
    <div class="container container-narrow">
      <button id="logout-button" class="back-button">Выйти</button>
      <h1>${id ? 'Редактировать товар' : 'Добавить товар'}</h1>
      <form id="product-form" class="order-form">
        <div class="form-field"><label>ID товара</label>
          <input name="id" value="${p.id || ''}" required/>
        </div>
        <div class="form-field"><label>Категория</label>
          <input name="category" required value="${p.category}" list="category-list"/>
          <datalist id="category-list">
            <option value="clothing">
            <option value="bags">
            <option value="pattern">
          </datalist>
        </div>
        <div class="form-field" id="file-url-field" style="display: ${p.category === 'pattern' ? 'block' : 'none'}">
          <label>Ссылка на файл (fileUrl) — для паттернов</label>
          <input name="fileUrl" value="${p.fileUrl || ''}" placeholder="https://..." />
        </div>
        <div class="form-field"><label>Цена</label><input type="text" min="0" name="price" required value="${p.price}"/></div>
        <div class="form-field"><label>Размеры (через запятую)</label><input name="sizes" value="${sizesStr}"/></div>
        ${
          p.category !== 'pattern'
            ? `
          <div class="form-field"><label>Цвет (название)</label><input name="color_name" value="${p.color?.name || ''}"/></div>
          <div class="form-field"><label>Цвет (RGB, например #eeddbc)</label><input name="color_rgb" value="${p.color?.rgb || ''}" pattern="^#([A-Fa-f0-9]{6})$"/></div>
        `
            : ''
        }
        <div class="form-field"><label>Модель / Группа (опционально)</label><input name="group" value="${p.group || ''}"/></div>
        ${
          p.category !== 'pattern'
            ? `
          <div class="form-field"><label>Остатки по размерам (XS:1,S:0...)</label>
            <input name="stock" value="${Object.entries(p.stock || {})
              .map(([k, v]) => `${k}:${v}`)
              .join(',')}" />
          </div>
        `
            : ''
        }

        ${imageBlock('Основное фото', mainImgObj, 'main')}
        ${imageBlock('Фото при наведении (hover)', hoverImgObj, 'hover')}
        <div class="form-field"><label>Дополнительные изображения</label>
          <div id="extra-images-list"></div>
          <button type="button" id="add-extra-image-btn">Добавить фото</button>
        </div>

        ${translationFields(p)}
        <button type="submit" class="buy-button">Сохранить товар</button>
      </form>
    </div>
  `;
  const form = document.getElementById('product-form');

  document.getElementById('logout-button').onclick = () => signOut(auth);

  // Категория: показать/скрыть fileUrl
  const categoryInput = form.elements.category;
  const fileUrlField = document.getElementById('file-url-field');
  categoryInput.addEventListener('input', function () {
    if (categoryInput.value.trim() === 'pattern') fileUrlField.style.display = 'block';
    else fileUrlField.style.display = 'none';
  });

  // --- Универсальный блок загрузки трёх форматов (main и hover)
  bindImageUploadBlock('main', mainImgObj, (update) => {
    mainImgObj = update;
  });
  bindImageUploadBlock('hover', hoverImgObj, (update) => {
    hoverImgObj = update;
  });

  // --- Дополнительные фото (массив)
  renderExtraImages();
  document.getElementById('add-extra-image-btn').onclick = () => addExtraImage();

  // --- САБМИТ ---
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Валидация наличия всех форматов (main, hover, extra)
    if (!imageValid(mainImgObj)) return alert('Основное фото — загрузите все 3 формата');
    if (!imageValid(hoverImgObj))
      return alert('Фото при наведении — загрузите все 3 формата');
    for (let img of extraImages)
      if (!imageValid(img))
        return alert('В каждом доп. изображении должны быть все 3 формата');

    const productId = form.elements.id.value.trim();
    if (!productId) return alert('ID товара обязателен');

    const sizes = form.elements.sizes.value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const translations = {
      ru: {
        title: form.elements.title_ru.value.trim(),
        description: form.elements.description_ru.value.trim(),
        materials: form.elements.materials_ru.value.trim(),
        sizeChart: form.elements.sizeChart_ru.value.trim(),
      },
      en: {
        title: form.elements.title_en.value.trim(),
        description: form.elements.description_en.value.trim(),
        materials: form.elements.materials_en.value.trim(),
        sizeChart: form.elements.sizeChart_en.value.trim(),
      },
      sr: {
        title: form.elements.title_sr.value.trim(),
        description: form.elements.description_sr.value.trim(),
        materials: form.elements.materials_sr.value.trim(),
        sizeChart: form.elements.sizeChart_sr.value.trim(),
      },
    };

    const product = {
      id: productId,
      category: form.elements.category.value.trim(),
      price: form.elements.price.value.trim(),
      sizes,
      image: mainImgObj,
      hoverImage: hoverImgObj,
      images: extraImages,
      translations,
      fileUrl: form.elements.fileUrl ? form.elements.fileUrl.value.trim() : '',
      group: form.elements.group?.value.trim() || '',
      stock: {},
      color: { name: '', rgb: '' },
    };

    if (product.category !== 'pattern') {
      product.color = {
        name: form.elements.color_name.value.trim(),
        rgb: form.elements.color_rgb.value.trim(),
      };
      const stockStr = form.elements.stock.value.trim();
      product.stock = {};
      stockStr.split(',').forEach((part) => {
        const [size, qty] = part.split(':');
        if (size && qty !== undefined)
          product.stock[size.trim()] = parseInt(qty.trim(), 10) || 0;
      });
    }

    await addOrUpdateProduct(product);
    alert('Товар сохранён!');
    renderProductList();
  });

  // ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ EXTRA IMAGES =====

  function renderExtraImages() {
    const list = document.getElementById('extra-images-list');
    list.innerHTML = '';
    extraImages.forEach((img, idx) => {
      const row = document.createElement('div');
      row.className = 'extra-image-row';
      row.style.marginBottom = '6px';
      row.innerHTML = `
        <div style="display:flex;align-items:center;">
          <img src="${img.jpegUrl}" width="60" style="margin-right:8px;"/>
          <span style="font-size:12px;color:gray;">
            ${img.webpUrl ? 'WebP ✅' : 'WebP ❌'} | ${img.avifUrl ? 'AVIF ✅' : 'AVIF ❌'}
          </span>
          <button type="button" class="edit-extra" data-idx="${idx}" style="margin-left:12px;">Редактировать</button>
          <button type="button" class="remove-img" style="margin-left:6px;">Удалить</button>
          <button type="button" class="move-up" ${idx === 0 ? 'disabled' : ''}>&uarr;</button>
          <button type="button" class="move-down" ${idx === extraImages.length - 1 ? 'disabled' : ''}>&darr;</button>
        </div>
      `;
      row.querySelector('.remove-img').onclick = () => {
        extraImages.splice(idx, 1);
        renderExtraImages();
      };
      row.querySelector('.edit-extra').onclick = () => editExtraImage(idx);
      row.querySelector('.move-up').onclick = () => {
        [extraImages[idx - 1], extraImages[idx]] = [
          extraImages[idx],
          extraImages[idx - 1],
        ];
        renderExtraImages();
      };
      row.querySelector('.move-down').onclick = () => {
        [extraImages[idx], extraImages[idx + 1]] = [
          extraImages[idx + 1],
          extraImages[idx],
        ];
        renderExtraImages();
      };
      list.appendChild(row);
    });
  }

  async function addExtraImage() {
    // Диалог для добавления трёх форматов
    let obj = {
      jpegUrl: '',
      webpUrl: '',
      avifUrl: '',
      width: null,
      height: null,
    };
    await showImageUploadDialog(obj, async (res) => {
      extraImages.push(res);
      renderExtraImages();
    });
  }

  async function editExtraImage(idx) {
    let obj = { ...extraImages[idx] };
    await showImageUploadDialog(obj, async (res) => {
      extraImages[idx] = res;
      renderExtraImages();
    });
  }

  // ====== КОМПОНЕНТЫ ======

  function imageBlock(label, img, prefix) {
    return `
      <div class="form-field"><label>${label} (3 формата)</label>
        <div style="margin-bottom:8px;">
          <img id="${prefix}-preview" src="${img?.jpegUrl || ''}" width="120" ${img?.jpegUrl ? '' : 'style="display:none"'} />
          <div id="${prefix}-webp-status" style="font-size:12px; color:gray;">
            ${img?.webpUrl ? 'WebP загружен' : 'WebP не загружен'}
          </div>
          <div id="${prefix}-avif-status" style="font-size:12px; color:gray;">
            ${img?.avifUrl ? 'AVIF загружен' : 'AVIF не загружен'}
          </div>
        </div>
        <button type="button" id="${prefix}-upload-jpeg-btn">Загрузить JPEG</button>
        <input type="file" id="${prefix}-file-jpeg-input" accept=".jpg,image/jpeg" style="display:none"/>
        <button type="button" id="${prefix}-upload-webp-btn">Загрузить WebP</button>
        <input type="file" id="${prefix}-file-webp-input" accept=".webp,image/webp" style="display:none"/>
        <button type="button" id="${prefix}-upload-avif-btn">Загрузить AVIF</button>
        <input type="file" id="${prefix}-file-avif-input" accept=".avif,image/avif" style="display:none"/>
        <button type="button" id="${prefix}-img-clear" ${img?.jpegUrl || img?.webpUrl || img?.avifUrl ? '' : 'style="display:none"'}>Удалить</button>
      </div>
    `;
  }

  function translationFields(p) {
    return `
      <div class="form-field"><label>Название RU</label>
        <input name="title_ru" required value="${(p.translations.ru.title || '').replace(/"/g, '&quot;')}" />
      </div>
      <div class="form-field"><label>Описание RU</label>
        <textarea name="description_ru">${p.translations.ru.description || ''}</textarea>
      </div>
      <div class="form-field"><label>Материалы RU</label>
        <textarea name="materials_ru">${p.translations.ru.materials || ''}</textarea>
      </div>
      <div class="form-field"><label>Размерная сетка RU</label>
        <textarea name="sizeChart_ru">${p.translations.ru.sizeChart || ''}</textarea>
      </div>
      <div class="form-field"><label>Название EN</label>
        <input name="title_en" required value="${(p.translations.en.title || '').replace(/"/g, '&quot;')}" />
      </div>
      <div class="form-field"><label>Описание EN</label>
        <textarea name="description_en">${p.translations.en.description || ''}</textarea>
      </div>
      <div class="form-field"><label>Материалы EN</label>
        <textarea name="materials_en">${p.translations.en.materials || ''}</textarea>
      </div>
      <div class="form-field"><label>Размерная сетка EN</label>
        <textarea name="sizeChart_en">${p.translations.en.sizeChart || ''}</textarea>
      </div>
      <div class="form-field"><label>Название SR</label>
        <input name="title_sr" required value="${(p.translations.sr.title || '').replace(/"/g, '&quot;')}" />
      </div>
      <div class="form-field"><label>Описание SR</label>
        <textarea name="description_sr">${p.translations.sr.description || ''}</textarea>
      </div>
      <div class="form-field"><label>Материалы SR</label>
        <textarea name="materials_sr">${p.translations.sr.materials || ''}</textarea>
      </div>
      <div class="form-field"><label>Размерная сетка SR</label>
        <textarea name="sizeChart_sr">${p.translations.sr.sizeChart || ''}</textarea>
      </div>
    `;
  }

  function imageValid(obj) {
    return obj && obj.jpegUrl && obj.webpUrl && obj.avifUrl && obj.width && obj.height;
  }

  function bindImageUploadBlock(prefix, imgObj, onChange) {
    const preview = document.getElementById(`${prefix}-preview`);
    const webpStatus = document.getElementById(`${prefix}-webp-status`);
    const avifStatus = document.getElementById(`${prefix}-avif-status`);
    const clearBtn = document.getElementById(`${prefix}-img-clear`);

    // JPEG
    document.getElementById(`${prefix}-upload-jpeg-btn`).onclick = () =>
      document.getElementById(`${prefix}-file-jpeg-input`).click();
    document.getElementById(`${prefix}-file-jpeg-input`).onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = await uploadImageToStorage(
        file,
        form.elements.id.value.trim() || 'temp',
        file.name,
      );
      const { width, height } = await getImageMeta(url);
      imgObj.jpegUrl = stripToken(url);
      imgObj.width = width;
      imgObj.height = height;
      preview.src = imgObj.jpegUrl;
      preview.style.display = '';
      clearBtn.style.display = '';
      onChange({ ...imgObj });
    };

    // WebP
    document.getElementById(`${prefix}-upload-webp-btn`).onclick = () =>
      document.getElementById(`${prefix}-file-webp-input`).click();
    document.getElementById(`${prefix}-file-webp-input`).onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = await uploadImageToStorage(
        file,
        form.elements.id.value.trim() || 'temp',
        file.name,
      );
      imgObj.webpUrl = stripToken(url);
      webpStatus.textContent = imgObj.webpUrl ? 'WebP загружен' : 'WebP не загружен';
      clearBtn.style.display = '';
      onChange({ ...imgObj });
    };

    // AVIF
    document.getElementById(`${prefix}-upload-avif-btn`).onclick = () =>
      document.getElementById(`${prefix}-file-avif-input`).click();
    document.getElementById(`${prefix}-file-avif-input`).onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = await uploadImageToStorage(
        file,
        form.elements.id.value.trim() || 'temp',
        file.name,
      );
      imgObj.avifUrl = stripToken(url);
      avifStatus.textContent = imgObj.avifUrl ? 'AVIF загружен' : 'AVIF не загружен';
      clearBtn.style.display = '';
      onChange({ ...imgObj });
    };

    clearBtn.onclick = () => {
      imgObj.jpegUrl = '';
      imgObj.webpUrl = '';
      imgObj.avifUrl = '';
      imgObj.width = null;
      imgObj.height = null;
      preview.src = '';
      preview.style.display = 'none';
      clearBtn.style.display = 'none';
      webpStatus.textContent = 'WebP не загружен';
      avifStatus.textContent = 'AVIF не загружен';
      onChange({ ...imgObj });
    };
  }

  // Диалог загрузки для доп. изображения (3 формата)
  async function showImageUploadDialog(obj, onReady) {
    const modal = document.createElement('div');
    modal.className = 'extra-img-modal';
    modal.innerHTML = `
      <div style="background:#fff;padding:24px;border-radius:12px;max-width:420px;margin:120px auto;box-shadow:0 8px 32px #0002">
        <div style="margin-bottom:8px;"><img id="dlg-preview" src="${obj.jpegUrl || ''}" width="120" ${obj.jpegUrl ? '' : 'style="display:none"'} /></div>
        <div id="dlg-webp-status" style="font-size:12px;color:gray;">
          ${obj.webpUrl ? 'WebP загружен' : 'WebP не загружен'}
        </div>
        <div id="dlg-avif-status" style="font-size:12px;color:gray;">
          ${obj.avifUrl ? 'AVIF загружен' : 'AVIF не загружен'}
        </div>
        <button type="button" id="dlg-upload-jpeg-btn">Загрузить JPEG</button>
        <input type="file" id="dlg-file-jpeg-input" accept=".jpg,image/jpeg" style="display:none"/>
        <button type="button" id="dlg-upload-webp-btn">Загрузить WebP</button>
        <input type="file" id="dlg-file-webp-input" accept=".webp,image/webp" style="display:none"/>
        <button type="button" id="dlg-upload-avif-btn">Загрузить AVIF</button>
        <input type="file" id="dlg-file-avif-input" accept=".avif,image/avif" style="display:none"/>
        <button type="button" id="dlg-ok-btn" style="margin-top:12px;">OK</button>
        <button type="button" id="dlg-cancel-btn" style="margin-top:12px;">Отмена</button>
      </div>
    `;
    document.body.appendChild(modal);

    const preview = modal.querySelector('#dlg-preview');
    modal.querySelector('#dlg-upload-jpeg-btn').onclick = () =>
      modal.querySelector('#dlg-file-jpeg-input').click();
    modal.querySelector('#dlg-file-jpeg-input').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = await uploadImageToStorage(
        file,
        form.elements.id.value.trim() || 'temp',
        file.name,
      );
      const { width, height } = await getImageMeta(url);
      obj.jpegUrl = stripToken(url);
      obj.width = width;
      obj.height = height;
      preview.src = obj.jpegUrl;
      preview.style.display = '';
    };
    modal.querySelector('#dlg-upload-webp-btn').onclick = () =>
      modal.querySelector('#dlg-file-webp-input').click();
    modal.querySelector('#dlg-file-webp-input').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = await uploadImageToStorage(
        file,
        form.elements.id.value.trim() || 'temp',
        file.name,
      );
      obj.webpUrl = stripToken(url);
      modal.querySelector('#dlg-webp-status').textContent = obj.webpUrl
        ? 'WebP загружен'
        : 'WebP не загружен';
    };
    modal.querySelector('#dlg-upload-avif-btn').onclick = () =>
      modal.querySelector('#dlg-file-avif-input').click();
    modal.querySelector('#dlg-file-avif-input').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = await uploadImageToStorage(
        file,
        form.elements.id.value.trim() || 'temp',
        file.name,
      );
      obj.avifUrl = stripToken(url);
      modal.querySelector('#dlg-avif-status').textContent = obj.avifUrl
        ? 'AVIF загружен'
        : 'AVIF не загружен';
    };
    modal.querySelector('#dlg-ok-btn').onclick = () => {
      if (imageValid(obj)) {
        document.body.removeChild(modal);
        onReady({ ...obj });
      } else {
        alert('Загрузите все 3 формата');
      }
    };
    modal.querySelector('#dlg-cancel-btn').onclick = () => {
      document.body.removeChild(modal);
    };
  }
}

window.renderLogin = renderLogin;
window.renderAdminForm = renderAdminForm;

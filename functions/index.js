const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const nodemailer = require('nodemailer');
const sharp = require('sharp');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const os = require('os');
const fs = require('fs');

admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();
const storage = new Storage();

// === Gmail SMTP через nodemailer ===
const GMAIL_USER = functions.config().gmail.email;
const GMAIL_PASS = functions.config().gmail.pass;

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS,
  },
});

// === НАСТРОЙКИ ===
const ADMIN_EMAIL = 'alxemilla@gmail.com';

const allowedOrigins = [
  'https://alxemilla.com',
  'https://www.alxemilla.com',
  'https://knitting-shop-7526c.web.app',
  'http://localhost:5000',
];
const corsFn = require('cors')({
  origin: (origin, callback) => {
    callback(null, allowedOrigins.includes(origin));
  },
});

const RECAPTCHA_SECRET = functions.config().recaptcha.secret;
const SKIP_CAPTCHA_SECRET = functions.config().test.skip_captcha_secret;

// ——————————————————————————————————————————
// 1) getProducts
// ——————————————————————————————————————————
exports.getProducts = functions.region('europe-west1').https.onRequest((req, res) => {
  corsFn(req, res, async () => {
    const snap = await db.collection('products').get();
    const list = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        category: data.category,
        price: data.price,
        group: data.group || '',
        color: data.color || {},
        image: data.image,
        hoverImage: data.hoverImage,
        translations: {
          ru: { title: data.translations?.ru?.title || '' },
          en: { title: data.translations?.en?.title || '' },
          sr: { title: data.translations?.sr?.title || '' },
        },
      };
    });
    res.json(list);
  });
});

// ——————————————————————————————————————————
// 2) getProduct
// ——————————————————————————————————————————
exports.getProduct = functions.region('europe-west1').https.onRequest((req, res) => {
  corsFn(req, res, async () => {
    try {
      const doc = await db.collection('products').doc(req.query.id).get();

      if (!doc.exists) return res.status(404).send('Not found');

      const d = doc.data();

      res.json({
        id: doc.id,
        category: d.category || '',
        price: d.price || '',
        sizes: Array.isArray(d.sizes) ? d.sizes : [],
        image: d.image || '',
        hoverImage: d.hoverImage || '',
        images: Array.isArray(d.images) ? d.images.filter(Boolean) : [],
        fileUrl: d.fileUrl || '',
        color: d.color || { name: '', rgb: '' },
        group: d.group || '',
        stock: d.stock || {},
        translations: {
          ru: {
            title: d.translations?.ru?.title || '',
            description: d.translations?.ru?.description || '',
            materials: d.translations?.ru?.materials || '',
            sizeChart: d.translations?.ru?.sizeChart || '',
          },
          en: {
            title: d.translations?.en?.title || '',
            description: d.translations?.en?.description || '',
            materials: d.translations?.en?.materials || '',
            sizeChart: d.translations?.en?.sizeChart || '',
          },
          sr: {
            title: d.translations?.sr?.title || '',
            description: d.translations?.sr?.description || '',
            materials: d.translations?.sr?.materials || '',
            sizeChart: d.translations?.sr?.sizeChart || '',
          },
        },
      });
    } catch (err) {
      console.error('❌ getProduct error:', err.message, err.stack);
      res.status(500).send('Internal Server Error');
    }
  });
});

// ——————————————————————————————————————————
// 3) createOrder — с поддержкой color
// ——————————————————————————————————————————
exports.createOrder = functions.region('europe-west1').https.onRequest((req, res) => {
  corsFn(req, res, async () => {
    const data = req.body;
    const { name, email, comment, size, productId, color } = data;

    // --- 0. Валидация name ---
    let rawName = name;
    const n = typeof rawName === 'string' ? rawName.trim() : '';
    if (
      typeof n !== 'string' ||
      !/^(?=(?:.*[\p{L}]){2,})[\p{L} .'-]+$/u.test(n) ||
      n.length > 100
    ) {
      return res.status(400).send('Invalid name');
    }

    // --- 1. Валидация email ---
    const rawEmail = email;
    const e = typeof rawEmail === 'string' ? rawEmail.trim() : '';
    const emailRe =
      /^[A-Za-z0-9]+(?:[._%+-][A-Za-z0-9]+)*@(?:[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)*\.[A-Za-z]{2,}$/;

    if (!emailRe.test(e) || e.length > 254 || e.split('@')[0].length > 64) {
      return res.status(400).send('Invalid email');
    }

    // --- 2. Валидация comment ---
    if (
      typeof comment !== 'string' ||
      !comment.trim() ||
      comment.length > 500 ||
      /<[^>]+>/.test(comment)
    ) {
      return res.status(400).send('Invalid comment');
    }

    // --- 3. size/productId и остальная логика ---
    const prodSnap = await db.collection('products').doc(productId).get();
    const productData = prodSnap.exists ? prodSnap.data() : {};
    const validSizes = Array.isArray(productData.sizes) ? productData.sizes : [];

    // size обязателен только для НЕ pattern
    if (productData.category !== 'pattern') {
      if (!validSizes.includes(size)) {
        return res.status(400).send('Invalid size');
      }
    }

    // --- 4. recaptcha ---
    const token = data['g-recaptcha-response'];
    const skipHeader = req.headers['x-skip-captcha'];
    if (skipHeader === SKIP_CAPTCHA_SECRET) {
      console.log('🔓 Skipping CAPTCHA (header matched)');
    } else {
      if (!token) {
        return res.status(400).send('Missing CAPTCHA token');
      }
      const verifyRes = await axios.post(
        'https://www.google.com/recaptcha/api/siteverify',
        new URLSearchParams({
          secret: RECAPTCHA_SECRET,
          response: token,
        }),
      );
      if (!verifyRes.data.success) {
        return res.status(403).send('CAPTCHA verification failed');
      }
    }

    try {
      // 5. Создаём заказ в Firestore
      const orderData = {
        productId,
        name,
        email,
        comment,
        created: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (typeof size === 'string' && size) {
        orderData.size = size;
      }
      if (typeof color === 'string' && color) {
        orderData.color = color;
      }

      const ref = await db.collection('orders').add(orderData);
      const orderId = ref.id;

      // 6. Письмо админу (с цветом)
      await transporter.sendMail({
        from: `"Alxemilla Shop" <${GMAIL_USER}>`,
        to: ADMIN_EMAIL,
        subject: `Новый заказ №${orderId}`,
        text: `
Номер заказа: ${orderId}
Имя: ${name}
Email: ${email}
Комментарий: ${comment}
Размер: ${size}
Цвет: ${color || ''}
Товар ID: ${productId}
          `,
        html: `
            <h2>Новый заказ №${orderId}</h2>
            <ul>
              <li><strong>Имя:</strong> ${name}</li>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Комментарий:</strong> ${comment}</li>
              <li><strong>Размер:</strong> ${size}</li>
              <li><strong>Цвет:</strong> ${color || ''}</li>
              <li><strong>Товар ID:</strong> ${productId}</li>
            </ul>
          `,
      });

      // 7. Ответ клиенту
      return res.json({ id: orderId });
    } catch (err) {
      console.error('Error in createOrder:', err);
      return res.status(500).send('Internal server error');
    }
  });
});

// ——————————————————————————————————————————
// 4) addOrUpdateProduct (оставляем проверку admin-claim)
// ——————————————————————————————————————————
exports.addOrUpdateProduct = functions
  .region('europe-west1')
  .https.onRequest((req, res) => {
    corsFn(req, res, async () => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send('Unauthorized');
      }

      const idToken = authHeader.split(' ')[1];
      let decoded;
      try {
        decoded = await auth.verifyIdToken(idToken);
      } catch (err) {
        return res.status(401).send('Invalid or expired token');
      }
      if (!decoded.admin) {
        return res.status(403).send('Forbidden');
      }

      const data = req.body;
      if (!data || typeof data !== 'object') {
        return res.status(400).send('Invalid body');
      }

      const product = {
        category: data.category,
        price: data.price,
        sizes: data.sizes,
        image: data.image,
        hoverImage: data.hoverImage,
        images: Array.isArray(data.images) ? data.images : [],
        translations: data.translations,
        fileUrl: data.fileUrl || '',
        color: data.color || null,
        group: data.group || '',
        stock: data.stock || {},
      };

      try {
        await db.collection('products').doc(data.id).set(product, { merge: true });
        return res.status(200).json({ id: data.id });
      } catch (err) {
        console.error('Product save error:', err);
        return res.status(500).send('Failed to save product');
      }
    });
  });

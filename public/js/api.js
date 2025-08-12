// public/js/api.js
import { auth } from './firebase.js';
const LOCAL_API = 'http://localhost:5001/knitting-shop-7526c/us-central1';
export const API =
  window.location.hostname === 'localhost'
    ? LOCAL_API
    : 'https://europe-west1-knitting-shop-7526c.cloudfunctions.net';

export async function fetchProducts(category = null) {
  const res = await fetch(`${API}/getProducts`);
  if (!res.ok) throw new Error(res.statusText);
  const all = await res.json();
  return category ? all.filter((p) => p.category === category) : all;
}

export async function fetchProduct(id) {
  const res = await fetch(`${API}/getProduct?id=${id}`);
  if (res.status === 404) return null;
  return res.json();
}

export async function submitOrder(data) {
  const res = await fetch(`${API}/createOrder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function addOrUpdateProduct(product) {
  if (!auth.currentUser) throw new Error('Не авторизован');
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(`${API}/addOrUpdateProduct`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(product),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
// public/js/main.js
import { auth, onAuthStateChanged } from "./firebase.js";
import { t, changeLang } from "./locale.js";
import {
  renderSidebar,
  renderProductList,
  showProduct,
  renderOrderForm,
  renderAbout,
} from "./views.min.js";

function scrollToTop() {
  window.scrollTo(0, 0);
}
window.scrollToTop = scrollToTop;

// Делает функции доступными в HTML
window.renderProductList = renderProductList;
window.showProduct = showProduct;
window.renderOrderForm = renderOrderForm;
window.renderAbout = renderAbout;
window.renderDelivery = renderDelivery;
window.setLanguage = (lang) => {
  changeLang(lang);
  renderSidebar();
  const state = window.currentView;
  if (!state) {
    renderProductList(null, false);
    scrollToTop();
    return;
  }
  switch (state.name) {
    case "list":
      renderProductList(state.category, false);
      break;
    case "product":
      showProduct(state.id);
      break;
    case "order":
      renderOrderForm(state.id, state.size, state.color, state.preorder);
      break;
    case "about":
      renderAbout();
      break;
    default:
      renderProductList(null, false);
  }
  scrollToTop();
};

function setupBurger() {
  const burger = document.getElementById("burger");
  const sidebar = document.getElementById("sidebar");
  if (!burger || !sidebar) return;
  burger.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebar.classList.toggle("show");
  });
  document.addEventListener("click", (e) => {
    if (!sidebar.contains(e.target) && !burger.contains(e.target)) {
      sidebar.classList.remove("show");
    }
  });
  sidebar
    .querySelectorAll("a")
    .forEach((link) =>
      link.addEventListener("click", () => sidebar.classList.remove("show")),
    );
}

function init() {
  renderSidebar();
  setupBurger();

  onAuthStateChanged(auth, (user) => {
    renderSidebar();

    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    // Админка
    if (path === "/admin") {
      const prodId = params.get("id");
      import("./admin.js").then(() => {
        if (user) {
          window.renderAdminForm(prodId);
        } else {
          window.renderLogin();
        }
      });
      return;
    }

    // Просмотр товара
    if (path.startsWith("/product/")) {
      showProduct(path.split("/product/")[1]);
      return;
    }

    // Оформление заказа
    if (path.startsWith("/order/")) {
      const state = window.history.state || {};
      renderOrderForm(
        path.split("/order/")[1],
        state.size,
        state.color,
        state.preorder,
      );
      return;
    }

    // О нас
    if (path === "/about") {
      renderAbout();
      return;
    }
    // Доставка
    if (path === "/delivery") {
      window.renderDelivery();
      return;
    }

    // Главная
    renderProductList(null, false);
  });

  window.addEventListener("popstate", (e) => {
    renderSidebar();
    const state = e.state;
    if (!state) return renderProductList(null, false);
    switch (state.name) {
      case "list":
        renderProductList(state.category, false);
        break;
      case "product":
        showProduct(state.id);
        break;
      case "order":
        renderOrderForm(state.id, state.size, state.color, state.preorder);
        break;
      case "about":
        renderAbout();
        break;
      case "delivery":
        window.renderDelivery();
        break;
      default:
        renderProductList(null, false);
    }
  });
}

init();

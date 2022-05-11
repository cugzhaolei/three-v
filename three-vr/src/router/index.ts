import { createRouter, createWebHistory } from "vue-router";

const scene = () => import("../pages/scene.vue")
const login = () => import("../pages/login.vue")

const routes = [
  {
    path: "/login",
    name: "Login",
    meta: {
      title: "login",
      keepAlive: true,
      requireAuth: false,
    },
    component: login,
  },
  {
    path: "/",
    name: "Index",
    meta: {
      title: "home",
      keepAlive: true,
      requireAuth: true,
    },
    component: () => import("../pages/index.vue"),
  },
  {
    path: "/scene",
    name: "scene",
    meta: {
      title: "scene",
      keepAlive: true,
      requireAuto: true,
    },
    component: ()=> import('../pages/scene.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});
export default router;

import { createApp }    from 'vue';
import { createPinia }  from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import App              from './App.vue';
import './style.css';

import RoleList   from './views/RoleList.vue';
import RoleDetail from './views/RoleDetail.vue';
import AddRole    from './views/AddRole.vue';
import SqlQuery   from './views/SqlQuery.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',         component: RoleList },
    { path: '/roles/:id', component: RoleDetail },
    { path: '/add',      component: AddRole },
    { path: '/query',    component: SqlQuery },
  ],
});

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');

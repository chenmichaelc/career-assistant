<template>
  <div class="min-h-screen bg-surface">
    <nav data-testid="menu-bar" class="border-b border-border px-6 py-4 flex items-center justify-between">
      <router-link to="/" class="font-mono text-accent font-semibold tracking-tight text-lg">
        career-assistant
      </router-link>
      <div class="flex items-center gap-6 font-mono text-sm">
        <router-link to="/"      class="text-dim hover:text-text transition-colors" active-class="text-text">roles</router-link>
        <router-link to="/add"   class="text-dim hover:text-text transition-colors" active-class="text-text">add</router-link>
        <router-link to="/query" class="text-dim hover:text-text transition-colors" active-class="text-text">query</router-link>
        <button @click="backup" class="text-dim hover:text-success transition-colors">backup</button>
      </div>
    </nav>
    <main class="px-6 py-8 max-w-7xl mx-auto">
      <router-view />
    </main>
    <div v-if="backupMsg" class="fixed bottom-4 right-4 bg-panel border border-success text-success font-mono text-sm px-4 py-2 rounded">
      {{ backupMsg }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const backupMsg = ref('');

async function backup() {
  try {
    const res  = await fetch('/api/backup', { method: 'POST' });
    const data = await res.json();
    backupMsg.value = `Backup saved: ${data.timestamp}`;
    setTimeout(() => backupMsg.value = '', 4000);
  } catch (err) {
    console.error('[backup] failed:', err);
    backupMsg.value = 'Backup failed.';
    setTimeout(() => backupMsg.value = '', 4000);
  }
}
</script>
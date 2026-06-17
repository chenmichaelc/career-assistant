<template>
  <div class="max-w-4xl">
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-mono text-2xl font-semibold text-text">SQL Query</h1>
      <div class="flex items-center gap-3">
        <span class="font-mono text-xs text-dim">write mode</span>
        <button
          @click="writeMode = !writeMode"
          :class="writeMode ? 'bg-danger border-danger' : 'bg-surface border-border'"
          class="relative w-10 h-5 border rounded-full transition-colors"
        >
          <span
            :class="writeMode ? 'translate-x-5 bg-surface' : 'translate-x-0.5 bg-dim'"
            class="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
          />
        </button>
        <span :class="writeMode ? 'text-danger' : 'text-dim'" class="font-mono text-xs font-medium">
          {{ writeMode ? 'WRITE ENABLED' : 'read only' }}
        </span>
      </div>
    </div>

    <div v-if="writeMode" class="bg-danger/10 border border-danger text-danger font-mono text-xs px-4 py-2 rounded mb-4">
      ⚠ Write mode enabled. INSERT, UPDATE, DELETE, DROP, ALTER, and CREATE statements will execute against the live database.
    </div>

    <div class="mb-4">
      <textarea
        v-model="sql"
        class="w-full bg-panel border border-border text-text font-mono text-sm px-4 py-3 rounded focus:outline-none focus:border-accent h-36 resize-y"
        placeholder="SELECT * FROM roles WHERE role_status = 'Applied' ORDER BY applied_date DESC;"
        @keydown.ctrl.enter="execute"
        @keydown.meta.enter="execute"
      />
      <div class="flex items-center justify-between mt-2">
        <span class="font-mono text-xs text-dim">ctrl+enter to execute</span>
        <div class="flex gap-3">
          <button @click="sql = ''" class="border border-border text-dim font-mono text-xs px-3 py-1.5 rounded hover:text-text transition-colors">clear</button>
          <button @click="execute" :disabled="!sql.trim() || loading" class="bg-accent text-surface font-mono text-sm px-4 py-1.5 rounded hover:opacity-90 disabled:opacity-40 transition-opacity">
            {{ loading ? 'running...' : 'execute' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="error" class="bg-danger/10 border border-danger text-danger font-mono text-sm px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <div v-if="results !== null">
      <div class="font-mono text-xs text-dim mb-3">
        {{ Array.isArray(results) ? `${results.length} row(s) returned` : `${(results as any).changes ?? 0} row(s) affected` }}
      </div>

      <div v-if="Array.isArray(results) && results.length > 0" class="overflow-x-auto">
        <table class="w-full font-mono text-xs border-collapse">
          <thead>
            <tr class="border-b border-border">
              <th v-for="col in columns" :key="col" class="pb-2 pr-4 text-left text-dim font-medium">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in results" :key="i" class="border-b border-border hover:bg-panel transition-colors">
              <td v-for="col in columns" :key="col" class="py-2 pr-4 text-text max-w-xs truncate">
                {{ row[col] ?? '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="Array.isArray(results) && results.length === 0" class="font-mono text-dim text-sm">
        No rows returned.
      </div>

      <div v-else class="font-mono text-success text-sm">
        Query executed successfully.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { apiFetch }      from '@/composables/useApi';

const sql       = ref('');
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- SQL query results are runtime-dynamic; shape depends on user-supplied query
const results   = ref<any[] | object | null>(null);
const error     = ref('');
const loading   = ref(false);
const writeMode = ref(false);

const columns = computed(() => {
  if (!Array.isArray(results.value) || results.value.length === 0) return [];
  return Object.keys(results.value[0]);
});

async function execute() {
  if (!sql.value.trim()) return;
  error.value   = '';
  results.value = null;
  loading.value = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SQL query results are runtime-dynamic; shape depends on user-supplied query
    const data = await apiFetch<{ results: any[] | object }>('/api/query', {
      method: 'POST',
      body:   JSON.stringify({ sql: sql.value, writeMode: writeMode.value }),
    });
    results.value = data.results;
  }
 catch (err) {
    error.value = (err as Error).message;
  }
 finally {
    loading.value = false;
  }
}
</script>

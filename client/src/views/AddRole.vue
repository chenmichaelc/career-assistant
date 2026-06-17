<template>
  <div class="max-w-2xl">
    <h1 class="font-mono text-2xl font-semibold text-text mb-6">Add Role</h1>

    <div class="space-y-4">
      <div>
        <label class="font-mono text-xs text-dim block mb-1">company *</label>
        <input v-model="form.company" class="input w-full" placeholder="Acme Corp" />
      </div>
      <div>
        <label class="font-mono text-xs text-dim block mb-1">title *</label>
        <input v-model="form.title" class="input w-full" placeholder="Senior QA Engineer" />
      </div>
      <div>
        <label class="font-mono text-xs text-dim block mb-1">url *</label>
        <input v-model="form.url" class="input w-full" placeholder="https://..." />
      </div>
      <div>
        <label class="font-mono text-xs text-dim block mb-1">status *</label>
        <select v-model="form.role_status" class="input w-full">
          <option v-for="s in VALID_STATUSES" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="font-mono text-xs text-dim block mb-1">salary min</label>
          <input v-model.number="form.salary_min" type="number" class="input w-full" placeholder="110000" />
        </div>
        <div>
          <label class="font-mono text-xs text-dim block mb-1">salary max</label>
          <input v-model.number="form.salary_max" type="number" class="input w-full" placeholder="130000" />
        </div>
      </div>
      <div>
        <label class="font-mono text-xs text-dim block mb-1">notes</label>
        <input v-model="form.notes" class="input w-full" placeholder="Optional notes..." />
      </div>
      <div>
        <label class="font-mono text-xs text-dim block mb-1">job description *</label>
        <textarea v-model="form.jd" class="input w-full h-64 resize-y" placeholder="Paste the full job description here..." />
      </div>

      <div v-if="error" class="font-mono text-danger text-sm bg-danger/10 border border-danger px-4 py-3 rounded">
        {{ error }}
      </div>

      <div class="flex gap-3">
        <button @click="submit" :disabled="submitting" class="bg-accent text-surface font-mono text-sm px-6 py-2 rounded hover:opacity-90 disabled:opacity-40 transition-opacity">
          {{ submitting ? 'adding...' : 'add role' }}
        </button>
        <router-link to="/" class="border border-border text-dim font-mono text-sm px-6 py-2 rounded hover:text-text transition-colors">
          cancel
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref }           from 'vue';
import { useRouter }     from 'vue-router';
import { apiFetch }      from '@/composables/useApi';
import { VALID_STATUSES } from '@/constants';

const router    = useRouter();
const error     = ref('');
const submitting = ref(false);

const form = ref({
  company:     '',
  title:       '',
  url:         '',
  role_status: 'Pending Triage' as string,
  salary_min:  null as number | null,
  salary_max:  null as number | null,
  notes:       '',
  jd:          '',
});

async function submit() {
  error.value     = '';
  submitting.value = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shared RoleInput type not yet accessible from client; tracked in CAR-4
    const payload: any = { ...form.value };
    if (!payload.notes)      delete payload.notes;
    if (!payload.salary_min) payload.salary_min = null;
    if (!payload.salary_max) payload.salary_max = null;

    const { id } = await apiFetch<{ id: number }>('/api/roles', {
      method: 'POST',
      body:   JSON.stringify(payload),
    });
    router.push(`/roles/${id}`);
  }
 catch (err) {
    error.value = (err as Error).message;
  }
 finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
@reference "../style.css";

.input {
  @apply bg-panel border border-border text-text font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-accent;
}
</style>
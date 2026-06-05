<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-mono text-2xl font-semibold text-text">Roles</h1>
      <span class="font-mono text-sm text-dim">{{ roles.length }} found</span>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 mb-6">
      <input
        v-model="filterStatus"
        placeholder="filter by status"
        class="bg-panel border border-border text-text font-mono text-sm px-3 py-2 rounded w-48 focus:outline-none focus:border-accent"
      />
      <input
        v-model="filterCompany"
        placeholder="filter by company"
        class="bg-panel border border-border text-text font-mono text-sm px-3 py-2 rounded w-56 focus:outline-none focus:border-accent"
      />
      <button @click="load" class="bg-accent text-surface font-mono text-sm px-4 py-2 rounded hover:opacity-90 transition-opacity">
        search
      </button>
      <button @click="clearFilters" class="border border-border text-dim font-mono text-sm px-4 py-2 rounded hover:text-text transition-colors">
        clear
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="bg-panel border border-danger text-danger font-mono text-sm px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <!-- Loading -->
    <div v-if="loading" class="font-mono text-dim text-sm">loading...</div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full font-mono text-sm border-collapse">
        <thead>
          <tr class="border-b border-border text-dim text-left">
            <th class="pb-3 pr-4 font-medium w-12">id</th>
            <th class="pb-3 pr-4 font-medium">company</th>
            <th class="pb-3 pr-4 font-medium">title</th>
            <th class="pb-3 pr-4 font-medium">status</th>
            <th class="pb-3 pr-4 font-medium">candidacy</th>
            <th class="pb-3 font-medium">applied</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="role in roles"
            :key="role.id"
            @click="goToRole(role.id)"
            class="border-b border-border hover:bg-panel cursor-pointer transition-colors"
          >
            <td class="py-3 pr-4 text-dim">{{ role.id }}</td>
            <td class="py-3 pr-4 text-text">{{ role.company }}</td>
            <td class="py-3 pr-4 text-dim max-w-xs truncate">{{ role.title }}</td>
            <td class="py-3 pr-4">
              <span :class="statusClass(role.role_status)" class="px-2 py-0.5 rounded text-xs font-medium">
                {{ role.role_status }}
              </span>
            </td>
            <td class="py-3 pr-4 text-dim">{{ role.candidacy ?? '—' }}</td>
            <td class="py-3 text-dim">{{ role.applied_date ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted }  from 'vue';
import { useRouter }       from 'vue-router';
import { apiFetch }        from '@/composables/useApi';

const router        = useRouter();
const roles         = ref<any[]>([]);
const loading       = ref(false);
const error         = ref('');
const filterStatus  = ref('');
const filterCompany = ref('');

async function load() {
  loading.value = true;
  error.value   = '';
  try {
    const params = new URLSearchParams();
    if (filterStatus.value)  params.set('status',  filterStatus.value);
    if (filterCompany.value) params.set('company', filterCompany.value);
    roles.value = await apiFetch<any[]>(`/api/roles?${params}`);
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

function clearFilters() {
  filterStatus.value  = '';
  filterCompany.value = '';
  load();
}

function goToRole(id: number) {
  router.push(`/roles/${id}`);
}

function statusClass(status: string): string {
  const map: Record<string, string> = {
    'Applied':           'bg-accent/20 text-accent',
    'Pending Triage':    'bg-warning/20 text-warning',
    'Skipped':           'bg-muted/40 text-dim',
    'Closed':            'bg-muted/40 text-dim',
    'In Interview':      'bg-success/20 text-success',
    'Offer Accepted':    'bg-success/20 text-success',
    'Offer Declined':    'bg-danger/20 text-danger',
    'Callback':          'bg-accent/20 text-accent',
    'On Hold':           'bg-warning/20 text-warning',
    'Resume Needed':     'bg-warning/20 text-warning',
    'Resume Ready':      'bg-accent/20 text-accent',
  };
  return map[status] ?? 'bg-muted/40 text-dim';
}

onMounted(load);
</script>

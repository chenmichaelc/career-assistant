<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-mono text-2xl font-semibold text-text">Roles</h1>
      <span class="font-mono text-sm text-dim">{{ roles.length }} found</span>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 mb-6 flex-wrap">

      <!-- Status multi-select dropdown -->
      <div class="relative" ref="statusDropdownRef">
        <button
            @click="showStatusDropdown = !showStatusDropdown"
            class="bg-panel border border-border text-text font-mono text-sm px-3 py-2 rounded w-48 text-left flex items-center justify-between hover:border-accent transition-colors focus:outline-none"
        >
          <span class="truncate">{{ statusLabel }}</span>
          <span class="text-dim text-xs ml-2">▾</span>
        </button>

        <div
            v-if="showStatusDropdown"
            class="absolute top-full mt-1 left-0 z-10 bg-panel border border-border rounded shadow-lg w-56"
        >
          <!-- Controls -->
          <div class="flex gap-2 px-3 pt-3 pb-2 border-b border-border">
            <button @click="selectAll"  class="font-mono text-xs text-accent hover:opacity-80 transition-opacity">all</button>
            <span class="text-dim text-xs">·</span>
            <button @click="selectNone" class="font-mono text-xs text-accent hover:opacity-80 transition-opacity">none</button>
            <span class="text-dim text-xs">·</span>
            <button @click="selectActive" class="font-mono text-xs text-accent hover:opacity-80 transition-opacity">active</button>
          </div>

          <!-- Options -->
          <div class="py-1 max-h-64 overflow-y-auto">
            <label
                v-for="s in VALID_STATUSES"
                :key="s"
                class="flex items-center gap-2 px-3 py-1.5 hover:bg-surface cursor-pointer"
            >
              <input
                  type="checkbox"
                  :value="s"
                  v-model="filterStatuses"
                  class="accent-accent"
              />
              <span class="font-mono text-sm text-text">{{ s }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Company filter -->
      <input
          v-model="filterCompany"
          @keyup.enter="load"
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
          <th @click="setSort('id')"           class="pb-3 pr-4 font-medium w-12 cursor-pointer hover:text-text transition-colors select-none">
            id <span class="text-xs">{{ sortIndicator('id') }}</span>
          </th>
          <th @click="setSort('company')"      class="pb-3 pr-4 font-medium cursor-pointer hover:text-text transition-colors select-none">
            company <span class="text-xs">{{ sortIndicator('company') }}</span>
          </th>
          <th @click="setSort('title')"        class="pb-3 pr-4 font-medium cursor-pointer hover:text-text transition-colors select-none">
            title <span class="text-xs">{{ sortIndicator('title') }}</span>
          </th>
          <th @click="setSort('role_status')"  class="pb-3 pr-4 font-medium cursor-pointer hover:text-text transition-colors select-none">
            status <span class="text-xs">{{ sortIndicator('role_status') }}</span>
          </th>
          <th @click="setSort('candidacy')"    class="pb-3 pr-4 font-medium cursor-pointer hover:text-text transition-colors select-none">
            candidacy <span class="text-xs">{{ sortIndicator('candidacy') }}</span>
          </th>
          <th @click="setSort('applied_date')" class="pb-3 font-medium cursor-pointer hover:text-text transition-colors select-none">
            applied <span class="text-xs">{{ sortIndicator('applied_date') }}</span>
          </th>
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter }                              from 'vue-router';
import { apiFetch }                              from '@/composables/useApi';
import { VALID_STATUSES }                        from '@/constants';

const INACTIVE_STATUSES = ['Skipped', 'Closed'];
const ACTIVE_STATUSES   = VALID_STATUSES.filter(s => !INACTIVE_STATUSES.includes(s));

const router              = useRouter();
const roles               = ref<any[]>([]);
const loading             = ref(false);
const error               = ref('');
const filterStatuses      = ref<string[]>([...ACTIVE_STATUSES]);
const filterCompany       = ref('');
const sortColumn          = ref('id');
const sortOrder           = ref<'ASC' | 'DESC'>('DESC');
const showStatusDropdown  = ref(false);
const statusDropdownRef   = ref<HTMLElement | null>(null);

// ─── Status dropdown label ────────────────────────────────────────────────────

const statusLabel = computed(() => {
  const count = filterStatuses.value.length;
  if (count === 0)                    return 'no status selected';
  if (count === VALID_STATUSES.length) return 'all statuses';
  if (count === 1)                    return filterStatuses.value[0];
  return `${count} statuses`;
});

// ─── Status selection helpers ─────────────────────────────────────────────────

function selectAll()    { filterStatuses.value = [...VALID_STATUSES]; }
function selectNone()   { filterStatuses.value = []; }
function selectActive() { filterStatuses.value = [...ACTIVE_STATUSES]; }

// ─── Close dropdown on outside click ─────────────────────────────────────────

function handleClickOutside(e: MouseEvent) {
  if (statusDropdownRef.value && !statusDropdownRef.value.contains(e.target as Node)) {
    showStatusDropdown.value = false;
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
  load();
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});

// ─── Load ─────────────────────────────────────────────────────────────────────

async function load() {
  showStatusDropdown.value = false;
  loading.value            = true;
  error.value              = '';
  try {
    const params = new URLSearchParams();
    filterStatuses.value.forEach(s => params.append('status[]', s));
    if (filterCompany.value) params.set('company', filterCompany.value);
    params.set('sort',  sortColumn.value);
    params.set('order', sortOrder.value);
    roles.value = await apiFetch<any[]>(`/api/roles?${params}`);
  }
  catch (err) {
    error.value = (err as Error).message;
  }
  finally {
    loading.value = false;
  }
}

// ─── Sort ─────────────────────────────────────────────────────────────────────

function setSort(column: string) {
  if (sortColumn.value === column) {
    sortOrder.value = sortOrder.value === 'ASC' ? 'DESC' : 'ASC';
  }
  else {
    sortColumn.value = column;
    sortOrder.value  = 'DESC';
  }
  load();
}

function sortIndicator(column: string): string {
  if (sortColumn.value !== column) return '';
  return sortOrder.value === 'ASC' ? '↑' : '↓';
}

// ─── Clear ────────────────────────────────────────────────────────────────────

function clearFilters() {
  filterStatuses.value = [...ACTIVE_STATUSES];
  filterCompany.value  = '';
  sortColumn.value     = 'id';
  sortOrder.value      = 'DESC';
  load();
}

// ─── Navigation ──────────────────────────────────────────────────────────────

function goToRole(id: number) {
  router.push(`/roles/${id}`);
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function statusClass(status: string): string {
  const map: Record<string, string> = {
    'Applied':        'bg-accent/20 text-accent',
    'Pending Triage': 'bg-warning/20 text-warning',
    'Skipped':        'bg-muted/40 text-dim',
    'Closed':         'bg-muted/40 text-dim',
    'In Interview':   'bg-success/20 text-success',
    'Offer Accepted': 'bg-success/20 text-success',
    'Offer Declined': 'bg-danger/20 text-danger',
    'Callback':       'bg-accent/20 text-accent',
    'On Hold':        'bg-warning/20 text-warning',
    'Resume Needed':  'bg-warning/20 text-warning',
    'Resume Ready':   'bg-accent/20 text-accent',
  };
  return map[status] ?? 'bg-muted/40 text-dim';
}
</script>
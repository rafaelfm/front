<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useDestinationsStore, type Destination } from '../stores/destinations';

interface Props {
  modelValue: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  name?: string;
  minChars?: number;
  disabled?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
  (event: 'selected', payload: { destination: Destination; formatted: string }): void;
}>();

const destinationsStore = useDestinationsStore();

const internalValue = ref(props.modelValue);
const showSuggestions = ref(false);
const debounceHandle = ref<number | undefined>();
const blurHandle = ref<number | undefined>();
const minChars = computed(() => Math.max(1, props.minChars ?? 2));
const results = ref<Destination[]>([]);
const isFocused = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

const hasQuery = computed(() => internalValue.value.trim().length >= minChars.value);
const hasSuggestions = computed(() => results.value.length > 0);

watch(
  () => props.modelValue,
  (value) => {
    if (value !== internalValue.value) {
      internalValue.value = value;
    }
  },
);

watch(
  internalValue,
  (value) => {
    if (value !== props.modelValue) {
      emit('update:modelValue', value);
    }

    if (typeof window !== 'undefined' && debounceHandle.value !== undefined) {
      window.clearTimeout(debounceHandle.value);
    }

    if (!hasQuery.value) {
      results.value = [];
      showSuggestions.value = false;
      return;
    }

    if (!isFocused.value) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    debounceHandle.value = window.setTimeout(async () => {
      try {
        results.value = await destinationsStore.search(value);
      } catch (error) {
        results.value = [];
        console.warn('Não foi possível carregar destinos:', error);
      } finally {
        if (!isFocused.value) {
          results.value = [];
          showSuggestions.value = false;
        } else {
          showSuggestions.value = results.value.length > 0;
        }
      }
    }, 1500);
  },
  { immediate: false },
);

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement | null;

  if (!target) {
    return;
  }

  internalValue.value = target.value;
};

const handleSelect = (destination: Destination) => {
  const fallbackParts = [
    destination.city,
    destination.state_code ?? destination.state,
    destination.country,
  ].filter((value): value is string => typeof value === 'string' && value.trim() !== '');

  const formatted = typeof destination.label === 'string' && destination.label.trim() !== ''
    ? destination.label
    : fallbackParts.join(', ');

  if (typeof window !== 'undefined' && debounceHandle.value !== undefined) {
    window.clearTimeout(debounceHandle.value);
  }

  isFocused.value = false;
  showSuggestions.value = false;
  results.value = [];
  internalValue.value = formatted;
  emit('update:modelValue', formatted);
  emit('selected', { destination, formatted });
  if (typeof window !== 'undefined' && blurHandle.value !== undefined) {
    window.clearTimeout(blurHandle.value);
  }
  inputRef.value?.blur();
};

const handleFocus = () => {
  isFocused.value = true;

  if (typeof window !== 'undefined' && blurHandle.value !== undefined) {
    window.clearTimeout(blurHandle.value);
  }

  if (hasSuggestions.value) {
    showSuggestions.value = true;
  }
};

const handleBlur = () => {
  isFocused.value = false;

  if (typeof window === 'undefined') {
    showSuggestions.value = false;
    return;
  }

  blurHandle.value = window.setTimeout(() => {
    showSuggestions.value = false;
  }, 150);
};

onBeforeUnmount(() => {
  if (typeof window === 'undefined') {
    return;
  }

  if (debounceHandle.value !== undefined) {
    window.clearTimeout(debounceHandle.value);
  }

  if (blurHandle.value !== undefined) {
    window.clearTimeout(blurHandle.value);
  }
});
</script>

<template>
  <label class="destination-autocomplete">
    <span v-if="label">{{ label }}</span>
    <div class="field">
      <input
        ref="inputRef"
        :value="internalValue"
        :name="name"
        type="text"
        :required="required"
        :placeholder="placeholder"
        :disabled="disabled"
        autocomplete="off"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
      />

      <div v-if="showSuggestions" class="suggestions">
        <p v-if="destinationsStore.loading" class="state">Carregando destinos…</p>
        <template v-else>
          <ul v-if="hasSuggestions" class="list">
            <li v-for="destination in results" :key="destination.id">
              <button
                type="button"
                @mousedown.prevent
                @click="handleSelect(destination)"
              >
                {{ destination.label }}
              </button>
            </li>
          </ul>
          <p v-else class="state">Nenhum destino encontrado para o filtro.</p>
        </template>
      </div>
    </div>
  </label>
</template>

<style scoped>
.destination-autocomplete {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  position: relative;
}

.field {
  position: relative;
}

input {
  width: 100%;
  border: 1px solid #cbd5f5;
  border-radius: 0.75rem;
  padding: 0.75rem 0.9rem;
  font-size: 0.95rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input:focus {
  border-color: #646cff;
  outline: none;
  box-shadow: 0 0 0 3px rgba(100, 108, 255, 0.15);
}

.suggestions {
  position: absolute;
  z-index: 10;
  top: calc(100% + 0.3rem);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #cbd5f5;
  border-radius: 0.75rem;
  box-shadow: 0 20px 40px -25px rgba(15, 23, 42, 0.2);
  padding: 0.25rem;
  max-height: 260px;
  overflow-y: auto;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.list li + li {
  margin-top: 0.15rem;
}

.list button {
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 0.65rem 0.75rem;
  border-radius: 0.65rem;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.list button:hover,
.list button:focus {
  background: rgba(100, 108, 255, 0.1);
  color: #1e293b;
}

.state {
  padding: 0.7rem 0.75rem;
  color: #475569;
  font-size: 0.9rem;
}
</style>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { ref } from 'vue'

const menuOpen = ref(false)
</script>

<template>
  <header class="sticky top-0 z-50 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          🧩 Igsaw Puzzle App
        </h1>

        <!-- Mobile menu button -->
        <button
          @click="menuOpen = !menuOpen"
          class="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
          aria-expanded="false"
        >
          <span class="sr-only">Open main menu</span>
          <!-- Icon when menu is closed -->
          <svg
            v-if="!menuOpen"
            class="h-6 w-6"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <!-- Icon when menu is open -->
          <svg
            v-else
            class="h-6 w-6"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <!-- Desktop navigation -->
        <nav class="hidden md:flex md:gap-2 lg:gap-4">
          <RouterLink
            to="/"
            class="px-3 py-2 text-sm lg:text-base rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Home
          </RouterLink>
          <RouterLink
            to="/jigsaw-bridge"
            class="px-3 py-2 text-sm lg:text-base rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Jigsaw Bridge
          </RouterLink>

          <RouterLink
            to="/comfyui"
            class="px-3 py-2 text-sm lg:text-base rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            ComfyUI
          </RouterLink>
          <RouterLink
            to="/about"
            class="px-3 py-2 text-sm lg:text-base rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            About
          </RouterLink>
        </nav>
      </div>

      <!-- Mobile menu, show/hide based on menu state -->
      <div v-if="menuOpen" class="md:hidden pb-4">
        <nav class="flex flex-col gap-2">
          <RouterLink
            to="/"
            @click="menuOpen = false"
            class="px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Home
          </RouterLink>
          <RouterLink
            to="/jigsaw-bridge"
            @click="menuOpen = false"
            class="px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Jigsaw Bridge
          </RouterLink>

          <RouterLink
            to="/comfyui"
            @click="menuOpen = false"
            class="px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            ComfyUI
          </RouterLink>
          <RouterLink
            to="/about"
            @click="menuOpen = false"
            class="px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            About
          </RouterLink>
        </nav>
      </div>
    </div>
  </header>

  <main class="min-h-screen pb-8">
    <RouterView />
  </main>
</template>

<style scoped>
.router-link-exact-active {
  background-color: #42b983;
  color: white;
}

.router-link-exact-active:hover {
  background-color: #42b983;
  opacity: 0.9;
}
</style>

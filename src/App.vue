<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <div class="wrapper">
      <h1 class="app-title">🧩 Igsaw Puzzle App</h1>

      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/jigsaw-bridge">Jigsaw Bridge</RouterLink>
        <RouterLink to="/ollama">Ollama Vision</RouterLink>
        <RouterLink to="/comfyui">ComfyUI</RouterLink>
        <RouterLink to="/about">About</RouterLink>
      </nav>
    </div>
  </header>

  <main>
    <RouterView />
  </main>
</template>

<style scoped>
header {
  background-color: var(--color-background-soft);
  padding: 1rem 0;
  border-bottom: 1px solid var(--color-border);
}

.wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.app-title {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
}

nav {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

nav a {
  padding: 0.5rem 1rem;
  text-decoration: none;
  color: var(--color-text);
  border-radius: 4px;
  transition: background-color 0.3s;
}

nav a:hover {
  background-color: var(--color-background-mute);
}

nav a.router-link-exact-active {
  background-color: var(--color-primary, #42b983);
  color: white;
}

main {
  min-height: calc(100vh - 200px);
}
</style>

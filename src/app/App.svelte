<script>
  import { Router, Link, Route } from "svelte-routing";
  import Create from "./Create.svelte";
  import Home from "./Home.svelte";
  import List from "./List.svelte";
</script>

<style>
  :global(body) {
    font: 14px Helvetica;
    background: #fafafa;
    padding: 0;
    margin: 0;
    color: #333;
    -webkit-font-smoothing: antialiased;
  }
  main {
    padding: 20px 25px;
    width: 100%;
    overflow: hidden;
    box-sizing: border-box;
  }
</style>

<main>
  <Router url="">
    <Route path="create">
      <Create />
    </Route>
    <Route path="prase">Phrase</Route>
    <Route path="list">
      <List />
    </Route>
    <Route path="/">
      <Home />
    </Route>
  </Router>
</main>

<script>
    let count = $state(0);
</script>

<div class="assistant-window">
    <h3>Unnamed Assistant</h3>
    <button onclick={() => count++ }>Clicked {count} times</button>
</div>

<style>
    .assistant-window {
        padding: 8px 12px;
    }
</style>
<script>
    import { fly } from "svelte/transition";
    let notes = $state([]);
    let loading = $state(false);
    let error = $state("");
    async function review() {
        // Reset everything between calls
        error = "";

        // Reads the selected text.
        const text = window.getSelection().toString().trim();

        if (!text) {
            error = "No text selected! Please select some text and try again!";
            return;
        }
        loading = true;
        notes = [];
        try {
            // Pauses the function until the model responds
            const result = await window.neo.assistantReview(text);

            // Writes the model reply to either error, or the notes array, depending on what happens
            if (result.error) {
                error = result.error;
            } else {
                notes = result.notes.map((note) => ({
                    id: crypto.randomUUID(),
                    ...note,
                }));
            }
        } finally {
            loading = false;
        }
    }
    function dismiss(id) {
        notes = notes.filter((note) => note.id !== id);
    }
    function keep(note) {
        const sid = window.insertPlaceholder(note.text);
        if (sid) {
            notes = notes.map((item) =>
                note.id === item.id ? { ...item, kept: true } : item,
            );
        }
    }
</script>

<div class="assistant-window">
    <h3>Unnamed Assistant</h3>

    <p>Highlight text and click "Review" to get some notes!</p>

    <button onclick={review} disabled={loading}>
        {loading ? "Loading..." : "Review"}
    </button>

    {#if error}<p class="error-msg">{error}</p>{/if}

    {#each notes as note (note.id)}
        <div class="note-card" out:fly={{ x: 150, duration: 350 }}>
            {#if note.kept}<span class="pinned">📌</span>{/if}
            <span class="note-type">{note.type}</span>
            <p>{note.text}</p>
            {#if !note.kept}
                <div class="note-actions">
                    <button onclick={() => keep(note)}>Keep</button>
                    <button onclick={() => dismiss(note.id)}>Dismiss</button>
                </div>
            {/if}
        </div>
    {/each}
</div>

<style>
    .assistant-window {
        margin-bottom: 8px;
        padding: 8px 12px;
    }
    .note-card {
        margin-bottom: 8px;
        padding: 8px 12px;
        background-color: rgb(255, 255, 120);
        color: black;
    }

    .pinned {
        display: block;
        text-align: center;
    }
    .note-type {
        font-size: 1.1em;
        opacity: 0.8;
        display: block;
        text-transform: uppercase;
        border-bottom: 2px solid rgb(255, 0, 0);
    }
</style>

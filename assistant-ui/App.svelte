<script>
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
                notes = result.notes.map(note => ({id: crypto.randomUUID(), ...note}));
                console.log(notes)
            }
        } finally {
            loading = false;
        }
    }
</script>

<div class="assistant-window">
    <h3>Unnamed Assistant</h3>

    <p>Highlight text and click "Review" to get some notes!<p>

    <button onclick={review} disabled={loading}>
        {loading ? "Loading..." : "Review"}
    </button>

    {#if error}<p class="error-msg">{error}</p>{/if}
    
    {#each notes as note(id)}
    <div class="note-card">
        <span class="note-type">{note.type}</span>
        <p>{note.text}</p>
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
        opacity: 0.8;
    }

    .note-type {
        font-size: 1.1em;
        color: black;
        opacity: 0.8;
        text-transform: uppercase;
        border-bottom: 2px solid rgb(255, 0, 0);
    }
</style>

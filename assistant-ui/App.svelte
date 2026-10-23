<script>
    import { fly } from "svelte/transition";
    import Settings from './Settings.svelte';
    let notes = $state([]);
    let loading = $state(false);
    let error = $state("");
    let editingId = $state(null);
    let draft = $state("");
    let reviewId = $state(null);
    let wildcard = $state(false);
    let showSettings = $state(false);

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
            const result = await window.neo.assistantReview(text, { wildcard });

            // Writes the model reply to either error, or the notes array, depending on what happens
            if (result.error) {
                error = result.error;
            } else {
                notes = result.notes;
                reviewId = result.reviewId;
            }
        } finally {
            loading = false;
        }
    }
    function dismiss(id) {
        notes = notes.filter((note) => note.id !== id);
        window.neo.assistantLogAction({
            reviewId,
            noteId: id,
            action: "dismiss",
        });
    }
    function keep(note) {
        const sid = window.insertPlaceholder(note.text);
        if (sid) {
            notes = notes.map((item) =>
                note.id === item.id ? { ...item, kept: true } : item,
            );
            window.neo.assistantLogAction({
                reviewId,
                noteID: note.id,
                action: "keep",
            });
        }
    }
    function spark(note) {
        editingId = note.id;
        draft = note.text;
    }
    function cancel() {
        editingId = null;
    }
    function place(note) {
        const edited = draft.trim();
        if (!edited) {
            return;
        }
        const sid = window.insertPlaceholder(edited);
        if (!sid) {
            return;
        }
        window.neo.assistantLogAction({
            reviewId,
            noteId: note.id,
            action: "spark",
            edited,
        });
        notes = notes.map((item) =>
            note.id === item.id ? { ...item, kept: true, edited } : item,
        );
        editingId = null;
    }
</script>

<div class="assistant-window">
    <h3>Unnamed Assistant</h3>

    <p>Highlight text and click "Review" to get some notes!</p>
    <button class="settings-gear" onclick={() => (showSettings=!showSettings)}>
        ⚙
    </button>
    <button class="review-button" onclick={review} disabled={loading}>
        {loading ? "Loading..." : "Review"}
    </button>

    {#if showSettings}
            <Settings/>
    {/if}

    <label>
        <input
            class="wildcard-toggle"
            type="checkbox"
            bind:checked={wildcard}
        />
        Include a wildcard
    </label>
    {#if error}<p class="error-msg">{error}</p>{/if}

    {#each notes as note (note.id)}
        <div class="note-card" out:fly={{ x: 150, duration: 350 }} class:wildcard={note.type==='wildcard'}>
            {#if note.kept}<span class="pinned">📌</span>{/if}
            <span class="note-type">{note.type}</span>

            {#if editingId === note.id}
                <textarea bind:value={draft}></textarea>
                <div class="note-actions">
                    <button onclick={() => place(note)}>Place</button>
                    <button onclick={() => cancel()}>Cancel</button>
                </div>
            {:else}
                <p>{note.edited ?? note.text}</p>
                {#if note.anchor}
                    <p class="wildcard-anchor">Anchor: {note.anchor}</p>
                {/if}

                {#if !note.kept}
                    <div class="note-actions">
                        <button onclick={() => keep(note)}>Keep</button>
                        <button onclick={() => spark(note)}>Spark</button>
                        <button onclick={() => dismiss(note.id)}>Dismiss</button
                        >
                    </div>
                {/if}
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
        background-color: rgb(223, 223, 192);
        color: black;
    }
    
    .wildcard {
        background-color: darkred;
        color: whitesmoke;
    }

    .wildcard-anchor {
        font-size: 0.75em;
        opacity: 0.7;
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
        border-bottom: 2px solid rgb(255, 0, 98);
    }
</style>

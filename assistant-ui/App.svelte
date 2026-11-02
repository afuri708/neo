<script>
    import { fly } from "svelte/transition";
    import Settings from "./Settings.svelte";
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
    <div class="header">
        <h3>Unnamed Assistant</h3>
        <p class="main-instruction">
            Highlight text and click "Review" to get some notes!
        </p>
    </div>
    <div class="review-row">
        <button
            class="settings-gear ui-button"
            onclick={() => (showSettings = !showSettings)}
        >
            ⚙
        </button>
        <button
            class="review-button ui-button"
            onclick={review}
            disabled={loading}
        >
            {loading ? "Loading..." : "Review"}
        </button>
    </div>
    {#if showSettings}
        <Settings />
    {/if}

    <label class="wildcard-toggle">
        <input type="checkbox" bind:checked={wildcard} />
        Include a wildcard
    </label>
    {#if error}<p class="error-msg">{error}</p>{/if}

    {#each notes as note (note.id)}
        <div
            class="note-card"
            out:fly={{ x: 150, duration: 350 }}
            class:wildcard={note.type === "wildcard"}
        >
            {#if note.kept}<span class="pinned">📌</span>{/if}
            <span class="note-type">{note.type}</span>

            {#if editingId === note.id}
                <textarea bind:value={draft}></textarea>
                <div class="note-actions">
                    <button class="note-button" onclick={() => place(note)}
                        >Place</button
                    >
                    <button class="note-button" onclick={() => cancel()}
                        >Cancel</button
                    >
                </div>
            {:else}
                <p class="note-text">{note.edited ?? note.text}</p>
                {#if note.anchor}
                    <p class="wildcard-anchor">Anchor: {note.anchor}</p>
                {/if}

                {#if !note.kept}
                    <div class="note-actions">
                        <button class="note-button" onclick={() => keep(note)}
                            >Keep</button
                        >
                        <button class="note-button" onclick={() => spark(note)}
                            >Spark</button
                        >
                        <button
                            class="note-button"
                            onclick={() => dismiss(note.id)}>Dismiss</button
                        >
                    </div>
                {/if}
            {/if}
        </div>
    {/each}
</div>

<style>
    /* PALETTE */

    .assistant-window {
        /* Cards */
        --card-bg: #efe6c8;
        --card-ink: #27221f;
        --card-label: #5e5848;
        --card-header-line: #c0392b;
        --card-rule: rgba(70, 120, 190, 0.25);
        --card-button-bg: #fbf7ea;
        --card-button-border: rgba(60, 40, 0, 0.12);
        --card-shadow: rgba(0, 0, 0, 0.35);
        --pin: #c0392b;

        /* Wildcard cards */
        --wildcard-bg: #962b21;
        --wildcard-ink: #efe4dc;
        --wildcard-label: #f0cfc4;
        --wildcard-rule: rgba(255, 246, 238, 0.22);
        --wildcard-header-line: rgba(255, 246, 238, 0.65);
    }

    .assistant-window {
        /* Panel */
        --button-bg: #3a3834;
        --button-ink: #ece8df;
        --button-shadow: rgba(0, 0, 0, 0.45);
        --section-bg: #2a2a26;
        --input-bg: #1c1c1c;
        --input-border: #454545;
        --success: #9fd3a6;
    }

    /* PANEL LAYOUT */

    .assistant-window {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 8px;
        padding: 8px 12px;
    }

    .header {
        margin: 0;
    }

    .main-instruction {
        color: var(--muted);
    }

    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
    }

    /* PANEL BUTTONS */

    .ui-button {
        background-color: var(--button-bg);
        color: var(--button-ink);
        border: none;
        border-radius: 999px;
        box-shadow: 0 2px 6px var(--button-shadow);
    }

    .ui-button:hover:not(:disabled) {
        box-shadow: 0 3px 6px var(--button-shadow);
    }

    .ui-button:active:not(:disabled) {
        box-shadow: 0 1px 2px var(--button-shadow);
        transform: translateY(1px);
    }

    .settings-gear {
        width: 44px;
        height: 44px;
        flex-shrink: 0;
        padding: 0;
        font-size: 20px;
    }

    .review-button {
        flex: 1;
        height: 44px;
        font-size: 15px;
        font-weight: 600;
    }

    /* WILDCARD TOGGLE */

    .wildcard-toggle {
        accent-color: var(--red);
    }

    /* MESSAGES */

    .error-msg {
        color: var(--red);
    }

    /* NOTE CARDS */

    .note-card {
        margin-bottom: 8px;
        padding: 8px 12px;
        border-radius: 10px;
        background-color: var(--card-bg);
        color: var(--card-ink);
        box-shadow: 0 4px 12px var(--card-shadow);
    }

    .pinned {
        display: block;
        text-align: center;
    }

    .note-type {
        display: block;
        padding-bottom: 6px;
        font-size: 0.75em;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--card-label);
        border-bottom: 2px solid var(--card-header-line);
    }

    /* Ruled lines: the 28px stripe must match line-height */
    .note-text {
        line-height: 28px;
        background-image: repeating-linear-gradient(
            to bottom,
            transparent 0 27px,
            var(--card-rule) 27px 28px
        );
    }

    /* CARD BUTTONS */

    .note-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
    }

    .note-button {
        flex: 1;
        height: 44px;
        border-radius: 999px;
        background-color: var(--card-button-bg);
        color: var(--card-ink);
        border: 1px solid var(--card-button-border);
        box-shadow: 0 2px 4px var(--card-shadow);
        font-size: 14px;
        font-weight: 600;
    }

    .note-button:hover {
        box-shadow: 0 3px 6px var(--card-shadow);
    }

    .note-button:active {
        box-shadow: 0 1px 2px var(--card-shadow);
        transform: translateY(1px);
    }

    /* WILDCARD CARDS */

    .wildcard {
        background-color: var(--wildcard-bg);
        color: var(--wildcard-ink);
    }

    .wildcard .note-type {
        color: var(--wildcard-label);
        border-bottom-color: var(--wildcard-header-line);
    }

    .wildcard .note-text {
        background-image: repeating-linear-gradient(
            to bottom,
            transparent 0 27px,
            var(--wildcard-rule) 27px 28px
        );
    }

    .wildcard-anchor {
        font-size: 0.75em;
        color: var(--wildcard-label);
    }

    /* KEYBOARD FOCUS */

    .ui-button:focus-visible,
    .note-button:focus-visible,
    .wildcard-toggle:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
    }
</style>

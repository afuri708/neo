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
        logAction(id, 'dismiss');
    }
    function logAction(noteId, action, edited=null) {
        window.neo.assistantLogAction({reviewId, noteId, action, edited});
    }
    function keep(note) {
        const sid = window.insertPlaceholder(note.text, "nova");
        if (sid) {
            notes = notes.map((item) =>
                note.id === item.id ? { ...item, kept: true } : item,
            );
            logAction(note.id, 'keep');
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
        const sid = window.insertPlaceholder(edited, "nova");
        if (!sid) {
            return;
        }
        logAction(note.id, 'spark', edited);
        notes = notes.map((item) =>
            note.id === item.id ? { ...item, kept: true, edited } : item,
        );
        editingId = null;
    }
</script>

<div class="assistant-window">
    <div class="header">
        <h3>
            <svg
                class="nova-logo"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 124 32"
                width="124"
                height="32"
                role="img"
                aria-labelledby="nova-logo-title">
                <title id="nova-logo-title">Nova</title>
                <defs>
                    <linearGradient
                        id="nova-logo-trail"
                        gradientUnits="userSpaceOnUse"
                        x1="29.5"
                        y1="2.5"
                        x2="3"
                        y2="18.5"
                    >
                        <stop
                            offset="0"
                            style="stop-color: var(--nova-trail-head, #fff4dc)"
                        />
                        <stop
                            offset="0.35"
                            style="stop-color: var(--nova-trail-mid, #f0b46a)"
                        />
                        <stop
                            offset="1"
                            style="stop-color: var(--nova-trail-tail, #c0392b)"
                        />
                    </linearGradient>
                    <mask
                        id="nova-logo-cut"
                        maskUnits="userSpaceOnUse"
                        x="0"
                        y="0"
                        width="32"
                        height="32"
                    >
                        <rect width="32" height="32" fill="#ffffff" />
                        <path
                            d="M29.5 2.5L5.6 20.6C3.2 22.4 0.6 18.2 2.4 15.4Z"
                            fill="#000000"
                            stroke="#000000"
                            stroke-width="2.4"
                            stroke-linejoin="round"
                        />
                    </mask>
                </defs>
                <path
                    d="M16 2C17 11 21 15 30 16C21 17 17 21 16 30C15 21 11 17 2 16C11 15 15 11 16 2Z"
                    style="fill: var(--accent, #c9a86a)"
                    mask="url(#nova-logo-cut)"
                />
                <path
                    d="M29.5 2.5L5.6 20.6C3.2 22.4 0.6 18.2 2.4 15.4Z"
                    fill="url(#nova-logo-trail)"
                />
                <text
                    x="39"
                    y="23.5"
                    font-family=" NOVA oxanium, 'Arial Black', sans-serif"
                    font-weight="800"
                    font-size="21"
                    letter-spacing="1.5"
                    fill="currentColor">NOVA</text
                >
            </svg>
        </h3>
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
            {#if loading}
                <span class="spinner"></span>
            {/if}
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
    {#if error}
        <p class="error-msg">{error}</p>
    {/if}
    {#if loading}
        <div class="loading-area">
            <span class="spinner spinner-large" role="status"> </span>
        </div>
    {/if}
    {#each notes as note (note.id)}
        <div
            class="note-card"
            out:fly={{ x: 150, duration: 350 }}
            class:wildcard={note.type === "wildcard"}
        >
            {#if note.kept}<span class="pinned"
                    ><svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        width="24"
                        height="24"
                        role="img"
                        aria-label="Kept"
                        >
                        <path
                            d="M9 3h6l-1 6 4 4H6l4-4z"
                            fill="currentColor"
                            stroke="currentColor"
                            stroke-width="1.6"
                            stroke-linejoin="round"
                        />
                        <path
                            d="M12 13v8"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.8"
                            stroke-linecap="round"
                        />
                    </svg></span
                >{/if}
            <span class="note-type">{note.type}</span>

            {#if editingId === note.id}
                <textarea class="spark-editor" bind:value={draft}></textarea>
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
        /* Logo */
        --nova-trail-head: #fff4dc;
        --nova-trail-mid: #f0b46a;
        --nova-trail-tail: #c0392b;

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

    /* LIGHT MODE */

    :global(body.light) .assistant-window {
        --button-bg: #e4e0d7;
        --button-ink: #2b2926;
        --button-shadow: rgba(0, 0, 0, 0.15);
        --section-bg: #fbfaf8;
        --input-bg: #ffffff;
        --input-border: #d6d2c8;
        --success: #3d7a46;
        --nova-trail-head: #f0b46a;
        --nova-trail-mid: #d9622f;
        --card-shadow: rgba(0, 0, 0, 0.18);
    }

    /* FONTS */

    @font-face {
        font-family: "NOVA kalam";
        src: url("assistant-fonts/kalam-latin-400-normal.woff2") format("woff2");
        font-weight: 400;
    }
    @font-face {
        font-family: "NOVA oxanium";
        src: url("assistant-fonts/oxanium-latin-800-normal.woff2")
            format("woff2");
        font-weight: 800;
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
    .nova-logo {
        height: 28px;
        width: auto;
    }
    .main-instruction {
        color: var(--muted);
    }

    .review-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
    }

    /* PANEL BUTTONS */

    .assistant-window :global(.ui-button) {
        background-color: var(--button-bg);
        color: var(--button-ink);
        border: none;
        border-radius: 999px;
        box-shadow: 0 2px 6px var(--button-shadow);
    }

    .assistant-window :global(.ui-button:hover:not(:disabled)) {
        box-shadow: 0 3px 6px var(--button-shadow);
    }

    .assistant-window :global(.ui-button:active:not(:disabled)) {
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
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }
    .main-instruction {
        margin: 0;
    }

    /* MESSAGES */

    .assistant-window :global(.error-msg) {
        color: var(--red);
    }

    /* LOADING */
    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .spinner {
            animation-duration: 3s;
        }
    }
    .spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid var(--muted);
        border-top-color: var(--accent);
        border-radius: 50%;
        animation: spin 0.9s linear infinite;
    }
    .spinner-large {
        width: 36px;
        height: 36px;
        border-width: 3px;
    }
    .loading-area {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 24px;
        border: 1px dashed var(--muted);
        border-radius: 10px;
        color: var(--muted);
    }

    /* WILDCARD TOGGLE */

    .wildcard-toggle {
        accent-color: var(--red);
    }

    /* NOTE CARDS */

    .note-card {
        position: relative;
        margin-bottom: 8px;
        padding: 8px 12px;
        border-radius: 10px;
        background-color: var(--card-bg);
        color: var(--card-ink);
        box-shadow: 0 4px 12px var(--card-shadow);
    }

    .pinned {
        position: absolute;
        top: -12px;
        left: 50%;
        transform: translateX(-50%);
        color: var(--pin);
        line-height: 0;
    }
    .pinned svg {
        width: 24px;
        height: 24px;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.35));
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
        font-family: "NOVA kalam", cursive;
        font-size: 19px;
        line-height: 28px;
        background-image: repeating-linear-gradient(
            to bottom,
            transparent 0 27px,
            var(--card-rule) 27px 28px
        );
    }
    .spark-editor {
        font-family: "NOVA kalam", cursive;
        font-size: 19px;
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

    .assistant-window :global(.ui-button:focus-visible),
    .note-button:focus-visible,
    .wildcard-toggle:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
    }

    /* STICKIES */

    :global(.nova-sticky) {
        position: relative;
        padding-right: 32px;
    }
    :global(.nova-sticky::after) {
        content: "";
        position: absolute;
        top: 10px;
        right: 10px;
        width: 16px;
        height: 16px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='t' gradientUnits='userSpaceOnUse' x1='29.5' y1='2.5' x2='3' y2='18.5'%3E%3Cstop offset='0' stop-color='%23fff4dc'/%3E%3Cstop offset='0.35' stop-color='%23f0b46a'/%3E%3Cstop offset='1' stop-color='%23c0392b'/%3E%3C/linearGradient%3E%3Cmask id='c' maskUnits='userSpaceOnUse' x='0' y='0' width='32' height='32'%3E%3Crect width='32' height='32' fill='%23fff'/%3E%3Cpath d='M29.5 2.5L5.6 20.6C3.2 22.4 0.6 18.2 2.4 15.4Z' fill='%23000' stroke='%23000' stroke-width='2.4' stroke-linejoin='round'/%3E%3C/mask%3E%3C/defs%3E%3Cpath d='M16 2C17 11 21 15 30 16C21 17 17 21 16 30C15 21 11 17 2 16C11 15 15 11 16 2Z' fill='%23c9a86a' mask='url(%23c)'/%3E%3Cpath d='M29.5 2.5L5.6 20.6C3.2 22.4 0.6 18.2 2.4 15.4Z' fill='url(%23t)'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        pointer-events: none;
    }
</style>

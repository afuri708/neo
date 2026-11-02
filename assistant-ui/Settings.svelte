<script>
    import { onMount } from "svelte";
    import { fromStore } from "svelte/store";

    let keyInput = $state("");
    let hasKey = $state(false);
    let keyMsg = $state("");
    let minNotes = $state(3);
    let maxNotes = $state(6);
    let countMsg = $state("");
    let promptText = $state("");
    let promptMsg = $state("");

    onMount(keyCheck);
    onMount(loadSettings);
    onMount(loadPrompt);

    async function keyCheck() {
        hasKey = await window.neo.hasSecret("omlx");
    }

    async function saveKey() {
        const trimmedKey = keyInput.trim();
        if (!trimmedKey) {
            let keyMsg = "Please set a key!";
            return;
        }
        await window.neo.setSecret("omlx", trimmedKey);
        keyInput = "";
        await keyCheck();
        keyMsg = "Key stored!";
    }
    async function removeKey() {
        await window.neo.setSecret("omlx", "");
        await keyCheck();
        keyMsg = "Key deleted...";
    }

    async function loadSettings() {
        const settings = await window.neo.assistantGetSettings();
        minNotes = settings.minNotes;
        maxNotes = settings.maxNotes;
    }

    async function saveCounts() {
        const counts = await window.neo.assistantSetSettings({
            minNotes,
            maxNotes,
        });
        if (counts.error) {
            countMsg = counts.error;
        } else {
            countMsg = "Counts saved!";
        }
    }
    async function loadPrompt() {
        const result = await window.neo.assistantGetPrompt();
        promptText = result.text;
    }
    async function savePrompt() {
        const result = await window.neo.assistantSetPrompt(promptText);
        if (result.error) {
            promptMsg = result.error;
        } else {
            promptMsg = "Prompt saved!";
        }
    }
    async function revertPrompt() {
        await loadPrompt();
        promptMsg = "Changes not saved. Prompt set back to saved version.";
    }
    async function importPrompt(event) {
        const file = event.target.files[0];
        if (!file) {
            return;
        }
        promptText = await file.text();
        event.target.value = "";
        promptMsg = "Prompt imported but not saved.";
    }
</script>

<div class="settings">
    <h3 class="heading">Settings</h3>

    <div class="settings-section">
        <h4>oMLX API key</h4>
        <p>{hasKey ? "Key set" : "No key set"}</p>
        <input
            class="settings-input"
            type="password"
            bind:value={keyInput}
            placeholder="Key here"
        />

        <div class="settings-buttons">
            <button class="ui-button" onclick={saveKey}>Save</button>
            <button class="ui-button" onclick={removeKey}>Remove</button>
        </div>
        {#if keyMsg}
            <p class="message">{keyMsg}</p>
        {/if}
    </div>
    <div class="settings-section">
        <h4>Notes per review</h4>
        <div class="notes-numbers">
            <label class="notes-number-input">
                Minimum # notes
                <input
                    class="settings-input"
                    type="number"
                    bind:value={minNotes}
                />
            </label>
            <label class="notes-number-input">
                Maximum # notes
                <input
                    class="settings-input"
                    type="number"
                    bind:value={maxNotes}
                />
            </label>
        </div>
        <div class="settings-buttons">
            <button class="ui-button" onclick={saveCounts}>Save</button>
        </div>
        {#if countMsg}
            <p class="message">{countMsg}</p>
        {/if}
        <p class="inactive-message">Not yet active</p>
    </div>
    <div class="settings-section">
        <h4>System prompt</h4>
        <textarea class="prompt-editor" bind:value={promptText}></textarea>
        <label
            >Import from .txt<input
                type="file"
                accept=".txt"
                onchange={importPrompt}
            /></label
        >
        <div class="settings-buttons">
            <button class="ui-button" onclick={savePrompt}>Save</button>
            <button class="ui-button" onclick={revertPrompt}>Revert</button>
        </div>
        {#if promptMsg}
            <p class="message">{promptMsg}</p>
        {/if}
    </div>
</div>

<style>

    ::placeholder {
        color: var(--muted);
    }
    .settings {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    .settings-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
        border-radius: 12px;
        background-color: var(--section-bg);
        box-shadow: 0 2px 8px var(--button-shadow);
    }
    .settings-section h4, .settings-section p {
        margin: 0;
    }
    .heading {
        margin: 0;
    }
    .prompt-editor {
        width: 100%;
        height: 20em;
        padding: 12px;
        border-radius: 10px;
        font-family: monospace;
        border: 1px solid var(--input-border);
        box-sizing: border-box;
        background-color: var(--input-bg);
        color: inherit;
        font-size: 12px;
        line-height: 1.5;
        resize: vertical;
        outline: none;
    }
    .settings-input {
        height: 44px;
        padding: 0 16px;
        box-sizing: border-box;
        border-radius: 999px;
        background-color: var(--input-bg);
        color: inherit;
        border: 1px solid var(--input-border);
        width: 100%;
    }
    .prompt-editor:focus-visible, .settings-input:focus-visible {
        outline: 2px solid var(--accent);
    }
    .settings-buttons {
        display: flex;
        gap: 8px;
    }
    .settings-buttons button {
        flex: 1;
    }
    .notes-numbers {
        display: flex;
        gap: 8px;
    }
    .notes-number-input {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
    }
    .message {
        color: var(--success);
    }
    .inactive-message {
        color: var(--muted);
    }
</style>

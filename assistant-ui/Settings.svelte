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
    <h3>Settings</h3>

    <div class="key-settings">
        <h4>oMLX API key</h4>
        <p>{hasKey ? "Key set" : "No key set"}</p>
        <input type="password" bind:value={keyInput} placeholder="Key here" />

        <div class="key-buttons">
            <button onclick={saveKey}>Save</button>
            <button onclick={removeKey}>Remove</button>
        </div>
        {#if keyMsg}
            <p>{keyMsg}</p>
        {/if}
    </div>
    <div class="notes-settings">
        <h4>Notes per review</h4>
        <label>
            <input class="min-notes" type="number" bind:value={minNotes} />
            Minimum # notes
        </label>
        <label>
            <input class="max-notes" type="number" bind:value={maxNotes} />
            Maximum # notes
        </label>
        <button class="save-button" onclick={saveCounts}>Save</button>
        {#if countMsg}
            <p>{countMsg}</p>
        {/if}
        <p>Not yet active</p>
    </div>
    <div class="prompt-settings">
        <h4>System prompt</h4>
        <textarea class="prompt-editor" bind:value={promptText}></textarea>
        <label><input type="file" accept =".txt" onchange={importPrompt}></label>
    </div>
    <div class="prompt-buttons">
        <button class="save-button" onclick={savePrompt}>Save</button>
        <button class="revert-button" onclick={revertPrompt}>Revert</button>
        {#if promptMsg}
        <p>{promptMsg}</p>
        {/if}
    </div>
</div>

<style>
    .settings {
        padding: 10px;
        border: 4px;
        border-color: blueviolet;
    }
    .prompt-settings {
        width: 100%;
        height: 20em;
        font-family: monospace;
        box-sizing: border-box;
    }
</style>

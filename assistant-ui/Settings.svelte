<script>
    import { onMount } from "svelte";

    let keyInput = $state('');
    let hasKey = $state(false);
    let keyMsg = $state('');

    async function keyCheck(){
        hasKey = await window.neo.hasSecret('omlx');
    }
    onMount(keyCheck);

    async function saveKey(){
        const trimmedKey = keyInput.trim();
        if (!trimmedKey) {
            let keyMsg = ('Please set a key!');
            return;
        }
        await window.neo.setSecret('omlx', trimmedKey);
        keyInput = ('');
        await keyCheck();
        keyMsg = ('Key stored!');
    }
    async function removeKey(){
        await window.neo.setSecret('omlx', '');
        await keyCheck();
        keyMsg = ('Key deleted...');
    }
</script>

<div class="settings">
    <h3>Settings</h3>
    
    <div class="key-settings">   
        <h4>oMLX API key</h4>
        <p>{hasKey ? "Key set" : "No key set"}</p>
        <input type="password" bind:value={keyInput} placeholder="Key here">
        
        <div class="key-buttons">
            <button onclick={saveKey}>Save</button>
            <button onclick={removeKey}>Remove</button>
        </div>
        {#if keyMsg}
            <p>{keyMsg}</p>
        {/if}
    </div>
</div>



<style>
    .settings {
        padding: 10px;
        border: 4px;
        border-color: blueviolet;
    }
</style>
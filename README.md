# Still Here

A private memory garden for the people and stories we carry. Write down a memory, add a photograph if you like, and ask an open-weight language model to shape your own details into a letter, vignette, or poem.

## Run it

Serve this folder over localhost (the browser needs a local web server for ES modules):

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000>. Your writing tools and archive work without an account. Select **Load open model** to download and start SmolLM2-360M-Instruct in your browser. The first model load needs an internet connection; the browser can cache model files for later use. After the model is ready, generation runs on your device.

## Why open AI

Memories and attached photos are saved in this browser's local storage. They are not sent to an inference API or stored on a service. The open-weight model makes it possible to inspect, replace, and run the writing engine on-device; the small model is practical for a personal laptop, with the tradeoff that its writing is less capable than a large hosted model. The app itself is static and has no backend.

The model and Transformers.js are fetched from their public repositories on first load, so this is not a zero-download first run. For a fully disconnected setup, cache or serve those assets locally before going offline. Clearing this browser's site data will erase saved memories.

## Suggested project post

**Still Here** is a small, private place to keep the details that make a person feel present: a remembered phrase, a favorite song, the smell of something cooking. It turns those notes into a letter, vignette, or poem without asking anyone to upload a loved one's story to a service.

Open innovation matters here because the writing model can run on the same device as the archive. There is no inference account, no per-message fee, and no server holding the family's memories. The open model is replaceable, and its limits are visible: this is a modest model, not a claim that local generation always beats a frontier hosted system. For something this personal, control over where the words go is the better trade.